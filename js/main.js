// js/main.js
import { GameScene } from './Scene.js';
import { Player } from './Player.js';
import { Terrain } from './Terrain.js';
import { Controls } from './Controls.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingText = document.getElementById('loading-text');
        this.startBtn = document.getElementById('start-btn');
        this.hud = document.getElementById('hud');

        this.init();
    }

    async init() {
        // 1. Inicializar Escena y Motor Base
        this.gameScene = new GameScene(this.canvas);
        
        // 2. Inicializar Terreno (Mundo)
        this.terrain = new Terrain(this.gameScene.scene);

        // 3. Inicializar Personaje (¡Cargando modelo realista!)
        this.player = new Player(this.gameScene.scene);
        
        try {
            this.loadingText.innerText = "Cargando personaje realista...";
            await this.player.load(); // Esperar a que el modelo se cargue al 100%
            
            // 4. Inicializar Controles (Uniendo personaje y cámara)
            this.controls = new Controls(this.player, this.gameScene.camera, this.canvas);

            this.finalizeInit();
        } catch (error) {
            this.loadingText.innerText = "Error crítico al cargar. Revisa la consola.";
            console.error("Perfección interrumpida:", error);
        }
    }

    finalizeInit() {
        this.loadingText.style.display = 'none';
        this.startBtn.style.display = 'block';

        this.startBtn.addEventListener('click', () => {
            this.loadingOverlay.style.display = 'none';
            this.hud.style.display = 'block';
            this.startLoop();
        });
    }

    startLoop() {
        const clock = new THREE.Clock();

        const animate = () => {
            requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();

            // Actualizar lógica (Sin errores, cada módulo hace lo suyo)
            this.controls.update(deltaTime);
            this.player.update(deltaTime);
            this.terrain.update(deltaTime);

            // Renderizar
            this.gameScene.render();
        };
        animate();
    }
}

// Iniciar cuando todo el HTML cargue
window.onload = () => { new Game(); };
