import * as THREE from 'three';
import {createDensityTest,DENSITY_BUILDINGS} from './density-test.js';

export const CLEAN_BUILDING_IDS=['south-west','south-east'];
export const CLEAN_ENTRANCE={width:1.95,height:1.7,canopyWidth:2.2,canopyDepth:.42};

export async function createCleanBuildingsTest(scene) {
  const test=await createDensityTest(scene);
  return decorateCityBuildings(test,DENSITY_BUILDINGS,CLEAN_BUILDING_IDS);
}

// Shared appearance only: callers supply their own map, volumes and positions.
export function decorateCityBuildings(test,configs,ids=configs.map(b=>b.id)) {
  const palette={wall:0xefefeb,warmWall:0xe2e7e8,trim:0xd1d5d3,frame:0x657782,glass:0x5c8fae,equipment:0xd8dedd,green:0x8fae79};
  const materials=Object.fromEntries(Object.entries(palette).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:k==='glass'?.65:.9})]));
  for(const id of ids) {
    const group=test.root.getObjectByName(id),b=configs.find(b=>b.id===id);
    const body=test.boxes[configs.indexOf(b)];
    body.material=materials[(b.tone==='white'||id==='south-west')?'wall':'warmWall'];
    // Keep the actual volume, position and orientation; replace only the old
    // two entrance details. The other four buildings are untouched.
    for(const child of [...group.children])if(child!==body)group.remove(child);
    const details=new THREE.Group();details.name='clean-building-details';group.add(details);
    function box(w,h,d,x,y,z,material,name) {
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
      mesh.position.set(x,y,z);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;details.add(mesh);return mesh;
    }
    const front=b.depth/2;
    box(CLEAN_ENTRANCE.width,CLEAN_ENTRANCE.height,.035,0,.85,front+.02,materials.glass,'wide-entrance');
    // Off-centre doorway within a broad glazed entrance, not a single thin door.
    box(.035,1.7,.04,.32,.85,front+.025,materials.frame,'entrance-mullion');
    box(CLEAN_ENTRANCE.canopyWidth,.16,CLEAN_ENTRANCE.canopyDepth,0,1.89,front+.15,materials.wall,'emphasized-canopy');
    const roadSide=b.roadSide??(id==='south-west'?-1:1);
    box(.025,1.55,b.depth-.60,roadSide*(b.width/2+.014),.85,0,materials.glass,'street-entrance-glazing');
    box(.32,.16,b.depth-.16,roadSide*(b.width/2+.10),1.89,0,materials.wall,'street-canopy');
    // Broad continuous glazing and shallow horizontal ledges. The body volume
    // is unchanged; facade relief is only a few hundredths of a game unit.
    for(const y of (b.windowLevels??[2.75,3.95]).filter(y=>y+.4<b.height)) {
      box(b.width-.26,.66,.025,0,y,front+.014,materials.glass,'front-window');
      box(b.width-.40,.66,.025,0,y,-front-.014,materials.glass,'rear-window');
      box(.025,.66,b.depth-.26,roadSide*(b.width/2+.014),y,0,materials.glass,'street-window');
      box(b.width-.08,.12,.065,0,y-.40,front+.025,materials.wall,'front-facade-step');
      box(.065,.12,b.depth-.08,roadSide*(b.width/2+.025),y-.40,0,materials.wall,'street-facade-step');
    }
    // Thin dark borders sit behind the glass, leaving its continuous horizontal
    // shape legible. A single sash on the long street bands avoids a dense grid.
    const glazing=details.children.filter(m=>m.name.endsWith('-window')||['wide-entrance','street-entrance-glazing'].includes(m.name));
    for(const pane of glazing) {
      const p=pane.geometry.parameters,side=p.width<.1;
      const {x,y,z}=pane.position;
      box(side?.024:p.width+.10,p.height+.10,side?p.depth+.10:.024,
        side?roadSide*(b.width/2+.006):x,y,side?z:Math.sign(z)*(front+.006),materials.frame,'glazing-frame');
      if(side)box(.035,p.height,.04,x+roadSide*.008,y,.24,materials.frame,'street-sash');
    }
    // Low parapet stays within the footprint; two small rooftop units.
    for(const sign of [-1,1]) {
      box(b.width,.18,.09,0,b.height+.09,sign*(front-.045),materials.trim,'roof-rim');
      box(.09,.18,b.depth-.18,sign*(b.width/2-.045),b.height+.09,0,materials.trim,'roof-rim');
    }
    box(.60,.36,.60,-.45,b.height+.18,-Math.min(.65,b.depth/2-.4),materials.equipment,'roof-unit');
    box(.42,.25,.50,.43,b.height+.125,Math.min(.40,b.depth/2-.35),materials.equipment,'roof-unit');
    if(b.greenRoof||id==='south-west') {
      // One compact roof garden (~20% green coverage), clear of both units.
      // Keep a visible pale border, white roof and the original parapet.
      box(1.25,.10,1.40,-.50,b.height+.05,.70,materials.trim,'roof-garden-bed');
      box(1.15,.08,1.30,-.50,b.height+.14,.70,materials.green,'roof-garden-green');
      box(.42,.24,.46,-.78,b.height+.30,1.04,materials.wall,'roof-garden-equipment');
      box(.38,.18,.40,-.23,b.height+.27,.36,materials.wall,'roof-garden-equipment');
    }
  }
  // Reuse the second ground planter as one small tree; retain the other shrub,
  // existing bench and lamp. The circulation layout is unchanged.
  const oldPlant=test.root.getObjectByName('plant-2');
  if(oldPlant) {
  const tree=new THREE.Group();tree.name='small-ground-tree';tree.position.set(oldPlant.position.x,0,oldPlant.position.z);
  const trunk=new THREE.Mesh(new THREE.BoxGeometry(.10,.80,.10),materials.frame);trunk.position.y=.70;
  const crown=new THREE.Mesh(new THREE.BoxGeometry(.65,.65,.65),materials.green);crown.position.y=1.25;
  for(const m of [trunk,crown]){m.castShadow=true;m.receiveShadow=true;tree.add(m);}
  oldPlant.removeFromParent();test.root.add(tree);
  }
  return test;
}
