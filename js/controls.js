// js/Controls.js
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

export class Controls {
    constructor(player, camera, world, canvas) {
        this.player = player;
        this.camera = camera;
        this.world = world;
        this.canvas = canvas;
        
        this.keys = {};
        this.touchMoveDir = 0; // -1, 0, 1

        this.initPC();
        this.initTouch();
    }

    initPC() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        
        // Salto (Espacio)
        window.addEventListener('keydown', (e) => { if(e.key === ' ') this.player.jump(); });

        // Minar con Click (PC)
        window.addEventListener('mousedown', (e) => this.mine(e));
    }

    initTouch() {
        // Región de movimiento (Izquierda)
        const region = document.getElementById('joystick-region');
        region.addEventListener('touchstart', (e) => this.onTouchStart(e));
        region.addEventListener('touchmove', (e) => this.onTouchMove(e));
        region.addEventListener('touchend', () => this.touchMoveDir = 0);

        // Botones de acción
        document.getElementById('mine-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.mineTouch();
        });
        document.getElementById('jump-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.player.jump();
        });
    }

    onTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
    }

    onTouchMove(e) {
        const touchX = e.touches[0].clientX;
        const diff = touchX - this.touchStartX;
        if (diff > 20) this.touchMoveDir = 1; // Derecha
        else if (diff < -20) this.touchMoveDir = -1; // Izquierda
        else this.touchMoveDir = 0;
    }

    // Minar con Toque (Móvil) - Mina bloque frente al jugador
    mineTouch() {
        const lookDir = this.player.velocity.x >= 0 ? 1 : -1;
        const mineX = this.player.mesh.position.x + lookDir;
        const mineY = this.player.mesh.position.y;
        this.world.removeBlock(mineX, mineY, 0);
    }

    // Minar con Raycaster (PC) - Mina donde haces click
    mine(event) {
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        const intersects = raycaster.intersectObjects(Array.from(this.world.blocks.values()));
        if (intersects.length > 0) {
            const block = intersects[0].object;
            this.world.removeBlock(block.position.x, block.position.y, block.position.z);
        }
    }

    update(deltaTime) {
        let moveX = 0;

        // Procesar Teclado
        if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
        if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

        // Procesar Táctil
        if (this.touchMoveDir !== 0) moveX = this.touchMoveDir;

        // Aplicar velocidad al jugador
        this.player.velocity.x = moveX * this.player.moveSpeed;

        // --- La Cámara Sigue al Jugador Suavemente ---
        const targetX = this.player.mesh.position.x;
        const targetY = this.player.mesh.position.y + 2;
        this.camera.position.x += (targetX - this.camera.position.x) * 5 * deltaTime;
        this.camera.position.y += (targetY - this.camera.position.y) * 5 * deltaTime;
        this.camera.lookAt(targetX, targetY, 0);
    }
}
