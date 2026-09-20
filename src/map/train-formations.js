import * as THREE from 'three';

export const TRAIN_COUPLING_GAP=.12;

// The existing placement already carries the adopted uniform .95 scale.
// Its model faces +X; rotate each copy so both cab faces point outwards.
export function createTrainFormation(template,railTop,name) {
  const root=new THREE.Group();root.name=name;
  const cars=[1,-1].map(sign=>{
    const car=template.clone(true);car.name=`${name}-car-${sign===1?1:2}`;
    car.position.set(0,0,0);car.rotation.set(0,sign===1?-Math.PI/2:Math.PI/2,0);
    car.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(car,true),center=bounds.getCenter(new THREE.Vector3());
    const length=bounds.max.z-bounds.min.z;
    car.position.set(-center.x,railTop-bounds.min.y,sign*(length+TRAIN_COUPLING_GAP)/2-center.z);
    root.add(car);return car;
  });
  root.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(root,true).getSize(new THREE.Vector3());
  return {root,cars,length:size.z,width:size.x};
}

// Independent, replaceable preview motion for each future role. No player input.
function shuttle(formation,axis,fixed,start,end,phase,role) {
  const padding=formation.length/2+.25,min=start+padding,max=end-padding;
  if(max<=min)throw new Error('Two-car train does not fit on '+role);
  const middle=(min+max)/2,radius=(max-min)/2;
  formation.root.rotation.y=axis==='x'?Math.PI/2:0;
  formation.root.position[axis==='x'?'z':'x']=fixed;
  formation.root.userData.role=role;
  let angle=phase,restartTime=.8;
  function resume(direction=1){
    const base=Math.asin(THREE.MathUtils.clamp((formation.root.position[axis]-middle)/radius,-1,1));
    angle=direction<0?Math.PI-base:base;restartTime=0;
  }
  function update(dt){
    restartTime=Math.min(.8,restartTime+dt);
    const t=restartTime/.8,ramp=t*t*(3-2*t);
    angle=(angle+dt*1.6/radius*ramp)%(Math.PI*2);formation.root.position[axis]=middle+radius*Math.sin(angle);
  }
  update(0);
  return {...formation,axis,min,max,role,update,resume};
}

export function createViaductTrains(root,template,railTop,{north,joinNorth,junction,west,east}) {
  const horizontal=shuttle(createTrainFormation(template,railTop,'horizontal-two-car-train'),'x',junction,west,east,-.8,'future-opening');
  const vertical=shuttle(createTrainFormation(template,railTop,'vertical-two-car-train'),'z',0,north,joinNorth,.35,'future-train-transformation');
  root.add(horizontal.root,vertical.root);
  return {horizontal,vertical,update(dt){horizontal.update(dt);vertical.update(dt);}};
}
