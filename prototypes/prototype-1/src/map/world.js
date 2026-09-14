import * as THREE from 'three';
import { layout } from './layout.js';

export const CELL_SIZE = 2;
export const ELEVATION = 4; // Track surface; all elevated pieces share this height.
export const DECK_THICKNESS = 0.25;
export const SIDEWALK_WIDTH = 0.18;
export const EDGE_MARGIN = 0.45;
export const WIDTH = 14 * CELL_SIZE;
export const DEPTH = 15 * CELL_SIZE;
export function cellCenter(col, row) {
  return new THREE.Vector3((col - 6.5) * CELL_SIZE, 0, (row - 7) * CELL_SIZE);
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
    const address=`${String.fromCharCode(66+col)}${row+6}`;
    box(CELL_SIZE,.08,CELL_SIZE,p.x,-.04,p.z,materials[type],`${address}:${type}`);
    if(type==='road') {
      for(const [dc,dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if(groundType(col+dc,row+dr)==='road') continue;
        const offset=(CELL_SIZE-SIDEWALK_WIDTH)/2;
        box(dc?SIDEWALK_WIDTH:CELL_SIZE,.014,dr?SIDEWALK_WIDTH:CELL_SIZE,p.x+dc*offset,.007,p.z+dr*offset,sidewalk,`${address}:sidewalk`);
      }
    }
  }
  // Permanently translucent prototype decks keep the player visible beneath
  // the single elevated layer, without camera switching or occluder logic.
  function deck(c1,r1,c2,r2,color,name) {
    const a=cellCenter(c1,r1), b=cellCenter(c2,r2);
    const material=new THREE.MeshStandardMaterial({color,transparent:true,opacity:.30,depthWrite:false,roughness:1});
    const mesh=box((c2-c1+1)*CELL_SIZE,DECK_THICKNESS,(r2-r1+1)*CELL_SIZE,(a.x+b.x)/2,ELEVATION-DECK_THICKNESS/2,(a.z+b.z)/2,material,name);
    mesh.receiveShadow=false;
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:.7}));
    edge.position.copy(mesh.position); group.add(edge);
  }
  deck(6,2,7,9,0x5075aa,'H8:I15 縦高架');
  deck(0,10,4,10,0x7599bf,'B16:F16 横高架');
  deck(9,10,13,10,0x7599bf,'K16:O16 横高架');
  deck(5,10,8,11,0xd99547,'G16:J17 駅');
  return group;
}
