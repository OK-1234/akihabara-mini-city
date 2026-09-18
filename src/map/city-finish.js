import * as THREE from 'three';
import {WIDTH,X_EDGES,Z_EDGES,CARRIAGEWAY_WIDTH,ROAD_WIDTH,SIDEWALK_WIDTH,cellCenter} from './world.js';

// Production-only surface dressing. No movement rules, map dimensions or asset changes.
export function finishCity(scene) {
  const root=new THREE.Group();root.name='city-first-finish';scene.add(root);
  const world=scene.getObjectByName('Excel_B6_O20');
  const cache=new Map();const mat=c=>{if(!cache.has(c))cache.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.95}));return cache.get(c);};
  function box(parent,w,h,d,x,y,z,c,name){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.name=name;m.receiveShadow=true;m.castShadow=h>.1;parent.add(m);return m;}
  function surface(shape,color,y,name){const g=new THREE.ShapeGeometry(shape,64);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat(color));m.position.y=y;m.name=name;m.receiveShadow=true;root.add(m);return m;}
  const plazaTiles=world.children.filter(o=>/:(plaza|fountainReserve)$/.test(o.name));
  // Procedural paving texture: muted concentric courses, staggered stone joints.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');
  const stoneColors=['#c7cecf','#d8d9d3','#cbd3d8','#deded7','#cfd4d3'];
  ctx.fillStyle='#bdc6c7';ctx.fillRect(0,0,1024,1024);ctx.translate(512,512);
  for(let ring=0;ring<17;ring++){
    const inner=ring*48,outer=inner+48,count=Math.max(8,Math.round((inner+24)/13)),step=Math.PI*2/count;
    for(let i=0;i<count;i++){
      const a=(i+ring*.43)*step,b=a+step;
      ctx.beginPath();ctx.arc(0,0,outer-.8,a+.003,b-.003);ctx.arc(0,0,inner+.8,b-.003,a+.003,true);ctx.closePath();
      ctx.fillStyle=stoneColors[(i*7+ring*3+Math.floor(i/3))%stoneColors.length];ctx.fill();
    }
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const paving=new THREE.MeshStandardMaterial({map:texture,roughness:1});
  for(const tile of plazaTiles){
    tile.material=mat(0xcdd3d4);const p=tile.geometry.parameters;
    const g=new THREE.PlaneGeometry(p.width,p.depth);g.rotateX(-Math.PI/2);
    const pos=g.attributes.position,uv=g.attributes.uv;
    for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+tile.position.x+7)/14,(pos.getZ(i)+tile.position.z-9.3)/14);
    const mesh=new THREE.Mesh(g,paving);mesh.position.set(tile.position.x,.022,tile.position.z);mesh.receiveShadow=true;mesh.name='plaza-stone-paving';root.add(mesh);
  }
  function bench(x,z,angle){
    const g=new THREE.Group();g.name='plaza-bench';g.position.set(x,0,z);g.rotation.y=angle;root.add(g);
    // Separate seat slats suggest wood without importing a texture.
    for(let i=0;i<3;i++)box(g,1.5,.09,.13,0,.48,-.15+i*.15,0xb89b7a,'wood-seat');
    for(let i=0;i<2;i++)box(g,1.5,.13,.07,0,.72+i*.17,-.23,0xb89b7a,'wood-back');
    for(const side of [-1,1]){box(g,.13,.5,.46,side*.69,.25,0,0x7d9d8c,'green-end');box(g,.13,.08,.46,side*.69,.64,0,0x7d9d8c,'green-arm');}
  }
  // Benches run parallel to the station-to-road axis, outside the clear central path.
  bench(2.85,14.85,-Math.PI/2);bench(-4.7,17.65,Math.PI/2);
  for(const [x,z] of [[3.4,16.15],[-5.35,17.75],[-10.22,3.8],[10.22,-10.9],[10.22,18.7]]){
    box(root,.22,.08,.22,x,.04,z,0x87969d,'plaza-lamp-base');
    box(root,.065,2.35,.065,x,1.215,z,0x778892,'plaza-lamp');
    box(root,.45,.09,.20,x+.15,2.4,z,0xc7d1d4,'plaza-lamp-head');
    box(root,.32,.015,.16,x+.15,2.35,z,0xf3f3df,'plaza-lamp-light');
  }
  for(const [x,z] of [[3.15,13.85],[-4.95,18.75]]){
    box(root,.55,.24,.65,x,.12,z,0xc7d0ce,'plaza-planter');
    box(root,.43,.26,.53,x,.36,z,0x91af8c,'plaza-low-shrub');
  }
  // A few selected passages only: staggered pale stone, at consistent world scale.
  const stoneCanvas=document.createElement('canvas');stoneCanvas.width=stoneCanvas.height=256;
  const sc=stoneCanvas.getContext('2d');sc.fillStyle='#cdd2d1';sc.fillRect(0,0,256,256);
  for(let row=0;row<8;row++)for(let col=-1;col<5;col++){
    sc.fillStyle=stoneColors[((row*3+col*7)%5+5)%5];sc.fillRect(col*64+(row%2)*32+1,row*32+1,62,30);
  }
  const stoneTexture=new THREE.CanvasTexture(stoneCanvas);stoneTexture.colorSpace=THREE.SRGBColorSpace;stoneTexture.wrapS=stoneTexture.wrapT=THREE.RepeatWrapping;stoneTexture.anisotropy=4;
  const passageMaterial=new THREE.MeshStandardMaterial({map:stoneTexture,roughness:1});
  for(const [x,z,w,d] of [[7,16.55,.85,5.6],[-8,14.45,3.65,.65],[2.9,-6.35,1.25,9.3]]){
    const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/2,uv.getY(i)*d/2);
    const mesh=new THREE.Mesh(g,passageMaterial);mesh.position.set(x,.019,z);mesh.receiveShadow=true;mesh.name='selected-passage-paving';root.add(mesh);
  }
  // Extend the same small rectangular stones over existing pedestrian surfaces.
  // World-space UVs keep stone size and joints continuous across map cells.
  for(const tile of world.children){
    if(!/:(sidewalk|empty|station-rear-space)$/.test(tile.name)||tile.position.z<Z_EDGES[3])continue;
    const p=tile.geometry.parameters;if(!p?.width||!p?.depth)continue;
    const g=new THREE.PlaneGeometry(p.width,p.depth);g.rotateX(-Math.PI/2);
    const positions=g.attributes.position,uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(positions.getX(i)+tile.position.x)/2,(positions.getZ(i)+tile.position.z)/2);
    const mesh=new THREE.Mesh(g,passageMaterial);mesh.position.set(tile.position.x,tile.position.y+p.height/2+.002,tile.position.z);
    mesh.receiveShadow=true;mesh.name='pedestrian-stone-paving';root.add(mesh);
  }
  // Existing sidewalks already provide the colour/height edge; whiten lane markings.
  for(const m of world.children)if(m.name.startsWith('road:'))m.material=mat(0xf2f3ed);
  function crossing(x,z,rotate=false){
    const g=new THREE.Group();g.name='crosswalk';g.position.set(x,0,z);g.rotation.y=rotate?Math.PI/2:0;root.add(g);
    for(let i=0;i<6;i++)box(g,1.45,.012,.28,0,.024,-CARRIAGEWAY_WIDTH/2+.22+i*.49,0xf5f5f0,'crosswalk-stripe');
    box(g,.10,.012,CARRIAGEWAY_WIDTH/2-.12,-1.05,.024,-CARRIAGEWAY_WIDTH/4,0xf5f5f0,'stop-line');
    box(g,.10,.012,CARRIAGEWAY_WIDTH/2-.12,1.05,.024,CARRIAGEWAY_WIDTH/4,0xf5f5f0,'stop-line');
    const footprint=new THREE.Box3(new THREE.Vector3(x-(rotate?1.6:.85),-.1,z-(rotate?.85:1.6)),new THREE.Vector3(x+(rotate?1.6:.85),.1,z+(rotate?.85:1.6)));
    for(const m of world.children)if(m.name==='road:center-line'&&footprint.containsPoint(m.position))m.visible=false;
  }
  crossing(-2.7,Z_EDGES[13]+ROAD_WIDTH/2); // Plaza → sidewalk → crossing → southern street.
  crossing(6.0,Z_EDGES[3]+ROAD_WIDTH/2);
  crossing(cellCenter(12,9).x,3.95,true);
  // Selected approaches to the east/west main junctions, clear of their centres.
  crossing(-8.5,Z_EDGES[9]+ROAD_WIDTH/2);
  crossing(8.5,Z_EDGES[9]+ROAD_WIDTH/2);
  crossing(-8.5,Z_EDGES[3]+ROAD_WIDTH/2);
  crossing(8.5,Z_EDGES[13]+ROAD_WIDTH/2);
  // Round the inner curb at the photographed commercial/station-side junction.
  // Trim only the existing .85 sidewalk corner; straight carriageway widths stay intact.
  const cx=X_EDGES[12],cz=Z_EDGES[9],r=SIDEWALK_WIDTH;
  box(root,r,.02,r,cx+r/2,.021,cz+r/2,0x777f88,'junction-corner-asphalt');
  const corner=new THREE.Shape();corner.moveTo(cx,-cz);corner.lineTo(cx+r,-cz);corner.absarc(cx,-cz,r,0,-Math.PI/2,true);corner.lineTo(cx,-cz);surface(corner,0xe0e1dc,.04,'rounded-junction-curb');
  const points=Array.from({length:25},(_,i)=>{const a=i*Math.PI/2/24;return new THREE.Vector3(cx+r*Math.cos(a),.045,cz+r*Math.sin(a));});
  const curb=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.025,4,false),mat(0xc6cecf));curb.name='curved-curb-edge';root.add(curb);

  // A broad, low-frequency shore with the existing beach depth and both accesses.
  for(const m of world.children){if(m.name.endsWith(':beach'))m.visible=false;if(m.name.includes(':sea')||m.name.startsWith('sea:'))m.material=mat(0x78c9da);}
  // Broad unequal coves define the actual sand mesh, independently of the foam.
  const shore=x=>Z_EDGES[1]+.9+.95*Math.exp(-((x+8)**2)/30)-.7*Math.exp(-((x-2)**2)/22)+.55*Math.exp(-((x-12)**2)/16);
  const left=-WIDTH/2,right=WIDTH/2;
  const beach=new THREE.Shape();beach.moveTo(left,-Z_EDGES[2]);beach.lineTo(right,-Z_EDGES[2]);
  for(let i=64;i>=0;i--){const x=left+(right-left)*i/64;beach.lineTo(x,-shore(x));}beach.closePath();
  const sand=surface(beach,0xede5d0,.025,'curved-ivory-beach');
  const sandCanvas=document.createElement('canvas');sandCanvas.width=sandCanvas.height=256;const sx=sandCanvas.getContext('2d');
  sx.fillStyle='#eee7d6';sx.fillRect(0,0,256,256);
  for(let i=0;i<14;i++){
    const x=(i*71)%256,y=(i*113)%256,g=sx.createRadialGradient(x,y,0,x,y,65);
    g.addColorStop(0,i%2?'#e9e1cf':'#f2ecdf');g.addColorStop(1,'rgba(238,231,214,0)');sx.fillStyle=g;sx.fillRect(0,0,256,256);
  }
  const sandTexture=new THREE.CanvasTexture(sandCanvas);sandTexture.colorSpace=THREE.SRGBColorSpace;
  const sp=sand.geometry.attributes.position,suv=sand.geometry.attributes.uv;
  for(let i=0;i<sp.count;i++)suv.setXY(i,(sp.getX(i)+WIDTH/2)/WIDTH,(sp.getZ(i)-Z_EDGES[1])/6);
  sand.material=new THREE.MeshStandardMaterial({map:sandTexture,roughness:1});
  box(root,WIDTH,.015,6,0,.007,(Z_EDGES[1]+Z_EDGES[2])/2,0x78c9da,'shore-water-underlay');
  function ribbon(offset,width,color,name,start=left,end=right){const shape=new THREE.Shape();for(let i=0;i<=64;i++){const x=start+(end-start)*i/64;const z=shore(x)+offset;i?shape.lineTo(x,-z):shape.moveTo(x,-z);}for(let i=64;i>=0;i--){const x=start+(end-start)*i/64;shape.lineTo(x,-(shore(x)+offset+width));}shape.closePath();surface(shape,color,.032,name);}
  ribbon(0,.30,0xe4ddca,'damp-sand');
  // Broken, thin foam on the water side; no second continuous contour line.
  ribbon(-.07,.05,0xe2f1ed,'shore-foam',-14,-5);
  ribbon(-.13,.055,0xdaeeee,'shore-foam',-1,7.5);
  ribbon(-.08,.045,0xe2f1ed,'shore-foam',11,15.8);
  return root;
}
