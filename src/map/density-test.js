import * as THREE from 'three';
import {createStreetBlock} from './street-block.js';

// Dedicated test only: west D10:G14 plot replaces UDX/support temporarily.
// Width/depth are local building axes; rotations change street-facing sides.
export const DENSITY_BUILDINGS=[
  {id:'north-west',x:-8.25,z:-10.15,width:2.4,depth:3.4,height:4.6,turn:1,color:0xc9d4d6},
  {id:'north-east',x:-3.75,z:-10.15,width:2.4,depth:3.4,height:5.4,turn:-1,color:0xd9cebd},
  {id:'middle-west',x:-8.3,z:-6.15,width:2.4,depth:3.2,height:4.2,turn:1,color:0xc8cecf},
  {id:'middle-east',x:-3.4,z:-6.45,width:2.4,depth:3.4,height:5.0,turn:0,color:0xc5d1c8},
  {id:'south-west',x:-8.1,z:-2.75,width:2.4,depth:3.2,height:5.0,turn:1,color:0xd9cebd},
  {id:'south-east',x:-3.7,z:-2.75,width:2.4,depth:3.4,height:4.6,turn:-1,color:0xc9d4d6},
];
// Clear outer loop plus a narrower internal route, also used by verification.
export const DENSITY_LOOP=[[-6,-.8],[-10.6,-.8],[-10.6,-12.1],[-1.4,-12.1],[-1.4,-.8],[-6,-.8]];
export const DENSITY_INNER=[[-6,-.8],[-6,-8.15],[-10.6,-8.15],[-10.6,-12.1],[-6,-12.1],[-6,-.8]];

export async function createDensityTest(scene) {
  const base=await createStreetBlock(scene);
  // Restore the earlier east volumes; decoration belongs only to this test block.
  for(const [id,x,z] of [['general-east-west',5.5,16.95],['general-east-east',8.5,16.95]]) {
    const m=base.volumes.group.getObjectByName(id);m.position.x=x;m.position.z=z;m.material.color.setHex(0xcbd0d4);
  }
  base.volumes.group.getObjectByName('udx').removeFromParent();
  base.volumes.group.getObjectByName('support').removeFromParent();
  const root=new THREE.Group();root.name='west-density-test';scene.add(root);
  const boxes=[];
  const entrance=base.details.getObjectByName('general-east-west:entrance');
  const canopy=base.details.getObjectByName('general-east-west:canopy');
  for(const b of DENSITY_BUILDINGS) {
    const group=new THREE.Group();group.name=b.id;group.position.set(b.x,0,b.z);group.rotation.y=b.turn*Math.PI/2;
    const body=new THREE.Mesh(new THREE.BoxGeometry(b.width,b.height,b.depth),new THREE.MeshStandardMaterial({color:b.color,roughness:.9}));
    body.position.y=b.height/2;body.castShadow=true;body.receiveShadow=true;group.add(body);
    // Reuse the previous simple entrance at exactly the same size.
    for(const [template,y,z] of [[entrance,.775,b.depth/2+.02],[canopy,1.65,b.depth/2+.14]]) {
      const part=template.clone();part.position.set(0,y,z);group.add(part);
    }
    root.add(group);boxes.push(body);
  }
  // A small pocket in the wider middle passage. No added decoration elsewhere.
  const bench=base.details.getObjectByName('bench').clone(true);
  bench.position.set(-5.35,0,-13.85);
  const benchPlacement=new THREE.Group();benchPlacement.position.set(-5,0,-6.6);benchPlacement.rotation.y=Math.PI/2;
  benchPlacement.add(bench);root.add(benchPlacement);
  for(const [name,x,z] of [['planter-1',-5.05,-5.15],['plant-1',-5.05,-5.15],['planter-2',-2.7,-8.55],['plant-2',-2.7,-8.55]]) {
    const m=base.details.getObjectByName(name).clone();m.position.x=x;m.position.z=z;root.add(m);
  }
  for(const name of ['lamp-base','lamp-post','lamp-head']) {
    const m=base.details.getObjectByName(name).clone();m.position.x-=14.7;m.position.z-=26.77;root.add(m);
  }
  base.details.removeFromParent();
  function spawnPlayer(player) {
    const actor=scene.children.find(o=>o.getObjectByName('Tanuki_茶タヌキ全体'));
    actor.position.x+=-6-player.position.x;actor.position.z+=-.8-player.position.z;player.update(0);
  }
  return {base,root,boxes,spawnPlayer};
}
