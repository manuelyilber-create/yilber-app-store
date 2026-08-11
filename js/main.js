// js/main.js
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { GameScene } from './Scene.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { Controls } from './Controls.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.startBtn = document.getElementById('start-btn');
        this.hud = document.getElementById('hud');
        
        this.gameActive = false;
        this.init();
    }

    async init() {
        // 1. Motor Gráfico Base
        this.gameScene = new GameScene(this.canvas);
        
        // 2. Generación de Mundo Procedural
        this.world = new World(this.gameScene.scene);
        await this.world.generate(); // Generar bloques

        // 3. Personaje (Físicas y Modelo)
        this.player = new Player(this.gameScene.scene, this.world);
        
        // 4. Controles (PC + Táctil)
        this.controls = new Controls(this.player, this.gameScene.camera, this.world, this.canvas);

        this.finalizeInit();
    }

    finalizeInit() {
        document.getElementById('loading-text').style.display = 'none';
        this.startBtn.style.display = 'block';
        this.startBtn.onclick = () => this.start();
    }

    start() {
        this.loadingOverlay.style.display = 'none';
        this.hud.style.display = 'block';
        this.gameActive = true;
        this.loop();
    }

    loop() {
        const clock = new THREE.Clock();
        const animate = () => {
            requestAnimationFrame(animate);
            if (!this.gameActive) return;

            const deltaTime = clock.getDelta();
            
            // Actualizar Módulos
            this.controls.update(deltaTime);
            this.player.update(deltaTime);
            
            // Renderizar Escena
            this.gameScene.render();
        };
        animate();
    }
}

new Game();
