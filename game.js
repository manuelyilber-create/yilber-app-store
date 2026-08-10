const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let player;
let resources;
let currentTool = 'axe';
let isAttacking = false;
let toolSprite;

let wood = 0, stone = 0, gold = 0, diamond = 0;
let woodText, stoneText, goldText, diamondText;
let slots = {};

// Teclado
let cursors, wasd;

// Sistema de Bolsos
const bags = [
    { name: 'Bolso Anaranjado', slots: 10, color: 0xe67e22, iconColor: '#e67e22' },
    { name: 'Bolso Verde', slots: 15, color: 0x2ecc71, iconColor: '#2ecc71' },
    { name: 'Bolso Rojo', slots: 20, color: 0xe74c3c, iconColor: '#e74c3c' },
    { name: 'Bolso Morado', slots: 30, color: 0x9b59b6, iconColor: '#9b59b6' },
    { name: 'Bolso de Colores', slots: 40, color: 0xf1c40f, iconColor: '#f1c40f' }
];
let currentBagIndex = 0; // Bolso inicial (Anaranjado)
let isBagOpen = false;
let bagContainer, bagBtnGraphics;

// Joystick Táctil
let joystickPointer = null;
let joystickBase = { x: 120, y: window.innerHeight - 120 };
let joystickThumb;
let joystickVector = { x: 0, y: 0 };

function preload() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });

    // Terrenos / Biomas
    g.fillStyle(0x56ab2f, 1); g.fillRect(0, 0, 100, 100);
    g.fillStyle(0x489825, 1); g.fillRect(0, 0, 50, 50); g.fillRect(50, 50, 50, 50);
    g.generateTexture('tile_grass', 100, 100); g.clear();

    g.fillStyle(0xe0f7fa, 1); g.fillRect(0, 0, 100, 100);
    g.fillStyle(0xb2ebf2, 1); g.fillRect(0, 0, 50, 50); g.fillRect(50, 50, 50, 50);
    g.generateTexture('tile_snow', 100, 100); g.clear();

    g.fillStyle(0xe67e22, 1); g.fillRect(0, 0, 100, 100);
    g.fillStyle(0xd35400, 1); g.fillRect(0, 0, 50, 50); g.fillRect(50, 50, 50, 50);
    g.generateTexture('tile_desert', 100, 100); g.clear();

    g.fillStyle(0x2c3e50, 1); g.fillRect(0, 0, 100, 100);
    g.fillStyle(0x1a252f, 1); g.fillRect(0, 0, 50, 50); g.fillRect(50, 50, 50, 50);
    g.generateTexture('tile_dark', 100, 100); g.clear();

    // Jugador
    g.fillStyle(0x000000, 0.2); g.fillCircle(30, 34, 24);
    g.fillStyle(0xe74c3c, 1); g.fillCircle(30, 30, 22);
    g.lineStyle(3, 0x2c3e50, 1); g.strokeCircle(30, 30, 22);
    g.fillStyle(0xf1c40f, 1); g.fillCircle(48, 16, 7); g.strokeCircle(48, 16, 7);
    g.fillCircle(48, 44, 7); g.strokeCircle(48, 44, 7);
    g.generateTexture('player_texture', 60, 60); g.clear();

    // Recursos
    g.fillStyle(0x795548, 1); g.fillRect(35, 50, 10, 20);
    g.fillStyle(0x1b5e20, 1); g.fillTriangle(40, 10, 15, 40, 65, 40);
    g.fillTriangle(40, 25, 20, 55, 60, 55);
    g.generateTexture('pine', 80, 80); g.clear();

    g.fillStyle(0x795548, 1); g.fillRect(35, 45, 10, 25);
    g.fillStyle(0x2e7d32, 1); g.fillCircle(40, 35, 30);
    g.fillStyle(0xe74c3c, 1); g.fillCircle(30, 25, 4); g.fillCircle(50, 30, 4);
    g.generateTexture('tree', 80, 80); g.clear();

    g.fillStyle(0x7f8c8d, 1); g.fillCircle(30, 30, 24);
    g.lineStyle(3, 0x2c3e50, 1); g.strokeCircle(30, 30, 24);
    g.generateTexture('rock', 60, 60); g.clear();

    g.fillStyle(0xf1c40f, 1); g.fillCircle(30, 30, 24);
    g.fillStyle(0xf39c12, 1); g.fillCircle(25, 25, 10);
    g.lineStyle(3, 0xd35400, 1); g.strokeCircle(30, 30, 24);
    g.generateTexture('gold_rock', 60, 60); g.clear();

    g.fillStyle(0x00d2d3, 1); g.fillCircle(30, 30, 24);
    g.fillStyle(0x54a0ff, 1); g.fillCircle(25, 25, 10);
    g.lineStyle(3, 0x2e86de, 1); g.strokeCircle(30, 30, 24);
    g.generateTexture('diamond_rock', 60, 60); g.clear();

    // Herramientas
    g.fillStyle(0x8d6e63, 1); g.fillRect(5, 12, 6, 22);
    g.fillStyle(0xbdc3c7, 1); g.fillRect(2, 5, 14, 8);
    g.generateTexture('axe', 20, 35); g.clear();

    g.fillStyle(0x8d6e63, 1); g.fillRect(7, 12, 6, 22);
    g.fillStyle(0x7f8c8d, 1); g.fillRect(0, 5, 20, 6);
    g.generateTexture('pickaxe', 20, 35); g.clear();

    g.fillStyle(0x8d6e63, 1); g.fillRect(7, 12, 6, 22);
    g.fillStyle(0x34495e, 1); g.fillRect(2, 4, 16, 10);
    g.generateTexture('hammer', 20, 35); g.clear();
}

