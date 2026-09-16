import * as THREE from 'three';
import {BUILDING_VOLUMES,createBuildingVolumes} from './building-volumes.js';
import {createConfirmedViaduct} from './confirmed-viaduct.js';
import {decorateCityBuildings} from './clean-buildings-test.js';
import {applyCityAppearance,addCityGreenery} from './city-appearance.js';

// Original Excel landmark plots, with the already calibrated world spacing.
// No density-test placement or temporary landmark substitution is used here.
export const CITY_BUILDINGS=[
  ...BUILDING_VOLUMES.map((b,i)=>({...b,tone:i%2?'cool':'white',
    height:b.id==='support'?6.2:b.id==='udx'?9:b.height,
    greenRoof:false,
    windowLevels:b.id==='support'?[2.75,4.05,5.35]:[2.75,3.95],
    roadSide:b.id==='yodobashi'?1:-1})),
  {id:'general-northwest',width:3,depth:1.6,height:3.8,x:-4.5,z:-10.55,tone:'white',windowLevels:[2.75]},
  {id:'outer-west-north',width:3.4,depth:1.4,height:4.2,x:-15.6,z:-8,turn:1,tone:'white'},
  {id:'outer-west-south',width:3.8,depth:1.4,height:4.8,x:-15.6,z:15,turn:1,tone:'cool'},
  {id:'outer-east-north',width:3.2,depth:1.4,height:3.8,x:15.6,z:-8,turn:-1,tone:'cool',windowLevels:[2.75]},
  {id:'outer-east-south',width:3.6,depth:1.4,height:4.6,x:15.6,z:15,turn:-1,tone:'white'},
  {id:'outer-north-west',width:3.2,depth:1.4,height:3.8,x:-6.6,z:-17.15,tone:'white',windowLevels:[2.75]},
  {id:'outer-north-east',width:3.6,depth:1.4,height:4.4,x:6.6,z:-17.15,tone:'cool'},
  {id:'outer-south-west',width:3.4,depth:1.4,height:3.6,x:-8,z:25.15,turn:2,tone:'cool',windowLevels:[2.65]},
  {id:'outer-south-east',width:3.8,depth:1.4,height:4.2,x:8,z:25.15,turn:2,tone:'white'},
  {id:'general-east-rear',width:4,depth:2.8,height:4.2,x:7,z:11.75,tone:'white'},
  {id:'general-west-inner',width:2.6,depth:1.2,height:3.4,x:-4.5,z:-8.5,tone:'cool',windowLevels:[2.65]},
  {id:'general-west-slim',width:2.4,depth:1.3,height:4.4,x:-9,z:-4.5,turn:1,tone:'white'},
  ...[-1,1].flatMap(side=>[
    {id:`outer-${side}-corner`,width:3,depth:1.4,height:3.5,x:side*15.6,z:-14,turn:-side,tone:'white',windowLevels:[2.65]},
    {id:`outer-${side}-middle`,width:3.2,depth:1.4,height:5.1,x:side*15.6,z:-2,turn:-side,tone:'cool'},
    {id:`outer-${side}-rail`,width:3.4,depth:1.4,height:4.1,x:side*15.6,z:3.7,turn:-side,tone:'white'},
    {id:`outer-${side}-south`,width:3,depth:1.4,height:3.8,x:side*15.6,z:21,turn:-side,tone:'cool',windowLevels:[2.75]},
    {id:`north-infill-${side}`,width:2,depth:1.4,height:3.2,x:side*3.4,z:-17.15,tone:'white',windowLevels:[2.65]},
  ]),
  {id:'south-infill-west',width:3.2,depth:1.4,height:4.8,x:-3.2,z:25.15,turn:2,tone:'white'},
  {id:'south-infill-east',width:2.8,depth:1.4,height:3.6,x:3.1,z:25.15,turn:2,tone:'cool',windowLevels:[2.65]},
];

export async function createCity(scene) {
  const volumes=await createBuildingVolumes(scene);
  const viaduct=createConfirmedViaduct(scene,volumes.deck);
  const root=volumes.group;root.name='akihabara-city-buildings';
  const boxes=[];
  for(const b of CITY_BUILDINGS) {
    let body=root.getObjectByName(b.id);
    if(body)body.removeFromParent();
    else body=new THREE.Mesh(new THREE.BoxGeometry(b.width,b.height,b.depth),new THREE.MeshStandardMaterial());
    if(body.geometry.parameters.height!==b.height)body.geometry=new THREE.BoxGeometry(b.width,b.height,b.depth);
    const group=new THREE.Group();group.name=b.id;group.position.set(b.x,0,b.z);group.rotation.y=(b.turn??0)*Math.PI/2;
    body.name=b.id+':body';body.position.set(0,b.height/2,0);body.castShadow=true;body.receiveShadow=true;
    group.add(body);root.add(group);boxes.push(body);
  }
  decorateCityBuildings({root,boxes},CITY_BUILDINGS);
  applyCityAppearance(root,boxes,CITY_BUILDINGS,scene);
  const greenery=addCityGreenery(scene);
  // Keep the existing station footprint, but retire the orange test-layer tint.
  const world=scene.getObjectByName('Excel_B6_O20'),station=world.getObjectByName('G16:J17 駅');
  const outline=world.children.find(o=>o.isLineSegments&&o.position.equals(station.position));
  outline?.removeFromParent();station.material=new THREE.MeshStandardMaterial({color:0xdce3e8,roughness:1});
  // Landmark plot colours were allocation markers, not the adopted streetscape.
  const paving=new THREE.MeshStandardMaterial({color:0xd3d6d4,roughness:1});
  for(const object of world.children)if(/:(supportPlot|udxPlot|yodobashiPlot)$/.test(object.name))object.material=paving;
  return {root,boxes,viaduct,volumes,greenery};
}
