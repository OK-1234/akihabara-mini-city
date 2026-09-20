import * as THREE from 'three';
import {ELEVATION,Z_EDGES} from './world.js';

const materials=new Map();
function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return materials.get(color);}
function box(group,w,h,d,x,y,z,color,name) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
  mesh.position.set(x,y,z);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
const WHITE=0xeceeea,GRAY=0xc8cfce,GLASS=0x85abbf,GREEN=0x91af7e;

// Roof schemes A-E; F deliberately leaves a roof without planting.
function roofGarden(group,b,pattern) {
  group.userData.roofPattern=pattern;
  const y=b.height,w=b.width,d=b.depth;
  function bed(bw,bd,x,z){
    box(group,bw+.08,.08,bd+.08,x,y+.04,z,GRAY,'roof-planter');
    box(group,bw,.075,bd,x,y+.115,z,GREEN,'roof-green');
  }
  if(pattern==='A')bed(w*.34,d*.38,-w*.24,d*.22);
  if(pattern==='B')bed(.30,d-.45,-w/2+.25,0);
  if(pattern==='C'){
    bed(w*.28,d*.25,-w*.25,d*.25);bed(w*.28,d*.25,w*.25,-d*.25);
    box(group,.30,.22,.34,-w*.25,y+.26,d*.25,0x7c9d70,'roof-low-shrub');
  }
  if(pattern==='D'){
    bed(w*.38,d*.40,-w*.23,d*.23);
    box(group,.32,.23,.32,-w*.23,y+.265,d*.23,WHITE,'roof-white-feature');
  }
  if(pattern==='E')bed(.32,Math.min(.48,d*.35),-w/2+.28,d*.24);
}

function roundedVolume(group,w,d,h,y,color,name,r=.35) {
  const s=new THREE.Shape(),x=-w/2,z=-d/2;
  s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);
  s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);
  s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);
  s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);
  const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:12});g.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(g,mat(color));m.position.y=y;m.name=name;m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
}

function commercial(group,b) {
  // Keep the footprint and total height; the taller lower storey carries the upper pavilion.
  const lower=3.5,r=1.55;
  roundedVolume(group,b.width,b.depth,lower,0,0xaab7c0,'commercial-lower',r);
  roundedVolume(group,b.width-.5,b.depth-.7,b.height-lower,lower,0xbdc7cd,'commercial-upper',r-.15);
  for(const y of [lower,b.height-.14])roundedVolume(group,b.width-.44,b.depth-.64,.12,y,GRAY,'commercial-belt',r-.12);
  // Curved glazing ribbons follow the rounded envelope, including the corners.
  for(const [y,h,w,d] of [[1.0,1.1,b.width+.015,b.depth+.015],[4.35,.45,b.width-.485,b.depth-.685]])
    roundedVolume(group,w,d,h,y,0x5799af,'commercial-glass-ribbon',r);
  roundedVolume(group,b.width-.85,b.depth-1.08,.11,b.height+.02,0x94b68d,'commercial-roof-garden',1.35);
  // A single garden, crossed by a quiet pale path, with irregular low planting islands.
  box(group,.46,.025,b.depth-1.6,.3,b.height+.14,0,0xdde2d9,'garden-path');
  for(const [x,z,w,d] of [[-1.05,-2.5,1.1,1.5],[.95,2.4,.75,1.1],[-.9,1.1,.9,1.8]])
    roundedVolume(group,w,d,.15,b.height+.13,0x7eaa80,'garden-shrub',.32).position.set(x,b.height+.13,z);
  box(group,.75,.3,.85,.95,b.height+.15,-2.75,WHITE,'commercial-roof-unit');
}

