// js/main.js
import { TerrainManager } from './Terrain.js';

// 1. Escena y Renderizador
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x71b2e1);
scene.fog = new THREE.FogExp2(0x71b2e1, 0.015);

const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 2. Crear Jugador (Visible y Coloreado)
const playerGroup = new THREE.Group();
playerGroup.position.set(0, 0, 0); // Posición inicial en el centro

// Cuerpo principal
const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff9f43, roughness: 0.3 }); // Naranja brillante
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 1;
body.castShadow = true;
playerGroup.add(body);

// Manos en 3D
const handGeo = new THREE.SphereGeometry(0.35, 16, 16);
const handMat = new THREE.MeshStandardMaterial({ color: 0xee5253 }); // Manos rojas para destacar

const leftHand = new THREE.Mesh(handGeo, handMat);
leftHand.position.set(-0.8, 0.9, 0.6);
leftHand.castShadow = true;
playerGroup.add(leftHand);

const rightHand = new THREE.Mesh(handGeo, handMat);
rightHand.position.set(0.8, 0.9, 0.6);
rightHand.castShadow = true;
playerGroup.add(rightHand);

scene.add(playerGroup);

// 3. Cámara Isométrica
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraOffset = new THREE.Vector3(0, 18, 14);

// 4. Inicializar Terreno
const terrain = new TerrainManager(scene);

// 5. Captura de Teclado (Soporta mayúsculas y minúsculas)
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
});

// Forzar enfoque al hacer clic en la pantalla
canvas.addEventListener('click', () => {
    window.focus();
});

// Apuntar personaje hacia la posición del mouse
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

// Ajustar resolución si cambia el tamaño de la ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 6. Bucle de Animación y Físicas
const clock = new THREE.Clock();
const speed = 10;

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Movimiento en 8 direcciones
    const moveVector = new THREE.Vector3(0, 0, 0);

    if (keys['w'] || keys['KeyW'] || keys['ArrowUp']) moveVector.z -= 1;
    if (keys['s'] || keys['KeyS'] || keys['ArrowDown']) moveVector.z += 1;
    if (keys['a'] || keys['KeyA'] || keys['ArrowLeft']) moveVector.x -= 1;
    if (keys['d'] || keys['KeyD'] || keys['ArrowRight']) moveVector.x += 1;

    if (moveVector.length() > 0) {
        moveVector.normalize().multiplyScalar(speed * deltaTime);
        playerGroup.position.add(moveVector);
    }

    // La cámara sigue al personaje
    camera.position.x = playerGroup.position.x + cameraOffset.x;
    camera.position.y = playerGroup.position.y + cameraOffset.y;
    camera.position.z = playerGroup.position.z + cameraOffset.z;
    camera.lookAt(playerGroup.position);

    // Actualizar terreno y renderizar
    terrain.update(deltaTime);
    renderer.render(scene, camera);
}

animate();
