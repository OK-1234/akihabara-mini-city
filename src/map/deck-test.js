import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createTrainTest } from './train-test.js';
import { ELEVATION, Z_EDGES } from './world.js';

export const DECK_WIDTH=3;
export const TRACK_SCALE=.95;
export const TRACK_COUNT=6;
export const WALL_THICKNESS=.04;
export const OPENING_LENGTH=1.2;
export const PLAYER_RADIUS=.44;

export async function createDeckTest(scene) {
  const source=await createTrainTest(scene);
  source.root.remove(source.placement);
  const gltf=await new GLTFLoader().loadAsync(new URL('../../assets/railway/track-detailed.glb',import.meta.url).href);
  const track=gltf.scene;
  const raw=new THREE.Box3().setFromObject(track,true),size=raw.getSize(new THREE.Vector3());
  const length=size.z*TRACK_SCALE*TRACK_COUNT;
  const center=new THREE.Vector3(-4.7,0,Z_EDGES[12]+length/2);
  const group=new THREE.Group();group.name='production-deck-test';group.position.copy(center);scene.add(group);
  const concrete=new THREE.MeshStandardMaterial({color:0xdce3e8,roughness:1});
  const wallMat=new THREE.MeshStandardMaterial({color:0xa5b4c0,roughness:1});
  function box(w,h,d,x,y,z,material,name) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.name=name;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  box(DECK_WIDTH,.25,length,0,ELEVATION-.125,0,concrete,'deck');
  box(WALL_THICKNESS,.35,length,(DECK_WIDTH-WALL_THICKNESS)/2,ELEVATION+.175,0,wallMat,'wall-right');
  // West opening, 0.3 from the sea-facing end, matching the prior B concept.
  const west=-(DECK_WIDTH-WALL_THICKNESS)/2;
  box(WALL_THICKNESS,.35,.3,west,ELEVATION+.175,-length/2+.15,wallMat,'wall-left-north');
  const southLength=length-.3-OPENING_LENGTH;
  box(WALL_THICKNESS,.35,southLength,west,ELEVATION+.175,length/2-southLength/2,wallMat,'wall-left-south');
  let textured=true;
  for(let i=0;i<TRACK_COUNT;i++) {
    const part=track.clone(true);part.name='real-track';part.scale.setScalar(TRACK_SCALE);
    part.position.set(-(raw.min.x+raw.max.x)*TRACK_SCALE/2,ELEVATION-raw.min.y*TRACK_SCALE,-length/2+(i+.5)*size.z*TRACK_SCALE-(raw.min.z+raw.max.z)*TRACK_SCALE/2);
    part.traverse(o=>{if(o.isMesh){o.receiveShadow=true;if(!o.material.map?.image)textured=false;}});group.add(part);
  }
  const train=source.placement;train.rotation.y=Math.PI/2;train.position.set(0,0,0);train.updateMatrixWorld(true);
  const trainBounds=new THREE.Box3().setFromObject(train,true),tc=trainBounds.getCenter(new THREE.Vector3());
  const railTop=ELEVATION+size.y*TRACK_SCALE;
  train.position.set(-tc.x,railTop-trainBounds.min.y,-tc.z);group.add(train);scene.updateMatrixWorld(true);
  const obstacle=new THREE.Box3().setFromObject(train,true);
  const margin=(DECK_WIDTH-(obstacle.max.x-obstacle.min.x))/2-WALL_THICKNESS;
  function mountPlayer(player) {
    const placement=scene.children.find(o=>o.getObjectByName('Tanuki_茶タヌキ全体'));
    const baseY=placement.position.y;
    placement.position.x+=center.x-1-player.position.x;
    placement.position.z+=center.z+length/2-.6-player.position.z;
    placement.position.y=baseY+ELEVATION;player.update(0);
    const previous=player.position.clone();
    function update() {
      const p=player.position.clone();
      p.x=THREE.MathUtils.clamp(p.x,center.x-DECK_WIDTH/2+WALL_THICKNESS+PLAYER_RADIUS,center.x+DECK_WIDTH/2-WALL_THICKNESS-PLAYER_RADIUS);
      p.z=THREE.MathUtils.clamp(p.z,center.z-length/2+PLAYER_RADIUS,center.z+length/2-PLAYER_RADIUS);
      // Prevent walking through the parked carriage. Resolve each axis so the
      // existing speed and directional input remain untouched on clear paths.
      const minX=obstacle.min.x-PLAYER_RADIUS,maxX=obstacle.max.x+PLAYER_RADIUS;
      const minZ=obstacle.min.z-PLAYER_RADIUS,maxZ=obstacle.max.z+PLAYER_RADIUS;
      if(p.x>minX&&p.x<maxX&&p.z>minZ&&p.z<maxZ) {
        if(previous.x<=minX+1e-6)p.x=minX;else if(previous.x>=maxX-1e-6)p.x=maxX;
        else if(previous.z<=minZ+1e-6)p.z=minZ;else p.z=maxZ;
      }
      placement.position.x+=p.x-player.position.x;placement.position.z+=p.z-player.position.z;
      player.update(0);previous.copy(player.position);
    }
    update();return {update,cameraLift:ELEVATION};
  }
  return {group,source,mountPlayer,length,center,railTop,margin,textured,obstacle};
}
