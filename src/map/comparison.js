import * as THREE from 'three';
import { createCalibration, TRAIN } from './calibration.js';
import { cellCenter, Z_EDGES, ROAD_WIDTH, CARRIAGEWAY_WIDTH, ELEVATION } from './world.js';

export const COMPARISON_SCALES = [1, .8, .65];

// Reuse the unmodified prototype-3 geometry, materials, building and world.
export function createComparison(scene) {
  const root = createCalibration(scene);
  const car = root.getObjectByName('calibration-car');
  const train = root.getObjectByName('calibration-train');
  root.remove(car, train);
  const totalTrainLength = TRAIN.length * COMPARISON_SCALES.reduce((a,b)=>a+b,0) + 2 * 1.25;
  let trainStart = -totalTrainLength / 2;

  function label(text, x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 72;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fffffff0'; context.fillRect(0,0,256,72);
    context.fillStyle = '#283740'; context.font = 'bold 40px sans-serif';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(text,128,37);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,toneMapped:false}));
    sprite.name = `comparison-label:${text}`;
    sprite.position.set(x,y,z); sprite.scale.set(1.15,.324,1);sprite.renderOrder=10;
    root.add(sprite);
  }
  COMPARISON_SCALES.forEach((scale,index)=>{
    const id = String.fromCharCode(65+index);
    const text = `${id} ${Math.round(scale*100)}%`;
    const vehicle = car.clone(true);
    vehicle.name = `comparison-car-${id}`;
    vehicle.scale.setScalar(scale);
    vehicle.position.set(-4+index*4,0,Z_EDGES[13]+ROAD_WIDTH/2-CARRIAGEWAY_WIDTH/4);
    root.add(vehicle);
    label(text,vehicle.position.x,.3,vehicle.position.z+1.05);

    const carriage = train.clone(true);
    carriage.name = `comparison-train-${id}`;
    carriage.scale.setScalar(scale);
    carriage.position.set(trainStart+TRAIN.length*scale/2,ELEVATION,cellCenter(9,10).z);
    trainStart += TRAIN.length*scale+1.25;
    root.add(carriage);
    label(text,carriage.position.x,ELEVATION+.15,carriage.position.z+1.75);
  });
  return root;
}
