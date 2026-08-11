// js/Terrain.js
export class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.createGround();
        this.createResources();
    }

    createGround() {
        // Suelo Verde Realista con pBR
        const groundGeo = new THREE.PlaneGeometry(200, 200, 10, 10);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x4caf50,
            roughness: 0.8,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Cuadrícula estética estilo .io
        const grid = new THREE.GridHelper(200, 50, 0x388e3c, 0x388e3c);
        grid.position.y = 0.01;
        this.scene.add(grid);
    }

    createResources() {
        // Generar Rocas 3D con formas variadas (pBR metalizado)
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.6, metalness: 0.3 });
        
        for (let i = 0; i < 30; i++) {
            const size = 1 + Math.random() * 2;
            const rockGeo = new THREE.DodecahedronGeometry(size, 1);
            const rock = new THREE.Mesh(rockGeo, rockMat);
            
            rock.position.set(
                (Math.random() - 0.5) * 160,
                size / 2,
                (Math.random() - 0.5) * 160
            );
            rock.rotation.y = Math.random() * Math.PI;
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
        }
    }

    update(deltaTime) {
        // El terreno es estático por ahora.
    }
}