function create() {
    const MAP_SIZE = 4000;
    this.physics.world.setBounds(0, 0, MAP_SIZE, MAP_SIZE);

    // Fondo / Biomas
    this.add.tileSprite(MAP_SIZE / 2, 500, MAP_SIZE, 1000, 'tile_snow');
    this.add.tileSprite(MAP_SIZE / 2, MAP_SIZE - 500, MAP_SIZE, 1000, 'tile_desert');
    this.add.tileSprite(MAP_SIZE - 750, MAP_SIZE / 2, 1500, 2000, 'tile_dark');
    this.add.tileSprite(1250, MAP_SIZE / 2, 2500, 2000, 'tile_grass');

    resources = this.physics.add.staticGroup();
    for (let i = 0; i < 25; i++) {
        spawnRes(resources, Phaser.Math.Between(200, MAP_SIZE - 200), Phaser.Math.Between(100, 800), 'pine', 'tree', 4);
        spawnRes(resources, Phaser.Math.Between(2600, MAP_SIZE - 200), Phaser.Math.Between(1100, 2900), 'diamond_rock', 'diamond', 6);
        spawnRes(resources, Phaser.Math.Between(200, MAP_SIZE - 200), Phaser.Math.Between(3100, 3800), 'gold_rock', 'gold', 5);
        spawnRes(resources, Phaser.Math.Between(200, 2400), Phaser.Math.Between(1100, 2900), 'tree', 'tree', 3);
        spawnRes(resources, Phaser.Math.Between(200, 2400), Phaser.Math.Between(1100, 2900), 'rock', 'rock', 3);
    }

    player = this.physics.add.sprite(1500, 2000, 'player_texture');
    player.setCollideWorldBounds(true);
    player.setDepth(10);

    toolSprite = this.add.sprite(player.x, player.y, 'axe');
    toolSprite.setOrigin(0.5, 1.2);
    toolSprite.setDepth(11);

    this.physics.add.collider(player, resources);

    this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);

    // Teclas
    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.input.keyboard.on('keydown-ONE', () => selectTool('axe'));
    this.input.keyboard.on('keydown-TWO', () => selectTool('pickaxe'));
    this.input.keyboard.on('keydown-THREE', () => selectTool('hammer'));
    this.input.keyboard.on('keydown-B', () => toggleBag(this));

    // Crear UI (Recursos, Hotbar, Bolso, Joystick y Botón de Disparo)
    createUI(this);

    // Apuntar con el Mouse
    this.input.on('pointermove', (pointer) => {
        if (!joystickPointer) {
            let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
            player.setRotation(angle);
        }
    });

    // Ataque por clic de Mouse
    this.input.on('pointerdown', (pointer) => {
        if (pointer.x < 200 && pointer.y > window.innerHeight - 200) return; // Zona Joystick
        if (pointer.y > window.innerHeight - 80) return; // Zona Hotbar
        if (pointer.x > window.innerWidth - 120 && pointer.y > window.innerHeight - 120) return; // Botón Disparo

        useTool(this);
    });
}

