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
let cursors, wasd;
let resources;
let currentTool = 'axe';
let isAttacking = false;
let toolSprite;

let wood = 0, stone = 0, gold = 0, diamond = 0;
let woodText, stoneText, goldText, diamondText;
let slots = {};

function preload() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });

    // 1. Biomas / Texturas de Terreno
    // Grass (Pradera - Centro)
    g.fillStyle(0x56ab2f, 1); g.fillRect(0, 0, 100, 100);
    g.fillStyle(0x489825, 1); g.fillRect(0, 0, 50, 50); g.fillRect(50, 50, 50, 50);
    g.generateTexture('tile_grass', 100, 100); g.clear();

    // Snow (Nieve / Polo Norte - Arriba)
    g.fillStyle(0xe0f7fa, 1); g.fillRect(0, 0, 100, 100);
    g.fillStyle(0xb2ebf2, 1); g.fillRect(0, 0, 50, 50); g.fillRect(50, 50, 50, 50);
    g.generateTexture('tile_snow', 100, 100); g.clear();

    // Desert (Desierto - Abajo)
    g.fillStyle(0xe67e22, 1); g.fillRect(0, 0, 100, 100);
    g.fillStyle(0xd35400, 1); g.fillRect(0, 0, 50, 50); g.fillRect(50, 50, 50, 50);
    g.generateTexture('tile_desert', 100, 100); g.clear();

    // Dark (Zona Oscura - Derecha)
    g.fillStyle(0x2c3e50, 1); g.fillRect(0, 0, 100, 100);
    g.fillStyle(0x1a252f, 1); g.fillRect(0, 0, 50, 50); g.fillRect(50, 50, 50, 50);
    g.generateTexture('tile_dark', 100, 100); g.clear();

    // 2. Jugador
    g.fillStyle(0x000000, 0.2); g.fillCircle(30, 34, 24);
    g.fillStyle(0xe74c3c, 1); g.fillCircle(30, 30, 22);
    g.lineStyle(3, 0x2c3e50, 1); g.strokeCircle(30, 30, 22);
    g.fillStyle(0xf1c40f, 1); g.fillCircle(48, 16, 7); g.strokeCircle(48, 16, 7);
    g.fillCircle(48, 44, 7); g.strokeCircle(48, 44, 7);
    g.generateTexture('player_texture', 60, 60); g.clear();

    // 3. Recursos (Árboles y Minerales)
    // Pino
    g.fillStyle(0x795548, 1); g.fillRect(35, 50, 10, 20);
    g.fillStyle(0x1b5e20, 1); g.fillTriangle(40, 10, 15, 40, 65, 40);
    g.fillTriangle(40, 25, 20, 55, 60, 55);
    g.generateTexture('pine', 80, 80); g.clear();

    // Árbol Frutal
    g.fillStyle(0x795548, 1); g.fillRect(35, 45, 10, 25);
    g.fillStyle(0x2e7d32, 1); g.fillCircle(40, 35, 30);
    g.fillStyle(0xe74c3c, 1); g.fillCircle(30, 25, 4); g.fillCircle(50, 30, 4);
    g.generateTexture('tree', 80, 80); g.clear();

    // Rocas
    g.fillStyle(0x7f8c8d, 1); g.fillCircle(30, 30, 24);
    g.lineStyle(3, 0x2c3e50, 1); g.strokeCircle(30, 30, 24);
    g.generateTexture('rock', 60, 60); g.clear();

    // Oro
    g.fillStyle(0xf1c40f, 1); g.fillCircle(30, 30, 24);
    g.fillStyle(0xf39c12, 1); g.fillCircle(25, 25, 10);
    g.lineStyle(3, 0xd35400, 1); g.strokeCircle(30, 30, 24);
    g.generateTexture('gold_rock', 60, 60); g.clear();

    // Diamante
    g.fillStyle(0x00d2d3, 1); g.fillCircle(30, 30, 24);
    g.fillStyle(0x54a0ff, 1); g.fillCircle(25, 25, 10);
    g.lineStyle(3, 0x2e86de, 1); g.strokeCircle(30, 30, 24);
    g.generateTexture('diamond_rock', 60, 60); g.clear();

    // 4. Herramientas
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

    // Mapa por Biomas
    this.add.tileSprite(MAP_SIZE / 2, 500, MAP_SIZE, 1000, 'tile_snow');
    this.add.tileSprite(MAP_SIZE / 2, MAP_SIZE - 500, MAP_SIZE, 1000, 'tile_desert');
    this.add.tileSprite(MAP_SIZE - 750, MAP_SIZE / 2, 1500, 2000, 'tile_dark');
    this.add.tileSprite(1250, MAP_SIZE / 2, 2500, 2000, 'tile_grass');

    resources = this.physics.add.staticGroup();
    
    // Poblar recursos
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

    drawUI(this);

    this.input.on('pointermove', (pointer) => {
        let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        player.setRotation(angle);
    });

    this.input.on('pointerdown', (pointer) => {
        if (pointer.y > window.innerHeight - 80) return;
        useTool(this);
    });
}

