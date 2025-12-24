import { Sprite } from 'pixi.js';
import { Physics } from './Physics';

export class CharacterController {
    private sprite: Sprite;
    private velocity = { x: 0, y: 0 };
    private speed = 5;
    private jumpForce = 15;
    private isJumping = false;
    private keys: { [key: string]: boolean } = {};

    constructor(sprite: Sprite) {
        this.sprite = sprite;
        this.setupInputs();
    }

    private setupInputs() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    }

    public jump() {
        if (!this.isJumping) {
            this.velocity.y = -this.jumpForce;
            this.isJumping = true;
        }
    }

    public moveLeft() {
        this.velocity.x = -this.speed;
        this.sprite.scale.x = -Math.abs(this.sprite.scale.x); // Flip
    }

    public moveRight() {
        this.velocity.x = this.speed;
        this.sprite.scale.x = Math.abs(this.sprite.scale.x); // Unflip
    }

    public stopHorizontal() {
        this.velocity.x = 0;
    }

    public update(delta: number, screenHeight: number) {
        // console.log('Char Update', delta);
        // Input handing (Polling)
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.moveLeft();
        } else if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.moveRight();
        } else {
            this.stopHorizontal();
        }

        if ((this.keys['ArrowUp'] || this.keys['Space'] || this.keys['KeyW']) && !this.isJumping) {
            this.jump();
        }

        // Apply Gravity
        this.velocity.y += Physics.GRAVITY * delta;

        // Apply Velocity
        this.sprite.x += this.velocity.x * delta;
        this.sprite.y += this.velocity.y * delta;

        // Floor Collision
        const previousY = this.sprite.y;
        this.sprite.y = Physics.checkFloorCollision(this.sprite.y, screenHeight);

        // Check if landed
        if (this.sprite.y < previousY) {
            // Should ideally check velocity, but clamping means we hit floor
        }

        if (Physics.isOnFloor(this.sprite.y, screenHeight)) {
            this.velocity.y = 0;
            this.isJumping = false;
        }
    }
}
