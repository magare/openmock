import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// All dimensions in this module are millimetres. Keep face-plane corner
// radii independent of shell thickness; RoundedBoxGeometry clamps them.
const COLORS = {
  White: [0xe6e7e6, 0xbac0c2], Black: [0x15191b, 0x303638],
  'Mist Blue': [0xa9c0cf, 0x849fae], Sage: [0xb1c4b7, 0x8caa98],
  Lavender: [0xc7bad5, 0xa99aba],
};
const metal = (color, roughness = 0.32) => new THREE.MeshPhysicalMaterial({ color, metalness: 0.85, roughness, clearcoat: 0.12 });
const plastic = (color, roughness = 0.58) => new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness, clearcoat: 0.04 });
const optical = (color = 0x05070b) => new THREE.MeshPhysicalMaterial({ color, metalness: 0.05, roughness: 0.12, clearcoat: 1, envMapIntensity: 0.35 });

export function roundedOutline(width, height, radius) {
  const x = width / 2, y = height / 2, r = Math.min(radius, x, y);
  const s = new THREE.Shape();
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y); s.absarc(x - r, -y + r, r, -Math.PI / 2, 0);
  s.lineTo(x, y - r); s.absarc(x - r, y - r, r, 0, Math.PI / 2);
  s.lineTo(-x + r, y); s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-x, -y + r); s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

export function shellGeometry(width, height, depth, radius, bevel = 0.3) {
  const b = Math.min(bevel, depth * 0.45, radius * 0.45);
  const geo = new THREE.ExtrudeGeometry(roundedOutline(width - b * 2, height - b * 2, radius - b), {
    depth: depth - 2 * b, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b,
    bevelSegments: 4, curveSegments: radius < 3 ? 6 : 20,
  });
  geo.translate(0, 0, -(depth - 2 * b) / 2);
  return geo;
}

function shell(parent, width, height, depth, radius, material, x = 0, y = 0, z = 0, bevel = 0.3) {
  const mesh = new THREE.Mesh(shellGeometry(width, height, depth, radius, bevel), material);
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

// ShapeGeometry's default UVs are world coordinates. Normalize to [0,1]
// explicitly, otherwise the iPhone's rounded screen samples mostly an edge.
export function displayGeometry(width, height, radius) {
  const geo = new THREE.ShapeGeometry(roundedOutline(width, height, radius), 24);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / width + 0.5, pos.getY(i) / height + 0.5);
  return geo;
}

function plane(parent, width, height, radius, material, x, y, z) {
  const mesh = new THREE.Mesh(displayGeometry(width, height, radius), material);
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

function display(parent, texture, width, height, radius, x, y, z, matte = false) {
  texture.userData = { ...texture.userData, targetAspect: width / height };
  texture.colorSpace = THREE.SRGBColorSpace;
  const screen = plane(parent, width, height, radius, new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }), x, y, z);
  screen.userData.screenAspect = width / height;
  const glass = plane(parent, width, height, radius, new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: matte ? 0 : 0.025,
    roughness: matte ? 0.85 : 0.13, metalness: 0, clearcoat: matte ? 0 : 1, depthWrite: false,
  }), x, y, z + 0.025);
  glass.material.userData.openmockOpacityScale = matte ? 0 : 0.16;
  return { screen, glass };
}

function disk(parent, radius, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 64), material);
  mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

function ring(parent, radius, tube, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 64), material);
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

function label(parent, text, width, height, x, y, z, { color = '#a8abad', rear = false, font = '500 52px Arial' } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = Math.round(1024 * height / width);
  const ctx = canvas.getContext('2d');
  ctx.translate(0, canvas.height); ctx.scale(1, -1);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = font.replace(/\d+px/, `${Math.round(canvas.height * 0.65)}px`);
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * 0.97);
  const map = new THREE.CanvasTexture(canvas); map.flipY = false; map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }));
  mesh.position.set(x, y, z); if (rear) mesh.rotation.y = Math.PI; parent.add(mesh); return mesh;
}

function port(parent, width, height, x, y, z, rotation) {
  const mesh = shell(parent, width, height, 0.12, height / 2, plastic(0x080a0c), x, y, z, 0.04);
  mesh.rotation.set(...rotation); return mesh;
}

function result(group, surfaces, finishables = []) {
  group.traverse(mesh=>{
    if(mesh.isMesh && (mesh.material?.isMeshBasicMaterial || mesh.material?.transparent)) {
      mesh.userData.openmockCastShadow=false;mesh.userData.openmockReceiveShadow=false;
    }
  });
  return { group, materials: { body: null, finishables, ...surfaces } };
}

function rearLens(group, x, y, z, radius, rim) {
  disk(group, radius, 1.5, rim, x, y, z);
  disk(group, radius - 0.55, 0.25, optical(), x, y, z - 0.85);
  ring(group, radius - 0.8, 0.14, metal(0x343940, 0.22), x, y, z - 1.01);
  disk(group, radius * 0.37, 0.08, optical(0x111825), x, y, z - 1.03);
  disk(group, radius * 0.16, 0.04, optical(0x263951), x - 0.3, y + 0.3, z - 1.09);
}

