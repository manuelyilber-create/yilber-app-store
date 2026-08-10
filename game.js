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
let player, cursors, wasd;

function preload() {
    let gridGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    gridGraphics.fillStyle(0x71aa34, 1);
    gridGraphics.fillRect(0, 0, 100, 100);
    gridGraphics.lineStyle(2, 0x639b2b, 1);
    gridGraphics.strokeRect(0, 0, 100, 100);
    gridGraphics.generateTexture('grid', 100, 100);

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
}

function create() {
    const MAP_WIDTH = 3000;
    const MAP_HEIGHT = 3000;

    this.add.tileSprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 'grid');
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    player = this.physics.add.sprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'player_texture');
    player.setCollideWorldBounds(true);
    player.setDepth(10);

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
}

function update() {
    player.setVelocity(0);
    const speed = 250;

    if (cursors.left.isDown || wasd.left.isDown) player.setVelocityX(-speed);
    else if (cursors.right.isDown || wasd.right.isDown) player.setVelocityX(speed);

    if (cursors.up.isDown || wasd.up.isDown) player.setVelocityY(-speed);
    else if (cursors.down.isDown || wasd.down.isDown) player.setVelocityY(speed);

    player.body.velocity.normalize().scale(speed);
}

function drawUI(scene) {
    let uiGraphics = scene.add.graphics();
    uiGraphics.setScrollFactor(0);
    uiGraphics.setDepth(100);

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
