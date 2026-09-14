import * as THREE from 'three';
import {createCalibration} from '../src/map/calibration.js';
import {createComparison,COMPARISON_SCALES} from '../src/map/comparison.js';
import {createWorld,ELEVATION,CARRIAGEWAY_WIDTH,X_EDGES,Z_EDGES,cellCenter} from '../src/map/world.js';
import {createPlayer} from '../src/player/player.js';
import {createCamera} from '../src/camera.js';
const out=[];
function check(ok,name){if(!ok)throw new Error(name);out.push('PASS '+name);}
try {
  const scene=new THREE.Scene(),root=createComparison(scene),baseline=createCalibration(new THREE.Scene());
  const bounds=o=>new THREE.Box3().setFromObject(o,true);
  const near=(a,b)=>Math.abs(a-b)<1e-6;
  check(root.children.filter(o=>o.name.startsWith('comparison-car-')).length===3,'three cars');
  check(root.children.filter(o=>o.name.startsWith('comparison-train-')).length===3,'three carriages');
  check(root.children.filter(o=>o.name.startsWith('comparison-label:')).length===6,'six small labels');
  check(bounds(root.getObjectByName('calibration-building')).equals(bounds(baseline.getObjectByName('calibration-building'))),'existing building unchanged');
  for(const type of ['car','train']) {
    const original=baseline.getObjectByName('calibration-'+type),baseSize=bounds(original).getSize(new THREE.Vector3());
    let previous;
    COMPARISON_SCALES.forEach((scale,i)=>{
      const object=root.getObjectByName(`comparison-${type}-${String.fromCharCode(65+i)}`);
      const b=bounds(object),size=b.getSize(new THREE.Vector3());
      check(size.distanceTo(baseSize.clone().multiplyScalar(scale))<1e-6,`${type} ${scale} exact uniform size`);
      check(object.children.every((child,j)=>JSON.stringify(child.geometry.parameters)===JSON.stringify(original.children[j].geometry.parameters)&&child.material.color.equals(original.children[j].material.color)&&child.position.equals(original.children[j].position)),`${type} ${scale} same shape and color`);
      check(near(b.min.y,type==='car'?0:ELEVATION),`${type} ${scale} grounded`);
      check(b.min.x>=X_EDGES[type==='car'?2:0]&&b.max.x<=X_EDGES[type==='car'?12:14],`${type} ${scale} within existing road/deck length`);
      if(type==='car')check(size.z<CARRIAGEWAY_WIDTH/2,`car ${scale} fits one lane`);
      else check(b.min.z>=Z_EDGES[10]&&b.max.z<=Z_EDGES[11],`train ${scale} within elevated width`);
      if(previous)check(b.min.x>previous.max.x,`${type} spacing`);
      previous=b;
    });
  }
  createWorld(scene);
  scene.background=new THREE.Color(0xe6e8e6);
  scene.add(new THREE.HemisphereLight(0xf4f8ff,0xb5ada0,2.2));
  const light=new THREE.DirectionalLight(0xfff5e7,3);light.position.set(-15,30,20);scene.add(light);
  const rig=createCamera(),player=await createPlayer(scene,rig.camera);
  for(const [title,x,z] of [['車A・B・C',0,cellCenter(7,13).z+1],['電車A・B',-3,cellCenter(7,10).z+3],['電車B・C',5,cellCenter(7,10).z+3]]) {
    const placement=scene.children.find(o=>o.getObjectByName('Tanuki_茶タヌキ全体'));
    placement.position.x+=x-player.position.x;placement.position.z+=z-player.position.z;player.update(0);
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1000,600);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    rig.resize(1000,600);rig.follow(player.position);renderer.render(scene,rig.camera);
    const heading=document.createElement('h2');heading.textContent=title;document.body.append(heading,renderer.domElement);
  }
  document.querySelector('#result').textContent=out.join('\n')+'\nALL PASS';
}catch(error){document.querySelector('#result').textContent=out.join('\n')+'\nFAIL '+error.stack;}


