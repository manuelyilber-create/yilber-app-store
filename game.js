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
let axe;
let isAttacking = false;

// Variables de Inventario y Puntuación
let score = 0;
let wood = 0;
let stone = 0;
let scoreText, woodText, stoneText;

function preload() {
    // 1. Grid (Fondo)
    let gridGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    gridGraphics.fillStyle(0x71aa34, 1);
    gridGraphics.fillRect(0, 0, 100, 100);
    gridGraphics.lineStyle(2, 0x639b2b, 1);
    gridGraphics.strokeRect(0, 0, 100, 100);
    gridGraphics.generateTexture('grid', 100, 100);

    // 2. Player
    let playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    playerGraphics.fillStyle(0xebd1a8, 1);
    playerGraphics.fillCircle(30, 30, 25);
    playerGraphics.lineStyle(4, 0x333333, 1);
    playerGraphics.strokeCircle(30, 30, 25);
    playerGraphics.fillStyle(0xebd1a8, 1);
    playerGraphics.fillCircle(50, 15, 8);
    playerGraphics.strokeCircle(50, 15, 8);
    playerGraphics.fillCircle(50, 45, 8);
    playerGraphics.strokeCircle(50, 45, 8);
    playerGraphics.generateTexture('player_texture', 60, 60);

    // 3. Tree (Árbol)
    let treeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    treeGraphics.fillStyle(0x2d6a4f, 1);
    treeGraphics.fillCircle(40, 40, 35);
    treeGraphics.lineStyle(4, 0x1b4332, 1);
    treeGraphics.strokeCircle(40, 40, 35);
    treeGraphics.generateTexture('tree', 80, 80);

    // 4. Rock (Roca)
    let rockGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    rockGraphics.fillStyle(0x7f8c8d, 1);
    rockGraphics.fillCircle(30, 30, 25);
    rockGraphics.lineStyle(4, 0x2c3e50, 1);
    rockGraphics.strokeCircle(30, 30, 25);
    rockGraphics.generateTexture('rock', 60, 60);

    // 5. Axe (Hacha)
    let axeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    axeGraphics.fillStyle(0x8e44ad, 1);
    axeGraphics.fillRect(0, 0, 10, 25);
    axeGraphics.fillStyle(0xbdc3c7, 1);
    axeGraphics.fillRect(-5, 0, 20, 10);
    axeGraphics.generateTexture('axe', 20, 30);
}

function create() {
    const MAP_WIDTH = 3000;
    const MAP_HEIGHT = 3000;

    this.add.tileSprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 'grid');
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    resources = this.physics.add.staticGroup();

    spawnResources(resources, 'tree', 40, MAP_WIDTH, MAP_HEIGHT);
    spawnResources(resources, 'rock', 30, MAP_WIDTH, MAP_HEIGHT);

    player = this.physics.add.sprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'player_texture');
    player.setCollideWorldBounds(true);
    player.setDepth(10);

    axe = this.add.sprite(player.x, player.y, 'axe');
    axe.setOrigin(0.5, 1.5);
    axe.setDepth(11);

    this.physics.add.collider(player, resources);

    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);

    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    drawUI(this);

    this.input.on('pointermove', function (pointer) {
        let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        player.setRotation(angle);
    }, this);

    this.input.on('pointerdown', function () {
        hitResource(this);
    }, this);
}

function update() {
    player.setVelocity(0);
    const speed = 250;

    if (cursors.left.isDown || wasd.left.isDown) player.setVelocityX(-speed);
    else if (cursors.right.isDown || wasd.right.isDown) player.setVelocityX(speed);

    if (cursors.up.isDown || wasd.up.isDown) player.setVelocityY(-speed);
    else if (cursors.down.isDown || wasd.down.isDown) player.setVelocityY(speed);

    player.body.velocity.normalize().scale(speed);

    axe.x = player.x + Math.cos(player.rotation) * 20;
    axe.y = player.y + Math.sin(player.rotation) * 20;
    if (!isAttacking) {
        axe.rotation = player.rotation + Math.PI / 2;
    }
}

function spawnResources(group, type, amount, mapWidth, mapHeight) {
    for (let i = 0; i < amount; i++) {
        let x = Phaser.Math.Between(200, mapWidth - 200);
        let y = Phaser.Math.Between(200, mapHeight - 200);
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
        angle: axe.angle + 40,
        duration: 100,
        yoyo: true,
        onComplete: () => { isAttacking = false; }
    });

    resources.getChildren().forEach((res) => {
        let distance = Phaser.Math.Distance.Between(player.x, player.y, res.x, res.y);
        if (distance < 70) {
            res.health -= 1;
            res.setAlpha(0.5);
            scene.time.delayedCall(100, () => res.setAlpha(1));

            // Sumar recursos por golpe
            if (res.resourceType === 'tree') {
                wood += 5;
                woodText.setText('🪵 Madera: ' + wood);
            } else if (res.resourceType === 'rock') {
                stone += 5;
                stoneText.setText('🪨 Piedra: ' + stone);
            }

            score += 10;
            scoreText.setText('Puntos: ' + score);

            if (res.health <= 0) {
                let type = res.resourceType;
                res.destroy();

                // Reaparecer recurso en otra posición después de 5 segundos
                scene.time.delayedCall(5000, () => {
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

    // Fondo del Inventario (Arriba a la izquierda)
    uiGraphics.fillStyle(0x000000, 0.5);
    uiGraphics.fillRect(20, 20, 220, 110);

    // Textos de Recursos y Puntos
    scoreText = scene.add.text(30, 30, 'Puntos: 0', { font: '20px Arial', fill: '#ffffff' }).setScrollFactor(0).setDepth(101);
    woodText = scene.add.text(30, 60, '🪵 Madera: 0', { font: '18px Arial', fill: '#ffcc00' }).setScrollFactor(0).setDepth(101);
    stoneText = scene.add.text(30, 90, '🪨 Piedra: 0', { font: '18px Arial', fill: '#cccccc' }).setScrollFactor(0).setDepth(101);

    // Controles Táctiles (Joysticks)
    uiGraphics.lineStyle(6, 0xffffff, 0.6);
    uiGraphics.strokeCircle(120, window.innerHeight - 120, 60);
    uiGraphics.fillStyle(0xffffff, 0.4);
    uiGraphics.fillCircle(120, window.innerHeight - 120, 30);

    uiGraphics.lineStyle(6, 0xffffff, 0.6);
    uiGraphics.strokeCircle(window.innerWidth - 120, window.innerHeight - 120, 60);
    uiGraphics.fillStyle(0xffffff, 0.4);
    uiGraphics.fillCircle(window.innerWidth - 120, window.innerHeight - 120, 30);
}

window.addEventListener('resize', () => {
    if (game) game.scale.resize(window.innerWidth, window.innerHeight);
});