export function createIPhone16(texture, finish, addAppleLogo) {
  const group = new THREE.Group();
  const [glassColor, railColor] = COLORS[finish] || COLORS.White;
  const rail = metal(railColor, 0.36), back = plastic(glassColor, 0.48);
  back.clearcoat = 0.16; back.clearcoatRoughness = 0.35;
  // Apple: 147.6 × 71.6 × 7.8; glass and rails occupy the same envelope.
  shell(group, 71.6, 147.6, 7.8, 10.8, rail, 0, 0, 0, 0.8);
  shell(group, 70.65, 146.65, 0.8, 10.45, back, 0, 0, -3.5, 0.15);
  shell(group, 70.8, 146.8, 0.45, 10.5, optical(0x080a0c), 0, 0, 3.68, 0.12);
  const surfaces = display(group, texture, 66.2, 143.2, 8.9, 0, 0, 3.96);
  plane(group, 20.5, 5.8, 2.9, new THREE.MeshBasicMaterial({color:0x020305,toneMapped:false}), 0, 67.3, 4.04);
  disk(group, 1.55, 0.06, optical(0x070d18), 6.8, 67.3, 4.1);
  // Vertical camera island, measured against Apple's white finish render.
  shell(group, 21.0, 36.0, 1.85, 10.5, rail, 23.0, 52.9, -4.65, 0.4);
  shell(group, 20.05, 35.05, 1.65, 10.025, back, 23.0, 52.9, -5.0, 0.3);
  const lensRim = metal(railColor, 0.22);
  rearLens(group, 23, 62, -6.05, 7.55, lensRim);
  rearLens(group, 23, 43.8, -6.05, 7.55, lensRim);
  disk(group, 0.65, 0.12, optical(), 17.2, 53, -5.92);
  disk(group, 2.55, 0.15, metal(0xd7d9d6, 0.4), 7.4, 53, -3.96);
  disk(group, 2.05, 0.12, plastic(0xe3ded1, 0.32), 7.4, 53, -4.08);
  if (addAppleLogo) addAppleLogo(group, 71.6, 147.6, -3.94);
  for (const [side, y, h] of [[-1,41.5,6],[-1,28.2,9.4],[-1,14.3,9.4],[1,21.4,16.7],[1,-14.8,8.2]]) {
    const button = shell(group, h, 2.4, 0.45, 1.05, side===1 && y<0 ? metal(railColor,0.52) : rail, side * 35.83, y, 0, 0.12);
    button.rotation.set(0, Math.PI / 2, Math.PI / 2);
  }
  for (const side of [-1,1]) for (const y of [-53.5,54]) {
    const antenna = shell(group, 0.8, 6.3, 0.08, 0.1, plastic(glassColor,0.7), side*35.81, y, 0,0.02);
    antenna.rotation.y = Math.PI/2;
  }
  port(group, 8.8, 2.7, 0, -73.76, 0, [Math.PI/2,0,0]);
  for (const side of [-1,1]) for (let i=0;i<5;i++) {
    const hole = disk(group, 0.56, 0.09, plastic(0x15181a), side*(8+i*2), -73.78, 0);
    hole.rotation.x = 0;
  }
  // Roles use the editor's palette so existing finish controls remain live.
  return result(group, surfaces, [{material:rail,role:'metal'},{material:back,role:'body'},{material:lensRim,role:'metal'}]);
}

export function createGalaxyTab(texture, finish) {
  const group = new THREE.Group();
  const [, color] = COLORS[finish] || COLORS.White;
  const aluminum = metal(color,0.43);
  shell(group,208.5,326.3,5.1,9.8,aluminum,0,0,0,0.45);
  // Continuous anodized back, without the former raised plastic panel/S Pen.
  shell(group,207.7,325.5,0.28,9.5,aluminum,0,0,-2.46,0.06);
  shell(group,207.5,325.3,0.23,9.35,optical(0x07090b),0,0,2.48,0.05);
  const surfaces=display(group,texture,197.3,316,6.6,0,0,2.66);
  // Landscape camera is on the long edge; its notch cuts into the display.
  plane(group,6.6,11.2,4.8,new THREE.MeshBasicMaterial({color:0x030508,toneMapped:false}),97.25,0,2.74);
  disk(group,1.2,0.05,optical(0x101b24),98.3,0,2.81);
  const rim=metal(0x32373c,0.29);
  rearLens(group,87.5,146.5,-3.4,7.8,rim);
  rearLens(group,87.5,126.2,-3.4,7.8,rim);
  disk(group,1.9,0.1,plastic(0xe2ded2,0.4),87.5,108.5,-2.68);
  const branding=label(group,'SAMSUNG',29,5,-75,146,-2.68,{rear:true,color:'#82878b',font:'700 52px Arial'});
  branding.rotation.z = -Math.PI/2;
  const backSeam=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(roundedOutline(200.5,318.3,7.5).getPoints(32)),new THREE.LineBasicMaterial({color:0x727b81,transparent:true,opacity:0.35}));
  backSeam.position.z=-2.64;group.add(backSeam);
  for (const [y,h] of [[119,12],[94,23]]) {
    const button=shell(group,h,2.1,0.35,1,aluminum,104.22,y,0,0.07);
    button.rotation.set(0,Math.PI/2,Math.PI/2);
  }
  port(group,9,2.6,0,-163.14,0,[Math.PI/2,0,0]);
  for (const end of [-1,1]) for (const side of [-1,1]) for (let i=0;i<13;i++) {
    const hole=disk(group,0.47,0.07,plastic(0x202427),side*(47+i*1.8),end*163.14,0);
    hole.rotation.x=0;
  }
  for (const y of [-5,0,5]) disk(group,1,0.05,metal(0xa5a4a0),-88,y,-2.7);
  return result(group,surfaces,[{material:aluminum,role:'metal'}]);
}

export function createPaperwhite(texture) {
  const group=new THREE.Group();
  const body=plastic(0x232528,0.72), front=plastic(0x16181a,0.72);
  shell(group,127.6,176.7,7.8,6.8,body,0,0,0,1.25);
  shell(group,126.7,175.8,0.4,6.4,front,0,0,3.7,0.08);
  const surfaces=display(group,texture,107.1,142.4,0.65,0,6.7,3.94,true);
  label(group,'kindle',22,7,0,-76.5,3.96,{color:'#797b7c',font:'400 52px Arial'});
  label(group,'amazon',34,9,0,0,-3.94,{rear:true,color:'#111315',font:'700 52px Arial'});
  port(group,9,2.9,0,-88.3,0,[Math.PI/2,0,0]);
  const power=shell(group,9,2.3,0.3,1.1,plastic(0x151719),34,-88.32,0,0.1);
  power.rotation.x=Math.PI/2;
  const led=disk(group,0.45,0.08,plastic(0x577556),13,-88.35,0);led.rotation.x=0;
  return result(group,surfaces);
}

function lathe(parent, profile, material) {
  const geo=new THREE.LatheGeometry(profile.map(([r,z])=>new THREE.Vector2(r,z)),96);
  geo.rotateX(Math.PI/2);
  const mesh=new THREE.Mesh(geo,material);parent.add(mesh);return mesh;
}

