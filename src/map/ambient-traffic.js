import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {cellCenter,Z_EDGES,ROAD_WIDTH,CARRIAGEWAY_WIDTH} from './world.js';

export const TRAFFIC_SPEED=2.6;
const SCALE=.7;

// Separate background routes: never modify the player's outer-drive path.
export function createTrafficRoute(area,clockwise=false) {
  const lane=CARRIAGEWAY_WIDTH/4*(clockwise?-1:1);
  const left=cellCenter(1,3).x+lane,right=cellCenter(12,3).x-lane;
  const top=Z_EDGES[area==='upper'?3:9]+ROAD_WIDTH/2+lane;
  const bottom=Z_EDGES[area==='upper'?9:13]+ROAD_WIDTH/2-lane;
  // The outer turn has a wider radius to keep the whole car clear of the outer curb.
  const r=clockwise?2.5:.625,k=.55228475,path=new THREE.CurvePath();
  const v=(x,z)=>new THREE.Vector3(x,0,z);
  const line=(a,b)=>path.add(new THREE.LineCurve3(a,b));
  const bend=(a,b,c,d)=>path.add(new THREE.CubicBezierCurve3(a,b,c,d));
  line(v(left+r,bottom),v(right-r,bottom));
  bend(v(right-r,bottom),v(right-r+k*r,bottom),v(right,bottom-r+k*r),v(right,bottom-r));
  line(v(right,bottom-r),v(right,top+r));
  bend(v(right,top+r),v(right,top+r-k*r),v(right-r+k*r,top),v(right-r,top));
  line(v(right-r,top),v(left+r,top));
  bend(v(left+r,top),v(left+r-k*r,top),v(left,top+r-k*r),v(left,top+r));
  line(v(left,top+r),v(left,bottom-r));
  bend(v(left,bottom-r),v(left,bottom-r+k*r),v(left+r-k*r,bottom),v(left+r,bottom));
  path.arcLengthDivisions=2048;path.updateArcLengths();
  const length=path.getLength(),sign=clockwise?-1:1;
  const fraction=d=>((sign*d%length)+length)%length/length;
  return {length,area,clockwise,point:d=>path.getPointAt(fraction(d)),tangent:d=>path.getTangentAt(fraction(d)).multiplyScalar(sign)};
}

export async function createAmbientTraffic(scene) {
  const root=new THREE.Group();root.name='ambient-traffic';
  const specs=[['suv','upper',false,.12],['taxi','lower',false,0],['police','upper',true,.3]];
  const cars=await Promise.all(specs.map(async([name,area,clockwise,phase])=>{
    const {scene:model}=await new GLTFLoader().loadAsync(new URL(`../../assets/vehicles/${name}.glb`,import.meta.url).href);
    model.traverse(o=>{if(o.isLight)o.visible=false;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    model.scale.setScalar(SCALE);model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model,true),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    // Kenney vehicle fronts point along +Z. Keep native proportions and ground the wheels.
    model.position.set(-center.x,-bounds.min.y,-center.z);
    const object=new THREE.Group();object.name=`ambient-${name}`;object.add(model);root.add(object);
    const route=createTrafficRoute(area,clockwise);
    return {object,route,size,distance:route.length*phase};
  }));
  function update(dt) {
    for(const car of cars) {
      car.distance=(car.distance+TRAFFIC_SPEED*dt)%car.route.length;
      car.object.position.copy(car.route.point(car.distance));
      const tangent=car.route.tangent(car.distance);
      car.object.rotation.y=Math.atan2(tangent.x,tangent.z);
    }
  }
  update(0);scene.add(root);
  return {root,cars,update};
}



