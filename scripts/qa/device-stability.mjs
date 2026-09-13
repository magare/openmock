import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { devicePoseConfig } from '../../src/cameraInteraction.js';
import { slugify } from '../../src/editorState.js';

const outDir = process.argv[2] || 'output/playwright/device-stability';
const baseline = process.env.DEVICE_BASELINE_SOURCE;
const devices = process.argv[3] ? JSON.parse(process.argv[3]) : [
  'Pixel 10 Pro', 'Surface Laptop 15"', 'Dell XPS 16', 'Nintendo Switch 2',
  'Steam Deck', 'Galaxy Watch 8', 'Pixel Watch 4', 'Apple Vision Pro',
];
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
const logs = [], report = [];
page.on('pageerror', e => logs.push(e.message));
page.on('console', m => { if (['warning', 'error'].includes(m.type())) logs.push(m.text()); });
await page.route('**/src/ThreeStage.jsx*', async route => {
  const response = await route.fetch(baseline ? { url: `http://localhost:5199/${baseline}/ThreeStage.jsx` } : {});
  let body = await response.text();
  if (baseline) for (const file of ['editorState.js', 'cameraInteraction.js']) body = body.replaceAll(`/${baseline}/${file}`, `/src/${file}`);
  body = body.replace('runtimeRef.current = runtime;', 'runtimeRef.current = runtime; window.__deviceRuntime = runtime;');
  await route.fulfill({ response, body });
});
const ready = () => page.waitForFunction(() => window.__deviceRuntime?.model && document.querySelector('canvas')?.dataset.rendererStatus === 'ready', null, { timeout: 45000 });
const update = patch => page.evaluate(patch => window.updateDevice(patch), patch);
const pose = (name, view) => {
  const config = devicePoseConfig(name, 'Manual');
  const yaw = { Front:0, Angled:-25, Back:160, Side:78 }[view];
  const xAxis = yaw / config.yawSign;
  return { xAxis, yAxis:view==='Front'?0:view==='Back'?-8:14, zAxis:xAxis*config.rollFactor, fov:24, zoom:1.9, panX:0, panY:0 };
};
try {
  await page.goto('http://localhost:5199/scripts/qa/device-review.html');
  await ready();
  for (const name of devices) {
    await update({ mockup:name, finish:'White', cameraState:pose(name, 'Front') });
    await ready();
    // HDR/image loads and shader compilation finish before visual comparison.
    await page.waitForTimeout(800);
    const slug = slugify(name);
    for (const view of ['Front', 'Angled', 'Back', 'Side']) {
      await update({ cameraState:pose(name, view) });
      await page.waitForTimeout(120);
      await page.screenshot({ path:`${outDir}/${slug}-${view.toLowerCase()}.png` });
    }
    await update({ finish:'Black', cameraState:pose(name, 'Angled') });
    await page.waitForTimeout(150);
    await page.screenshot({ path:`${outDir}/${slug}-black.png` });
    const status = await page.evaluate(() => {
      const r=window.__deviceRuntime;
      return { fit:Number(r.renderer.domElement.dataset.openmockFit), calls:r.renderer.info.render.calls, triangles:r.renderer.info.render.triangles, memory:{...r.renderer.info.memory}, source:r.exact?'manufacturer':'procedural' };
    });
    assert.ok(Number.isFinite(status.fit) && status.fit>0, `${name}: finite fit`);
    report.push({name,...status}); console.log(JSON.stringify({name,...status}));
  }
  if (!baseline) {
    // Exercise repeated creation/teardown in one page, including cached bands.
    for (const name of ['Galaxy Watch 8','Pixel Watch 4','Galaxy Watch 8','Surface Laptop 15"','iPhone 17','Pixel 10 Pro XL','Dell XPS 16']) {
      await page.evaluate(() => { window.__retired = window.__deviceRuntime; });
      await update({mockup:name,cameraState:pose(name,'Angled')}); await ready();
      const memory = await page.evaluate(() => window.__retired.renderer.info.memory);
      assert.equal(memory.geometries,0,`${name}: previous geometry buffers released`);
      // Three r185 keeps one internal 1px fallback sampler in its uniform
      // module. It is not a device image or application-owned render target.
      assert.ok(memory.textures<=1,`${name}: previous device textures/render targets released (${memory.textures})`);
    }
    // Change device again while a manufacturer model is still downloading.
    let release, requested;
    const gate=new Promise(r=>{release=r;});
    const pending=new Promise(r=>{requested=r;});
    await page.route('**/pixel-10-pro-optimized.glb', async route=>{requested();await gate;await route.continue();});
    await update({mockup:'Pixel 10 Pro'}); await pending;
    await update({mockup:'Surface Laptop 15"'}); await ready(); release();
    await page.waitForTimeout(1600);
    assert.equal(await page.evaluate(()=>window.__deviceRuntime.exact),false,'late model does not replace the selected device');
    assert.equal(await page.locator('canvas').getAttribute('data-renderer-status'),'ready');
    const media = await page.evaluate(async()=>{
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#176bc2';ctx.fillRect(0,0,320,180);
      const image=canvas.toDataURL();
      const stream=canvas.captureStream(12),recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];
      const stopped=new Promise(resolve=>{recorder.onstop=resolve;});
      recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
      for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#f06a21':'#176bc2';ctx.fillRect(0,0,160,180);await new Promise(r=>setTimeout(r,80));}
      recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
      return {image,video:URL.createObjectURL(new Blob(chunks,{type:'video/webm'}))};
    });
    await update({media:{src:media.image,type:'image/png'}});await ready();await page.waitForTimeout(180);
    assert.equal(await page.evaluate(()=>window.__deviceRuntime.screenTexture.image.naturalWidth),320);
    assert.ok(await page.evaluate(()=>window.__deviceRuntime.screenTexture.userData.coverSignature),'new image gets fitted');
    await update({media:{src:media.video,type:'video/webm'}});await ready();await page.waitForTimeout(400);
    assert.ok(await page.evaluate(()=>window.__deviceRuntime.screenTexture.image.currentTime>0),'video screen advances');
    await page.evaluate(()=>{window.__retiredVideo=window.__deviceRuntime.screenTexture.image;});
    await update({media:null});await ready();
    assert.ok(await page.evaluate(()=>window.__retiredVideo.paused&&!window.__retiredVideo.getAttribute('src')),'old video stops on replacement');
    await page.evaluate(url=>URL.revokeObjectURL(url),media.video);
    await page.waitForTimeout(300);
    const idleFrame=await page.evaluate(()=>window.__deviceRuntime.renderer.info.render.frame);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>window.__deviceRuntime.renderer.info.render.frame),idleFrame,'static devices stop submitting GPU frames');
    await update({cameraState:{...pose('Surface Laptop 15"','Angled'),panX:.1}});
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(frame=>window.__deviceRuntime.renderer.info.render.frame>frame,idleFrame),'camera changes redraw an idle device');
    await page.setViewportSize({width:390,height:740});
    await page.waitForTimeout(250);
    assert.ok(await page.evaluate(()=>Number.isFinite(Number(window.__deviceRuntime.renderer.domElement.dataset.openmockFit))));
    await page.screenshot({path:`${outDir}/mobile-surface.png`});
    console.log('PASS repeated switches, GPU cleanup, delayed load, image/video replacement, and responsive resize');
  }
  await writeFile(`${outDir}/report.json`, JSON.stringify({report,logs},null,2));
  if(!baseline)assert.deepEqual(logs,[],'no browser warnings or errors');
} finally { await browser.close(); }
