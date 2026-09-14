import * as THREE from 'three';
import {createDeckTest} from '../src/map/deck-test.js';
import {createWorld,ELEVATION} from '../src/map/world.js';
import {createPlayer} from '../src/player/player.js';
import {createCamera} from '../src/camera.js';
try {
 const scene=new THREE.Scene(),test=await createDeckTest(scene),out=[];
 function check(ok,label){if(!ok)throw new Error(label);out.push('PASS '+label);}
 check(test.textured&&test.source.measurements.textured,'train and railway textures');
 check(test.group.getObjectByName('deck').geometry.parameters.width===3,'width 3.0');
 check(test.group.children.filter(o=>o.name==='real-track').length===6,'six real straight tracks');
 check(Math.abs(test.obstacle.min.y-test.railTop)<1e-6,'train wheels on rail top');
 check(test.source.placement.scale.toArray().every(v=>v===.95),'uniform train .95');
 check(!test.group.getObjectByName('wall-left')&&test.group.getObjectByName('wall-left-north')&&test.group.getObjectByName('wall-left-south'),'single west opening');
 const rig=createCamera(),player=await createPlayer(scene,rig.camera),walk=test.mountPlayer(player);
 const actor=scene.getObjectByName('Tanuki_茶タヌキ全体');
 check(Math.abs(new THREE.Box3().setFromObject(actor,true).min.y-ELEVATION)<1e-5,'player feet at deck height');
 const key=(type,key)=>window.dispatchEvent(new KeyboardEvent(type,{key}));
 const start=player.position.clone();key('keydown','ArrowLeft');
 for(let i=0;i<20;i++){player.update(.05);walk.update();}
 key('keyup','ArrowLeft');check(Math.abs(start.z-player.position.z-3)<1e-5,'left walkway speed remains 3.0');
 key('keydown','ArrowLeft');for(let i=0;i<100;i++){player.update(.05);walk.update();}key('keyup','ArrowLeft');
 check(player.position.z>=test.center.z-test.length/2+.439,'north edge prevents falls');
 key('keydown','ArrowUp');for(let i=0;i<20;i++){player.update(.05);walk.update();}key('keyup','ArrowUp');
 check(player.position.x>test.center.x+.97,'can cross around train at north end');
 key('keydown','ArrowRight');for(let i=0;i<20;i++){player.update(.05);walk.update();}key('keyup','ArrowRight');
 check(player.position.z>test.center.z,'right walkway traversable');
 key('keydown','ArrowDown');for(let i=0;i<20;i++){player.update(.05);walk.update();}key('keyup','ArrowDown');
 check(player.position.x>=test.obstacle.max.x+.439,'parked train blocks entry');
 createWorld(scene);scene.background=new THREE.Color(0xe6e8e6);scene.add(new THREE.HemisphereLight(0xf4f8ff,0xb5ada0,2.2));
 const light=new THREE.DirectionalLight(0xfff5e7,3);light.position.set(-15,30,20);scene.add(light);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1000,650);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 rig.resize(1000,650);rig.follow(player.position);rig.camera.position.y+=walk.cameraLift;renderer.render(scene,rig.camera);
 renderer.domElement.style.maxWidth='100%';renderer.domElement.style.height='auto';document.body.append(renderer.domElement);
 document.querySelector('#result').textContent=out.join('\n')+`\nlength=${test.length} railTop=${test.railTop} sideMargin=${test.margin}\nALL PASS`;
}catch(e){document.querySelector('#result').textContent='FAIL '+e.stack;}
