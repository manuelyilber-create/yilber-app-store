// js/Player.js
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

export class Player {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        
        // Modelo simple del personaje
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 1.8, 0.6),
            new THREE.MeshStandardMaterial({ color: 0xff4500 })
        );
        this.mesh.position.set(0, 10, 0); // Empezar en el aire
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        // Físicas
        this.velocity = new THREE.Vector3();
        this.gravity = -25;
        this.moveSpeed = 8;
        this.jumpForce = 12;
        this.onGround = false;
    }

    update(deltaTime) {
        // Aplicar gravedad
        this.velocity.y += this.gravity * deltaTime;
        
        // Movimiento tentativo
        const nextPos = this.mesh.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Reseteo Ground state
        this.onGround = false;

        // --- Colisión Simple (Pies y Cabeza) ---
        // Chequear pies
        if (this.world.isBlocked(nextPos.x, nextPos.y - 0.9, 0)) {
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
                this.mesh.position.y = Math.round(nextPos.y - 0.9) + 1.4; // Ajuste
                this.onGround = true;
            }
        } else {
            this.mesh.position.y = nextPos.y;
        }

        // Chequear muros (Izquierda/Derecha)
        if (!this.world.isBlocked(nextPos.x + (this.velocity.x > 0 ? 0.35 : -0.35), this.mesh.position.y, 0)) {
            this.mesh.position.x = nextPos.x;
        } else {
            this.velocity.x = 0;
        }
    }

    jump() {
        if (this.onGround) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }
    }
}
