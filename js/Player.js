// js/Player.js
export class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);
        
        this.speed = 12;
        this.rotationSpeed = 10;
        this.isRunning = false;
    }

    async load() {
        // En un entorno profesional, aquí usaríamos THREE.GLTFLoader() para cargar 'player.glb'.
        // Para garantizar PERFECCIÓN INMEDIATA sin errores de CORS, construimos un avatar humanoide PRO.
        
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.7 });
        const clothesMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 }); // Azul

        // Cabeza
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), skinMat);
        head.position.y = 1.7; head.castShadow = true;
        this.mesh.add(head);

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.4), clothesMat);
        torso.position.y = 0.9; torso.castShadow = true;
        this.mesh.add(torso);

        // Extremidades (Construcción perfecta para animación futura)
        const limbGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
        
        this.leftArm = new THREE.Mesh(limbGeo, clothesMat);
        this.leftArm.position.set(-0.6, 0.9, 0); this.leftArm.castShadow = true;
        this.mesh.add(this.leftArm);

        this.rightArm = new THREE.Mesh(limbGeo, clothesMat);
        this.rightArm.position.set(0.6, 0.9, 0); this.rightArm.castShadow = true;
        this.mesh.add(this.rightArm);

        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
        this.leftLeg = new THREE.Mesh(limbGeo, pantsMat);
        this.leftLeg.position.set(-0.25, 0.0, 0); this.leftLeg.castShadow = true;
        this.mesh.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(limbGeo, pantsMat);
        this.rightLeg.position.set(0.25, 0.0, 0); this.rightLeg.castShadow = true;
        this.mesh.add(this.rightLeg);
        
        // Asegurar que el personaje empiece en el suelo
        this.mesh.position.y = 0.45; // Ajuste para que las piernas toquen el suelo

        return Promise.resolve(); // Simular carga completada perfectamente
    }

    update(deltaTime) {
        // Aquí iría la lógica de animación de las extremidades al moverse.
        // Por ahora, el personaje es estático pero la estructura está perfecta.
    }
}
