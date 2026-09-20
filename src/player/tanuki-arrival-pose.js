import * as THREE from 'three';

// Model-specific adapter. A future avatar only needs to implement this pose API.
export function createTanukiArrivalPose(player) {
  const head=player.model.getObjectByName('Head_CTRL_頭全体'),arm=player.model.getObjectByName('Arm_CTRL_腕_R');
  const limbs=[['Arm_CTRL_腕_L',1],['Arm_CTRL_腕_R',-1],['Leg_CTRL_脚_L',-1],['Leg_CTRL_脚_R',1]].map(([name,sign])=>{const object=player.model.getObjectByName(name);if(!object)throw Error('到着演出の関節が見つかりません: '+name);return {object,sign,rest:object.quaternion.clone()};});
  if(!head||!arm)throw Error('到着演出の頭・腕が見つかりません');
  const headRest=head.quaternion.clone(),armRest=arm.quaternion.clone(),baseY=player.tanuki.position.y;
  const axis=new THREE.Vector3(1,0,0);let phase=0;
  return {
    get heading(){return player.tanuki.rotation.y;},
    set heading(value){player.tanuki.rotation.y=value;},
    eyePosition(){return head.getWorldPosition(new THREE.Vector3());},
    lookUp(angle){head.quaternion.copy(headRest).multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));},
    wave(time,strength){arm.quaternion.copy(armRest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-.2*strength,0,(1.95+.22*Math.sin(time*12))*strength)));},
    walk(dt){phase+=dt*Math.PI*2*1.6;for(const l of limbs)l.object.quaternion.copy(l.rest).multiply(new THREE.Quaternion().setFromAxisAngle(axis,Math.sin(phase)*.22*l.sign));player.tanuki.position.y=baseY+Math.sin(phase)**2*.025;},
    rest(){phase=0;head.quaternion.copy(headRest);for(const l of limbs)l.object.quaternion.copy(l.rest);player.tanuki.position.y=baseY;},
  };
}
