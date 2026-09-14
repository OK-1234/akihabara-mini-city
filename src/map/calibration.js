import * as THREE from 'three';
import { cellCenter, X_EDGES, Z_EDGES, ROAD_WIDTH, CARRIAGEWAY_WIDTH, ELEVATION } from './world.js';

// Calibration dimensions in game units; independent of the unchanged player.
export const CAR = Object.freeze({length:3.4,width:1.3,height:1.6});
export const BUILDING = Object.freeze({width:4,depth:4,height:6,floorHeight:2,doorWidth:1.1,doorHeight:1.85});
export const TRAIN = Object.freeze({length:7.5,width:2.2,height:3.4});

export function createCalibration(scene) {
  const root=new THREE.Group();root.name='scale-calibration';scene.add(root);
  const materials=new Map();
  function box(group,w,h,d,x,y,z,color) {
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials.get(color));
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  // One parked car, aligned with the near lane; a continuous lane stays free.
  const car=new THREE.Group();car.name='calibration-car';root.add(car);
  car.position.set(cellCenter(9,13).x,0,Z_EDGES[13]+ROAD_WIDTH/2-CARRIAGEWAY_WIDTH/4);
  const {length:l,width:w,height:h}=CAR;
  box(car,l,h*.38,w,0,h*.39,0,0xc4654c);
  box(car,l*.52,h*.42,w*.88,-l*.04,h*.79,0,0xc4654c);
  for(const side of [-1,1]) {
    box(car,l*.42,h*.25,.014,-l*.04,h*.81,side*w*.443,0x455b67);
    for(const end of [-1,1])box(car,l*.18,h*.2,w*.12,end*l*.3,h*.1,side*w*.44,0x343b41);
  }
  // One three-storey box building on the K:L general-building plot, south door.
  const building=new THREE.Group();building.name='calibration-building';root.add(building);
  const b=BUILDING;
  building.position.set((X_EDGES[9]+X_EDGES[11])/2,0,Z_EDGES[13]-b.depth/2-.5);
  box(building,b.width,b.height,b.depth,0,b.height/2,0,0xc8b9a4);
  box(building,b.doorWidth,b.doorHeight,.025,0,b.doorHeight/2,b.depth/2+.013,0x455b67);
  for(let floor=0;floor<3;floor++) {
    const y=floor*b.floorHeight+1.25;
    for(const side of [-1,1]) box(building,.7,.85,.025,side*1.3,y,b.depth/2+.014,0x728f9d);
    for(const z of [-1,1])box(building,.025,.85,.7,-b.width/2-.014,y,z,0x728f9d);
    if(floor>0)box(building,b.width+.02,.045,b.depth+.02,0,floor*b.floorHeight,0,0xe6ddcf);
  }
  // One stationary carriage on the east horizontal viaduct, with room either side.
  const train=new THREE.Group();train.name='calibration-train';root.add(train);
  const t=TRAIN;
  train.position.set((X_EDGES[9]+X_EDGES[14])/2,ELEVATION,cellCenter(9,10).z);
  box(train,t.length,t.height*.82,t.width,0,t.height*.59,0,0xe4e8e4);
  box(train,t.length*.9,t.height*.18,t.width*.75,0,t.height*.09,0,0x4f575e);
  for(const side of [-1,1]) {
    box(train,t.length,.22,.02,0,t.height*.46,side*(t.width/2+.011),0x6b9775);
    for(let i=-2;i<=2;i++)box(train,.8,.7,.025,i*1.3,t.height*.7,side*(t.width/2+.015),0x557383);
  }
  return root;
}
