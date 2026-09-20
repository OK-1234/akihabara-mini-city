import * as THREE from 'three';
export const VIEW_HEIGHT = 9;
export function createCamera() {
  const camera=new THREE.OrthographicCamera(-12,12,9,-9,.01,200);
  const offset=new THREE.Vector3(-30,30,30);
  const target=new THREE.Vector3();
  function follow(position,dt=0,smooth=false) {
    const desired=new THREE.Vector3(position.x,.5,position.z);
    if(smooth)target.lerp(desired,1-Math.exp(-8*dt));else target.copy(desired);
    camera.position.copy(target).add(offset); camera.lookAt(target); camera.updateMatrixWorld();
  }
  function resize(width,height) {
    const aspect=width/height;
    camera.left=-VIEW_HEIGHT*aspect/2; camera.right=VIEW_HEIGHT*aspect/2;
    camera.top=VIEW_HEIGHT/2; camera.bottom=-VIEW_HEIGHT/2; camera.updateProjectionMatrix();
  }
  follow(new THREE.Vector3());
  return {camera,follow,resize};
}
