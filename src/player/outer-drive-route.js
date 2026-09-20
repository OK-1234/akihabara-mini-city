import * as THREE from 'three';
import {cellCenter, Z_EDGES, ROAD_WIDTH, CARRIAGEWAY_WIDTH} from '../map/world.js';

// Counterclockwise in the map: south → east → north → west.
// Rounded corners stay inside the existing outer roadway, without moving the map.
export function createOuterDriveRoute() {
  const lane=CARRIAGEWAY_WIDTH/4; // Inner (left) lane for counterclockwise travel.
  const left=cellCenter(1,3).x+lane,right=cellCenter(12,3).x-lane;
  const top=Z_EDGES[3]+ROAD_WIDTH/2+lane,bottom=Z_EDGES[13]+ROAD_WIDTH/2-lane,r=2.3-lane,k=.55228475;
  const path=new THREE.CurvePath();
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
  const length=path.getLength(),fraction=d=>((d%length)+length)%length/length;
  return {length,point:d=>path.getPointAt(fraction(d)),tangent:d=>path.getTangentAt(fraction(d)),
    nearest(position){let best=0,error=Infinity;for(let i=0;i<1024;i++){const d=i*length/1024,e=path.getPointAt(i/1024).distanceToSquared(position);if(e<error){error=e;best=d;}}return best;}};
}
