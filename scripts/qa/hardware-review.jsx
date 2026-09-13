import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreeStage } from '../../src/ThreeStage.jsx';
import { devicePoseConfig } from '../../src/cameraInteraction.js';

const catalog = ['iPhone 16', 'Galaxy Tab S11 Ultra', 'Kindle Paperwhite', 'Galaxy Watch 8', 'Pixel Watch 4', 'Steam Deck', 'Nintendo Switch 2', 'Surface Laptop 15"', 'Dell XPS 16', 'iPhone 17'];
const requested = new URLSearchParams(location.search).getAll('device');
const devices = requested.length ? catalog.filter(name => requested.includes(name)) : catalog;
const noop = () => {};
const style = document.createElement('style');
style.textContent = `*{box-sizing:border-box}body{margin:0;background:#e9e9e7;color:#252629;font:14px system-ui}header{padding:18px 24px;display:flex;gap:12px;align-items:center;position:sticky;top:0;background:#f8f8f6;z-index:2}header strong{margin-right:auto}button,select{padding:8px 14px;border:1px solid #bbb;border-radius:6px;background:white}button[aria-pressed=true]{background:#262729;color:white}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:#d4d5d2}article{background:radial-gradient(ellipse at 50% 40%,#fafaf8,#e4e5e3);min-width:0}h2{font-size:13px;margin:0;padding:14px 20px;font-weight:500}.stage{height:350px;position:relative}.three-stage-canvas{display:block;width:100%;height:100%}`;
document.head.append(style);
if (devices.length < 3) style.textContent += `main{grid-template-columns:repeat(${devices.length || 1},minmax(0,1fr))}.stage{height:500px}`;
function Review() {
  const [view, setView] = useState('Angled');
  const [finish, setFinish] = useState('White');
  return <><header><strong>Hardware review · physical proportions</strong>{['Front','Angled','Back','Side'].map(v => <button key={v} aria-pressed={view===v} onClick={()=>setView(v)}>{v}</button>)}<select aria-label="Finish" value={finish} onChange={e=>setFinish(e.target.value)}>{['White','Black','Mist Blue'].map(v=><option key={v}>{v}</option>)}</select></header><main>{devices.map(name=>{
    const config = devicePoseConfig(name, 'Manual');
    const yaw = view==='Front' ? 0 : view==='Back' ? 160 : view==='Side' ? 78 : -25;
    const xAxis = yaw/config.yawSign;
    const camera = {xAxis,yAxis:view==='Front'?0:view==='Back'?-8:14,zAxis:xAxis*config.rollFactor,fov:24,zoom:1.9,panX:0,panY:0};
    return <article key={name}><h2>{name}</h2><div className="stage"><ThreeStage mockup={name} cameraState={camera} cameraPreset="Manual" finish={finish} lighting="Studio Soft" reflection={{amount:0.5,roughness:0.25}} onStatusChange={noop}/></div>{requested.length>0 && name==='Nintendo Switch 2' && <details><summary>Official Nintendo references</summary><img alt="Official Joy-Con 2 controller layout" src="/evidence/qa/hardware-realism/references/switch2-joycon.jpg" style={{width:'100%'}}/><img alt="Official Switch 2 wordmark" src="/hardware/switch2-wordmark.svg" style={{width:'100%',background:'#292d30'}}/></details>}</article>;
  })}</main></>;
}
const root=createRoot(document.getElementById('root'));
root.render(<Review/>);
if(import.meta.hot) import.meta.hot.dispose(()=>{root.unmount();style.remove();});
