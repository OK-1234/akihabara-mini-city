import * as THREE from 'three';
import {createViaductTest,DECK_WIDTHS,SAMPLE_Z} from '../src/map/viaduct-test.js';
import {createWorld,ELEVATION,constrainPosition} from '../src/map/world.js';
import {createPlayer} from '../src/player/player.js';
import {createCamera} from '../src/camera.js';
try {
 const scene=new THREE.Scene(),test=await createViaductTest(scene),out=[];
 function check(ok,label){if(!ok)throw new Error(label);out.push('PASS '+label);}
 check(test.source.measurements.textured,'train texture loaded');
 check(test.samples.children.length===3,'three conditions');
 for(const [i,s] of test.samples.children.entries()){
  check(s.getObjectByName('deck').geometry.parameters.width===DECK_WIDTHS[i],s.name+' width');
  const train=s.getObjectByName('sample-train');check(train.scale.toArray().every(v=>v===.95),s.name+' uniform .95');
  const bounds=new THREE.Box3().setFromObject(train,true);
  check(Math.abs(bounds.min.y-ELEVATION)<1e-6,s.name+' same train height');
  check(bounds.min.x>=s.position.x-DECK_WIDTHS[i]/2&&bounds.max.x<=s.position.x+DECK_WIDTHS[i]/2,s.name+' train contained');
  check(s.children.filter(o=>o.name==='walking-margin').length===2,s.name+' two walking margins');
  check(Boolean(s.getObjectByName('wall-left'))===(i!==1),s.name+' correct west wall');
  const p=new THREE.Vector3(s.position.x,0,SAMPLE_Z+2.5),clamped=p.clone();constrainPosition(clamped);check(p.equals(clamped),s.name+' approachable');
  out.push('CLEARANCE '+s.name+' '+s.userData.clearance);
 }
 const b=test.samples.children[1];check(b.getObjectByName('wall-left-north').geometry.parameters.depth===.3&&b.getObjectByName('wall-left-south').geometry.parameters.depth===2.1,'B 1.2 opening only');
 createWorld(scene);scene.background=new THREE.Color(0xe6e8e6);scene.add(new THREE.HemisphereLight(0xf4f8ff,0xb5ada0,2.2));
 const light=new THREE.DirectionalLight(0xfff5e7,3);light.position.set(-15,30,20);scene.add(light);
 const rig=createCamera(),player=await createPlayer(scene,rig.camera);
 const placement=scene.children.find(o=>o.getObjectByName('Tanuki_茶タヌキ全体'));
 placement.position.x+=-5-player.position.x;placement.position.z+=SAMPLE_Z-2-player.position.z;player.update(0);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1200,750);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 rig.resize(1200,750);rig.follow(player.position);renderer.render(scene,rig.camera);renderer.domElement.style.maxWidth='100%';renderer.domElement.style.height='auto';document.body.append(renderer.domElement);
 document.querySelector('#result').textContent=out.join('\n')+'\nALL PASS';
}catch(e){document.querySelector('#result').textContent='FAIL '+e.stack;}

