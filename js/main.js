
// js/main.js
import { TerrainManager } from './Terrain.js';

// 1. Escena 3D
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Cielo azul

// 2. Cámara (Perspectiva 3D inclinada tipo RPG/Supervivencia)
const camera = new THREE.PerspectiveCamera(
    60, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000
);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

// 3. Renderizador
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// 4. Inicializar Módulo de Terreno
const terrain = new TerrainManager(scene);

// Redimensionar ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bucle principal de animación (60 FPS)
let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Actualizar efectos del terreno
    terrain.update(deltaTime);

    // Renderizar escena
    renderer.render(scene, camera);
}

animate();
