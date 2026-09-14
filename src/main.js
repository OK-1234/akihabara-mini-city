import * as THREE from 'three';
import { createWorld } from './map/world.js';
import { createCalibration } from './map/calibration.js';
import { createComparison } from './map/comparison.js';
import { createSedanTest } from './map/sedan-test.js';
import { createTrainTest } from './map/train-test.js';
import { createViaductTest } from './map/viaduct-test.js';
import { createDeckTest } from './map/deck-test.js';
import { createCamera } from './camera.js';
import { createPlayer } from './player/player.js';
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xe6e8e6);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label','秋葉原ミニシティ 街の骨格');
document.body.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xf4f8ff,0xb5ada0,2.2));
const sun=new THREE.DirectionalLight(0xfff5e7,3);sun.position.set(-15,30,20);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.1,far:100});sun.shadow.normalBias=.015;scene.add(sun);
createWorld(scene);
let deckTest;
if (document.body.dataset.comparison === 'deck') {
  deckTest=await createDeckTest(scene);
} else if (document.body.dataset.comparison === 'viaduct') {
  await createViaductTest(scene);
} else if (document.body.dataset.comparison === 'train') {
  await createTrainTest(scene);
} else if (document.body.dataset.comparison === 'sedan') {
  await createSedanTest(scene);
} else if (document.body.dataset.comparison === 'vehicles') createComparison(scene);
else createCalibration(scene);
const rig=createCamera();
function resize(){renderer.setSize(innerWidth,innerHeight);rig.resize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);resize();
try {
  const player=await createPlayer(scene,rig.camera);
  const deckWalk=deckTest?.mountPlayer(player);
  document.querySelector('#status').textContent='広場からスタート · 海と砂浜は地図の上端';
  console.info('街の骨格 試作3号・縮尺校正', {tanukiHeight:player.height,walkSpeed:3,dashSpeed:4.8});
  let previous;
  renderer.setAnimationLoop(time=>{const dt=previous===undefined?0:Math.min((time-previous)/1000,.05);previous=time;player.update(dt);deckWalk?.update();rig.follow(player.position);if(deckWalk)rig.camera.position.y+=deckWalk.cameraLift;renderer.render(scene,rig.camera);});
} catch(error) {document.querySelector('#status').textContent='読み込みに失敗しました。ページを再読み込みしてください。';console.error(error);}