function update() {
    player.setVelocity(0);
    const speed = 280;

    // Control Teclado
    if (cursors.left.isDown || wasd.left.isDown) player.setVelocityX(-speed);
    else if (cursors.right.isDown || wasd.right.isDown) player.setVelocityX(speed);

    if (cursors.up.isDown || wasd.up.isDown) player.setVelocityY(-speed);
    else if (cursors.down.isDown || wasd.down.isDown) player.setVelocityY(speed);

    // Control Joystick Táctil
    if (joystickVector.x !== 0 || joystickVector.y !== 0) {
        player.setVelocityX(joystickVector.x * speed);
        player.setVelocityY(joystickVector.y * speed);
        let angle = Math.atan2(joystickVector.y, joystickVector.x);
        player.setRotation(angle);
    }

    player.body.velocity.normalize().scale(speed);

    toolSprite.x = player.x + Math.cos(player.rotation) * 25;
    toolSprite.y = player.y + Math.sin(player.rotation) * 25;
    if (!isAttacking) {
        toolSprite.rotation = player.rotation + Math.PI / 2;
    }
}

function createUI(scene) {
    let ui = scene.add.graphics().setScrollFactor(0).setDepth(100);

    // 1. Panel de Recursos
    ui.fillStyle(0x000000, 0.6);
    ui.fillRoundedRect(15, 15, 180, 140, 10);

    woodText = scene.add.text(25, 25, '🪵 Madera: 0', { font: 'bold 15px Arial', fill: '#f39c12' }).setScrollFactor(0).setDepth(101);
    stoneText = scene.add.text(25, 55, '🪨 Piedra: 0', { font: 'bold 15px Arial', fill: '#bdc3c7' }).setScrollFactor(0).setDepth(101);
    goldText = scene.add.text(25, 85, '🟡 Oro: 0', { font: 'bold 15px Arial', fill: '#f1c40f' }).setScrollFactor(0).setDepth(101);
    diamondText = scene.add.text(25, 115, '🔷 Diamante: 0', { font: 'bold 15px Arial', fill: '#00d2d3' }).setScrollFactor(0).setDepth(101);

    // 2. Botón de Bolso
    let bagX = window.innerWidth - 70;
    let bagY = 20;

    bagBtnGraphics = scene.add.rectangle(bagX, bagY + 25, 50, 50, 0x2c3e50, 0.8)
        .setScrollFactor(0).setDepth(101).setInteractive();
    bagBtnGraphics.setStrokeStyle(3, bags[currentBagIndex].color);

    scene.add.text(bagX - 16, bagY + 8, '🎒', { font: '28px Arial' }).setScrollFactor(0).setDepth(102);
    bagBtnGraphics.on('pointerdown', () => toggleBag(scene));

    bagContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(150);
    bagContainer.setVisible(false);

    // 3. Hotbar Abajo
    let startX = window.innerWidth / 2 - 100;
    let startY = window.innerHeight - 60;
    let toolNames = ['axe', 'pickaxe', 'hammer'];
    let icons = ['🪓', '⛏️', '🔨'];

    toolNames.forEach((name, i) => {
        let x = startX + i * 70;
        let box = scene.add.rectangle(x, startY, 55, 55, 0x000000, 0.7).setScrollFactor(0).setDepth(101).setInteractive();
        box.setStrokeStyle(2, 0xffffff);

        scene.add.text(x - 12, startY - 16, icons[i], { font: '24px Arial' }).setScrollFactor(0).setDepth(102);
        scene.add.text(x - 22, startY - 24, (i + 1).toString(), { font: 'bold 11px Arial', fill: '#ffffff' }).setScrollFactor(0).setDepth(102);

        box.on('pointerdown', () => selectTool(name));
        slots[name] = box;
    });

    selectTool('axe');

    // 4. Joystick Táctil (Izquierda)
    ui.lineStyle(4, 0xffffff, 0.4);
    ui.strokeCircle(joystickBase.x, joystickBase.y, 50);

    joystickThumb = scene.add.circle(joystickBase.x, joystickBase.y, 25, 0xffffff, 0.5)
        .setScrollFactor(0).setDepth(101);

    scene.input.on('pointerdown', (pointer) => {
        if (pointer.x < 250 && pointer.y > window.innerHeight - 250) {
            joystickPointer = pointer;
        }
    });

    scene.input.on('pointermove', (pointer) => {
        if (joystickPointer && pointer.id === joystickPointer.id) {
            let dist = Phaser.Math.Distance.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y);
            let angle = Phaser.Math.Angle.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y);

            let maxDist = 45;
            let clampDist = Math.min(dist, maxDist);

            joystickThumb.x = joystickBase.x + Math.cos(angle) * clampDist;
            joystickThumb.y = joystickBase.y + Math.sin(angle) * clampDist;

            joystickVector.x = (Math.cos(angle) * clampDist) / maxDist;
            joystickVector.y = (Math.sin(angle) * clampDist) / maxDist;
        }
    });

    scene.input.on('pointerup', (pointer) => {
        if (joystickPointer && pointer.id === joystickPointer.id) {
            joystickPointer = null;
            joystickThumb.x = joystickBase.x;
            joystickThumb.y = joystickBase.y;
            joystickVector = { x: 0, y: 0 };
        }
    });

    // 5. Botón de Ataque / Disparo (Derecha)
    let attackX = window.innerWidth - 80;
    let attackY = window.innerHeight - 80;

    let attackBtn = scene.add.circle(attackX, attackY, 35, 0xe74c3c, 0.8)
        .setScrollFactor(0).setDepth(101).setInteractive();
    attackBtn.setStrokeStyle(3, 0xffffff);

    scene.add.text(attackX - 14, attackY - 14, '⚔️', { font: '24px Arial' }).setScrollFactor(0).setDepth(102);
    attackBtn.on('pointerdown', () => useTool(scene));
}