// Samsung's cushion profile has continuously curved sides, unlike a square
// box with a circular dial glued on. Loft its sidewall with a soft edge roll.
function cushionGeometry(width,height,depth) {
  const count=128, rings=[[-depth/2,0.90],[-depth/2+0.6,0.96],[-depth/2+1.4,1],[depth/2-0.8,1],[depth/2,0.955]];
  const positions=[],indices=[];
  for(const [z,scale] of rings) for(let i=0;i<count;i++){
    const t=i/count*Math.PI*2,c=Math.cos(t),s=Math.sin(t),n=2.65;
    positions.push(Math.sign(c)*Math.pow(Math.abs(c),2/n)*width/2*scale,Math.sign(s)*Math.pow(Math.abs(s),2/n)*height/2*scale,z);
  }
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<count;i++){
    const a=j*count+i,b=j*count+(i+1)%count,c=b+count,d=a+count;
    indices.push(a,b,d,b,c,d);
  }
  for(const [j,reverse] of [[0,true],[rings.length-1,false]]){
    const center=positions.length/3;positions.push(0,0,rings[j][0]);
    for(let i=0;i<count;i++){const a=j*count+i,b=j*count+(i+1)%count;indices.push(center,reverse?b:a,reverse?a:b);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

// Only the four measured strap shapes are cached, on the CPU. Every device
// gets its own clone so switching/disposal cannot invalidate another watch.
const watchBandCache=new Map();
function watchBand(group,{width,radius,centerY,centerZ,start,end,holes=false,material}) {
  const cacheKey=[width,radius,centerY,centerZ,start,end,holes].join(':');
  const attach=geometry=>{
    const strap=new THREE.Mesh(geometry,material);strap.userData.openmockReceiveShadow=false;group.add(strap);return strap;
  };
  if(watchBandCache.has(cacheKey))return attach(watchBandCache.get(cacheKey).clone());
  const length=(end-start)*radius;
  const shape=roundedOutline(width,length,Math.min(3,width/8));
  if(holes)for(let s=length*0.16;s<length*0.79;s+=7){
    const hole=roundedOutline(4.2,2.7,1.25);
    const points=hole.getPoints(12).map(p=>new THREE.Vector2(p.x,p.y+s-length/2));
    shape.holes.push(new THREE.Path(points));
  }
  // Extra steps subdivide the strap along its length before bending it;
  // ShapeGeometry alone would join the endpoints with a straight chord.
  const geo=new THREE.ExtrudeGeometry(shape,{depth:2.2,bevelEnabled:true,bevelSize:0.32,bevelThickness:0.3,bevelSegments:3,curveSegments:14,steps:1});
  // Tessellate long triangles in the flat sheet so both faces follow the arc.
  const source=geo.index?geo.toNonIndexed():geo;
  const triangles=[];
  // Refine the same longest Y edge to the same 2 mm limit, without sorting
  // and copying every triangle through up to twenty whole-array passes.
  // Complete the tessellation before bending/welding to keep the band solid.
  const subdivide=(ax,ay,az,bx,by,bz,cx,cy,cz)=>{
    const ab=Math.abs(ay-by),bc=Math.abs(by-cy),ca=Math.abs(cy-ay);
    if(Math.max(ab,bc,ca)<=2){triangles.push(ax,ay,az,bx,by,bz,cx,cy,cz);return;}
    if(ab>=bc && ab>=ca){
      const mx=(ax+bx)/2,my=(ay+by)/2,mz=(az+bz)/2;
      subdivide(ax,ay,az,mx,my,mz,cx,cy,cz);subdivide(mx,my,mz,bx,by,bz,cx,cy,cz);
    }else if(bc>=ca){
      const mx=(bx+cx)/2,my=(by+cy)/2,mz=(bz+cz)/2;
      subdivide(bx,by,bz,mx,my,mz,ax,ay,az);subdivide(mx,my,mz,cx,cy,cz,ax,ay,az);
    }else{
      const mx=(cx+ax)/2,my=(cy+ay)/2,mz=(cz+az)/2;
      subdivide(cx,cy,cz,mx,my,mz,bx,by,bz);subdivide(mx,my,mz,ax,ay,az,bx,by,bz);
    }
  };
  const positions=source.attributes.position.array;
  for(let i=0;i<positions.length;i+=9)subdivide(positions[i],positions[i+1],positions[i+2],positions[i+3],positions[i+4],positions[i+5],positions[i+6],positions[i+7],positions[i+8]);
  for(let i=0;i<triangles.length;i+=3){
    const theta=start+(triangles[i+1]+length/2)/radius,r=radius+triangles[i+2]-1.1;
    triangles[i+1]=centerY+Math.sin(theta)*r;triangles[i+2]=centerZ+Math.cos(theta)*r;
  }
  const tessellated=new THREE.BufferGeometry();tessellated.setAttribute('position',new THREE.Float32BufferAttribute(triangles,3));
  const curved=mergeVertices(tessellated,0.001);curved.computeVertexNormals();tessellated.dispose();
  geo.dispose();if(source!==geo)source.dispose();
  if(watchBandCache.size===4){const oldest=watchBandCache.keys().next().value;watchBandCache.get(oldest).dispose();watchBandCache.delete(oldest);}
  watchBandCache.set(cacheKey,curved);
  return attach(curved.clone());
}

export function createAndroidWatch(texture,style) {
  const pixel=style==='pixel',group=new THREE.Group();
  const caseMaterial=metal(pixel?0xa7adaf:0x555c61,pixel?0.19:0.36);
  const bandMaterial=plastic(pixel?0x2c3032:0x353b3e,0.74);
  const radius=pixel?29.5:31,attach=pixel?19.8:22.3,theta=0.80;
  const cy=attach-Math.sin(theta)*radius,cz=-2.7-Math.cos(theta)*radius;
  const bandWidth=pixel?20:21.5;
  watchBand(group,{width:bandWidth,radius,centerY:cy,centerZ:cz,start:theta,end:Math.PI+0.40,material:bandMaterial});
  watchBand(group,{width:bandWidth,radius:radius+0.4,centerY:cy,centerZ:cz,start:Math.PI+0.17,end:Math.PI*2-theta,holes:true,material:bandMaterial});
  // A tucked strap, fastening pin and a slim keeper follow the wrist curve.
  const buckleAngle=Math.PI+0.31;
  const keeper=shell(group,bandWidth+1.5,5.0,3.8,1.0,bandMaterial,0,cy+Math.sin(buckleAngle)*(radius+1.9),cz+Math.cos(buckleAngle)*(radius+1.9),0.35);
  keeper.rotation.x=-buckleAngle;
  const fastener=disk(group,1.3,0.8,caseMaterial,0,cy+Math.sin(buckleAngle)*(radius+4.0),cz+Math.cos(buckleAngle)*(radius+4.0));
  fastener.rotation.x=Math.PI/2-buckleAngle;
  for(const sign of [-1,1]) {
    const connector=shell(group,pixel?19.2:17.2,6.8,3.6,2.0,pixel?bandMaterial:caseMaterial,0,sign*(attach-1.8),-1.9,0.5);
    connector.rotation.x=-sign*0.27;
  }
  if(pixel){
    lathe(group,[[0,-5.8],[11,-5.8],[16,-4.7],[19.5,-2.8],[20.5,-0.8],[20.5,0.7],[19.7,1.5]],caseMaterial);
    // Domed glass flows over the housing edge; a dark curved shoulder
    // frames the active display without a raised metal bezel.
    lathe(group,[[20.45,0.4],[20.5,0.9],[20.2,2],[19.4,3.45],[18.1,4.55],[16.95,4.95]],optical(0x050609));
  }else{
    group.add(new THREE.Mesh(cushionGeometry(43.7,46,7.3),caseMaterial));
    disk(group,20.45,0.65,metal(0x363d41,0.28),0,0,3.9);
    disk(group,19.85,0.32,optical(),0,0,4.33);
    ring(group,20.13,0.18,metal(0x6c7274,0.29),0,0,4.55);
  }
  const screenRadius=pixel?17.0:18.65,faceZ=pixel?4.97:4.56;
  texture.userData={...texture.userData,targetAspect:1};texture.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.Mesh(new THREE.CircleGeometry(screenRadius,96),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
  screen.position.z=faceZ;screen.userData.screenAspect=1;group.add(screen);
  const glass=new THREE.Mesh(new THREE.CircleGeometry(screenRadius,96),new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:0.022,roughness:0.13,metalness:0,clearcoat:1,depthWrite:false}));
  glass.position.z=faceZ+0.03;glass.material.userData.openmockOpacityScale=0.12;group.add(glass);
  if(pixel){
    const crown=disk(group,2.9,3.6,caseMaterial,21.2,0,-0.25);crown.rotation.set(0,0,Math.PI/2);
    for(let i=0;i<36;i++){
      const t=i/36*Math.PI*2;
      const ridge=shell(group,3.0,0.18,0.22,0.08,metal(0x7c8488,0.32),21.2,2.92*Math.cos(t),-0.25+2.92*Math.sin(t),0.025);
      ridge.rotation.x=t;
    }
    const button=shell(group,7.2,1.8,0.4,0.8,caseMaterial,18.7,8,-1.2,0.1);button.rotation.set(0,Math.PI/2,Math.PI/2);
    port(group,7,1.1,-20.35,0,-1.2,[0,Math.PI/2,Math.PI/2]);
  }else{
    for(const y of [-8.6,8.6]){
      const button=shell(group,8.4,2.65,1.1,1.25,metal(0x858b8e,0.32),21.5,y,-0.1,0.24);button.rotation.set(0,Math.PI/2,Math.PI/2);
    }
    const accent=shell(group,5.6,0.42,0.1,0.18,plastic(0xb36542),22.12,8.6,0,0.03);accent.rotation.set(0,Math.PI/2,Math.PI/2);
    port(group,8,0.85,-21.8,0,-0.2,[0,Math.PI/2,Math.PI/2]);
    const mic=disk(group,0.5,0.06,plastic(0x090c0e),21.9,0,0);mic.rotation.set(0,0,Math.PI/2);
  }
  // Black sensor disc, electrodes and distinct optical apertures on the back.
  disk(group,pixel?13.5:16.5,1.4,optical(0x111519),0,0,-5.2);
  ring(group,pixel?11.4:14.2,0.45,metal(0x747b7d,0.26),0,0,-6.0);
  disk(group,9.2,0.12,optical(0x151a1e),0,0,-6.03);
  for(const [x,y,r] of [[0,0,2.7],[-4.8,3.7,1.8],[4.8,3.7,1.8],[-4.8,-3.7,1.6],[4.8,-3.7,1.6]]){
    disk(group,r,0.06,optical(0x07100f),x,y,-6.14);
    disk(group,r*0.5,0.025,optical(0x133129),x,y,-6.2);
  }
  for(const x of [-9.7,9.7]) disk(group,1.5,0.12,metal(0xaba994,0.34),x,0,-6.07);
  return result(group,{screen,glass});
}

function shapeSolid(parent,shape,depth,material,x,y,z,bevel=0.5) {
  const geo=new THREE.ExtrudeGeometry(shape,{depth:depth-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:5,curveSegments:24});
  geo.translate(0,0,-(depth-2*bevel)/2);
  const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}

export function createSwitch2(texture) {
  const group = new THREE.Group();
  const graphite = plastic(0x25282b, 0.68), back = plastic(0x292d30, 0.72);
  const keys = plastic(0x191c1f, 0.65), rubber = plastic(0x222629, 0.86);
  // Nintendo's 272 × 116 mm assembled envelope. The 200 mm tablet and
  // 36 mm exposed controller faces are measured from the official renders.
  shell(group, 200, 114, 13.9, 4.8, graphite, 0, 0, 0, 1.25);
  shell(group, 198.2, 112.5, 0.4, 3.9, back, 0, 0, -6.79, 0.08);
  shell(group, 197.8, 111.6, 0.28, 2.2, plastic(0x040608,0.38), 0, 0, 6.84, 0.06);
  const screenWidth = 7.9 * 25.4 * 16 / Math.hypot(16, 9);
  const surfaces = display(group, texture, screenWidth, screenWidth * 9 / 16, 0.7, 0, 0, 7.03);

  // Inner edges are flat against the magnetic connector. Only the outer
  // shoulders/bottom corners sweep around into the grip, unlike a capsule.
  const controllerOutline = new THREE.Shape();
  controllerOutline.moveTo(100.8, -57.2);
  controllerOutline.lineTo(106, -57.2);
  controllerOutline.bezierCurveTo(126, -57.2, 135.2, -44, 135.2, -25);
  controllerOutline.lineTo(135.2, 25);
  controllerOutline.bezierCurveTo(135.2, 44, 126, 57.2, 106, 57.2);
  controllerOutline.lineTo(100.8, 57.2); controllerOutline.closePath();

  const stick = (x, y, accent) => {
    disk(group, 9.4, 0.65, keys, x, y, 7.12);
    ring(group, 9.1, 0.37, accent, x, y, 7.6);
    disk(group, 8.1, 1.4, rubber, x, y, 7.9);
    disk(group, 3.4, 5.4, keys, x, y, 10.7);
    disk(group, 7.8, 2.7, rubber, x, y, 14.4);
    ring(group, 6.8, 0.7, rubber, x, y, 15.7);
    disk(group, 6.2, 0.16, plastic(0x2c3033, 0.91), x, y, 15.64);
    for (const angle of [0, Math.PI/2, Math.PI, Math.PI*1.5]) {
      const notch = shell(group, 0.6, 1.8, 0.08, 0.2, keys, x+Math.sin(angle)*7, y+Math.cos(angle)*7, 16.04, 0.015);
      notch.rotation.z = -angle;
    }
  };
  const button = (x, y, text) => {
    disk(group, 4.15, 0.35, plastic(0x101315), x, y, 7.21);
    disk(group, 3.8, 1.45, keys, x, y, 7.9);
    if (text) label(group, text, 4.4, 4.4, x, y, 8.69, {color:'#949b9f'});
  };
  for (const side of [-1, 1]) {
    const controller = new THREE.Group();
    if (side < 0) controller.rotation.y = Math.PI;
    // Rotate only the outline meshes to mirror their silhouette; controls
    // stay on the same front plane for both Joy-Con controllers.
    group.add(controller);
    shapeSolid(controller, controllerOutline, 13.9, graphite, 0, 0, 0, 0.8);
    const seam = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(controllerOutline.getPoints(48)),new THREE.LineBasicMaterial({color:0x121619}));
    seam.position.z = side < 0 ? 5.25 : -5.25; controller.add(seam);
    const accent = plastic(side < 0 ? 0x67bdd7 : 0xf17a63, 0.54);
    shell(group, 0.75, 97, 8.8, 0.3, accent, side*100.2, 0, 0, 0.1);
    stick(side*117.2, side < 0 ? 28.5 : -1.0, accent);

    // Shoulder keys follow the rounded outline and meet the shell. They
    // extend toward the rear, rather than floating above the controllers.
    const shoulder = new THREE.Shape();
    shoulder.moveTo(103.4, 56.9);
    shoulder.bezierCurveTo(122, 56.9, 132.7, 45, 134.4, 31);
    shoulder.lineTo(132.5, 31);
    shoulder.bezierCurveTo(130.6, 44.4, 120.3, 54.5, 103.4, 54.6);
    shoulder.closePath();
    const bumper = shapeSolid(group, shoulder, 4.3, keys, 0, 0, 1.0, 0.25);
    if(side < 0) bumper.rotation.y = Math.PI;
    const trigger = shell(group, 25, 25, 8.4, 10.5, keys, side*117.8, 41, -10.7, 1.1);
    trigger.rotation.z = -side * 0.12;
    label(group, side < 0 ? 'ZL' : 'ZR', 7, 3, side*117.8, 41, -15.04, {rear:true,color:'#5e666b'});
    const release = disk(group, 4.3, 0.7, keys, side*105.7, 22.5, -7.1);
    release.name = side < 0 ? 'joycon-left-release' : 'joycon-right-release';
    for(const y of [-43,45])disk(group, 1.25, 0.1, keys, side*108.1, y, -7.12);
  }
  // Four separate direction buttons, not a cross-shaped D-pad.
  for(const [dx,dy,angle] of [[0,8.6,0],[-8.6,0,Math.PI/2],[8.6,0,-Math.PI/2],[0,-8.6,Math.PI]]) {
    button(-117.2+dx, -1+dy);
    const arrow = new THREE.Mesh(new THREE.CircleGeometry(1.3,3,Math.PI/2),new THREE.MeshBasicMaterial({color:0x090d10,toneMapped:false}));
    arrow.position.set(-117.2+dx,-1+dy,8.73);arrow.rotation.z=angle;group.add(arrow);
  }
  for(const [text,dx,dy] of [['X',0,8.6],['Y',-8.6,0],['A',8.6,0],['B',0,-8.6]])button(117.2+dx,28.5+dy,text);
  shell(group, 6.0, 1.65, 0.7, 0.35, keys, -106.7, 44.2, 7.3, 0.12);
  shell(group, 6.0, 1.65, 0.7, 0.35, keys, 106.7, 44.2, 7.3, 0.12);
  shell(group, 1.65, 6.0, 0.7, 0.35, keys, 106.7, 44.2, 7.3, 0.12);
  shell(group, 6.4, 6.4, 0.65, 0.8, keys, -110.1, -22.5, 7.3, 0.13);
  ring(group, 2.1, 0.15, plastic(0x343b3f), -110.1, -22.5, 7.69);
  button(110.1, -22.5, '⌂');
  shell(group, 6.4, 6.4, 0.65, 0.8, keys, 110.1, -34.7, 7.3, 0.13);
  label(group, 'C', 4.5, 4.5, 110.1, -34.7, 7.7, {color:'#080c0f'});

  // A single open U-shaped stand lies flush in its recessed rear outline.
  // The previous solid rectangle incorrectly covered the whole lower back.
  const stand = new THREE.Shape();
  stand.moveTo(-93.3,-8);stand.lineTo(-85.8,-8);stand.lineTo(-85.8,-44.5);
  stand.quadraticCurveTo(-85.8,-47.5,-82.8,-47.5);stand.lineTo(82.8,-47.5);
  stand.quadraticCurveTo(85.8,-47.5,85.8,-44.5);stand.lineTo(85.8,-8);stand.lineTo(93.3,-8);
  stand.lineTo(93.3,-49);stand.quadraticCurveTo(93.3,-55.1,87.2,-55.1);
  stand.lineTo(-87.2,-55.1);stand.quadraticCurveTo(-93.3,-55.1,-93.3,-49);stand.closePath();
  const kickstand = shapeSolid(group, stand, 0.95, plastic(0x353a3e,0.68), 0, 0, -7.05, 0.16);
  kickstand.name = 'switch2-u-kickstand';
  for(const x of [-89.5,89.5])shell(group, 7.5, 1.3, 0.2, 0.5, keys, x, -8.2, -7.59, 0.03);
  const wordmark = new THREE.TextureLoader().load(`${import.meta.env?.BASE_URL || '/'}hardware/switch2-wordmark.svg`);
  wordmark.colorSpace = THREE.SRGBColorSpace;
  const brand = plane(group,47,47*322/360,0,new THREE.MeshBasicMaterial({
    map:wordmark,color:0x6c757b,transparent:true,depthWrite:false,toneMapped:false,
  }),0,4,-7.05);
  brand.rotation.y = Math.PI;

  // Top: power / volume, three exhaust openings, USB-C, audio and game card.
  for(const [x,w] of [[-82,7.3],[-67,15.2]]){
    const key = shell(group,w,3.6,0.45,1.6,keys,x,57.01,0,0.1);key.rotation.x=-Math.PI/2;
  }
  for(const x of [-12,5,22]) {
    port(group,15.3,4.7,x,57.03,0,[Math.PI/2,0,0]);
    for(let i=-5;i<=5;i++){
      const fin=shell(group,0.35,4.3,0.08,0.12,graphite,x+i*1.18,57.12,0,0.015);fin.rotation.x=-Math.PI/2;
    }
  }
  port(group,9,3,39,57.05,0,[Math.PI/2,0,0]);
  const jack=disk(group,1.85,0.1,keys,52,57.05,0);jack.rotation.x=0;
  const card=shell(group,25.6,10.5,0.16,2.1,back,72,57.02,0,0.035);card.rotation.x=-Math.PI/2;
  const cardText=label(group,'GAME CARD',18,2.3,72,57.13,0,{color:'#13191d'});cardText.rotation.x=-Math.PI/2;
  port(group,0.75,2.1,90,57.03,0,[Math.PI/2,0,0]);
  port(group,9.0,3.0,0,-57.04,0,[Math.PI/2,0,0]);
  for(const side of [-1,1]) {
    port(group,39,3.4,side*41,-57.02,-1.8,[Math.PI/2,0,0]);
    port(group,16,1.8,side*77,-57.06,4.2,[Math.PI/2,0,0]);
  }
  return result(group, surfaces);
}

