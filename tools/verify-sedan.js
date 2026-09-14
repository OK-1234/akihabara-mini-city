import * as THREE from 'three';
import {createSedanTest} from '../src/map/sedan-test.js';
import {createCalibration} from '../src/map/calibration.js';
import {createWorld,CARRIAGEWAY_WIDTH,constrainPosition} from '../src/map/world.js';
import {createPlayer} from '../src/player/player.js';
import {createCamera} from '../src/camera.js';
try {
  const scene=new THREE.Scene(),test=await createSedanTest(scene),baseline=createCalibration(new THREE.Scene());
  const messages=[];
  function check(ok,label){if(!ok)throw new Error(label);messages.push('PASS '+label);}
  const box=o=>new THREE.Box3().setFromObject(o,true);
  check(test.root.children.length===3&&!test.root.getObjectByName('calibration-car'),'exactly one real car replaces placeholder');
  for(const name of ['calibration-train','calibration-building'])check(box(test.root.getObjectByName(name)).equals(box(baseline.getObjectByName(name))),name+' unchanged');
  check(test.placement.scale.toArray().every(value=>value===.8),'uniform XYZ scale 0.80');
  for(const axis of ['length','width','height'])check(Math.abs(test.measurements.placed[axis]/test.measurements.original[axis]-.8)<1e-6,'original proportion preserved: '+axis);
  const meshes=[];test.placement.traverse(object=>{if(object.isMesh)meshes.push(object);});
  check(meshes.length>0&&meshes.every(mesh=>mesh.material.map?.image?.width>0),'original colormap loaded on all meshes');
  check(test.measurements.placed.width<CARRIAGEWAY_WIDTH/2,'fits one lane');
  check(Math.abs(box(test.placement).min.y)<1e-6,'wheels grounded');
  const rig=createCamera(),player=await createPlayer(scene,rig.camera);
  const target=box(test.placement).getCenter(new THREE.Vector3());target.z+=1.2;
  const constrained=target.clone();constrainPosition(constrained);check(constrained.equals(target),'car side reachable');
  const placement=scene.children.find(o=>o.getObjectByName('Tanuki_茶タヌキ全体'));
  placement.position.x+=target.x-player.position.x;placement.position.z+=target.z-player.position.z;player.update(0);
  createWorld(scene);scene.background=new THREE.Color(0xe6e8e6);
  scene.add(new THREE.HemisphereLight(0xf4f8ff,0xb5ada0,2.2));
  const light=new THREE.DirectionalLight(0xfff5e7,3);light.position.set(-15,30,20);scene.add(light);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1000,600);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  rig.resize(1000,600);rig.follow(player.position);renderer.render(scene,rig.camera);document.body.append(renderer.domElement);
  document.querySelector('#result').textContent=JSON.stringify(test.measurements,null,2)+'\n'+messages.join('\n')+'\nALL PASS';
}catch(error){document.querySelector('#result').textContent='FAIL '+error.stack;}