function toggleBag(scene) {
    isBagOpen = !isBagOpen;
    bagContainer.setVisible(isBagOpen);
    if (isBagOpen) {
        renderBagGrid(scene);
    }
}

function renderBagGrid(scene) {
    bagContainer.removeAll(true);

    let currentBag = bags[currentBagIndex];
    let cols = 5;
    let rows = Math.ceil(currentBag.slots / cols);

    let panelWidth = 340;
    let panelHeight = 80 + rows * 52;

    let bg = scene.add.rectangle(window.innerWidth / 2, window.innerHeight / 2, panelWidth, panelHeight, 0x000000, 0.88);
    bg.setStrokeStyle(3, currentBag.color);
    bagContainer.add(bg);

    let title = scene.add.text(
        window.innerWidth / 2 - 130, 
        window.innerHeight / 2 - panelHeight / 2 + 20, 
        `🎒 ${currentBag.name} (${currentBag.slots} Espacios)`, 
        { font: 'bold 15px Arial', fill: currentBag.iconColor }
    );
    bagContainer.add(title);

    let startX = window.innerWidth / 2 - 104;
    let startY = window.innerHeight / 2 - panelHeight / 2 + 60;

    for (let i = 0; i < currentBag.slots; i++) {
        let row = Math.floor(i / cols);
        let col = i % cols;
        let x = startX + col * 52;
        let y = startY + row * 52;

        let slotBg = scene.add.rectangle(x, y, 46, 46, 0x2c3e50, 0.8);
        slotBg.setStrokeStyle(1, 0x7f8c8d);
        bagContainer.add(slotBg);

        let slotNum = scene.add.text(x - 20, y - 20, (i + 1).toString(), { font: '9px Arial', fill: '#95a5a6' });
        bagContainer.add(slotNum);
    }
}

function spawnRes(group, x, y, texture, type, hp) {
    let res = group.create(x, y, texture);
    res.resourceType = type;
    res.health = hp;
    res.refreshBody();
}

function useTool(scene) {
    if (isAttacking) return;
    isAttacking = true;

    scene.tweens.add({
        targets: toolSprite,
        angle: toolSprite.angle + 50,
        duration: 90,
        yoyo: true,
        onComplete: () => { isAttacking = false; }
    });

    resources.getChildren().forEach((res) => {
        let dist = Phaser.Math.Distance.Between(player.x, player.y, res.x, res.y);
        if (dist < 100) {
            let dmg = 1;
            if (currentTool === 'axe' && res.resourceType === 'tree') dmg = 2;
            if (currentTool === 'pickaxe' && (res.resourceType === 'rock' || res.resourceType === 'gold' || res.resourceType === 'diamond')) dmg = 2;

            res.health -= dmg;
            res.setAlpha(0.5);
            scene.time.delayedCall(100, () => res.setAlpha(1));

            if (res.resourceType === 'tree') { wood += 5; woodText.setText('🪵 Madera: ' + wood); }
            else if (res.resourceType === 'rock') { stone += 5; stoneText.setText('🪨 Piedra: ' + stone); }
            else if (res.resourceType === 'gold') { gold += 3; goldText.setText('🟡 Oro: ' + gold); }
            else if (res.resourceType === 'diamond') { diamond += 1; diamondText.setText('🔷 Diamante: ' + diamond); }

            if (res.health <= 0) res.destroy();
        }
    });
}

function selectTool(type) {
    currentTool = type;
    if (toolSprite) toolSprite.setTexture(type);
    Object.keys(slots).forEach(key => slots[key].setStrokeStyle(2, 0xffffff));
    if (slots[type]) slots[type].setStrokeStyle(4, 0xf1c40f);
}

window.addEventListener('resize', () => {
    if (game) game.scale.resize(window.innerWidth, window.innerHeight);
});
