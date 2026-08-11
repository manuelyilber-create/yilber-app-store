// js/Terrain.js
export class TerrainManager {
    constructor(scene) {
        this.scene = scene;
        this.grassBlades = [];
        this.resources = [];
        this.windTime = 0;

        this.initTerrain();
        this.initLighting();
        this.generateResources();
    }

    initTerrain() {
        // Terreno 3D
        const size = 120;
        const geometry = new THREE.PlaneGeometry(size, size, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            color: 0x3a7d44,
            roughness: 0.9,
            metalness: 0.1
        });

        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Cuadrícula estética
        const grid = new THREE.GridHelper(size, 40, 0x2e6636, 0x2e6636);
        grid.position.y = 0.01;
        this.scene.add(grid);
    }

    initLighting() {
        // Luz Ambiental
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Sol (Luz Direccional con Sombras de Alta Definición)
        const sun = new THREE.DirectionalLight(0xfffaed, 1.2);
        sun.position.set(30, 50, 30);
        sun.castShadow = true;
        
        // Ajustes de resolución de sombra
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 150;
        const d = 40;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;

        this.scene.add(sun);
    }

    generateResources() {
        // Creación de Rocas 3D HD distribuidas aleatoriamente
        const rockGeo = new THREE.DodecahedronGeometry(1.5, 1);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.8 });

        for (let i = 0; i < 25; i++) {
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.set(
                (Math.random() - 0.5) * 80,
                1,
                (Math.random() - 0.5) * 80
            );
            rock.scale.set(1 + Math.random(), 0.8 + Math.random()*0.5, 1 + Math.random());
            rock.rotation.y = Math.random() * Math.PI;
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
            this.resources.push(rock);
        }
    }

    update(deltaTime) {
        // Animación dinámica de viento para detalles
        this.windTime += deltaTime * 2;
    }
}
