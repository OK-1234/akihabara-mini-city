import * as THREE from 'three';

// Arrival only: the existing building and player meshes are never replaced.
export function createSupportArrival(scene,player,camera,building,transformation) {
  const pose=player.createArrivalPose();
  const body=building.getObjectByName('support:body'),halfWidth=body.geometry.parameters.width/2;
  const entranceZ=building.position.z-(body.geometry.parameters.depth-1.5)/2;
  const mouth=new THREE.Vector3(building.position.x-halfWidth-.65,0,entranceZ);
  const inside=new THREE.Vector3(building.position.x+.65,0,entranceZ);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#fffffff5';
  for(const [x,y,r] of [[130,109,52],[204,70,55],[290,65,55],[368,108,54],[255,125,86],[159,203,15],[139,231,8]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  ctx.textAlign='center';ctx.fillStyle='#bd3c39';ctx.font='bold 76px sans-serif';ctx.fillText('!',256,108);ctx.fillStyle='#344047';ctx.font='bold 33px sans-serif';ctx.fillText('E：入る',256,157);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const prompt=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));prompt.scale.set(2.25,1.125,1);prompt.renderOrder=20;prompt.visible=false;scene.add(prompt);
  const fade=document.createElement('div');fade.setAttribute('aria-hidden','true');fade.style.cssText='position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:1000';document.body.append(fade);
  let state='idle',time=0,startHeading=0,lookHeading=0,tilt=0,waypoint=0;
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  const turn=(from,to,t)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*smooth(t);
  function eligible(){return transformation.mode==='walk'&&player.position.x>=mouth.x-.65&&player.position.x<=mouth.x+.25&&Math.abs(player.position.z-entranceZ)<.65;}
  window.addEventListener('keydown',event=>{
    if(state!=='idle'){
      if(['KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();}return;
    }
    if(event.code!=='KeyE'||event.repeat||!eligible())return;
    event.preventDefault();event.stopImmediatePropagation();player.setWalking(false);prompt.visible=false;
    startHeading=pose.heading;
    const eye=pose.eyePosition(),direction=camera.position.clone().sub(eye);
    lookHeading=Math.atan2(direction.x,direction.z);tilt=-Math.atan2(direction.y,Math.hypot(direction.x,direction.z));
    state='face';time=0;fade.style.pointerEvents='auto';
  },true);
  function next(value){state=value;time=0;}
  function update(dt){
    prompt.visible=state==='idle'&&eligible();prompt.position.set(player.position.x,player.height+.65,player.position.z);
    if(state==='idle'||state==='done')return;
    time+=dt;
    if(state==='face'){
      pose.heading=turn(startHeading,lookHeading,time/.55);
      pose.lookUp(0);
      if(time>=.55)next('look');
    } else if(state==='look'){
      pose.lookUp(tilt*smooth(time/.65));
      if(time>=.65)next('eye-contact');
    } else if(state==='eye-contact'){
      if(time>=.2)next('wave');
    } else if(state==='wave'){
      const strength=smooth(time/.2)*smooth((1.5-time)/.25);
      pose.wave(time,strength);
      if(time>=1.5){startHeading=pose.heading;next('turn');}
    } else if(state==='turn'){
      const destination=mouth.clone().sub(player.position);const yaw=Math.hypot(destination.x,destination.z)>.1?Math.atan2(destination.x,destination.z):Math.PI/2;
      pose.heading=turn(startHeading,yaw,time/.45);
      pose.lookUp(tilt*(1-smooth(time/.45)));
      if(time>=.45){pose.rest();next('walk');}
    } else if(state==='walk'){
      const target=waypoint===0?mouth:inside,delta=target.clone().sub(player.position);delta.y=0;const distance=delta.length();
      if(distance<.015){if(waypoint===0)waypoint=1;else {pose.rest();next('hidden');}return;}
      delta.normalize();const yaw=Math.atan2(delta.x,delta.z);pose.heading=turn(pose.heading,yaw,Math.min(1,dt*8));
      player.setPosition(player.position.clone().addScaledVector(delta,Math.min(distance,1.15*dt)));
      pose.walk(dt);
    } else if(state==='hidden'){if(time>=.4)next('fade');}
    else if(state==='fade'){fade.style.opacity=String(smooth(time/1.8));if(time>=1.8){fade.style.opacity='1';next('done');}}
  }
  return {update,prompt,fade,mouth,inside,get active(){return state!=='idle';},get state(){return state;}};
}
