import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWalking } from './walking.js';
import { cellCenter, constrainPosition } from '../map/world.js';
export const PLAYER_SCALE = 0.45;
export async function createPlayer(scene,camera) {
  const gltf=await new GLTFLoader().loadAsync(new URL('../../assets/characters/tanuki/tanuki_brown_v2.glb', import.meta.url).href);
  const model=gltf.scene;
  const tanuki=model.getObjectByName('Tanuki_茶タヌキ全体');
  if(!tanuki) throw new Error('茶タヌキv2が見つかりません');
  // Preserve the authored hierarchy/scale, excluding the GLB test floor.
  model.traverse(object=>{
    if(object.isLight || object.name.startsWith('Ground_')) object.visible=false;
    if(object.isMesh) {object.castShadow=true;object.receiveShadow=true;}
  });
  const placement=new THREE.Group(); placement.add(model); scene.add(placement);
  placement.scale.setScalar(PLAYER_SCALE);
  placement.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(tanuki,true);
  placement.position.y=-bounds.min.y;
  const spawn=cellCenter(7,12); // I18 plaza; F18 remains completely empty.
  const center=bounds.getCenter(new THREE.Vector3());
  placement.position.x=spawn.x-center.x; placement.position.z=spawn.z-center.z;
  const walking=createWalking(model,camera,PLAYER_SCALE);
  const position=new THREE.Vector3();
  function update(dt) {
    walking.update(dt);
    tanuki.getWorldPosition(position);
    const before=position.clone(); constrainPosition(position);
    placement.position.x+=position.x-before.x; placement.position.z+=position.z-before.z;
    placement.updateMatrixWorld(true);
    tanuki.getWorldPosition(position);
  }
  update(0);
  return {update,position,height:bounds.max.y-bounds.min.y};
}
