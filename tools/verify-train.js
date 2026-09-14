import * as THREE from 'three';
import {createTrainTest} from '../src/map/train-test.js';
import {createWorld,ELEVATION,VIADUCT_WIDTH,X_EDGES,Z_EDGES} from '../src/map/world.js';
import {createCamera} from '../src/camera.js';
import {createPlayer} from '../src/player/player.js';
try {
  const scene=new THREE.Scene(),test=await createTrainTest(scene),messages=[];
  function check(ok,label){if(!ok)throw new Error(label);messages.push('PASS '+label);}
  check(test.root.children.length===3&&!test.root.getObjectByName('calibration-train'),'one real carriage replaces placeholder');
  check(test.placement.scale.toArray().every(v=>v===.95),'uniform scale .95');
  for(const axis of ['length','width','height'])check(Math.abs(test.measurements.placed[axis]/test.measurements.original[axis]-.95)<1e-6,'original proportion: '+axis);
  const bounds=new THREE.Box3().setFromObject(test.placement,true);
  check(Math.abs(bounds.min.y-ELEVATION)<1e-6,'wheels on elevated deck');
  check(bounds.min.x>=X_EDGES[9]&&bounds.max.x<=X_EDGES[14]&&bounds.min.z>=Z_EDGES[10]&&bounds.max.z<=Z_EDGES[11],'entire carriage inside existing deck');
  check(test.sedan.measurements.scale===.8,'sedan scale retained');
  createWorld(scene);scene.background=new THREE.Color(0xe6e8e6);scene.add(new THREE.HemisphereLight(0xf4f8ff,0xb5ada0,2.2));
  const light=new THREE.DirectionalLight(0xfff5e7,3);light.position.set(-15,30,20);scene.add(light);
  const rig=createCamera(),player=await createPlayer(scene,rig.camera);
  const target=bounds.getCenter(new THREE.Vector3());target.x-=3;target.z+=2;
  const placement=scene.children.find(o=>o.getObjectByName('Tanuki_茶タヌキ全体'));
  placement.position.x+=target.x-player.position.x;placement.position.z+=target.z-player.position.z;player.update(0);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1000,600);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  rig.resize(1000,600);rig.follow(player.position);renderer.render(scene,rig.camera);document.body.append(renderer.domElement);
  document.querySelector('#result').textContent=JSON.stringify({...test.measurements,viaductWidth:VIADUCT_WIDTH},null,2)+'\n'+messages.join('\n')+'\nALL PASS';
}catch(error){document.querySelector('#result').textContent='FAIL '+error.stack;}
