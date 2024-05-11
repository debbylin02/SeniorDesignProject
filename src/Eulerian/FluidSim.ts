import { draw } from './FluidDraw';
import { inputsForScene } from './FluidHTMLButtons';
import {
  makeScene,
  Scene,
  SceneConfig,
  setObstacle,
} from './FluidScene';

import { Canvas, CanvasListener } from '../Utils/Canvas';
import {vec2} from 'gl-matrix'; 

// export class FluidSim implements CanvasListener {
  export class FluidSim {
  private scene: Scene;
  private mouseDown = false;
  // private readonly context: WebGL2RenderingContext;
  private readonly context: CanvasRenderingContext2D;
  private readonly cSize: vec2;

  // constructor(scene: Scene, cSize: vec2, context: WebGL2RenderingContext) {
    constructor(scene: Scene, cSize: vec2, context: CanvasRenderingContext2D) {
    this.scene = scene;
    this.context = context;
    this.cSize = cSize;
  }

  setScene(scene: Scene) {
    this.scene = scene;
  }

  keyDown(key: 'm' | 'p') {
    if (key === 'm') {
      this.step();
    } else if (key === 'p') {
      this.pausePressed();
    }
  }

  step() {
    this.scene.paused = false;
    this.simulate();
    draw(this.scene, this.cSize, this.context);
    this.scene.paused = true;
  }

  update() {
    this.simulate();
    draw(this.scene, this.cSize, this.context);
    if (!this.scene.paused) {
      requestAnimationFrame(this.update.bind(this));
    }
  }

  simulate() {
    this.scene.fluid.simulate(this.scene, this.scene.dt);
    this.scene.frameNr = this.scene.frameNr + 1;
  }

  pausePressed() {
    this.scene.paused = !this.scene.paused;
    if (!this.scene.paused) {
      this.update();
    }
  }

  startDrag(cx: number, cy: number, isLeft: boolean) {
    this.mouseDown = true;
    setObstacle(this.scene, this.sX(cx), this.sY(cy), true, isLeft);
  }

  drag(cx: number, cy: number, isLeft: boolean) {
    if (this.mouseDown) {
      setObstacle(this.scene, this.sX(cx), this.sY(cy), false, isLeft);
    }
  }

  endDrag() {
    this.mouseDown = false;
  }

  updateObstacle() {
    setObstacle(this.scene, this.scene.obstacleX, this.scene.obstacleY, false);
  }

  private sX(canvasX: number) {
    return canvasX / this.cSize[1];
  }

  // Simulation coordinates go from [0, 1] on the Y-axis
  private sY(canvasY: number) {
    return (this.cSize[1] - canvasY) / this.cSize[1];
  }
}

// Cache slider overrides, so that we can keep it when switching scenes.
let overrides: Partial<SceneConfig> = {};

export function createFluidSim(options: {
  canvasDomId: string;
  buttonsDomId: string;
  canvasSize: vec2;
  autostart: boolean;
  resolutionOverride?: number;
}) {
  overrides.resolution = options.resolutionOverride;

  const { canvasSize } = options;
  const initialScene = makeScene(canvasSize, overrides);

  const fluidCanvas = new Canvas(
    document.getElementById(options.canvasDomId) as HTMLCanvasElement,
    canvasSize
  );
  const fluidSim = new FluidSim(initialScene, canvasSize, fluidCanvas.context);
  fluidCanvas.setListener(fluidSim);

  options.autostart ? fluidSim.update() : fluidSim.step();

  appendInputs(
    document.getElementById(options.buttonsDomId)!,
    canvasSize,
    initialScene,
    fluidSim
  );
}

function appendInputs(
  inputDiv: HTMLElement,
  canvasSize: vec2,
  initialScene: Scene,
  fluidSim: FluidSim
) {
  const setDiv = (scene: Scene) => {
    inputDiv.innerHTML = '';
    inputDiv.append(
      ...inputsForScene({
        scene,
        onPauseToggled: () => {
          fluidSim.pausePressed();
        },
        onObstacleChanged: () => {
          fluidSim.updateObstacle();
        },
        onChangeScene,
        onChangeOverrides,
      })
    );
  };

  const onChangeScene = (clearOverrides: boolean) => {
    if (clearOverrides) {
      overrides = {};
    }
    const scene = makeScene(canvasSize, overrides);
    setDiv(scene);
    fluidSim.setScene(scene);
  };

  const onChangeOverrides = (newOverrides: Partial<SceneConfig>) => {
    overrides = { ...overrides, ...(newOverrides ?? {}) };
  };

  setDiv(initialScene);
}
