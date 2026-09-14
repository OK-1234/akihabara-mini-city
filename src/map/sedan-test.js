import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createCalibration } from './calibration.js';

export const SEDAN_SCALE = 0.80;
export async function createSedanTest(scene) {
  const root=createCalibration(scene);
  const placeholder=root.getObjectByName('calibration-car');
  const gltf=await new GLTFLoader().loadAsync(new URL('../../assets/vehicles/sedan.glb',import.meta.url).href);
  const model=gltf.scene;
  model.traverse(object=>{if(object.isLight)object.visible=false;if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
  const originalBounds=new THREE.Box3().setFromObject(model,true);
  const size=originalBounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.length())||Math.min(size.x,size.y,size.z)<=0)throw new Error('sedan.glb has invalid bounds');
  // Preserve all original Kenney proportions with one uniform display scale.
  const length=Math.max(size.x,size.z),width=Math.min(size.x,size.z);
  const scale=SEDAN_SCALE;
  const placement=new THREE.Group();placement.name='kenney-sedan';
  placement.add(model);
  if(size.z>size.x)model.rotation.y+=Math.PI/2;
  placement.scale.setScalar(scale);
  placement.updateMatrixWorld(true);
  const fitted=new THREE.Box3().setFromObject(placement,true),center=fitted.getCenter(new THREE.Vector3());
  placement.position.set(placeholder.position.x-center.x,-fitted.min.y,placeholder.position.z-center.z);
  root.remove(placeholder);root.add(placement);
  root.updateMatrixWorld(true);
  const actual=new THREE.Box3().setFromObject(placement,true).getSize(new THREE.Vector3());
  const measurements={original:{length,width,height:size.y},scale,placed:{length:actual.x,width:actual.z,height:actual.y},position:placement.position.toArray()};
  console.info('Kenney sedan measurement',measurements);
  return {root,placement,measurements};
}
