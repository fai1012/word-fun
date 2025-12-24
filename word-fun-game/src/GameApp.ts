import { Application, Assets } from 'pixi.js';
import { HouseScene } from './scenes/HouseScene';

export class GameApp {
    private app: Application;
    private houseScene: HouseScene | null = null;

    constructor() {
        this.app = new Application();
    }

    async init() {
        // Initialize the application
        await this.app.init({
            background: '#1099bb',
            resizeTo: window,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        document.body.appendChild(this.app.canvas);

        // Load global assets if needed, or delegate to scenes
        await this.loadAssets();

        // Create and add the main scene
        this.houseScene = new HouseScene(this.app);
        await this.houseScene.init(); // Initialize the scene (load its assets, etc)

        this.app.stage.addChild(this.houseScene.container);

        // Listen for resize to update scene layout
        window.addEventListener('resize', () => {
            this.houseScene?.resize(this.app.screen.width, this.app.screen.height);
        });
    }

    async loadAssets() {
        // Basic asset manifest could go here
        const manifest = {
            bundles: [
                {
                    name: 'game-screen',
                    assets: [
                        { alias: 'background', src: '/assets/background_house.png' },
                        { alias: 'panda', src: '/assets/panda_character.png' },
                    ],
                },
            ],
        };

        await Assets.init({ manifest });
        await Assets.loadBundle('game-screen');
    }
}
