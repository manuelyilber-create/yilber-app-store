// Configuración principal del juego con Phaser 3
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

// Variables del juego
let player;
let cursors, wasd;
let resources;
let axe;
let isAttacking = false;

// Variables de UI, Inventario y Puntaje
let score = 0;
let wood = 0;
let stone = 0;
let scoreText, woodText, stoneText;
let leaderboardTexts = [];
let minimapGraphics;

function preload() {
    // 1. Textura de Suelo Suave (Sin rayas duras)
    let gridGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    gridGraphics.fillStyle(0x76b852, 1);
    gridGraphics.fillRect(0, 0, 128, 128);
    // Detalles sutiles de tono de césped
    gridGraphics.fillStyle(0x6eaf49, 1);
    gridGraphics.fillRect(0, 0, 64, 64);
    gridGraphics.fillRect(64, 64, 64, 64);
    gridGraphics.generateTexture('grid', 128, 128);

    // 2. Jugador Mejorado (Estilo .io con sombra)
    let playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Sombra
    playerGraphics.fillStyle(0x000000, 0.2);
    playerGraphics.fillCircle(32, 36, 26);
    // Cuerpo
    playerGraphics.fillStyle(0xf1c40f, 1);
    playerGraphics.fillCircle(32, 32, 24);
    playerGraphics.lineStyle(3, 0x2c3e50, 1);
    playerGraphics.strokeCircle(32, 32, 24);
    // Manos
    playerGraphics.fillStyle(0xf1c40f, 1);
    playerGraphics.fillCircle(52, 18, 7);
    playerGraphics.strokeCircle(52, 18, 7);
    playerGraphics.fillCircle(52, 46, 7);
    playerGraphics.strokeCircle(52, 46, 7);
    playerGraphics.generateTexture('player_texture', 64, 64);

    // 3. Árbol Frondoso
    let treeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Sombra
    treeGraphics.fillStyle(0x000000, 0.25);
    treeGraphics.fillCircle(45, 50, 40);
    // Tronco
    treeGraphics.fillStyle(0x795548, 1);
    treeGraphics.fillRect(38, 50, 14, 30);
    // Copa del árbol (Hojas estructuradas)
    treeGraphics.fillStyle(0x2e7d32, 1);
    treeGraphics.fillCircle(45, 40, 36);
    treeGraphics.fillStyle(0x388e3c, 1);
    treeGraphics.fillCircle(35, 30, 24);
    treeGraphics.lineStyle(3, 0x1b5e20, 1);
    treeGraphics.strokeCircle(45, 40, 36);
    treeGraphics.generateTexture('tree', 90, 90);

    // 4. Roca Detallada
    let rockGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Sombra
    rockGraphics.fillStyle(0x000000, 0.25);
    rockGraphics.fillCircle(35, 38, 28);
    // Cuerpo de la roca
    rockGraphics.fillStyle(0x95a5a6, 1);
    rockGraphics.fillCircle(35, 35, 26);
    rockGraphics.fillStyle(0x7f8c8d, 1);
    rockGraphics.fillCircle(30, 30, 16);
    rockGraphics.lineStyle(3, 0x34495e, 1);
    rockGraphics.strokeCircle(35, 35, 26);
    rockGraphics.generateTexture('rock', 70, 70);

    // 5. Hacha Diseñada
    let axeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    // Mango de madera
    axeGraphics.fillStyle(0x8d6e63, 1);
    axeGraphics.fillRect(6, 10, 6, 25);
    // Hoja de metal
    axeGraphics.fillStyle(0xbdc3c7, 1);
    axeGraphics.fillTriangle(0, 5, 18, 5, 9, 18);
    axeGraphics.lineStyle(1, 0x2c3e50, 1);
    axeGraphics.strokeTriangle(0, 5, 18, 5, 9, 18);
    axeGraphics.generateTexture('axe', 24, 38);
}

function create() {
    const MAP_WIDTH = 3000;
    const MAP_HEIGHT = 3000;

    // Fondo repetitivo de hierba limpia
    this.add.tileSprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 'grid');
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Grupo de Recursos
    resources = this.physics.add.staticGroup();
    spawnResources(resources, 'tree', 45, MAP_WIDTH, MAP_HEIGHT);
    spawnResources(resources, 'rock', 35, MAP_WIDTH, MAP_HEIGHT);

    // Jugador
    player = this.physics.add.sprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'player_texture');
    player.setCollideWorldBounds(true);
    player.setDepth(10);

    // Hacha
    axe = this.add.sprite(player.x, player.y, 'axe');
    axe.setOrigin(0.5, 1.2);
    axe.setDepth(11);

    // Colisión física entre jugador y recursos
    this.physics.add.collider(player, resources);

    // Cámara
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);

    // Controles teclado
    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Interfaz Gráfica (UI)
    drawUI(this);

    // Mini-mapa Gráfico
    minimapGraphics = this.add.graphics();
    minimapGraphics.setScrollFactor(0);
    minimapGraphics.setDepth(100);

    // Apuntar con el mouse
    this.input.on('pointermove', function (pointer) {
        let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        player.setRotation(angle);
    }, this);

    // Ataque / Recolección al hacer clic
    this.input.on('pointerdown', function () {
        hitResource(this);
    }, this);
}

function update() {
    player.setVelocity(0);
    const speed = 260;

    if (cursors.left.isDown || wasd.left.isDown) player.setVelocityX(-speed);
    else if (cursors.right.isDown || wasd.right.isDown) player.setVelocityX(speed);

    if (cursors.up.isDown || wasd.up.isDown) player.setVelocityY(-speed);
    else if (cursors.down.isDown || wasd.down.isDown) player.setVelocityY(speed);

    player.body.velocity.normalize().scale(speed);

    // Movimiento del hacha sincronizado con el jugador
    axe.x = player.x + Math.cos(player.rotation) * 22;
    axe.y = player.y + Math.sin(player.rotation) * 22;
    if (!isAttacking) {
        axe.rotation = player.rotation + Math.PI / 2;
    }

    // Actualizar el Mini-mapa
    updateMinimap();
}

