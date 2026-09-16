import * as THREE from 'three';
import {createBuildingVolumes} from './building-volumes.js';
import {createConfirmedViaduct} from './confirmed-viaduct.js';
import {X_EDGES,Z_EDGES} from './world.js';

// K17:M18: two existing general buildings, with a 1.0-unit passage between.
// Heights and footprints stay at the previous volume-test dimensions.
export const BLOCK_BUILDINGS=[
  {id:'general-east-west',x:X_EDGES[9]+1.3,z:Z_EDGES[13]-2.6,color:0xc9d4d6},
  {id:'general-east-east',x:X_EDGES[12]-1.3,z:Z_EDGES[13]-2.2,color:0xd9cebd},
];
export async function createStreetBlock(scene) {
  const volumes=await createBuildingVolumes(scene);
  const viaduct=createConfirmedViaduct(scene,volumes.deck);
  const details=new THREE.Group();details.name='K17_M18-street-details';scene.add(details);
  const mats=new Map();
  function box(w,h,d,x,y,z,color,name) {
    if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mats.get(color));
    m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;details.add(m);return m;
  }
  for(const b of BLOCK_BUILDINGS) {
    const mesh=volumes.group.getObjectByName(b.id);
    mesh.position.x=b.x;mesh.position.z=b.z;mesh.material.color.setHex(b.color);
    const {width,height,depth}=mesh.geometry.parameters;
    const front=b.z+depth/2;
    box(.75,1.55,.035,b.x,.775,front+.02,0x52656b,`${b.id}:entrance`);
    box(1.1,.1,.32,b.x,1.65,front+.14,0xb1b8b6,`${b.id}:canopy`);
    box(width+.06,.13,depth+.06,b.x,height-.08,b.z,0xb7bfbd,`${b.id}:roof-edge`);
  }
  // Quiet rear pocket and narrow passage; all objects remain inside the plot.
  box(.94,.012,6.4,7,.009,16.3,0xdadbd4,'passage');
  const bench=new THREE.Group();bench.name='bench';details.add(bench);
  const addBench=(w,h,d,x,y,z,c)=>{const m=box(w,h,d,x,y,z,c,'bench-part');bench.attach(m);};
  addBench(1.25,.12,.42,5.35,.48,13.85,0xa58c72);
  addBench(1.25,.42,.09,5.35,.75,13.63,0xa58c72);
  for(const x of [4.9,5.8])addBench(.09,.44,.32,x,.22,13.85,0x647179);
  for(const [i,x,z] of [[1,4.45,14.6],[2,8.9,13.8]]) {
    box(.58,.30,.58,x,.15,z,0x9baba5,`planter-${i}`);
    box(.46,.43,.46,x,.48,z,0x90ae83,`plant-${i}`);
  }
  box(.24,.1,.24,9.65,.05,19.22,0x7b8588,'lamp-base');
  box(.085,2.25,.085,9.65,1.175,19.22,0x647780,'lamp-post');
  box(.38,.17,.29,9.53,2.34,19.22,0xe9dfbf,'lamp-head');
  return {volumes,viaduct,details};
}
