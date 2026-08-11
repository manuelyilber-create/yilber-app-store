// js/Controls.js
export class Controls {
    constructor(player, camera, canvas) {
        this.player = player;
        this.camera = camera;
        this.canvas = canvas;
        
        this.cameraOffset = new THREE.Vector3(0, 20, 15); // Vista .io perfecta
        
        // Estado de teclas
        this.keys = {};
        this.moveDir = new THREE.Vector3();
        
        // Estado Táctil (Joystick)
        this.joystickZone = document.getElementById('joystick-zone');
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickStick = document.getElementById('joystick-stick');
        this.touchId = null;
        this.touchStartPos = new THREE.Vector2();
        this.joystickVector = new THREE.Vector2(); // -1 a 1

        this.initPCControls();
        this.initTouchControls();
    }

    initPCControls() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    initTouchControls() {
        this.joystickZone.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.joystickZone.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.joystickZone.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Botón de ataque
        document.getElementById('attack-btn').addEventListener('touchstart', () => this.attack());
    }

    onTouchStart(e) {
        if (this.touchId !== null) return; // Ya hay un toque
        const touch = e.changedTouches[0];
        this.touchId = touch.identifier;
        this.touchStartPos.set(touch.clientX, touch.clientY);
        
        // Mostrar joystick donde toco
        this.joystickBase.style.display = 'block';
        this.joystickBase.style.left = `${touch.clientX}px`;
        this.joystickBase.style.top = `${touch.clientY}px`;
        this.joystickStick.style.transform = 'translate(0px, 0px)';
    }

    onTouchMove(e) {
        if (this.touchId === null) return;
        for (let touch of e.changedTouches) {
            if (touch.identifier === this.touchId) {
                const move = new THREE.Vector2(touch.clientX, touch.clientY);
                const dist = move.distanceTo(this.touchStartPos);
                const maxDist = 50; // Radio del joystick base

                const drag = move.sub(this.touchStartPos);
                if (dist > maxDist) drag.normalize().multiplyScalar(maxDist);
                
                this.joystickStick.style.transform = `translate(${drag.x}px, ${drag.y}px)`;
                
                // Normalizar vector de movimiento (-1 a 1)
                this.joystickVector.set(drag.x / maxDist, drag.y / maxDist);
            }
        }
    }

    onTouchEnd(e) {
        for (let touch of e.changedTouches) {
            if (touch.identifier === this.touchId) {
                this.touchId = null;
                this.joystickBase.style.display = 'none';
                this.joystickVector.set(0, 0);
            }
        }
    }

    attack() {
        // Lógica de ataque perfecta.
        this.player.mesh.position.y += 0.2; // Pequeño salto
        setTimeout(() => this.player.mesh.position.y -= 0.2, 100);
    }

    update(deltaTime) {
        this.moveDir.set(0, 0, 0);

        // 1. Procesar Teclado (PC)
        if (this.keys['w'] || this.keys['arrowup']) this.moveDir.z -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) this.moveDir.z += 1;
        if (this.keys['a'] || this.keys['arrowleft']) this.moveDir.x -= 1;
        if (this.keys['d'] || keys['arrowright']) this.moveDir.x += 1;

        // 2. Procesar Táctil (Joystick)
        if (this.joystickVector.length() > 0.1) {
            this.moveDir.x = this.joystickVector.x;
            this.moveDir.z = this.joystickVector.y;
        }

        // 3. Aplicar Movimiento y Rotación al Personaje
        if (this.moveDir.length() > 0.1) {
            this.moveDir.normalize();
            
            // Mover
            const moveStep = this.moveDir.clone().multiplyScalar(this.player.speed * deltaTime);
            this.player.mesh.position.add(moveStep);
            
            // Rotar suavemente hacia la dirección de movimiento
            const targetAngle = Math.atan2(this.moveDir.x, this.moveDir.z);
            const currentAngle = this.player.mesh.rotation.y;
            
            // Suavizado perfecto de rotación
            let deltaAngle = targetAngle - currentAngle;
            if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
            if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
            
            this.player.mesh.rotation.y += deltaAngle * this.player.rotationSpeed * deltaTime;
        }

        // 4. Actualizar Cámara (Seguimiento suave)
        this.camera.position.x = this.player.mesh.position.x + this.cameraOffset.x;
        this.camera.position.y = this.player.mesh.position.y + this.cameraOffset.y;
        this.camera.position.z = this.player.mesh.position.z + this.cameraOffset.z;
        this.camera.lookAt(this.player.mesh.position);
    }
}
