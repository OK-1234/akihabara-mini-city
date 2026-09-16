import * as THREE from 'three';
import {BUILDING_VOLUMES,createBuildingVolumes} from '../src/map/building-volumes.js';
import {createWorld,X_EDGES,Z_EDGES,groundType,ROAD_WIDTH} from '../src/map/world.js';
import {createCamera} from '../src/camera.js';
import {createPlayer} from '../src/player/player.js';
try {
  const out=[],check=(ok,label)=>{if(!ok)throw Error(label);out.push('PASS '+label);};
  const scene=new THREE.Scene();createWorld(scene);
  const test=await createBuildingVolumes(scene),rig=createCamera(),player=await createPlayer(scene,rig.camera);
  check(test.group.children.length===8&&test.group.children.every(m=>m.geometry.type==='BoxGeometry'),'8 plain boxes, no decorations');
  check(!scene.getObjectByName('calibration-building'),'old decorated placeholder removed in this page');
  const overlap=(a,b)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ;
  const bounds=BUILDING_VOLUMES.map(b=>({minX:b.x-b.width/2,maxX:b.x+b.width/2,minZ:b.z-b.depth/2,maxZ:b.z+b.depth/2}));
  for(let i=0;i<bounds.length;i++) {
    for(let j=0;j<i;j++)check(!overlap(bounds[i],bounds[j]),`${BUILDING_VOLUMES[i].id}/${BUILDING_VOLUMES[j].id} separated`);
    for(let r=0;r<15;r++)for(let c=0;c<14;c++) {
      const type=groundType(c,r);
      if(!['road','plaza','fountainReserve','sea','beach'].includes(type))continue;
      const cell={minX:X_EDGES[c],maxX:X_EDGES[c+1],minZ:Z_EDGES[r],maxZ:r===9&&c>1&&c<12?Z_EDGES[r]+ROAD_WIDTH:Z_EDGES[r+1]};
      if(overlap(bounds[i],cell))throw Error(`${BUILDING_VOLUMES[i].id} overlaps ${type} ${c}/${r}`);
    }
  }
  check(true,'roads, sidewalks within road cells, plaza, fountain reserve and coast remain clear');
  check(test.deck.textured&&test.deck.source.measurements.textured,'train and rail textures loaded');
  check(test.deck.source.sedan.measurements.scale===.8&&test.deck.source.measurements.scale===.95,'car .80 / train .95 unchanged');
  check(test.deck.group.getObjectByName('deck').geometry.parameters.width===3,'existing width-3 deck retained');
  check(test.deck.group.getObjectByName('wall-left-north')&&test.deck.group.getObjectByName('wall-left-south'),'existing sidewall opening retained');
  const key=(type,key)=>window.dispatchEvent(new KeyboardEvent(type,{key}));
  const advance=(n)=>{for(let i=0;i<n;i++)player.update(.05);};
  let start=player.position.clone();key('keydown','ArrowUp');advance(10);key('keyup','ArrowUp');
  check(Math.abs(player.position.x-start.x-1.5)<1e-5,'normal walk 3.0 / screen-relative direction');
  start=player.position.clone();key('keydown','ArrowUp');advance(10);
  check(Math.abs(player.position.x-start.x-2.4)<1e-5,'double tap dash 4.8');
  start=player.position.clone();key('keydown','ArrowLeft');key('keyup','ArrowUp');advance(10);key('keyup','ArrowLeft');
  check(Math.abs(player.position.z-start.z+2.4)<1e-5,'dash continues on direction change');
  rig.follow(player.position);check(rig.camera.position.x===player.position.x-30&&rig.camera.position.z===player.position.z+30,'original follow camera');
  // Existing ground movement can reach north beach; no deck-only mount is used.
  key('keydown','ArrowLeft');advance(400);key('keyup','ArrowLeft');
  check(player.position.z<Z_EDGES[2]&&player.position.z>Z_EDGES[1],'ground exploration reaches beach and stops before sea');
  document.querySelector('#result').textContent=out.join('\n')+'\nALL PASS';
}catch(e){document.querySelector('#result').textContent='FAIL '+e.stack;}
