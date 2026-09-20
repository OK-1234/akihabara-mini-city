import * as THREE from 'three';
import {createCity,CITY_BUILDINGS} from '../src/map/city.js';
import {BUILDING_VOLUMES} from '../src/map/building-volumes.js';
import {createWorld,X_EDGES,Z_EDGES,ROAD_WIDTH,groundType} from '../src/map/world.js';
import {createPlayer} from '../src/player/player.js';
import {createCamera} from '../src/camera.js';
try {
 const out=[],check=(ok,label)=>{if(!ok)throw Error(label);out.push('PASS '+label);};
 const scene=new THREE.Scene();createWorld(scene);const city=await createCity(scene);scene.updateMatrixWorld(true);
 check(city.boxes.length===32,'32 buildings on original map');
 check(!scene.getObjectByName('west-density-test')&&!scene.getObjectByName('K17_M18-street-details'),'no test-only district or decorations');
 for(const b of BUILDING_VOLUMES) {
  const g=city.root.getObjectByName(b.id),p=g.getObjectByName(b.id+':body').geometry.parameters;
  const adopted=CITY_BUILDINGS.find(c=>c.id===b.id);
  check(g.position.x===adopted.x&&g.position.z===adopted.z&&p.width===adopted.width&&p.depth===adopted.depth&&p.height===adopted.height-(b.id==='support'?2.2:0),'adopted footprint and upper volume '+b.id);
 }
 const bounds=city.boxes.map(m=>new THREE.Box3().setFromObject(m,true));
 for(let i=0;i<bounds.length;i++) {
  for(let j=0;j<i;j++)if(bounds[i].intersectsBox(bounds[j]))throw Error('building overlap '+i+'/'+j);
  for(let r=0;r<15;r++)for(let c=0;c<14;c++) {
   if(!['road','plaza','fountainReserve','sea','beach'].includes(groundType(c,r)))continue;
   const maxZ=r===9&&c>1&&c<12?Z_EDGES[r]+ROAD_WIDTH:Z_EDGES[r+1],b=bounds[i];
   if(b.min.x<X_EDGES[c+1]-1e-6&&b.max.x>X_EDGES[c]+1e-6&&b.min.z<maxZ-1e-6&&b.max.z>Z_EDGES[r]+1e-6)throw Error(CITY_BUILDINGS[i].id+' overlaps public area '+c+'/'+r);
  }
 }
 check(true,'no building overlap / roads, plaza, beach remain clear');
 const obstacles=[];for(const root of [city.root,city.greenery])root.traverse(m=>{if(m.isMesh){const b=new THREE.Box3().setFromObject(m,true);if(b.min.y<1.5)obstacles.push(b);}});
 obstacles.push(new THREE.Box3().setFromObject(city.volumes.deck.source.sedan.placement,true));
 const rig=createCamera(),player=await createPlayer(scene,rig.camera),spawn=player.position.clone();
 const key=(type,key)=>window.dispatchEvent(new KeyboardEvent(type,{key}));
 async function walkTo(x,z){
  for(const [axis,value] of [['x',x],['z',z]]) {
   window.dispatchEvent(new Event('blur'));const delta=value-player.position[axis];if(Math.abs(delta)<1e-6)continue;
   const direction=axis==='x'?(delta>0?'ArrowUp':'ArrowDown'):(delta>0?'ArrowRight':'ArrowLeft');
   key('keydown',direction);let remaining=Math.abs(delta);
   while(remaining>1e-7){const step=Math.min(.06,remaining);player.update(step/3);remaining-=step;
    for(const b of obstacles){const p=player.position;if(p.x>b.min.x-.44&&p.x<b.max.x+.44&&p.z>b.min.z-.44&&p.z<b.max.z+.44)throw Error('route obstructed '+p.toArray());}
   }key('keyup',direction);
  }
  if(Math.hypot(player.position.x-x,player.position.z-z)>1e-5)throw Error('movement mismatch');
 }
 for(const [x,z] of [[1,20],[11,20],[11,-12.4],[-11,-12.4],[-11,20],[1,20],[1,16.3]])await walkTo(x,z);
 check(true,'full original-map loop by real walking controller');
 for(const [x,z] of [[1,13.5],[4,13.5],[4,14.4],[-5.2,14.4],[-11,14.4],[-11,-.7],[-5,-.7],[2.8,-.7],[2.8,-10],[2.8,-12.4],[-8.2,-12.4],[-12.3,-12.4],[-12.3,-21],[0,-21],[0,-12.4],[-11,-12.4],[-11,20],[1,20],[spawn.x,spawn.z]])await walkTo(x,z);
 check(true,'station, general-building alleys, UDX, Yodobashi, support, viaduct and both beach approaches connected');
 check(city.viaduct.root.getObjectByName('vertical-deck-3').geometry.parameters.width===3&&city.viaduct.root.getObjectByName('horizontal-deck-3').geometry.parameters.depth===3,'both viaduct widths 3.0');
 check(city.volumes.deck.source.measurements.scale===.95&&city.volumes.deck.source.sedan.measurements.scale===.8,'train .95 / sedan .80');
 check(city.volumes.deck.textured&&city.volumes.deck.source.measurements.textured,'rail and train textures');
 check(city.root.getObjectByName('commercial-lower')&&city.root.getObjectByName('commercial-upper')&&city.root.getObjectByName('tower-glass'),'distinct commercial and tower silhouettes');
 check(CITY_BUILDINGS.find(b=>b.id==='support').height===6.2&&CITY_BUILDINGS.find(b=>b.id==='udx').height===9,'support below UDX, above ordinary buildings');
 const arch=scene.getObjectByName('station-arched-roof');
 check(arch&&arch.children.filter(o=>o.name==='arch-rib').length===3&&arch.getObjectByName('light-arch-shell').material.opacity<1,'light station arch above junction');
 check(new Set(city.root.children.map(g=>g.userData.roofPattern).filter(Boolean)).size===6,'six roof planting patterns including no planting');
 check(city.greenery.children.length===8,'four trees and four low planters distributed');
 check(city.finish.children.filter(o=>o.name==='plaza-bench').length===2,'two plaza benches only');
 check(city.finish.children.filter(o=>o.name==='crosswalk').length===7,'seven selected crossings');
 check(city.finish.children.filter(o=>o.name==='plaza-lamp').length===5,'five lamps including three added on sidewalk edges');
 check(city.finish.children.filter(o=>o.name==='pedestrian-stone-paving').length>20,'rectangular paving on existing pedestrian surfaces');
 check(city.finish.getObjectByName('curved-ivory-beach')&&city.finish.getObjectByName('rounded-junction-curb'),'curved shore and junction curb');
 check(city.root.getObjectByName('commercial-roof-garden'),'unified commercial roof garden');
 document.querySelector('#result').textContent=out.join('\n')+'\nALL PASS';
 if(new URLSearchParams(location.search).has('views')) {
  scene.background=new THREE.Color(0xe6e8e6);scene.add(new THREE.HemisphereLight(0xf4f8ff,0xb5ada0,2.2));
  const sun=new THREE.DirectionalLight(0xfff5e7,3);sun.position.set(-15,30,20);scene.add(sun);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(620,430);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  rig.resize(620,430);
  const gallery=document.createElement('div');gallery.style.cssText='display:grid;grid-template-columns:repeat(2,620px);gap:8px';
  document.querySelector('#result').textContent='ALL PASS · 本番と同じ角度・表示高さでのランドマーク確認';document.body.append(gallery);
  const actor=scene.children.find(o=>o.getObjectByName('Tanuki_茶タヌキ全体'));
  for(const [label,x,z] of [['ヨドバシ風',8,-3.5],['駅前広場',0,17],['海岸線',0,-22],['交差点',11,-.7]]) {
   actor.position.x+=x-player.position.x;actor.position.z+=z-player.position.z;player.update(0);rig.follow(player.position);
   renderer.render(scene,rig.camera);
   const section=document.createElement('div'),caption=document.createElement('div'),canvas=document.createElement('canvas');
   caption.textContent=label;canvas.width=620;canvas.height=430;canvas.getContext('2d').drawImage(renderer.domElement,0,0);section.append(caption,canvas);gallery.append(section);
  }
  renderer.dispose();
 }
}catch(e){document.querySelector('#result').textContent='FAIL '+e.stack;}

