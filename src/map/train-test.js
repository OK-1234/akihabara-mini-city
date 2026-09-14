import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSedanTest } from './sedan-test.js';
import { ELEVATION } from './world.js';

// Match the approximate height/presence of calibration C, including collector.
// Do not stretch this deliberately short carriage to the placeholder length.
export const TRAIN_SCALE = .95;
export async function createTrainTest(scene) {
  const sedan=await createSedanTest(scene),root=sedan.root;
  const placeholder=root.getObjectByName('calibration-train');
  const gltf=await new GLTFLoader().loadAsync(new URL('../../assets/trains/train-electric-square-a.glb',import.meta.url).href);
  const model=gltf.scene;
  const original=new THREE.Box3().setFromObject(model,true).getSize(new THREE.Vector3());
  if(!Number.isFinite(original.length())||Math.min(original.x,original.y,original.z)<=0)throw new Error('Invalid train bounds');
  let textured=true;
  model.traverse(object=>{
    if(object.isLight)object.visible=false;
    if(object.isMesh){object.castShadow=true;object.receiveShadow=true;const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(m=>!m.map?.image))textured=false;}
  });
  const placement=new THREE.Group();placement.name='kenney-train';placement.add(model);
  if(original.z>original.x)model.rotation.y+=Math.PI/2;
  placement.scale.setScalar(TRAIN_SCALE);placement.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(placement,true),center=bounds.getCenter(new THREE.Vector3());
  placement.position.set(placeholder.position.x-center.x,ELEVATION-bounds.min.y,placeholder.position.z-center.z);
  root.remove(placeholder);root.add(placement);root.updateMatrixWorld(true);
  const placed=new THREE.Box3().setFromObject(placement,true).getSize(new THREE.Vector3());
  const measurements={original:{length:Math.max(original.x,original.z),width:Math.min(original.x,original.z),height:original.y},scale:TRAIN_SCALE,placed:{length:placed.x,width:placed.z,height:placed.y},textured};
  console.info('Kenney train measurement',measurements);
  return {root,placement,measurements,sedan};
}
