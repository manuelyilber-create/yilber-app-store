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

function preload() {
    // 1. Fondo de cuadrícula verde
    let gridGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    gridGraphics.fillStyle(0x71aa34, 1);
    gridGraphics.fillRect(0, 0, 100, 100);
    gridGraphics.lineStyle(2, 0x639b2b, 1);
    gridGraphics.strokeRect(0, 0, 100, 100);
    gridGraphics.generateTexture('grid', 100, 100);

    // 2. Textura del Jugador
    let playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    playerGraphics.fillStyle(0xebd1a8, 1);
    playerGraphics.fillCircle(30, 30, 25);
    playerGraphics.lineStyle(4, 0x333333, 1);
    playerGraphics.strokeCircle(30, 30, 25);
    // Manos
    playerGraphics.fillStyle(0xebd1a8, 1);
    playerGraphics.fillCircle(50, 15, 8);
    playerGraphics.strokeCircle(50, 15, 8);
    playerGraphics.fillCircle(50, 45, 8);
    playerGraphics.strokeCircle(50, 45, 8);
    playerGraphics.generateTexture('player_texture', 60, 60);

    // 3. Textura del Árbol (Verde oscuro con copa circular)
    let treeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    treeGraphics.fillStyle(0x2d6a4f, 1);
    treeGraphics.fillCircle(40, 40, 35);
    treeGraphics.lineStyle(4, 0x1b4332, 1);
    treeGraphics.strokeCircle(40, 40, 35);
    treeGraphics.generateTexture('tree', 80, 80);

    // 4. Textura de Roca (Gris irregular)
    let rockGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    rockGraphics.fillStyle(0x7f8c8d, 1);
    rockGraphics.fillCircle(30, 30, 25);
    rockGraphics.lineStyle(4, 0x2c3e50, 1);
    rockGraphics.strokeCircle(30, 30, 25);
    rockGraphics.generateTexture('rock', 60, 60);

    // 5. Textura del Hacha / Herramienta
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

    // Fondo
    this.add.tileSprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 'grid');
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Grupo de recursos con físicas (estáticos)
    resources = this.physics.add.staticGroup();

    // Generar 40 Árboles y 30 Rocas de forma aleatoria en el mapa
    spawnResources(resources, 'tree', 40, MAP_WIDTH, MAP_HEIGHT);
    spawnResources(resources, 'rock', 30, MAP_WIDTH, MAP_HEIGHT);

    // Jugador
    player = this.physics.add.sprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'player_texture');
    player.setCollideWorldBounds(true);
    player.setDepth(10);

    // Hacha (Herramienta)
    axe = this.add.sprite(player.x, player.y, 'axe');
    axe.setOrigin(0.5, 1.5);
    axe.setDepth(11);

    // Colisión entre el jugador y los recursos (para no traspasarlos)
    this.physics.add.collider(player, resources);

    // Cámara
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);

    // Controles por teclado
    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Interfaz (UI)
    drawUI(this);

    // Orientación del jugador hacia el puntero
    this.input.on('pointermove', function (pointer) {
        let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        player.setRotation(angle);
    }, this);

    // Acción de golpear / atacar al hacer clic o tocar la pantalla
    this.input.on('pointerdown', function () {
        hitResource(this);
    }, this);
}

function update() {
    player.setVelocity(0);
    const speed = 250;

    // Movimiento
    if (cursors.left.isDown || wasd.left.isDown) player.setVelocityX(-speed);
    else if (cursors.right.isDown || wasd.right.isDown) player.setVelocityX(speed);

    if (cursors.up.isDown || wasd.up.isDown) player.setVelocityY(-speed);
    else if (cursors.down.isDown || wasd.down.isDown) player.setVelocityY(speed);

    player.body.velocity.normalize().scale(speed);

    // Posición del hacha vinculada al jugador
    axe.x = player.x + Math.cos(player.rotation) * 20;
    axe.y = player.y + Math.sin(player.rotation) * 20;
    if (!isAttacking) {
        axe.rotation = player.rotation + Math.PI / 2;
    }
}

// Función para distribuir árboles y rocas aleatoriamente
function spawnResources(group, type, amount, mapWidth, mapHeight) {
    for (let i = 0; i < amount; i++) {
        let x = Phaser.Math.Between(200, mapWidth - 200);
        let y = Phaser.Math.Between(200, mapHeight - 200);
        let res = group.create(x, y, type);
        res.health = 3; // Golpes necesarios para destruirlo
        res.refreshBody();
    }
}

// Lógica para golpear y recolectar
function hitResource(scene) {
    if (isAttacking) return;
    isAttacking = true;

    // Animación rápida de golpe con el hacha
    scene.tweens.add({
        targets: axe,
        angle: axe.angle + 40,
        duration: 100,
        yoyo: true,
        onComplete: () => {
            isAttacking = false;
        }
    });

    // Verificar si hay algún recurso cerca del jugador para golpearlo
    resources.getChildren().forEach((res) => {
        let distance = Phaser.Math.Distance.Between(player.x, player.y, res.x, res.y);
        if (distance < 70) {
            res.health -= 1;
            // Pequeño parpadeo al golpear
            res.setAlpha(0.5);
            scene.time.delayedCall(100, () => res.setAlpha(1));

            if (res.health <= 0) {
                res.destroy(); // Se destruye al quedarse sin vida
            }
        }
    });
}

function drawUI(scene) {
    let uiGraphics = scene.add.graphics();
    uiGraphics.setScrollFactor(0);
    uiGraphics.setDepth(100);

    // Controles táctiles
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
