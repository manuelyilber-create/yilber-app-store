// Módulo de Controles, UI, Joystick y Sistema de Bolsos por Colores
class ControlsManager {
    constructor(scene) {
        this.scene = scene;
        this.slots = {};
        this.currentTool = 'axe';
        
        // Definición de Bolsos y sus capacidades
        this.bags = [
            { name: 'Bolso Anaranjado', slots: 10, color: 0xe67e22, iconColor: '#e67e22' },
            { name: 'Bolso Verde', slots: 15, color: 0x2ecc71, iconColor: '#2ecc71' },
            { name: 'Bolso Rojo', slots: 20, color: 0xe74c3c, iconColor: '#e74c3c' },
            { name: 'Bolso Morado', slots: 30, color: 0x9b59b6, iconColor: '#9b59b6' },
            { name: 'Bolso de Colores', slots: 40, color: 0xf1c40f, iconColor: '#f1c40f' }
        ];
        
        this.currentBagIndex = 0; // Comienza con el Bolso Anaranjado
        this.isBagOpen = false;

        // Variables de Joystick Táctil
        this.joystickPointer = null;
        this.joystickBase = { x: 120, y: window.innerHeight - 120 };
        this.joystickVector = { x: 0, y: 0 };

        this.initKeyboard();
        this.initUI();
        this.initTouchControls();
    }

    initKeyboard() {
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.scene.input.keyboard.on('keydown-ONE', () => this.selectTool('axe'));
        this.scene.input.keyboard.on('keydown-TWO', () => this.selectTool('pickaxe'));
        this.scene.input.keyboard.on('keydown-THREE', () => this.selectTool('hammer'));
        
        // Abrir/cerrar mochila con la tecla B
        this.scene.input.keyboard.on('keydown-B', () => this.toggleBag());
    }

    initUI() {
        let ui = this.scene.add.graphics().setScrollFactor(0).setDepth(100);

        // 1. Panel de Recursos (Arriba Izquierda)
        ui.fillStyle(0x000000, 0.6);
        ui.fillRoundedRect(15, 15, 180, 140, 10);

        this.woodText = this.scene.add.text(25, 25, '🪵 Madera: 0', { font: 'bold 15px Arial', fill: '#f39c12' }).setScrollFactor(0).setDepth(101);
        this.stoneText = this.scene.add.text(25, 55, '🪨 Piedra: 0', { font: 'bold 15px Arial', fill: '#bdc3c7' }).setScrollFactor(0).setDepth(101);
        this.goldText = this.scene.add.text(25, 85, '🟡 Oro: 0', { font: 'bold 15px Arial', fill: '#f1c40f' }).setScrollFactor(0).setDepth(101);
        this.diamondText = this.scene.add.text(25, 115, '🔷 Diamante: 0', { font: 'bold 15px Arial', fill: '#00d2d3' }).setScrollFactor(0).setDepth(101);

        // 2. Botón de Bolso / Mochila (Arriba Derecha)
        let bagX = window.innerWidth - 70;
        let bagY = 20;

        this.bagBtnGraphics = this.scene.add.rectangle(bagX, bagY + 25, 50, 50, 0x2c3e50, 0.8)
            .setScrollFactor(0).setDepth(101).setInteractive();
        this.updateBagButtonBorder();

        this.scene.add.text(bagX - 16, bagY + 8, '🎒', { font: '28px Arial' }).setScrollFactor(0).setDepth(102);
        
        this.bagBtnGraphics.on('pointerdown', () => this.toggleBag());

        // Panel emergente de la Mochila
        this.bagContainer = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(150);
        this.bagContainer.setVisible(false);

        // 3. HOTBAR - Barra de Herramientas (Abajo Centro)
        let startX = window.innerWidth / 2 - 100;
        let startY = window.innerHeight - 60;
        let toolNames = ['axe', 'pickaxe', 'hammer'];
        let icons = ['🪓', '⛏️', '🔨'];

        toolNames.forEach((name, i) => {
            let x = startX + i * 70;
            let box = this.scene.add.rectangle(x, startY, 55, 55, 0x000000, 0.7).setScrollFactor(0).setDepth(101).setInteractive();
            box.setStrokeStyle(2, 0xffffff);

            this.scene.add.text(x - 12, startY - 16, icons[i], { font: '24px Arial' }).setScrollFactor(0).setDepth(102);
            this.scene.add.text(x - 22, startY - 24, (i + 1).toString(), { font: 'bold 11px Arial', fill: '#ffffff' }).setScrollFactor(0).setDepth(102);

            box.on('pointerdown', () => this.selectTool(name));
            this.slots[name] = box;
        });

        this.selectTool('axe');
    }

