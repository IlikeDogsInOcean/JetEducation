// Here, we import the things we need from other script files 
import Game from './common/game';
import MainGame from './scenes/MainGame';

// First thing we need is to get the canvas on which we draw our scenes
const canvas: HTMLCanvasElement = document.querySelector("#app");

/* Rresize the canvas to occupy the full page, 
   by getting the widow width and height and setting it to canvas*/

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
// Then we create an instance of the game class and give it the canvas
const game = new Game(canvas, {maxfps: 25});

// Here we list all our scenes and our initial scene
const scenes = {
    "Main Game": MainGame,
};
const initialScene = "Main Game";

// Then we add those scenes to the game object and ask it to start the initial scene
game.addScenes(scenes);
game.startScene(initialScene);

