// js/World.js
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = new Map(); // Guardar bloques (x,y -> mesh)
        
        // Texturas básicas (puedes cambiarlas por imágenes reales luego)
        this.materials = {
            dirt: new THREE.MeshStandardMaterial({ color: 0x8b4513 }),
            grass: new THREE.MeshStandardMaterial({ color: 0x228b22 }),
            stone: new THREE.MeshStandardMaterial({ color: 0x708090 }),
        };
        this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    }

    async generate() {
        const width = 100;
        const depth = 2; // Lostminer es 2.5D, solo necesitamos un par de capas

        for (let x = -width/2; x < width/2; x++) {
            for (let z = 0; z < depth; z++) {
                // Altura procedural (Onda seno para colinas)
                const height = Math.floor(Math.sin(x * 0.1) * 3 + 5);
                
                for (let y = 0; y < height; y++) {
                    let type = 'stone';
                    if (y === height - 1) type = 'grass';
                    else if (y > height - 4) type = 'dirt';

                    this.addBlock(x, y, -z, type);
                }
            }
        }
        return Promise.resolve();
    }

    addBlock(x, y, z, type) {
        const key = `${x},${y},${z}`;
        if (this.blocks.has(key)) return;

        const block = new THREE.Mesh(this.blockGeometry, this.materials[type]);
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        block.userData.type = type; // Guardar tipo

        this.scene.add(block);
        this.blocks.set(key, block);
    }

    removeBlock(x, y, z) {
        const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
        if (this.blocks.has(key)) {
            const block = this.blocks.get(key);
            this.scene.remove(block);
            this.blocks.delete(key);
            return true;
        }
        return false;
    }

    // Comprobar colisión en una posición
    isBlocked(x, y, z) {
        const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
        return this.blocks.has(key);
    }
}
