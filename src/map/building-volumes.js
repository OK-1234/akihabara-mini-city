import * as THREE from 'three';
import { createDeckTest } from './deck-test.js';
import { X_EDGES, Z_EDGES } from './world.js';

// Temporary volumes only. Units: width=X, depth=Z, height=Y; x/z=center.
// Excel supplies the plot relationships; current expanded world edges supply
// positions. Change these numbers to resize/reposition, without editing meshes.
export const BUILDING_VOLUMES = [
  { id:'general-west-north', label:'一般ビル1', width:3.2, depth:3.2, height:4.2,
    x:X_EDGES[2]+2, z:Z_EDGES[11]+1.8, color:0xcbd0d4, plot:'D17:E18 北寄り' },
  { id:'general-west-south', label:'一般ビル2', width:3.0, depth:3.6, height:5.0,
    x:X_EDGES[2]+2, z:Z_EDGES[13]-2.4, color:0xcbd0d4, plot:'D18:E18 南寄り' },
  { id:'general-east-west', label:'一般ビル3', width:2.4, depth:3.8, height:4.6,
    x:X_EDGES[9]+1.5, z:Z_EDGES[13]-2.6, color:0xcbd0d4, plot:'K18:L18 西寄り' },
  { id:'general-east-east', label:'一般ビル4', width:2.4, depth:3.4, height:5.4,
    x:X_EDGES[12]-1.5, z:Z_EDGES[13]-2.6, color:0xcbd0d4, plot:'L18:M18 東寄り' },
  { id:'yodobashi', label:'ヨドバシ風', width:5.4, depth:9.6, height:5.8,
    x:(X_EDGES[9]+X_EDGES[12])/2, z:(Z_EDGES[4]+Z_EDGES[9])/2,
    color:0xeee4cc, plot:'K10:M14 東側の縦長区画' },
  { id:'udx', label:'UDX風', width:5.4, depth:5.4, height:7.2,
    x:(X_EDGES[3]+X_EDGES[6])/2, z:(Z_EDGES[6]+Z_EDGES[9])/2,
    color:0xb5c8d7, plot:'E12:G14 西側区画' },
  { id:'support', label:'就労移行支援', width:3.0, depth:1.6, height:2.6,
    x:X_EDGES[2]+1.8, z:Z_EDGES[4]+1, color:0xc1dfcf,
    plot:'D10を基準にE10側まで、西側区画の北西' },
  { id:'station', label:'駅', width:7.2, depth:2.2, height:3.0,
    x:(X_EDGES[5]+X_EDGES[9])/2, z:Z_EDGES[12]-1.4,
    color:0xc9c6bd, plot:'G17:J17 駅区画内の広場側' },
];

export async function createBuildingVolumes(scene) {
  // Reuse the existing car .80, train .95 and width-3 deck with its sidewalls
  // and opening. Ground exploration does not mount/lock the player to the deck.
  const deck=await createDeckTest(scene);
  const oldBuilding=deck.source.root.getObjectByName('calibration-building');
  oldBuilding?.removeFromParent();
  const group=new THREE.Group();group.name='building-volume-test';scene.add(group);
  for(const b of BUILDING_VOLUMES) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(b.width,b.height,b.depth),
      new THREE.MeshStandardMaterial({color:b.color,roughness:1}));
    mesh.name=b.id;mesh.position.set(b.x,b.height/2,b.z);
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData={label:b.label,plot:b.plot};group.add(mesh);
  }
  console.info('建物群ボリューム試作',BUILDING_VOLUMES);
  return {group,deck};
}
