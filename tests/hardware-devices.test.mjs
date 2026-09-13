import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { displayGeometry, shellGeometry } from '../src/hardwareDevices.js';

test('thin shells retain their specified face radius and physical thickness',()=>{
  for(const [w,h,d,r] of [[71.6,147.6,7.8,10.8],[208.5,326.3,5.1,9.8],[127.6,176.7,7.8,6.8],[200,114,13.9,4.8],[329,239,12.8,9.6]]){
    const geo=shellGeometry(w,h,d,r,0.4);geo.computeBoundingBox();
    const size=geo.boundingBox.getSize(new Vector3());
    assert.ok(Math.abs(size.x-w)<0.001 && Math.abs(size.y-h)<0.001 && Math.abs(size.z-d)<0.001,'millimetre envelope stays exact');
    const p=geo.attributes.position;
    // A thin rounded box used to fill these corner regions even when its
    // requested face radius was much larger than half its thickness.
    for(let i=0;i<p.count;i++)assert.ok(!(Math.abs(p.getX(i))>w/2-r*0.2 && Math.abs(p.getY(i))>h/2-r*0.2),'rounded corners must not contain square corner vertices');
    geo.dispose();
  }
});

test('rounded displays map the complete image exactly once across the face',()=>{
  const switchWidth=7.9*25.4*16/Math.hypot(16,9);
  for(const [w,h,r] of [[66.2,143.2,8.9],[197.3,316,6.6],[107.1,142.4,0.65],[159.7,99.8,1.7],[switchWidth,switchWidth*9/16,0.7],[317,211.3,6.1],[350.4,219,3.9],[148,90,3]]){
    const geo=displayGeometry(w,h,r),p=geo.attributes.position,uv=geo.attributes.uv;
    let minU=1,maxU=0,minV=1,maxV=0;
    for(let i=0;i<p.count;i++){
      const u=uv.getX(i),v=uv.getY(i);
      assert.ok(Number.isFinite(u) && Number.isFinite(v));
      assert.ok(Math.abs(u-(p.getX(i)/w+0.5))<1e-6);
      assert.ok(Math.abs(v-(p.getY(i)/h+0.5))<1e-6);
      minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v);
    }
    assert.ok(Math.abs(minU)<1e-6 && Math.abs(minV)<1e-6 && Math.abs(maxU-1)<1e-6 && Math.abs(maxV-1)<1e-6);geo.dispose();
  }
});
