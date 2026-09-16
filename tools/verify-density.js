import * as THREE from 'three';
import {createDensityTest,DENSITY_LOOP,DENSITY_INNER} from '../src/map/density-test.js';
import {createWorld} from '../src/map/world.js';
import {createPlayer} from '../src/player/player.js';
import {createCamera} from '../src/camera.js';
import {createCleanBuildingsTest,CLEAN_BUILDING_IDS} from '../src/map/clean-buildings-test.js';
import {DENSITY_BUILDINGS} from '../src/map/density-test.js';
try {
 const out=[],check=(ok,label)=>{if(!ok)throw Error(label);out.push('PASS '+label);};
 const scene=new THREE.Scene();createWorld(scene);
 const clean=new URLSearchParams(location.search).has('clean');
 const test=await (clean?createCleanBuildingsTest(scene):createDensityTest(scene));
 if(clean)for(const [i,b] of DENSITY_BUILDINGS.entries()) {
   const body=test.boxes[i],g=body.parent,p=body.geometry.parameters;
   check(p.width===b.width&&p.depth===b.depth&&p.height===b.height&&g.position.x===b.x&&g.position.z===b.z&&g.rotation.y===b.turn*Math.PI/2,'unchanged body '+b.id);
   const detail=g.getObjectByName('clean-building-details');
   if(CLEAN_BUILDING_IDS.includes(b.id)) {
     check(detail.children.filter(m=>m.name.endsWith('-window')).length===6,'six continuous window bands '+b.id);
     check(detail.children.filter(m=>m.name==='roof-unit').length===2,'two rooftop units '+b.id);
     check(detail.getObjectByName('wide-entrance').geometry.parameters.width===1.95,'wide glazed entrance '+b.id);
   }else check(!detail&&g.children.length===3&&body.material.color.getHex()===b.color,'simple box retained '+b.id);
 }
 scene.updateMatrixWorld(true);
 check(test.boxes.length===6,'six density buildings');
 const bounds=test.boxes.map(m=>new THREE.Box3().setFromObject(m,true));
 for(let i=0;i<bounds.length;i++) {
   const b=bounds[i];check(b.min.x>=-10.001&&b.max.x<=-1.999&&b.min.z>=-11.551&&b.max.z<=-1.549,'building within west plot '+i);
   for(let j=0;j<i;j++)check(!b.intersectsBox(bounds[j]),'buildings separated '+i+'/'+j);
 }
 // Walk both loops using the real controller. At every step check a .44-radius
 // tanuki against bodies and low street props, without adding game collisions.
 const obstacles=[];test.root.traverse(m=>{if(m.isMesh){const b=new THREE.Box3().setFromObject(m,true);if(b.min.y<1.5)obstacles.push(b);}});
 const rig=createCamera(),player=await createPlayer(scene,rig.camera);test.spawnPlayer(player);
 const key=(type,key)=>window.dispatchEvent(new KeyboardEvent(type,{key}));
 for(const [name,path] of [['outer',DENSITY_LOOP],['inner',DENSITY_INNER]]) {
   for(const [x,z] of path.slice(1)) {
     window.dispatchEvent(new Event('blur'));
     const dx=x-player.position.x,dz=z-player.position.z;
     const direction=Math.abs(dx)>1e-5?(dx>0?'ArrowUp':'ArrowDown'):(dz>0?'ArrowRight':'ArrowLeft');
     let distance=Math.abs(dx)+Math.abs(dz);key('keydown',direction);
     while(distance>1e-7) {
       const step=Math.min(distance,.06);player.update(step/3);distance-=step;
       for(const b of obstacles) {
         const p=player.position;
         if(p.x>b.min.x-.44&&p.x<b.max.x+.44&&p.z>b.min.z-.44&&p.z<b.max.z+.44)throw Error(name+' route blocked at '+p.toArray());
       }
     }
     key('keyup',direction);
     check(Math.hypot(player.position.x-x,player.position.z-z)<1e-5,name+' route waypoint '+x+','+z);
   }
 }
 check(test.base.viaduct.root.getObjectByName('vertical-deck-3').geometry.parameters.width===3,'confirmed viaduct 3.0');
 check(test.base.volumes.deck.source.measurements.scale===.95&&test.base.volumes.deck.source.sedan.measurements.scale===.8,'train .95 / car .80 unchanged');
 check(test.base.volumes.deck.textured&&test.base.volumes.deck.source.measurements.textured,'rail/train textures');
 check(!scene.getObjectByName('udx')&&!scene.getObjectByName('support'),'temporary west plot substitution');
 document.querySelector('#result').textContent=out.join('\n')+'\nALL PASS';
}catch(e){document.querySelector('#result').textContent='FAIL '+e.stack;}