export function createSteamDeck(texture) {
  const group=new THREE.Group(),body=plastic(0x202225,0.67),back=plastic(0x1d1f22,0.73),buttons=plastic(0x101214,0.62);
  // 298 × 117 mm outline. Grips swell behind this perimeter instead of
  // hanging below it like two controller handles.
  const outline=roundedOutline(296.4,115.4,24);
  shapeSolid(group,outline,25,body,0,0,0,0.8);
  for(const side of [-1,1]){
    const grip=shell(group,62,107,32,24,back,side*117,-2,-9.3,3.7);
    grip.rotation.y=side*0.08;
  }
  shell(group,297.6,116.6,4.8,25,body,0,0,11.0,0.9);
  shell(group,175.8,107.8,0.55,2.4,optical(0x080a0d),0,0,13.23,0.12);
  const surfaces=display(group,texture,159.7,99.8,1.7,0,0,13.56);
  const stick=(x,y)=>{
    disk(group,13.0,1.5,plastic(0x101214,0.5),x,y,13.8);
    disk(group,10.7,1.6,plastic(0x373a3e,0.57),x,y,14.8);
    disk(group,5.0,5.2,plastic(0x16181b),x,y,17.4);
    disk(group,8.1,2.4,plastic(0x292b2e,0.82),x,y,20.8);
    ring(group,7.0,0.8,plastic(0x151719,0.89),x,y,22.0);
    disk(group,6.5,0.15,plastic(0x35373a,0.82),x,y,21.6);
  };
  stick(-102,34);stick(102,34);
  const dpad=new THREE.Shape();
  const points=[[-3.5,-10], [3.5,-10],[3.5,-3.5],[10,-3.5],[10,3.5],[3.5,3.5],[3.5,10],[-3.5,10],[-3.5,3.5],[-10,3.5],[-10,-3.5],[-3.5,-3.5]];
  dpad.moveTo(...points[0]);points.slice(1).forEach(p=>dpad.lineTo(...p));dpad.closePath();
  shapeSolid(group,dpad,3.4,buttons,-130,39,14.3,0.7);
  for(const [letter,dx,dy] of [['Y',0,8.7],['B',8.7,0],['A',0,-8.7],['X',-8.7,0]]){
    disk(group,4.6,3.5,optical(0x151719),130+dx,39+dy,14.2);
    label(group,letter,4.5,4.5,130+dx,39+dy,16.03,{color:'#bbbfc3'});
  }
  for(const side of [-1,1]){
    shell(group,34.2,33.8,0.3,4.8,plastic(0x090b0d),side*104,-4,13.43,0.06);
    shell(group,32.4,32.1,0.4,4.1,plastic(0x292b2e,0.87),side*104,-4,13.6,0.1);
    shell(group,15.7,6.3,1.3,3.0,buttons,side*99,-32,13.8,0.24);
    label(group,side<0?'STEAM':'•••',side<0?11:7,2.8,side*99,-32,14.52,{color:'#a7aaae'});
    shell(group,8.4,3.8,0.8,1.8,buttons,side*113.5,50.5,13.55,0.15);
    label(group,side<0?'▱':'≡',5,2.4,side*113.5,50.5,14.02,{color:'#969b9d'});
    for(let row=0;row<3;row++)for(let col=0;col<4;col++){
      shell(group,2.9,0.65,0.1,0.3,plastic(0x090b0c),side*98+(col-1.5)*3.8,-41-row*2.2,13.45,0.02);
    }
    const bumper=shell(group,42,6.8,10,3.1,buttons,side*121,55.8,-0.5,0.6);
    bumper.rotation.y=side*0.1;
    const trigger=shell(group,29,8,17,3.9,back,side*127,51.5,-12,0.9);
    trigger.rotation.x=-0.23;
    for(const y of [0,-24]){
      const paddle=shell(group,23,13,1.2,4.1,buttons,side*111,y,-25.5,0.25);
      paddle.rotation.y=side*0.08;paddle.rotation.z=-side*0.12;
    }
  }
  // Top exhaust, USB-C, audio jack, volume rocker and the power button.
  for(let i=0;i<17;i++)port(group,1.8,8,8+i*2.5,58.35,-0.8,[Math.PI/2,0,0]);
  port(group,9,3.2,61,58.42,0,[Math.PI/2,0,0]);
  const jack=disk(group,1.9,0.1,buttons,-55,58.42,0);jack.rotation.x=0;
  for(const x of [-92,-82]){const key=shell(group,7,3.3,0.7,1.5,buttons,x,58.42,0,0.15);key.rotation.x=Math.PI/2;}
  const power=shell(group,10,3.8,0.9,1.8,buttons,83,58.42,0,0.18);power.rotation.x=Math.PI/2;
  shell(group,69,35,0.15,2.5,plastic(0x101214),-31,4,-12.62,0.025);
  for(let i=0;i<12;i++)shell(group,62,1.0,0.08,0.4,plastic(0x36393c),-31,-11+i*2.6,-12.76,0.02);
  label(group,'VALVE',17,4,16,-4,-12.71,{rear:true,color:'#34383b',font:'700 52px Arial'});
  return result(group,surfaces);
}

