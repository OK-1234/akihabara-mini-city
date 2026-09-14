import * as THREE from 'three';
import { createTrainTest } from './train-test.js';
import { ELEVATION, DECK_THICKNESS, Z_EDGES } from './world.js';

export const DECK_WIDTHS=[4,3.4,3];
export const SAMPLE_LENGTH=3.6;
export const TRACK_WIDTH=1.3;
export const WALL_THICKNESS=.08;
export const WALL_HEIGHT=.35;
export const OPENING_LENGTH=1.2;
export const SAMPLE_Z=Z_EDGES[12]+SAMPLE_LENGTH/2;

export async function createViaductTest(scene) {
  const source=await createTrainTest(scene);
  source.root.remove(source.placement);
  const samples=new THREE.Group();samples.name='viaduct-width-comparison';scene.add(samples);
  const material=color=>new THREE.MeshStandardMaterial({color,roughness:1});
  const deckMat=material(0xbac5cb),walkMat=material(0xe7ddbd),trackMat=material(0x7b8790),wallMat=material(0x9caeb9),railMat=material(0xcbd3d8);
  function box(parent,w,h,d,x,y,z,mat,name) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);mesh.name=name;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const centers=[-9,-4.7,-1];
  DECK_WIDTHS.forEach((width,index)=>{
    const id=String.fromCharCode(65+index),group=new THREE.Group();group.name=`sample-${id}`;
    group.position.set(centers[index],0,SAMPLE_Z);samples.add(group);
    const clearance=(width-TRACK_WIDTH)/2-WALL_THICKNESS;
    group.userData={width,clearance,opening:index===1};
    box(group,width,DECK_THICKNESS,SAMPLE_LENGTH,0,ELEVATION-DECK_THICKNESS/2,0,deckMat,'deck');
    box(group,TRACK_WIDTH,.012,SAMPLE_LENGTH,0,ELEVATION+.006,0,trackMat,'track');
    for(const side of [-1,1]) {
      box(group,clearance,.012,SAMPLE_LENGTH,side*(TRACK_WIDTH/2+clearance/2),ELEVATION+.006,0,walkMat,'walking-margin');
      box(group,.035,.025,SAMPLE_LENGTH,side*.4,ELEVATION+.0125,0,railMat,'rail');
      const x=side*(width-WALL_THICKNESS)/2;
      // B only: west (-X) side opening near the north/sea (-Z) end.
      if(index===1&&side===-1) {
        box(group,WALL_THICKNESS,WALL_HEIGHT,.3,x,ELEVATION+WALL_HEIGHT/2,-1.65,wallMat,'wall-left-north');
        box(group,WALL_THICKNESS,WALL_HEIGHT,2.1,x,ELEVATION+WALL_HEIGHT/2,.75,wallMat,'wall-left-south');
      } else box(group,WALL_THICKNESS,WALL_HEIGHT,SAMPLE_LENGTH,x,ELEVATION+WALL_HEIGHT/2,0,wallMat,side===-1?'wall-left':'wall-right');
    }
    const train=source.placement.clone(true);train.name='sample-train';
    // The production carriage is aligned X. Rotate the entire unaltered model
    // to Z for all three north-south comparison decks.
    train.rotation.y=Math.PI/2;train.position.set(0,0,0);
    train.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(train,true),center=bounds.getCenter(new THREE.Vector3());
    train.position.set(-center.x,ELEVATION-bounds.min.y,-center.z);group.add(train);
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=72;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fffffff0';ctx.fillRect(0,0,256,72);ctx.fillStyle='#293c49';ctx.font='bold 40px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`${id} ${width.toFixed(1)}`,128,36);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,toneMapped:false}));
    label.name='label';label.position.set(0,ELEVATION+.25,SAMPLE_LENGTH/2+.25);label.scale.set(1,.281,1);group.add(label);
  });
  scene.updateMatrixWorld(true);
  return {source,samples};
}