function tower(group,b) {
  box(group,b.width,1.2,b.depth,0,.6,0,WHITE,'tower-podium');
  const w=b.width-.65,d=b.depth-.65,h=b.height-1.2;
  box(group,w,h,d,0,1.2+h/2,0,GLASS,'tower-glass');
  for(const sign of [-1,1]) {
    for(let i=0;i<=5;i++) {
      const x=-w/2+i*w/5,z=-d/2+i*d/5;
      box(group,.055,h,.045,x,1.2+h/2,sign*(d/2+.015),WHITE,'tower-vertical-grid');
      box(group,.045,h,.055,sign*(w/2+.015),1.2+h/2,z,WHITE,'tower-vertical-grid');
    }
    for(let i=0;i<=6;i++) {
      const y=1.2+i*h/6;
      box(group,w,.05,.045,0,y,sign*(d/2+.02),WHITE,'tower-horizontal-grid');
      box(group,.045,.05,d,sign*(w/2+.02),y,0,WHITE,'tower-horizontal-grid');
    }
  }
  box(group,w+.1,.18,d+.1,0,b.height+.09,0,WHITE,'tower-roof');
  box(group,1.0,.35,.85,.5,b.height+.355,-.65,WHITE,'tower-equipment');
  roofGarden(group,{...b,width:w,depth:d,height:b.height+.18},'D');
}

function stationRoof(scene) {
  const root=new THREE.Group();root.name='station-arched-roof';root.position.z=(Z_EDGES[10]+Z_EDGES[11])/2;scene.add(root);
  const width=7.6,depth=3.95,spring=ELEVATION+3,segments=16,vertices=[],indices=[];
  const point=(i,z)=>new THREE.Vector3(-width/2+width*i/segments,spring+1.15*Math.sin(Math.PI*i/segments),z);
  for(let i=0;i<=segments;i++)for(const z of [-depth/2,depth/2])vertices.push(...point(i,z).toArray());
  for(let i=0;i<segments;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const shell=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x799fb7,roughness:.6,transparent:true,opacity:.56,depthWrite:false,side:THREE.DoubleSide}));
  shell.name='light-arch-shell';root.add(shell);
  for(const z of [-depth/2,0,depth/2]) {
    const curve=new THREE.CatmullRomCurve3(Array.from({length:segments+1},(_,i)=>point(i,z)));
    const rib=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.04,4,false),mat(WHITE));rib.name='arch-rib';root.add(rib);
  }
  for(const x of [-3.65,3.65])for(const z of [-1.72,1.72])box(root,.09,3,.09,x,ELEVATION+1.5,z,GRAY,'roof-post');
  return root;
}

