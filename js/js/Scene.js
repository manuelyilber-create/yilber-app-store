// js/Scene.js
export class GameScene {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Cielo azul perfecto
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.01); // Niebla realista

        // Cámara (Perspectiva .io perfecta)
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Renderizador profesional
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras suaves

        // Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.position.set(50, 100, 50);
        this.sunLight.castShadow = true;
        
        // Ajuste perfecto de sombras
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 1;
        this.sunLight.shadow.camera.far = 200;
        const d = 50;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        
        this.scene.add(this.sunLight);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
