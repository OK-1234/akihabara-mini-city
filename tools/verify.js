import * as THREE from 'three';
import {createWalking} from '../src/player/walking.js';
import {createCamera} from '../src/camera.js';
import {createWorld,constrainPosition,cellCenter,groundType,ELEVATION,DECK_THICKNESS,WIDTH,DEPTH,EDGE_MARGIN,ROAD_WIDTH,VIADUCT_WIDTH,SEA_EXTENSION} from '../src/map/world.js';
import {createPlayer,PLAYER_SCALE} from '../src/player/player.js';
import {layout} from '../src/map/layout.js';
import {createCalibration,CAR,BUILDING,TRAIN} from '../src/map/calibration.js';
import {SIDEWALK_WIDTH,CARRIAGEWAY_WIDTH,ROW_DEPTHS} from '../src/map/world.js';
const results=[];
function check(value,label){if(!value)throw new Error(label);results.push('PASS '+label);}
const near=(a,b)=>Math.abs(a-b)<1e-6;
try{
  const rig=createCamera(), scene=new THREE.Scene(), world=createWorld(scene);
  check(layout.length===15&&layout.every(row=>row.length===14),'14 × 15 cells');
  check(layout[0].every(x=>x==='sea')&&layout[1].every(x=>x==='beach'),'sea above beach');
  check(layout[12][4]==='fountainReserve'&&!world.children.some(x=>/fountain/.test(x.name)&&x.position.y>0),'F18 empty ground');
  const decks=world.children.filter(x=>/高架|駅/.test(x.name));
  check(decks.length===4&&decks.every(x=>near(x.position.y+DECK_THICKNESS/2,ELEVATION)),'all elevated surfaces at one height');
  check([6,7].every(c=>groundType(c,3)==='road'&&groundType(c,9)==='road')&&[1,12].every(c=>groundType(c,10)==='road'),'roads continue beneath elevated layer');
  const model=new THREE.Group(),tanuki=new THREE.Group();tanuki.name='Tanuki_茶タヌキ全体';model.add(tanuki);
  for(const name of ['Arm_CTRL_腕_L','Arm_CTRL_腕_R','Leg_CTRL_脚_L','Leg_CTRL_脚_R']){const limb=new THREE.Group();limb.name=name;tanuki.add(limb);}
  const walking=createWalking(model,rig.camera);
  const key=(type,key,repeat=false)=>window.dispatchEvent(new KeyboardEvent(type,{key,repeat}));
  const clear=()=>window.dispatchEvent(new Event('blur'));
  const distance=()=>Math.hypot(tanuki.position.x,tanuki.position.z);
  const reset=()=>{clear();tanuki.position.set(0,0,0);};
  for(const arrow of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight']){
    reset();key('keydown',arrow);walking.update(1);check(near(distance(),3),arrow+' walk speed 3.0');
    key('keyup',arrow);key('keydown',arrow);const before=tanuki.position.clone();walking.update(1);check(near(Math.hypot(tanuki.position.x-before.x,tanuki.position.z-before.z),4.8),arrow+' dash speed 4.8');
    key('keyup',arrow);const stopped=tanuki.position.clone();walking.update(1);check(tanuki.position.equals(stopped),arrow+' release stops');
  }
  reset();key('keydown','ArrowUp');key('keydown','ArrowUp',true);walking.update(1);check(near(distance(),3),'key repeat does not dash');
  reset();key('keydown','ArrowUp');key('keyup','ArrowUp');await new Promise(r=>setTimeout(r,280));key('keydown','ArrowUp');walking.update(1);check(near(distance(),3),'250ms timeout');
  reset();key('keydown','ArrowUp');key('keydown','ArrowRight');walking.update(1);check(near(distance(),3)&&near(tanuki.position.x,0)&&tanuki.position.z>0,'last direction wins without diagonal');
  key('keyup','ArrowRight');const before=tanuki.position.clone();walking.update(1);check(tanuki.position.x>before.x&&near(tanuki.position.z,before.z),'release restores held direction');
  clear();const stopped=tanuki.position.clone();walking.update(1);check(tanuki.position.equals(stopped)&&tanuki.children.every(x=>x.quaternion.equals(new THREE.Quaternion())),'blur stops and restores limbs');
  // Traverse from plaza to every non-sea cell in small steps, including road,
  // station underside and beach; the only constraints are the outer perimeter.
  for(let r=1;r<15;r++)for(let c=0;c<14;c++){
    const p=cellCenter(7,12),target=cellCenter(c,r),step=target.clone().sub(p).multiplyScalar(1/100);
    for(let i=0;i<100;i++){p.add(step);constrainPosition(p);}
    if(p.distanceTo(target)>1e-6)throw new Error('unreachable '+c+','+r);
    rig.follow(p);rig.resize(1000,700);const projected=new THREE.Vector3(p.x,.5,p.z).project(rig.camera);
    if(Math.abs(projected.x)>.001||Math.abs(projected.y)>.001)throw new Error('camera loses player');
  }
  check(true,'all 196 land cells reachable; camera keeps player centered');
  const edge=new THREE.Vector3(-100,0,-100);constrainPosition(edge);check(near(edge.x,-WIDTH/2+EDGE_MARGIN)&&near(edge.z,-DEPTH/2+2+EDGE_MARGIN),'west/sea boundary');
  edge.set(100,0,100);constrainPosition(edge);check(near(edge.x,WIDTH/2-EDGE_MARGIN)&&near(edge.z,DEPTH/2-EDGE_MARGIN),'east/south boundary');
  reset();key('keydown','ArrowUp');key('keyup','ArrowUp');key('keydown','ArrowUp');key('keydown','ArrowRight');key('keyup','ArrowUp');walking.update(1);check(near(distance(),4.8),'dash retained across direction change and original key release');
  key('keyup','ArrowRight');tanuki.position.set(0,0,0);key('keydown','ArrowRight');walking.update(1);check(near(distance(),3),'all keys released resets dash and next press walks');
  for(const [arrow,sx,sy] of [['ArrowUp',1,1],['ArrowDown',-1,-1],['ArrowLeft',-1,1],['ArrowRight',1,-1]]){
    reset();key('keydown',arrow);walking.update(1);rig.follow(new THREE.Vector3());
    const origin=new THREE.Vector3().project(rig.camera),p=new THREE.Vector3(tanuki.position.x,0,tanuki.position.z).project(rig.camera);
    check((p.x-origin.x)*sx>0&&(p.y-origin.y)*sy>0,arrow+' requested screen diagonal');
  }
  clear();
  check(near(decks[0].geometry.parameters.width,VIADUCT_WIDTH)&&decks.slice(1,3).every(d=>near(d.geometry.parameters.depth,VIADUCT_WIDTH)),'equal vertical/horizontal viaduct width');
  check(near(ROAD_WIDTH,4.6)&&world.getObjectByName('sea:extension-north').geometry.parameters.depth===SEA_EXTENSION,'widened road and unchanged sea extension');
  check(near(SIDEWALK_WIDTH,.85)&&near(CARRIAGEWAY_WIDTH,2.9),'sidewalk / two lanes / sidewalk dimensions');
  check(ROW_DEPTHS[12]===6.5&&ROW_DEPTHS[1]===6,'expanded plaza and beach');
  check(world.children.filter(x=>x.name==='beach:access').length===2,'two paved beach approaches');
  const samples=createCalibration(scene);
  check(samples.children.length===3,'exactly one car, building and carriage');
  check(CAR.width<CARRIAGEWAY_WIDTH/2&&TRAIN.width<VIADUCT_WIDTH,'car fits one lane; train fits both viaducts');
  const trainBounds=new THREE.Box3().setFromObject(samples.getObjectByName('calibration-train'),true);
  check(near(trainBounds.min.y,ELEVATION),'carriage rests on elevated surface');
  const realScene=new THREE.Scene(),player=await createPlayer(realScene,rig.camera);
  const realTanuki=realScene.getObjectByName('Tanuki_茶タヌキ全体');
  const size=new THREE.Box3().setFromObject(realTanuki,true).getSize(new THREE.Vector3());
  check(player.height<ELEVATION-DECK_THICKNESS,'real GLB fits beneath elevated layer');
  results.push(`MEASURE scale=${PLAYER_SCALE}, size=${size.toArray()}, road/bodyWidth=${ROAD_WIDTH/size.x}`);
  for(const dash of [false,true]){
    clear();key('keydown','ArrowUp');if(dash){key('keyup','ArrowUp');key('keydown','ArrowUp');}
    const before=player.position.clone();player.update(.2);
    check(near(Math.hypot(player.position.x-before.x,player.position.z-before.z),(dash?4.8:3)*.2),'real scaled GLB world speed '+(dash?'dash':'walk'));
  }
  clear();
  document.querySelector('#result').textContent=results.join('\n')+'\nALL PASS';
  createWorld(realScene);
  createCalibration(realScene);
  realScene.background=new THREE.Color(0xe6e8e6);
  realScene.add(new THREE.HemisphereLight(0xf4f8ff,0xb5ada0,2.2));
  const light=new THREE.DirectionalLight(0xfff5e7,3);light.position.set(-15,30,20);realScene.add(light);
  for(const [label,c,r] of [['車・入口・歩道の比較',9,13],['電車と高架',10,11],['砂浜と海',1,1]]){
    const target=cellCenter(c,r),placement=realScene.children.find(x=>x.getObjectByName('Tanuki_茶タヌキ全体'));
    placement.position.x+=target.x-player.position.x;placement.position.z+=target.z-player.position.z;player.update(0);
    const render=new THREE.WebGLRenderer({antialias:true});render.setSize(800,450);render.toneMapping=THREE.ACESFilmicToneMapping;render.toneMappingExposure=1.15;
    rig.resize(800,450);rig.follow(player.position);render.render(realScene,rig.camera);
    const heading=document.createElement('h2');heading.textContent=label;document.body.append(heading,render.domElement);
  }
}catch(error){document.querySelector('#result').textContent=results.join('\n')+'\nFAIL '+error.stack;}
