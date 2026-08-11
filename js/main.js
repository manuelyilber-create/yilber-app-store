// js/main.js
import { TerrainManager } from './Terrain.js';

// 1. Escena y Render
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x71b2e1); // Cielo claro
scene.fog = new THREE.FogExp2(0x71b2e1, 0.015);

const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 2. Cámara (Vista Isométrica 3D estilo .io)
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraOffset = new THREE.Vector3(0, 22, 18);

// 3. Crear Jugador (Estilo Esférico 3D HD)
const playerGroup = new THREE.Group();

const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.3 });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 1;
body.castShadow = true;
playerGroup.add(body);

// Manos 3D del Jugador
const handGeo = new THREE.SphereGeometry(0.3, 16, 16);
const handMat = new THREE.MeshStandardMaterial({ color: 0xd35400 });

const leftHand = new THREE.Mesh(handGeo, handMat);
leftHand.position.set(-0.9, 0.9, 0.6);
leftHand.castShadow = true;
playerGroup.add(leftHand);

const rightHand = new THREE.Mesh(handGeo, handMat);
rightHand.position.set(0.9, 0.9, 0.6);
rightHand.castShadow = true;
playerGroup.add(rightHand);

scene.add(playerGroup);

// 4. Inicializar Terreno
const terrain = new TerrainManager(scene);

// 5. Sistema de Controles
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// Apuntar con el mouse en 3D
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const planeFloor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const targetPoint = new THREE.Vector3();

window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(planeFloor, targetPoint);
    
    if (targetPoint) {
        playerGroup.lookAt(targetPoint.x, playerGroup.position.y, targetPoint.z);
    }
});

// Resonar Ajuste de Pantalla
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 6. Bucle de Juego Principal (60 FPS Ultra Fluido)
let clock = new THREE.Clock();
const speed = 12;

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Movimiento
    const moveVector = new THREE.Vector3(0, 0, 0);
    if (keys['w'] || keys['arrowup']) moveVector.z -= 1;
    if (keys['s'] || keys['arrowdown']) moveVector.z += 1;
    if (keys['a'] || keys['arrowleft']) moveVector.x -= 1;
    if (keys['d'] || keys['arrowright']) moveVector.x += 1;

    if (moveVector.length() > 0) {
        moveVector.normalize().multiplyScalar(speed * deltaTime);
        playerGroup.position.add(moveVector);
    }

    // Cámara sigue suavemente al jugador
    camera.position.x = playerGroup.position.x + cameraOffset.x;
    camera.position.y = playerGroup.position.y + cameraOffset.y;
    camera.position.z = playerGroup.position.z + cameraOffset.z;
    camera.lookAt(playerGroup.position);

    terrain.update(deltaTime);
    renderer.render(scene, camera);
}

animate();