function keyboard(parent,{width,xps,dark}) {
  const rows=[
    [['esc',1],...Array.from({length:12},(_,i)=>['F'+(i+1),1]),['del',1]],
    [['`',1],...Array.from('1234567890',c=>[c,1]),['−',1],['=',1],['delete',2]],
    [['tab',1.5],...Array.from('QWERTYUIOP',c=>[c,1]),['[',1],[']',1],['\\',1.5]],
    [['caps',1.8],...Array.from('ASDFGHJKL',c=>[c,1]),[';',1],["'",1],['enter',2.2]],
    [['shift',2.3],...Array.from('ZXCVBNM',c=>[c,1]),[',',1],['.',1],['/',1],['shift',2.7]],
    [['ctrl',1.2],['fn',1.0],['⊞',1.1],['alt',1.1],['',5.8],['alt',1.1],['ctrl',1.1],['←',1],['↑ ↓',1.1],['→',1.0]],
  ];
  const plateColor=xps?0x32373a:dark?0x292d30:0x737b81;
  const cap=plastic(plateColor,xps?0.57:0.61);
  const gap=xps?0.7:1.75;
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
  const ctx=canvas.getContext('2d'),canvasHeight=121;
  ctx.translate(0,canvas.height);ctx.scale(1,-1);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffff';
  rows.forEach((row,rowIndex)=>{
    const total=row.reduce((sum,[,u])=>sum+u,0),unit=width/total;
    let cursor=-width/2;
    const y=49-rowIndex*18.0;
    row.forEach(([text,u])=>{
      const w=u*unit-gap,h=rowIndex===0?9.0:xps?17.1:15.8,x=cursor+u*unit/2;
      if(!(xps && rowIndex===0)){
        shell(parent,w+0.7,h+0.6,0.10,xps?0.6:1.9,plastic(0x131719),x,y,0.12,0.015);
        shell(parent,w,h,0.65,xps?0.55:1.75,cap,x,y,0.39,xps?0.09:0.15);
      }
      ctx.font=`${text.length>3?16:22}px Arial`;
      ctx.fillText(text,(x/width+0.5)*canvas.width,(0.5-y/canvasHeight)*canvas.height,w/width*canvas.width*0.88);
      cursor+=u*unit;
    });
  });
  const map=new THREE.CanvasTexture(canvas);map.flipY=false;map.colorSpace=THREE.SRGBColorSpace;
  const legends=new THREE.Mesh(new THREE.PlaneGeometry(width,canvasHeight),new THREE.MeshBasicMaterial({map,color:0xc2c6c9,transparent:true,depthWrite:false,toneMapped:false}));
  // Canvas y is down; reverse the vertical text placement into keyboard space.
  legends.rotation.z=0;legends.position.z=0.78;parent.add(legends);
  return {cap,legend:legends.material};
}

