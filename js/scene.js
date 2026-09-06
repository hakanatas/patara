import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PALETTE } from './config.js';
import { clamp } from './tween.js';

/** Renderer, camera, lights and the cream tabletop with a soft desk mat. */
export function createScene(canvas, { isMobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.cream);
  scene.fog = new THREE.Fog(PALETTE.cream, 18, 38);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.15, 0.25, 0.2);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.5;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.32;
  controls.minAzimuthAngle = -1.15;
  controls.maxAzimuthAngle = 1.15;
  controls.minDistance = 1.6;
  controls.maxDistance = 14;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  camera.position.set(1.6, 5.0, 7.4);
  controls.update();

  const key = new THREE.DirectionalLight('#fff0dc', 2.3);
  key.position.set(-3.5, 8, 5);
  key.castShadow = true;
  const shadowSize = isMobile ? 1024 : 2048;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.camera.left = -5.5;
  key.shadow.camera.right = 5.5;
  key.shadow.camera.top = 5.5;
  key.shadow.camera.bottom = -5.5;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 6;
  if ('intensity' in key.shadow) key.shadow.intensity = 0.7;
  scene.add(key, key.target);

  scene.add(new THREE.HemisphereLight('#fff9ef', '#e2c4a2', 0.55));
  const rim = new THREE.DirectionalLight('#dde7ff', 0.8);
  rim.position.set(4.5, 4.5, -6);
  scene.add(rim);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.96, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'table';
  scene.add(ground);

  // Desk mat under the board
  const matShape = new THREE.Shape();
  const mw = 4.4, mh = 3.1, mr = 0.35;
  matShape.moveTo(-mw + mr, -mh);
  matShape.lineTo(mw - mr, -mh);
  matShape.quadraticCurveTo(mw, -mh, mw, -mh + mr);
  matShape.lineTo(mw, mh - mr);
  matShape.quadraticCurveTo(mw, mh, mw - mr, mh);
  matShape.lineTo(-mw + mr, mh);
  matShape.quadraticCurveTo(-mw, mh, -mw, mh - mr);
  matShape.lineTo(-mw, -mh + mr);
  matShape.quadraticCurveTo(-mw, -mh, -mw + mr, -mh);
  const mat = new THREE.Mesh(new THREE.ShapeGeometry(matShape, 12), new THREE.MeshStandardMaterial({ color: PALETTE.mat, roughness: 0.98 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0.1, 0.004, 0.1);
  mat.receiveShadow = true;
  scene.add(mat);

  const state = { width: 1, height: 1 };
  function applyFraming() {
    const aspect = state.width / state.height;
    camera.aspect = aspect;
    if (aspect > 1.35) camera.setViewOffset(state.width, state.height, state.width * 0.09, -state.height * 0.02, state.width, state.height);
    else if (aspect < 0.8) camera.setViewOffset(state.width, state.height, 0, -state.height * 0.06, state.width, state.height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function resize(width, height) {
    state.width = width;
    state.height = height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
    renderer.setSize(width, height, false);
    applyFraming();
  }
  /** Distance multiplier so that portrait screens still see the whole board. */
  function fitFactor() {
    const aspect = state.width / state.height;
    return clamp(1.35 / aspect, 1, 2.4);
  }

  return { renderer, scene, camera, controls, key, ground, resize, fitFactor };
}
