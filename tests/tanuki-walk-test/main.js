import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWalking } from './walking.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe6e8e6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label', '固定カメラによるタヌキの表示確認');
document.body.appendChild(renderer.domElement);

// Xを右、Yを上、+Zを手前とし、左手前（地図の左下側）から見る。
const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.01, 200);
let viewHeight = 6;
let minimumViewWidth = 4;

const skyLight = new THREE.HemisphereLight(0xf4f8ff, 0xb5ada0, 2.2);
scene.add(skyLight);

const sunlight = new THREE.DirectionalLight(0xfff5e7, 3);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.bias = -0.0001;
scene.add(sunlight, sunlight.target);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshStandardMaterial({ color: 0xd8dad7, roughness: 1 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function render() {
  renderer.render(scene, camera);
}

function resize() {
  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);
  const aspect = width / height;
  const visibleHeight = Math.max(viewHeight, minimumViewWidth / aspect);
  camera.left = -visibleHeight * aspect / 2;
  camera.right = visibleHeight * aspect / 2;
  camera.top = visibleHeight / 2;
  camera.bottom = -visibleHeight / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  render();
}

// 固定カメラはサイズ変更時だけ更新する。
window.addEventListener('resize', resize);

async function loadTanuki() {
  try {
    const displayedGltf = await new GLTFLoader().loadAsync('./tanuki_brown_v2.glb');
    // v1は元の比較条件の採寸専用。画面に表示するのはv2のみ。
    const gltf = await new GLTFLoader().loadAsync('./tanuki_brown_v1.glb');
    const model = gltf.scene;
    model.traverse((object) => {
      // GLBに含まれる照明は使用せず、このテストの昼光に統一する。
      if (object.isLight) object.visible = false;
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    // 回転・縮尺・頭身を保持したまま、バウンディングボックスの底面を床へ。
    const placement = new THREE.Group();
    placement.add(model);
    placement.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(placement, true);
    const size = bounds.getSize(new THREE.Vector3());
    if (bounds.isEmpty() || !Number.isFinite(size.length()) || size.y <= 0) {
      throw new Error('表示できる立体メッシュがGLBにありません。');
    }
    const center = bounds.getCenter(new THREE.Vector3());
    placement.position.set(-center.x, -bounds.min.y, -center.z);
    scene.add(placement);

    const extent = Math.max(size.x, size.y, size.z);
    const target = new THREE.Vector3(0, size.y * 0.5, 0);
    // カメラの採寸対象はタヌキのみ。GLB内の確認用床は含めない。
    placement.updateMatrixWorld(true);
    const cameraSubject = model.getObjectByName('Tanuki_茶タヌキ全体') || model;
    const cameraBounds = new THREE.Box3();
    const cameraMeshes = [];
    cameraSubject.traverse((object) => {
      if (!object.isMesh || object.name.startsWith('Ground_')) return;
      cameraMeshes.push(object);
      cameraBounds.expandByObject(object, true);
    });
    const cameraTarget = cameraBounds.getCenter(new THREE.Vector3());
    // XYZの距離を等しくした正投影カメラ（俯角約35度）を維持。
    camera.position.copy(cameraTarget).add(new THREE.Vector3(-1, 1, 1).multiplyScalar(extent * 6));
    camera.lookAt(cameraTarget);
    camera.near = extent * 0.001;
    camera.far = extent * 100;
    camera.updateMatrixWorld(true);
    // この視点での実際の頂点範囲を測り、画面高の30%に合わせる。
    const projectedBounds = new THREE.Box3();
    const vertex = new THREE.Vector3();
    for (const mesh of cameraMeshes) {
      const positions = mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        mesh.getVertexPosition(i, vertex);
        vertex.applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
        projectedBounds.expandByPoint(vertex);
      }
    }
    const projectedSize = projectedBounds.getSize(new THREE.Vector3());
    const projectedCenter = projectedBounds.getCenter(new THREE.Vector3());
    camera.position.add(new THREE.Vector3(projectedCenter.x, projectedCenter.y, 0).applyQuaternion(camera.quaternion));
    viewHeight = projectedSize.y / 0.30;
    minimumViewWidth = projectedSize.x * 1.2;

    floor.scale.setScalar(extent * 200);
    sunlight.position.copy(target).add(new THREE.Vector3(-3, 6, 4).multiplyScalar(extent));
    sunlight.target.position.copy(target);
    const shadowCamera = sunlight.shadow.camera;
    shadowCamera.left = shadowCamera.bottom = -extent * 2;
    shadowCamera.right = shadowCamera.top = extent * 2;
    shadowCamera.near = extent * 0.01;
    shadowCamera.far = extent * 20;
    shadowCamera.updateProjectionMatrix();
    sunlight.shadow.normalBias = extent * 0.002;

    // v1で決まった配置・カメラ・倍率・床・ライトを保持して表示モデルだけ交換。
    const displayedModel = displayedGltf.scene;
    displayedModel.traverse((object) => {
      if (object.isLight) object.visible = false;
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    placement.remove(model);
    placement.add(displayedModel);

    resize();
    const walking = createWalking(displayedModel, camera);
    let previousTime;
    renderer.setAnimationLoop((time) => {
      const dt = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      walking.update(dt);
      render();
    });
    console.info('タヌキを読み込みました。元の回転と縮尺を保持し、最下点を床に合わせています。', {
      originalSize: size.toArray(),
      translation: placement.position.toArray(),
    });
  } catch (error) {
    // 画面上にUIは出さず、失敗理由は開発者ツールに表示する。
    console.error('GLB表示に失敗しました。READMEの「表示されない場合」を確認してください。', error);
  }
}

loadTanuki();
