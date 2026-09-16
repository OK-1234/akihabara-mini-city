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

function roundedVolume(group,w,d,h,y,color,name) {
  const s=new THREE.Shape(),r=.35,x=-w/2,z=-d/2;
  s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);
  s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);
  s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);
  s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);
  const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:4});g.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(g,mat(color));m.position.y=y;m.name=name;m.castShadow=true;m.receiveShadow=true;group.add(m);
}

function commercial(group,b) {
  roundedVolume(group,b.width,b.depth,2.3,0,0xd4d8d6,'commercial-lower');
  roundedVolume(group,b.width-.5,b.depth-.7,b.height-2.3,2.3,0xe3e6e2,'commercial-upper');
  for(const y of [2.30,4.45])roundedVolume(group,b.width-.38,b.depth-.58,.12,y,GRAY,'commercial-belt');
  // Sparse recessed-looking bands, not an office curtain wall.
  for(const sign of [-1,1]) {
    box(group,.025,.32,b.depth-1.6,sign*(b.width-.5)/2,3.55,0,0x8d9ea4,'commercial-window');
    box(group,3.4,1.45,.035,0,.725,sign*(b.depth/2-.015),0x718e9e,'commercial-entrance');
  }
  box(group,.035,1.45,3.8,b.width/2-.015,.725,1,0x718e9e,'commercial-east-entrance');
  box(group,.40,.15,4.5,b.width/2-.04,1.7,1,WHITE,'commercial-canopy');
  box(group,1.1,.35,1.25,.5,b.height+.175,-1.5,WHITE,'commercial-roof-unit');
  roofGarden(group,{...b,width:b.width-.7,depth:b.depth-.9},'B');
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
      const canopy=details.getObjectByName('emphasized-canopy');canopy.scale.x=1.18;
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