export function applyCityAppearance(root,bodies,configs,scene) {
  configs.forEach((b,i)=>{
    const group=root.getObjectByName(b.id),body=bodies[i],details=group.getObjectByName('clean-building-details');
    if(['udx','yodobashi'].includes(b.id)) {
      // Retain the invisible footprint envelope for placement verification.
      body.visible=false;details.removeFromParent();
      if(b.id==='udx')tower(group,b);else commercial(group,b);return;
    }
    body.material=mat([0xe8ecec,0xcdd7dd,0xdedfd8,0xf0efea,0xbfcdd4][i%5]);
    const variant=i%3,factor=[.80,1,.68][variant];
    const panes=details.children.filter(m=>m.name.endsWith('-window')||['wide-entrance','street-entrance-glazing'].includes(m.name));
    const frames=details.children.filter(m=>m.name==='glazing-frame');
    panes.forEach((p,j)=>{
      p.material=mat([0x668fa8,0x809da9,0x668394][variant]);
      if(!p.name.endsWith('-window'))return;
      const side=p.geometry.parameters.width<.1,axis=side?'z':'x';p.scale[axis]=factor;frames[j].scale[axis]=factor;
      if(variant!==1) {
        const long=(side?p.geometry.parameters.depth:p.geometry.parameters.width)*factor;
        for(const offset of variant===0?[0]:[-long/6,long/6]) {
          box(details,side?.045:.12,.74,side?.12:.045,
            side?p.position.x:offset,p.position.y,side?offset:p.position.z,
            b.tone==='white'?WHITE:GRAY,'window-divider');
        }
      }
    });
    for(const m of details.children) {
      if(m.name==='emphasized-canopy')m.scale.x=[.82,1,.92][variant];
      if(m.name==='street-canopy')m.scale.z=[1,.8,.9][variant];
      if(m.name==='roof-rim'){m.scale.y=[1,1.6,.65][variant];m.position.y=b.height+.09*m.scale.y;}
    }
    const units=details.children.filter(m=>m.name==='roof-unit');
    if(variant===2)units[1]?.removeFromParent();
    roofGarden(group,b,b.id==='support'?'E':['A','B','C','D','E','F'][i%6]);
    if(b.id==='support') {
      box(group,.18,b.height,.12,-b.width/2+.15,b.height/2,b.depth/2+.025,GRAY,'support-vertical-frame');
      // Street-facing west elevation: retain upper floors, physically cut out the ground floor.
      const entranceHeight=2.2,opening=1.5,wallDepth=b.depth-opening;
      body.geometry.dispose();body.geometry=new THREE.BoxGeometry(b.width,b.height-entranceHeight,b.depth);
      body.position.y=entranceHeight+(b.height-entranceHeight)/2;
      // Retire the old surface-mounted doors, frames and canopies at ground level only.
      for(const mesh of [...details.children])if(mesh.position.y<entranceHeight)mesh.removeFromParent();
      const side=box(group,b.width,entranceHeight,wallDepth,0,entranceHeight/2,b.depth/2-wallDepth/2,0xe8ecec,'support-entrance-screen-wall');
      side.material=body.material;
      const back=box(group,.18,entranceHeight,opening,b.width/2-.09,entranceHeight/2,-wallDepth/2,0xe8ecec,'support-entrance-back');back.material=body.material;
      const jamb=box(group,b.width,entranceHeight,.08,0,entranceHeight/2,-b.depth/2+.04,0xe8ecec,'support-entrance-north-wall');jamb.material=body.material;
      // Entering from the west, the north inner wall is on the visitor's left.
      const signZ=-b.depth/2+.10;
      box(group,.56,1.02,.035,-.88,1.17,signZ,0xf3f4f0,'support-floor-directory');
      for(let i=0;i<4;i++)box(group,.39,.025,.008,-.88,1.46-i*.19,signZ+.022,0x93a3ac,'support-directory-line');
      box(group,b.width-.18,.025,opening-.08,-.09,.018,-wallDepth/2+.04,0xcdd4d5,'support-recess-floor');
      box(group,.32,.14,opening+.12,-b.width/2-.08,entranceHeight+.07,-wallDepth/2,WHITE,'support-recess-canopy');
      group.userData.entrance={width:opening-.08,depth:b.width-.18,height:entranceHeight,screenWall:wallDepth};
    }
  });
  stationRoof(scene);
}

export function addCityGreenery(scene) {
  const root=new THREE.Group();root.name='city-ground-greenery';scene.add(root);
  const spots=[[-9,-17.3,true],[-8.2,-8.8,false],[3.6,-6,false],[9.3,14.2,true],[-15.6,10.8,true],[15.6,10.8,false],[0,25.2,true],[-2.65,-8.7,false]];
  for(const [i,[x,z,tree]] of spots.entries()) {
    const g=new THREE.Group();g.name=`city-plant-${i}`;g.position.set(x,0,z);root.add(g);
    box(g,.56,.25,.56,0,.125,0,GRAY,'ground-planter');
    if(tree) {
      box(g,.1,.85,.1,0,.675,0,0x7a8178,'tree-trunk');
      box(g,.64,.70,.64,0,1.25,0,0x8eaa7b,'tree-crown');
    } else box(g,.46,.38,.46,0,.44,0,GREEN,'ground-shrub');
  }
  return root;
}