function update() {
    player.setVelocity(0);
    const speed = 280;

    if (cursors.left.isDown || wasd.left.isDown) player.setVelocityX(-speed);
    else if (cursors.right.isDown || wasd.right.isDown) player.setVelocityX(speed);

    if (cursors.up.isDown || wasd.up.isDown) player.setVelocityY(-speed);
    else if (cursors.down.isDown || wasd.down.isDown) player.setVelocityY(speed);

    player.body.velocity.normalize().scale(speed);

    toolSprite.x = player.x + Math.cos(player.rotation) * 25;
    toolSprite.y = player.y + Math.sin(player.rotation) * 25;
    if (!isAttacking) {
        toolSprite.rotation = player.rotation + Math.PI / 2;
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
    toolSprite.setTexture(type);
    Object.keys(slots).forEach(key => slots[key].setStrokeStyle(2, 0xffffff));
    if (slots[type]) slots[type].setStrokeStyle(4, 0xf1c40f);
}

function drawUI(scene) {
    let ui = scene.add.graphics().setScrollFactor(0).setDepth(100);

    ui.fillStyle(0x000000, 0.6);
    ui.fillRoundedRect(15, 15, 180, 140, 10);

    woodText = scene.add.text(25, 25, '🪵 Madera: 0', { font: 'bold 15px Arial', fill: '#f39c12' }).setScrollFactor(0).setDepth(101);
    stoneText = scene.add.text(25, 55, '🪨 Piedra: 0', { font: 'bold 15px Arial', fill: '#bdc3c7' }).setScrollFactor(0).setDepth(101);
    goldText = scene.add.text(25, 85, '🟡 Oro: 0', { font: 'bold 15px Arial', fill: '#f1c40f' }).setScrollFactor(0).setDepth(101);
    diamondText = scene.add.text(25, 115, '🔷 Diamante: 0', { font: 'bold 15px Arial', fill: '#00d2d3' }).setScrollFactor(0).setDepth(101);

    let startX = window.innerWidth / 2 - 100;
    let startY = window.innerHeight - 70;
    let toolNames = ['axe', 'pickaxe', 'hammer'];
    let icons = ['🪓', '⛏️', '🔨'];

    toolNames.forEach((name, i) => {
        let x = startX + i * 70;
        let box = scene.add.rectangle(x, startY, 60, 60, 0x000000, 0.7).setScrollFactor(0).setDepth(101).setInteractive();
        box.setStrokeStyle(2, 0xffffff);

        scene.add.text(x - 12, startY - 18, icons[i], { font: '26px Arial' }).setScrollFactor(0).setDepth(102);
        scene.add.text(x - 24, startY - 26, (i + 1).toString(), { font: 'bold 12px Arial', fill: '#ffffff' }).setScrollFactor(0).setDepth(102);

        box.on('pointerdown', () => selectTool(name));
        slots[name] = box;
    });

    selectTool('axe');
}

window.addEventListener('resize', () => {
    if (game) game.scale.resize(window.innerWidth, window.innerHeight);
});
