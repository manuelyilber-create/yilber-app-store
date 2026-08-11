// js/Terrain.js - Módulo exclusivo del Terreno 3D
export class TerrainManager {
    constructor(scene) {
        this.scene = scene;
        this.grassBlades = [];
        this.windTime = 0;

        this.initTerrain();
        this.initLights();
        this.createGrass();
    }

    initTerrain() {
        // Plano 3D de terreno de 100x100 unidades
        const geometry = new THREE.PlaneGeometry(100, 100, 32, 32);
        
        // Material verde realista que reacciona a la luz
        const material = new THREE.MeshStandardMaterial({
            color: 0x2d8a4e,
            roughness: 0.8,
            metalness: 0.1
        });

        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2; // Acostar el plano horizontalmente
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    initLights() {
        // Luz ambiental suave
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Luz solar con sombras
        const sunLight = new THREE.DirectionalLight(0xfffaed, 0.8);
        sunLight.position.set(20, 40, 20);
        sunLight.castShadow = true;
        this.scene.add(sunLight);
    }

    createGrass() {
        // Generación de briznas 3D distribuidas en el campo
        const bladeGeometry = new THREE.ConeGeometry(0.08, 0.6, 3);
        const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0x4cd137 });

        for (let i = 0; i < 600; i++) {
            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            
            // Posición aleatoria en el mapa
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            
            blade.position.set(x, 0.3, z);
            blade.rotation.y = Math.random() * Math.PI;
            blade.castShadow = true;

            this.grassBlades.push(blade);
            this.scene.add(blade);
        }
    }

    // Bucle de actualización para animar el viento
    update(deltaTime) {
        this.windTime += deltaTime * 2;
        const windAngle = Math.sin(this.windTime) * 0.15;

        // Inclinación suave de cada brizna simulando viento
        this.grassBlades.forEach((blade) => {
            blade.rotation.z = windAngle;
        });
    }
}
