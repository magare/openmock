import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { mockupOptions, slugify } from '../../src/editorState.js';

// Instrument the served development module only; profiling never ships in
// the renderer. Keep DPR, viewport, lighting and sample length comparable.
const outDir = process.argv[2] || 'output/playwright/device-performance';
const devices = process.argv[3] ? JSON.parse(process.argv[3]) : mockupOptions.map(([name]) => name);
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1121, height: 900 }, deviceScaleFactor: 2 });
const logs = [];
page.on('console', msg => { if (['warning', 'error'].includes(msg.type())) logs.push(msg.text()); });
page.on('pageerror', error => logs.push(error.message));
await page.route('**/src/ThreeStage.jsx*', async route => {
  const response = await route.fetch();
  let body = await response.text();
  body = body.replace('runtimeRef.current = runtime;', 'runtimeRef.current = runtime; globalThis.__deviceRuntime = runtime; runtime.profileStart = performance.now(); runtime.profileFrames = [];');
  body = body.replace('renderer.render(scene, camera);', 'const profileBefore = performance.now(); renderer.render(scene, camera); runtime.profileFrames.push({time: performance.now(), cpu: performance.now() - profileBefore}); if (runtime.profileFrames.length > 240) runtime.profileFrames.shift();');
  await route.fulfill({ response, body });
});
const report = [];
try {
  await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' });
  for (const name of devices) {
    await page.evaluate(name => {
      localStorage.setItem('openmock-project', JSON.stringify({ mockup: name, cameraPreset: 'Angled' }));
      localStorage.setItem('openmock-tour-seen', '1');
      localStorage.setItem('openmock-mobile-onboarded', '1');
    }, name);
    const start = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('.three-stage-canvas')?.dataset.rendererStatus === 'ready', null, { timeout: 60000 });
    const readyMs = Date.now() - start;
    await page.waitForTimeout(1600);
    const idleDraws = await page.evaluate(() => window.__deviceRuntime.profileFrames.filter(frame => frame.time > performance.now()-600).length);
    // Force one second of active draws for a comparable render-cost sample;
    // production can now leave static devices idle without GPU work.
    await page.evaluate(()=>new Promise(resolve=>{
      const until=performance.now()+1000;
      const frame=()=>{window.__deviceRuntime.needsRender=true;if(performance.now()<until)requestAnimationFrame(frame);else resolve();};
      frame();
    }));
    const metrics = await page.evaluate(() => {
      const r = globalThis.__deviceRuntime;
      if (!r) throw new Error('Profiling instrumentation did not attach');
      const geometries = new Set(), materials = new Set(), textures = new Set();
      let meshes = 0, triangles = 0, vertices = 0, geometryBytes = 0, textureBytes = 0;
      const heavyMeshes = [];
      r.model.traverseVisible(o => {
        if (!o.isMesh) return;
        meshes++;
        const g = o.geometry;
        const count = (g.index?.count || g.attributes.position.count) / 3;
        triangles += count;
        heavyMeshes.push({ name: o.name || o.type, triangles: count });
        if (!geometries.has(g)) {
          geometries.add(g); vertices += g.attributes.position.count;
          geometryBytes += (g.index?.array.byteLength || 0) + Object.values(g.attributes).reduce((sum, a) => sum + (a.array?.byteLength || 0), 0);
        }
        for (const m of [o.material].flat()) {
          materials.add(m);
          for (const t of Object.values(m)) if (t?.isTexture) textures.add(t);
        }
      });
      for (const t of textures) { const i = t.image; textureBytes += (i?.width || 0) * (i?.height || 0) * 4 * (t.generateMipmaps ? 4 / 3 : 1); }
      const frames = r.profileFrames.filter(f => f.time > performance.now() - 1000);
      const sorted = frames.map(f => f.cpu).sort((a, b) => a - b);
      const gaps = frames.slice(1).map((f, i) => f.time - frames[i].time).sort((a, b) => a - b);
      const p = (a, q) => Math.round((a[Math.floor((a.length - 1) * q)] || 0) * 100) / 100;
      return { source: r.exact ? 'manufacturer' : 'procedural', meshes, triangles, vertices, materials: materials.size, textures: textures.size,
        geometryMiB: +(geometryBytes / 1048576).toFixed(2), textureMiB: +(textureBytes / 1048576).toFixed(2),
        drawCalls: r.renderer.info.render.calls, drawnTriangles: r.renderer.info.render.triangles,
        cpuMedianMs: p(sorted, .5), cpuP95Ms: p(sorted, .95), frameMedianMs: p(gaps, .5), frameP95Ms: p(gaps, .95),
        memory: r.renderer.info.memory, fit: r.renderer.domElement.dataset.openmockFit,
        heavyMeshes: heavyMeshes.sort((a,b) => b.triangles-a.triangles).slice(0, 5) };
    });
    report.push({ name, readyMs, idleDraws, ...metrics });
    console.log(JSON.stringify({ name, readyMs, idleDraws, ...metrics, heavyMeshes: undefined }));
    if (process.env.DEVICE_SCREENSHOTS === '1') {
      await page.locator('.mockup-stage').screenshot({ path: `${outDir}/${slugify(name)}${name.includes('+') ? '-plus' : ''}.png` });
    }
    await writeFile(`${outDir}/report.json`, JSON.stringify({ report, logs }, null, 2));
  }
} finally { await browser.close(); }
if (logs.length || report.some(r => !Number.isFinite(Number(r.fit)))) process.exitCode = 1;
