import * as THREE from 'three';

// Opening progression reuses the existing avatar pose adapter and ordinary camera rig.
export function createOpening(player,rig,station,train) {
  const pose=player.createArrivalPose(),spawn=player.position.clone();
  // Capture the actual pre-opening model orientation, rather than inventing a new heading.
  const spawnRotation=player.tanuki.quaternion.clone(),exitRotation=new THREE.Quaternion();
  const body=station.getObjectByName('station:body');
  const entrance=new THREE.Vector3(station.position.x,0,station.position.z+body.geometry.parameters.depth/2);
  const inside=entrance.clone().add(new THREE.Vector3(0,0,-.8));
  const mouth=entrance.clone().add(new THREE.Vector3(0,0,.75));
  const startX=train.max,anchor=new THREE.Vector3(startX,0,train.root.position.z);
  const stationAnchor=anchor.clone();stationAnchor.x=0;
  let state='train',time=0,waypoint=0;
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  player.setWalking(false);player.setVisible(false);player.setPosition(inside);
  train.root.position.x=startX;rig.follow(anchor);
  function block(event){if(state!=='done'){event.preventDefault();event.stopImmediatePropagation();}}
  window.addEventListener('keydown',block,true);window.addEventListener('keyup',block,true);
  function next(value){state=value;time=0;}
  function update(dt){
    if(state==='done')return;
    time+=dt;
    if(state==='train'){
      // Constant-feeling arrival followed by a short, soft stop at the line intersection.
      const t=Math.min(time/5,1),u=Math.max(0,t-.65),distance=(t-u*u/.7)/.825;
      const progress=distance;train.root.position.x=THREE.MathUtils.lerp(startX,0,progress);
      anchor.set(train.root.position.x,0,train.root.position.z);rig.follow(anchor);
      if(t===1)next('pause');
    }else if(state==='pause'){
      if(time>=.6)next('pan');
    }else if(state==='pan'){
      anchor.lerpVectors(stationAnchor,entrance,smooth(time/1.15));rig.follow(anchor);
      if(time>=1.15){player.setVisible(true);pose.heading=0;next('walk');}
    }else if(state==='walk'){
      const target=waypoint===0?mouth:spawn,delta=target.clone().sub(player.position);delta.y=0;
      const distance=delta.length(),step=Math.min(distance,1.65*dt);
      if(distance>1e-6){pose.heading=Math.atan2(delta.x,delta.z);player.setPosition(player.position.clone().addScaledVector(delta,step/distance));pose.walk(dt);}
      anchor.lerpVectors(entrance,spawn,smooth(time/2));rig.follow(anchor);
      if(distance<=step+.00001){if(waypoint===0)waypoint=1;else {pose.rest();player.setPosition(spawn);exitRotation.copy(player.tanuki.quaternion);next('settle');}}
    }else if(state==='settle'){
      player.tanuki.quaternion.slerpQuaternions(exitRotation,spawnRotation,smooth(time/.3));
      anchor.lerpVectors(anchor,spawn,1-Math.exp(-12*dt));rig.follow(anchor);
      if(time>=.3){player.tanuki.quaternion.copy(spawnRotation);rig.follow(spawn);train.resume(-1);player.setWalking(true);next('done');window.removeEventListener('keydown',block,true);window.removeEventListener('keyup',block,true);}
    }
  }
  return {update,spawn,inside,entrance,get active(){return state!=='done';},get state(){return state;}};
}

