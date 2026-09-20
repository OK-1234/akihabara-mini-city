import * as THREE from 'three';
import { ELEVATION, X_EDGES, Z_EDGES } from './world.js';
import { DECK_WIDTH, WALL_THICKNESS, OPENING_LENGTH } from './deck-test.js';
import {createViaductTrains} from './train-formations.js';

// Reuse the tested deck materials, track instances, train and dimensions.
// Only the new block preview replaces the old translucent width-4 viaducts.
export function createConfirmedViaduct(scene, tested) {
  const world=scene.getObjectByName('Excel_B6_O20');
  const oldNames=['H8:I15 縦高架','B16:F16 横高架','K16:O16 横高架'];
  for(const name of oldNames) {
    const old=world.getObjectByName(name);
    const outline=world.children.find(o=>o.isLineSegments&&o.position.equals(old.position));
    outline?.removeFromParent();old.removeFromParent();
  }
  const root=new THREE.Group();root.name='confirmed-viaduct';scene.add(root);
  const floorMat=tested.group.getObjectByName('deck').material;
  const wallMat=tested.group.getObjectByName('wall-right').material;
  const template=tested.group.getObjectByName('real-track');
  const trackBounds=new THREE.Box3().setFromObject(template,true);
  const pieceLength=trackBounds.max.z-trackBounds.min.z;
  function box(w,h,d,x,y,z,mat,name) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);m.name=name;m.receiveShadow=true;root.add(m);return m;
  }
  function wall(vertical,fixed,a,b,name) {
    if(b<=a)return;
    box(vertical?WALL_THICKNESS:b-a,.35,vertical?b-a:WALL_THICKNESS,
      vertical?fixed:(a+b)/2,ELEVATION+.175,vertical?(a+b)/2:fixed,wallMat,name);
  }
  function rails(vertical,fixed,a,b) {
    // Equal-scale pieces; no stretching. Small end clearances stay on the deck.
    const count=Math.floor((b-a)/pieceLength),start=(a+b-count*pieceLength)/2;
    for(let i=0;i<count;i++) {
      const track=template.clone(true);track.position.set(0,0,0);
      if(!vertical)track.rotation.y+=Math.PI/2;
      track.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(track,true),c=bounds.getCenter(new THREE.Vector3());
      const along=start+(i+.5)*pieceLength;
      track.position.set((vertical?fixed:along)-c.x,ELEVATION-bounds.min.y,(vertical?along:fixed)-c.z);
      root.add(track);
    }
  }
  const north=Z_EDGES[2],junction=(Z_EDGES[10]+Z_EDGES[11])/2;
  const west=X_EDGES[0],east=X_EDGES.at(-1),side=(DECK_WIDTH-WALL_THICKNESS)/2;
  const joinNorth=junction-DECK_WIDTH/2;
  box(DECK_WIDTH,.25,joinNorth-north,0,ELEVATION-.125,(north+joinNorth)/2,floorMat,'vertical-deck-3');
  box(east-west,.25,DECK_WIDTH,(west+east)/2,ELEVATION-.125,junction,floorMat,'horizontal-deck-3');
  const openingStart=north+.3,openingEnd=openingStart+OPENING_LENGTH;
  wall(true,-side,north,openingStart,'west-wall-before-opening');
  wall(true,-side,openingEnd,joinNorth,'west-wall-after-opening');
  wall(true,side,north,joinNorth,'east-wall');
  wall(false,junction-side,west,-DECK_WIDTH/2,'north-wall-west');
  wall(false,junction-side,DECK_WIDTH/2,east,'north-wall-east');
  wall(false,junction+side,west,east,'south-wall');
  rails(true,0,north,junction);rails(false,junction,west,east);
  const trains=createViaductTrains(root,tested.source.placement,tested.railTop,{north,joinNorth,junction,west,east});
  tested.group.removeFromParent();
  scene.updateMatrixWorld(true);
  return {root,openingStart,openingEnd,margin:tested.margin,trains};
}
