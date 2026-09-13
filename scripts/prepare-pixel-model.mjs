import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Use the pinned asset toolchain without adding it to the app's dependencies.
const cli = process.env.PATH.split(delimiter).map(dir=>join(dir,'gltf-transform')).find(existsSync);
if (!process.argv.includes('--toolchain')) {
  execFileSync('npx',['--yes','--package','@gltf-transform/cli@4.3.0','--','node',fileURLToPath(import.meta.url),'--toolchain'],{stdio:'inherit'});
} else {
  if(!cli)throw new Error('The pinned glTF Transform toolchain was not found.');
  const requireTool = createRequire(realpathSync(cli));
  const { NodeIO } = await import(requireTool.resolve('@gltf-transform/core'));
  const { ALL_EXTENSIONS } = await import(requireTool.resolve('@gltf-transform/extensions'));
  const { simplifyPrimitive, draco } = await import(requireTool.resolve('@gltf-transform/functions'));
  const { MeshoptSimplifier } = await import(requireTool.resolve('meshoptimizer'));
  const { default: draco3d } = await import(requireTool.resolve('draco3dgltf'));
  await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder':await draco3d.createDecoderModule(),
    'draco3d.encoder':await draco3d.createEncoderModule(),
  });
  const document = await io.read('public/assets/devices/pixel-10-pro.glb');
  // Only the measured outliers: keep all camera/sensor/logo details intact.
  for (const node of document.getRoot().listNodes()) {
    if (!['speakerGrills','alumPolished'].includes(node.getName())) continue;
    for (const primitive of node.getMesh().listPrimitives()) {
      simplifyPrimitive(primitive,{
        simplifier:MeshoptSimplifier,ratio:.2,lockBorder:true,
        error:node.getName()==='alumPolished'?.00001:.0001,
      });
    }
  }
  // Preserve fine reflections and near-coplanar hardware layers. No image
  // changes; the source stays available as the manufacturer's reference.
  await document.transform(draco({quantizePosition:20,quantizeNormal:14,quantizeTexcoord:16,decodeSpeed:5,encodeSpeed:5}));
  await io.write('public/assets/devices/pixel-10-pro-optimized.glb',document);
  console.log('Prepared Pixel 10 Pro/XL with selective geometry reduction.');
}