function spawnResources(group, type, amount, mapWidth, mapHeight) {
    for (let i = 0; i < amount; i++) {
        let x = Phaser.Math.Between(150, mapWidth - 150);
        let y = Phaser.Math.Between(150, mapHeight - 150);
        let res = group.create(x, y, type);
        res.resourceType = type;
        res.health = 3;
        res.refreshBody();
    }
}

function hitResource(scene) {
    if (isAttacking) return;
    isAttacking = true;

    scene.tweens.add({
        targets: axe,
        angle: axe.angle + 45,
        duration: 90,
        yoyo: true,
        onComplete: () => { isAttacking = false; }
    });

    resources.getChildren().forEach((res) => {
        let distance = Phaser.Math.Distance.Between(player.x, player.y, res.x, res.y);
        if (distance < 75) {
            res.health -= 1;
            res.setAlpha(0.6);
            scene.time.delayedCall(100, () => res.setAlpha(1));

            if (res.resourceType === 'tree') {
                wood += 5;
                woodText.setText('🪵 Madera: ' + wood);
            } else if (res.resourceType === 'rock') {
                stone += 5;
                stoneText.setText('🪨 Piedra: ' + stone);
            }

            score += 15;
            scoreText.setText('Puntos: ' + score);
            updateLeaderboard();

            if (res.health <= 0) {
                let type = res.resourceType;
                res.destroy();

                scene.time.delayedCall(4000, () => {
                    spawnResources(resources, type, 1, 3000, 3000);
                });
            }
        }
    });
}

function drawUI(scene) {
    let uiGraphics = scene.add.graphics();
    uiGraphics.setScrollFactor(0);
    uiGraphics.setDepth(100);

    // Panel de Inventario (Izquierda)
    uiGraphics.fillStyle(0x000000, 0.6);
    uiGraphics.fillRoundedRect(15, 15, 200, 110, 10);

    scoreText = scene.add.text(25, 25, 'Puntos: 0', { font: 'bold 18px Arial', fill: '#ffffff' }).setScrollFactor(0).setDepth(101);
    woodText = scene.add.text(25, 55, '🪵 Madera: 0', { font: '16px Arial', fill: '#f39c12' }).setScrollFactor(0).setDepth(101);
    stoneText = scene.add.text(25, 82, '🪨 Piedra: 0', { font: '16px Arial', fill: '#bdc3c7' }).setScrollFactor(0).setDepth(101);

    // Panel de Leaderboard (Derecha Superior)
    let rightX = window.innerWidth - 200;
    uiGraphics.fillStyle(0x000000, 0.6);
    uiGraphics.fillRoundedRect(rightX, 15, 185, 130, 10);

    scene.add.text(rightX + 15, 22, 'Leaderboard', { font: 'bold 16px Arial', fill: '#f1c40f' }).setScrollFactor(0).setDepth(101);
    
    leaderboardTexts[0] = scene.add.text(rightX + 15, 50, '1. Jugador#1 - 2500', { font: '13px Arial', fill: '#cccccc' }).setScrollFactor(0).setDepth(101);
    leaderboardTexts[1] = scene.add.text(rightX + 15, 70, '2. Jugador#2 - 1200', { font: '13px Arial', fill: '#cccccc' }).setScrollFactor(0).setDepth(101);
    leaderboardTexts[2] = scene.add.text(rightX + 15, 95, '3. TÚ: 0', { font: 'bold 13px Arial', fill: '#2ecc71' }).setScrollFactor(0).setDepth(101);

    // Controles Táctiles estilo Joystick
    uiGraphics.lineStyle(5, 0xffffff, 0.5);
    uiGraphics.strokeCircle(100, window.innerHeight - 100, 50);
    uiGraphics.fillStyle(0xffffff, 0.3);
    uiGraphics.fillCircle(100, window.innerHeight - 100, 25);

    uiGraphics.lineStyle(5, 0xffffff, 0.5);
    uiGraphics.strokeCircle(window.innerWidth - 100, window.innerHeight - 100, 50);
    uiGraphics.fillStyle(0xffffff, 0.3);
    uiGraphics.fillCircle(window.innerWidth - 100, window.innerHeight - 100, 25);
}

function updateLeaderboard() {
    if (leaderboardTexts[2]) {
        leaderboardTexts[2].setText('3. TÚ: ' + score);
    }
}

function updateMinimap() {
    if (!minimapGraphics || !player) return;

    minimapGraphics.clear();
    let size = 110;
    let margin = 15;
    let x = window.innerWidth - size - margin;
    let y = window.innerHeight - size - margin;

    // Cuadro del Mini-mapa
    minimapGraphics.fillStyle(0x000000, 0.6);
    minimapGraphics.fillRoundedRect(x, y, size, size, 8);
    minimapGraphics.lineStyle(2, 0xffffff, 0.8);
    minimapGraphics.strokeRoundedRect(x, y, size, size, 8);

    // Punto verde del jugador
    let px = x + (player.x / 3000) * size;
    let py = y + (player.y / 3000) * size;
    minimapGraphics.fillStyle(0x2ecc71, 1);
    minimapGraphics.fillCircle(px, py, 4);
}

window.addEventListener('resize', () => {
    if (game) game.scale.resize(window.innerWidth, window.innerHeight);
});
