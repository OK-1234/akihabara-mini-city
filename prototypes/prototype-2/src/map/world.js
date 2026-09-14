import * as THREE from 'three';
import { layout } from './layout.js';

export const CELL_SIZE = 2;
export const ELEVATION = 2.6; // Track surface; all elevated pieces share this height.
export const DECK_THICKNESS = 0.25;
export const SIDEWALK_WIDTH = 0.45;
export const EDGE_MARGIN = 0.4;
export const ROAD_WIDTH = 4;
export const VIADUCT_WIDTH = 4;
export const STATION_REAR_SPACE = 3;
export const SEA_EXTENSION = 80;
export const COLUMN_WIDTHS = [2,4,2,2,2,2,2,2,2,2,2,2,4,2];
export const ROW_DEPTHS = [2,3,2,4,2,2,2,2,2,7,4,3,4,4,2];
export const WIDTH = COLUMN_WIDTHS.reduce((a,b)=>a+b,0);
export const DEPTH = ROW_DEPTHS.reduce((a,b)=>a+b,0);
export const X_EDGES = [-WIDTH/2];
export const Z_EDGES = [-DEPTH/2];
for(const size of COLUMN_WIDTHS) X_EDGES.push(X_EDGES.at(-1)+size);
for(const size of ROW_DEPTHS) Z_EDGES.push(Z_EDGES.at(-1)+size);
export function cellCenter(col, row) {
  return new THREE.Vector3((X_EDGES[col]+X_EDGES[col+1])/2, 0, (Z_EDGES[row]+Z_EDGES[row+1])/2);
}
const elevated = new Set(['vertical', 'horizontal', 'station']);
export function groundType(col, row) {
  const type = layout[row]?.[col];
  if (!elevated.has(type)) return type;
  // Excel hides the road beneath the elevated layer. Continue the existing
  // east/west roads (rows 9,15), and north/south loop (columns C,N).
  if (row === 3 || row === 9 || col === 1 || col === 12) return 'road';
  return 'empty';
}
export function constrainPosition(position) {
  position.x = THREE.MathUtils.clamp(position.x, -WIDTH / 2 + EDGE_MARGIN, WIDTH / 2 - EDGE_MARGIN);
  // Row 6 is sea. Stop inside the beach, without excavating the ground.
  position.z = THREE.MathUtils.clamp(position.z, -DEPTH / 2 + CELL_SIZE + EDGE_MARGIN, DEPTH / 2 - EDGE_MARGIN);
}
export function createWorld(scene) {
  const group = new THREE.Group();
  group.name = 'Excel_B6_O20';
  scene.add(group);
  const colors = {sea:0x93cfec,beach:0xe5cd9c,road:0x777f88,plot:0xcacdcf,supportPlot:0xa8d5ba,udxPlot:0xc1b2d5,yodobashiPlot:0xe7b2bd,plaza:0xf4e8be,fountainReserve:0xf4e8be,empty:0xf1f4f3};
  const materials = Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:1})]));
  const sidewalk = new THREE.MeshStandardMaterial({color:0xe0e1dc,roughness:1});
  function box(w,h,d,x,y,z,material,name) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z); mesh.name=name; mesh.receiveShadow=true; group.add(mesh); return mesh;
  }
  for(let row=0;row<15;row++) for(let col=0;col<14;col++) {
    const p=cellCenter(col,row), type=groundType(col,row);
    const width=COLUMN_WIDTHS[col], depth=ROW_DEPTHS[row];
    const address=`${String.fromCharCode(66+col)}${row+6}`;
    const rearGap=row===9 && col>1 && col<12;
    const surfaceDepth=rearGap?ROAD_WIDTH:depth;
    const surfaceZ=rearGap?Z_EDGES[row]+ROAD_WIDTH/2:p.z;
    box(width,.08,surfaceDepth,p.x,-.04,surfaceZ,materials[type],`${address}:${type}`);
    if(rearGap) box(width,.08,STATION_REAR_SPACE,p.x,-.04,Z_EDGES[row+1]-STATION_REAR_SPACE/2,materials.empty,`${address}:station-rear-space`);
    if(type==='road') {
      for(const [dc,dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if(groundType(col+dc,row+dr)==='road' && !(rearGap && dr===1)) continue;
        box(dc?SIDEWALK_WIDTH:width,.014,dr?SIDEWALK_WIDTH:surfaceDepth,p.x+dc*(width-SIDEWALK_WIDTH)/2,.007,surfaceZ+dr*(surfaceDepth-SIDEWALK_WIDTH)/2,sidewalk,`${address}:sidewalk`);
      }
    }
  }
  // Permanently translucent prototype decks keep the player visible beneath
  // the single elevated layer, without camera switching or occluder logic.
  function deck(c1,r1,c2,r2,color,name) {
    const a=cellCenter(c1,r1), b=cellCenter(c2,r2);
    const material=new THREE.MeshStandardMaterial({color,transparent:true,opacity:.30,depthWrite:false,roughness:1});
    const mesh=box(X_EDGES[c2+1]-X_EDGES[c1],DECK_THICKNESS,Z_EDGES[r2+1]-Z_EDGES[r1],(X_EDGES[c1]+X_EDGES[c2+1])/2,ELEVATION-DECK_THICKNESS/2,(Z_EDGES[r1]+Z_EDGES[r2+1])/2,material,name);
    mesh.receiveShadow=false;
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:.7}));
    edge.position.copy(mesh.position); group.add(edge);
  }
  deck(6,2,7,9,0x5075aa,'H8:I15 縦高架');
  deck(0,10,4,10,0x7599bf,'B16:F16 横高架');
  deck(9,10,13,10,0x7599bf,'K16:O16 横高架');
  deck(5,10,8,11,0xd99547,'G16:J17 駅');
  box(WIDTH+SEA_EXTENSION*2,.08,SEA_EXTENSION,0,-.04,Z_EDGES[0]-SEA_EXTENSION/2,materials.sea,'sea:extension-north');
  for(const sign of [-1,1]) box(SEA_EXTENSION,.08,ROW_DEPTHS[0],sign*(WIDTH+SEA_EXTENSION)/2,-.04,cellCenter(0,0).z,materials.sea,'sea:extension-side');
  return group;
}
