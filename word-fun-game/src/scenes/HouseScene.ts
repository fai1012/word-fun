import { Container, Sprite, Assets, Application } from 'pixi.js';
import { CharacterController } from '../game/CharacterController';

export class HouseScene {
    public container: Container;
    private app: Application;
    private background: Sprite | null = null;
    private panda: Sprite | null = null;

    private characterController: CharacterController | null = null;
    private updateTicker: ((ticker: any) => void) | null = null;

    constructor(app: Application) {
        this.app = app;
        this.container = new Container();
    }

    async init() {
        // Assets are already preloaded in GameApp, but we can access them here
        const bgTexture = Assets.get('background');
        const pandaTexture = Assets.get('panda');

        // Create Background
        this.background = new Sprite(bgTexture);
        this.background.anchor.set(0.5);
        this.container.addChild(this.background);

        // Create Panda
        this.panda = new Sprite(pandaTexture);
        this.panda.anchor.set(0.5);
        this.container.addChild(this.panda);

        // Initialize Controller
        this.characterController = new CharacterController(this.panda);

        window.addEventListener('game:jump', () => this.characterController?.jump());

        // Initial Resize
        this.resize(this.app.screen.width, this.app.screen.height);

        // Start Update Loop
        this.updateTicker = (ticker) => this.update(ticker.deltaTime);
        this.app.ticker.add(this.updateTicker);
    }

    update(delta: number) {
        if (this.characterController) {
            this.characterController.update(delta, this.app.screen.height);
        }
    }

    resize(width: number, height: number) {
        if (this.background) {
            // Scale background to cover the screen (cover mode)
            const scaleX = width / this.background.texture.width;
            const scaleY = height / this.background.texture.height;
            const scale = Math.max(scaleX, scaleY);

            this.background.scale.set(scale);
            this.background.position.set(width / 2, height / 2);
        }

        if (this.panda) {
            // Scale panda based on screen height.
            // Screen Height ~1000px. Panda ~200px tall wanted.
            // Factor 0.2 seems better.
            const pandaScale = Math.min(width, height) * 0.0003;
            // Clamp scale
            const finalPandaScale = Math.max(0.2, Math.min(pandaScale, 0.5));

            // We only set scale magnitude, direction is handled by controller (x flip)
            const currentSign = Math.sign(this.panda.scale.x) || 1;
            this.panda.scale.set(finalPandaScale * currentSign, finalPandaScale);

            // Set initial position if not set
            if (this.panda.x === 0 && this.panda.y === 0) {
                this.panda.position.set(width * 0.2, height * 0.75);
            }
        }
    }

    destroy() {
        if (this.updateTicker) {
            this.app.ticker.remove(this.updateTicker);
        }
    }
}