    initTouchControls() {
        let touchGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(100);

        // Base del Joystick (Izquierda)
        touchGraphics.lineStyle(4, 0xffffff, 0.4);
        touchGraphics.strokeCircle(this.joystickBase.x, this.joystickBase.y, 50);

        // Botón Interno del Joystick
        this.joystickThumb = this.scene.add.circle(this.joystickBase.x, this.joystickBase.y, 25, 0xffffff, 0.5)
            .setScrollFactor(0).setDepth(101);

        // Botón de Disparo / Acción (Derecha)
        let attackX = window.innerWidth - 100;
        let attackY = window.innerHeight - 100;

        let attackBtn = this.scene.add.circle(attackX, attackY, 40, 0xe74c3c, 0.7)
            .setScrollFactor(0).setDepth(101).setInteractive();
        attackBtn.setStrokeStyle(3, 0xffffff);

        this.scene.add.text(attackX - 15, attackY - 15, '⚔️', { font: '28px Arial' }).setScrollFactor(0).setDepth(102);

        attackBtn.on('pointerdown', () => {
            useTool(this.scene);
        });

        // Eventos táctiles para el Joystick
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.x < window.innerWidth / 2 && pointer.y > window.innerHeight / 2) {
                this.joystickPointer = pointer;
            }
        });

        this.scene.input.on('pointermove', (pointer) => {
            if (this.joystickPointer && pointer.id === this.joystickPointer.id) {
                let dist = Phaser.Math.Distance.Between(this.joystickBase.x, this.joystickBase.y, pointer.x, pointer.y);
                let angle = Phaser.Math.Angle.Between(this.joystickBase.x, this.joystickBase.y, pointer.x, pointer.y);

                let maxDist = 45;
                let clampDist = Math.min(dist, maxDist);

                this.joystickThumb.x = this.joystickBase.x + Math.cos(angle) * clampDist;
                this.joystickThumb.y = this.joystickBase.y + Math.sin(angle) * clampDist;

                this.joystickVector.x = (Math.cos(angle) * clampDist) / maxDist;
                this.joystickVector.y = (Math.sin(angle) * clampDist) / maxDist;
            }
        });

        this.scene.input.on('pointerup', (pointer) => {
            if (this.joystickPointer && pointer.id === this.joystickPointer.id) {
                this.joystickPointer = null;
                this.joystickThumb.x = this.joystickBase.x;
                this.joystickThumb.y = this.joystickBase.y;
                this.joystickVector = { x: 0, y: 0 };
            }
        });
    }

    toggleBag() {
        this.isBagOpen = !this.isBagOpen;
        this.bagContainer.setVisible(this.isBagOpen);
        if (this.isBagOpen) {
            this.renderBagGrid();
        }
    }

    // Función para equipar un bolso mejor (0: Anaranjado, 1: Verde, 2: Rojo, 3: Morado, 4: Colores)
    equipBag(index) {
        if (index >= 0 && index < this.bags.length) {
            this.currentBagIndex = index;
            this.updateBagButtonBorder();
            if (this.isBagOpen) this.renderBagGrid();
        }
    }

    updateBagButtonBorder() {
        let currentBag = this.bags[this.currentBagIndex];
        this.bagBtnGraphics.setStrokeStyle(3, currentBag.color);
    }

    renderBagGrid() {
        this.bagContainer.removeAll(true);

        let currentBag = this.bags[this.currentBagIndex];
        let cols = 5;
        let rows = Math.ceil(currentBag.slots / cols);

        let panelWidth = 340;
        let panelHeight = 80 + rows * 52;

        let bg = this.scene.add.rectangle(window.innerWidth / 2, window.innerHeight / 2, panelWidth, panelHeight, 0x000000, 0.88);
        bg.setStrokeStyle(3, currentBag.color);
        this.bagContainer.add(bg);

        let title = this.scene.add.text(
            window.innerWidth / 2 - 130, 
            window.innerHeight / 2 - panelHeight / 2 + 20, 
            `🎒 ${currentBag.name} (${currentBag.slots} Espacios)`, 
            { font: 'bold 15px Arial', fill: currentBag.iconColor }
        );
        this.bagContainer.add(title);

        let startX = window.innerWidth / 2 - 104;
        let startY = window.innerHeight / 2 - panelHeight / 2 + 60;

        for (let i = 0; i < currentBag.slots; i++) {
            let row = Math.floor(i / cols);
            let col = i % cols;
            let x = startX + col * 52;
            let y = startY + row * 52;

            let slotBg = this.scene.add.rectangle(x, y, 46, 46, 0x2c3e50, 0.8);
            slotBg.setStrokeStyle(1, 0x7f8c8d);
            this.bagContainer.add(slotBg);

            let slotNum = this.scene.add.text(x - 20, y - 20, (i + 1).toString(), { font: '9px Arial', fill: '#95a5a6' });
            this.bagContainer.add(slotNum);
        }
    }

    selectTool(type) {
        this.currentTool = type;
        if (this.scene.toolSprite) {
            this.scene.toolSprite.setTexture(type);
        }
        Object.keys(this.slots).forEach(key => this.slots[key].setStrokeStyle(2, 0xffffff));
        if (this.slots[type]) this.slots[type].setStrokeStyle(4, 0xf1c40f);
    }

    updateResources(wood, stone, gold, diamond) {
        this.woodText.setText('🪵 Madera: ' + wood);
        this.stoneText.setText('🪨 Piedra: ' + stone);
        this.goldText.setText('🟡 Oro: ' + gold);
        this.diamondText.setText('🔷 Diamante: ' + diamond);
    }

    getMovementVelocity(speed) {
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
        else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;

        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
        else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

        if (this.joystickVector.x !== 0 || this.joystickVector.y !== 0) {
            vx = this.joystickVector.x * speed;
            vy = this.joystickVector.y * speed;
        }

        return { x: vx, y: vy };
    }
}
