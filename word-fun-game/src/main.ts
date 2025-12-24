import './style.css';
import { GameApp } from './GameApp';
import { UIManager } from './ui/UIManager';

const ui = new UIManager();
const game = new GameApp();
game.init();

