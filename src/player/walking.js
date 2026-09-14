import * as THREE from 'three';

export function createWalking(model, camera, worldScale = 1) {
  // 確認用の床を含むGLB全体ではなく、タヌキだけを動かす。
  const tanuki = model.getObjectByName('Tanuki_茶タヌキ全体');
  if (!tanuki) throw new Error('タヌキの移動対象が見つかりません。');
  const limbs = [
    ['Arm_CTRL_腕_L', 1], ['Arm_CTRL_腕_R', -1],
    ['Leg_CTRL_脚_L', -1], ['Leg_CTRL_脚_R', 1],
  ].map(([name, sign]) => {
    const object = tanuki.getObjectByName(name);
    if (!object) throw new Error(`歩行の支点が見つかりません: ${name}`);
    return { object, sign, rest: object.quaternion.clone() };
  });
  const baseY = tanuki.position.y;
  const pressed = new Set();
  const initialSpeed = 1.2;
  const walkSpeed = initialSpeed * 2.5;
  const dashSpeed = initialSpeed * 4.0;
  const doubleTapMs = 250;
  let lastTapKey = null;
  let lastTapTime = -Infinity;
  let dashing = false;
  const arrows = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  right.y = 0;
  right.normalize();
  const up = new THREE.Vector3();
  camera.getWorldDirection(up);
  up.y = 0;
  up.normalize();
  // The requested screen diagonals follow the two isometric street axes.
  const forward = up.clone().add(right).normalize();
  const sideways = right.clone().sub(up).normalize();
  const direction = new THREE.Vector3();
  const swing = new THREE.Quaternion();
  const swingAxis = new THREE.Vector3(1, 0, 0);
  let phase = 0;

  function rest() {
    phase = 0;
    tanuki.position.y = baseY;
    for (const limb of limbs) limb.object.quaternion.copy(limb.rest);
  }
  function clear() {
    pressed.clear();
    lastTapKey = null;
    lastTapTime = -Infinity;
    dashing = false;
    rest();
  }
  window.addEventListener('keydown', (event) => {
    if (!arrows.has(event.key)) return;
    event.preventDefault();
    if (event.repeat || pressed.has(event.key)) return;
    const now = performance.now();
    if (lastTapKey === event.key && now - lastTapTime <= doubleTapMs) dashing = true;
    lastTapKey = event.key;
    lastTapTime = now;
    pressed.add(event.key);
  });
  window.addEventListener('keyup', (event) => {
    if (!arrows.has(event.key)) return;
    event.preventDefault();
    pressed.delete(event.key);
    if (pressed.size === 0) {
      // After finishing a dash, the next press starts walking even within 250ms.
      if (dashing) { lastTapKey = null; lastTapTime = -Infinity; }
      dashing = false;
      rest();
    }
  });
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clear();
  });

  return {
    update(dt) {
      // 同時押しは最後に押した方向を優先し、斜め移動を加えない。
      const key = Array.from(pressed).at(-1);
      if (!key) return;
      if (key === 'ArrowUp') direction.copy(forward);
      if (key === 'ArrowDown') direction.copy(forward).negate();
      if (key === 'ArrowRight') direction.copy(sideways);
      if (key === 'ArrowLeft') direction.copy(sideways).negate();
      // Rendering scale must not reduce the established world-space speeds.
      tanuki.position.addScaledVector(direction, (dashing ? dashSpeed : walkSpeed) * dt / worldScale);
      // +Zが顔の正面。進む方向へタヌキだけを向ける。
      tanuki.rotation.y = Math.atan2(direction.x, direction.z);
      phase += dt * Math.PI * 2 * 1.6;
      const angle = Math.sin(phase) * 0.22;
      for (const limb of limbs) {
        swing.setFromAxisAngle(swingAxis, angle * limb.sign);
        limb.object.quaternion.copy(limb.rest).multiply(swing);
      }
      tanuki.position.y = baseY + Math.sin(phase) ** 2 * 0.025;
    },
  };
}