function perforations(parent,width,height,x,y,z,color) {
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.fillStyle=color;
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    ctx.beginPath();ctx.arc(col*8+4,row*8+4,1.2,0,Math.PI*2);ctx.fill();
  }
  const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(width/9,height/9);map.flipY=false;
  return plane(parent,width,height,1,new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}),x,y,z);
}

export function createWindowsLaptop(texture,finish,kind) {
  const xps=kind==='xps',group=new THREE.Group();
  // Surface Laptop 15 (7th edition): 329 × 239 × 18.3 mm.
  // XPS 16 (9640): 358.18 × 240.05 × 18.70 mm.
  const w=xps?358.18:329,d=xps?240.05:239,baseThickness=xps?13.4:12.8;
  const dark=xps||finish==='Black';
  const aluminum=metal(xps?0x4e5357:dark?0x363b3f:0xbfc6c9,0.40);
  const base=shell(group,w,d,baseThickness,xps?7.4:9.6,aluminum,0,-baseThickness/2,0,xps?1.0:1.5);
  base.rotation.x=-Math.PI/2;
  // Lower seam and inset underside share the exact lid/base footprint.
  const undersideMaterial=metal(dark?0x41474b:0xa5adb1,0.48);
  const underside=shell(group,w-2.7,d-2.7,0.9,xps?6.8:8.8,undersideMaterial,0,-baseThickness+0.1,0,0.25);underside.rotation.x=-Math.PI/2;
  const deck=new THREE.Group();deck.rotation.x=-Math.PI/2;deck.position.y=0.08;group.add(deck);
  let trackpadMaterial;
  if(xps){
    // Preserve the glass palmrest but make the 148 × 90 mm active touchpad
    // legible in the mockup, per user feedback. A shallow tonal inset keeps
    // this from reading as a separate raised plastic slab.
    shell(deck,w-2.4,104,0.18,5.0,plastic(0x4a4f53,0.43),0,-66,0.02,0.04);
    plane(deck,149.0,91.0,3.4,plastic(0x30373c,0.5),0,-66,0.18);
    const touchpad=plane(deck,148,90,3.0,plastic(0x535b60,0.36),0,-66,0.22);
    touchpad.name='xps-haptic-trackpad';
    shell(deck,294,13,0.16,0.7,plastic(0x41474a,0.33),0,96,0.03,0.025);
    for(const side of [-1,1])perforations(deck,15.5,108,side*165,41,0.3,'#171b1e');
  }else{
    shell(deck,119.4,80.4,0.15,5,plastic(dark?0x161a1d:0x888f94),0,-69,0.03,0.03);
    trackpadMaterial=metal(dark?0x30363a:0x929da5,0.44);
    shell(deck,118.7,79.7,0.16,4.7,trackpadMaterial,0,-69,0.12,0.025);
  }
  const keys=new THREE.Group();keys.position.set(0,43,0);deck.add(keys);
  const keyMaterials=keyboard(keys,{width:xps?294:277,xps,dark});
  const lidHeight=xps?231:230.5,lidDepth=xps?5.3:5.5;
  const hinge=new THREE.Group();hinge.position.set(0,0.9,-d/2+4.0);hinge.rotation.x=-THREE.MathUtils.degToRad(13);group.add(hinge);
  const lid=new THREE.Group();lid.position.y=lidHeight/2;hinge.add(lid);
  shell(lid,w,lidHeight,lidDepth,xps?7.4:9.5,aluminum,0,0,0,0.65);
  shell(lid,w-1.3,lidHeight-1.3,0.26,xps?6.8:8.8,optical(0x080b0d),0,0,lidDepth/2-0.03,0.06);
  const screenWidth=xps?350.4:317,screenHeight=xps?219:211.3;
  // Give the display/glass enough separation for the renderer's depth
  // precision after millimetre geometry is normalized into stage units.
  const surfaces=display(lid,texture,screenWidth,screenHeight,xps?3.9:6.1,0,xps?-0.1:0.3,lidDepth/2+0.35);
  surfaces.glass.position.z += 0.1;
  for(const [x,r] of [[0,1.05],[-5,0.6],[5,0.72]])disk(lid,r,0.04,optical(x===0?0x122233:0x121619),x,lidHeight/2-(xps?2.8:4.2),lidDepth/2+0.18);
  if(xps){
    label(lid,'DELL',25,9,0,0,-lidDepth/2-0.03,{rear:true,color:'#858c90',font:'700 52px Arial'});
    ring(lid,17,0.45,metal(0x80888c,0.32),0,0,-lidDepth/2-0.06);
  }else{
    for(const x of [-5.0,5.0])for(const y of [-5.0,5.0]){
      const pane=plane(lid,9.3,9.3,0,metal(dark?0x70797e:0x7a858b,0.2),x,y,-lidDepth/2-0.03);pane.rotation.y=Math.PI;
    }
  }
  const hingeBar=new THREE.Mesh(new THREE.CylinderGeometry(2.7,2.7,w*0.86,48),metal(dark?0x2b3034:0x949fa6,0.36));
  hingeBar.rotation.z=Math.PI/2;hingeBar.position.set(0,-1.2,-d/2+3);group.add(hingeBar);
  // Physical ports sit on the sidewalls, not on top of the keyboard deck.
  for(const [side,z,type] of xps?[[-1,-83,'c'],[-1,-61,'c'],[1,-83,'c'],[1,-46,'sd']]:[[-1,-76,'c'],[-1,-57,'c'],[-1,-32,'a'],[1,-30,'connect'],[1,-87,'sd']]){
    port(group,type==='a'?12:type==='connect'?27:type==='sd'?13:9,type==='a'?4.8:type==='sd'?1.0:2.9,side*(w/2-0.07),-5.9,z,[0,Math.PI/2,0]);
  }
  const audioJack=disk(group,1.8,0.1,plastic(0x0c1013),xps?w/2:-w/2,-5.9,xps?-24:-12);audioJack.rotation.set(0,0,Math.PI/2);
  for(const side of [-1,1])for(const z of [-d/2+20,d/2-20]){
    const foot=shell(group,xps?56:22,6.5,1.3,3.2,plastic(0x272c2f,0.9),side*(w/2-43),-baseThickness-0.7,z,0.25);foot.rotation.x=Math.PI/2;
  }
  for(let i=0;i<45;i++)port(group,1.2,4.8,(i-22)*4.8,-7.0,-d/2+0.04,[0,0,0]);
  // XPS stays graphite; Surface responds to the available metal finishes.
  const laptop=result(group,surfaces);
  // These materials have independent live finish behavior even when their
  // initial colors happen to match a static part in a render batch.
  for(const material of [aluminum,undersideMaterial,trackpadMaterial,keyMaterials.cap])if(material)material.userData.openmockDynamic=true;
  if(!xps)laptop.materials.updateFinish=(next)=>{
    const black=next==='Black',color=(COLORS[next]||COLORS.White)[1];
    aluminum.color.setHex(color);
    undersideMaterial.color.setHex(color).multiplyScalar(0.85);
    trackpadMaterial.color.setHex(black?0x30363a:color).multiplyScalar(black?1:0.68);
    keyMaterials.cap.color.setHex(black?0x292d30:0x737b81);
  };
  return laptop;
}
