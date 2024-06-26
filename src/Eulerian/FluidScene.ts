import { FluidPhysics } from './FluidPhysics';
import {vec2} from 'gl-matrix'; 

export type Scene = {
  paused: boolean;
  fluid: FluidPhysics;
} & SceneConfig;

const defaultSceneConfig = {
  dt: 1.0 / 60.0,
  gravity: 0,
  overRelaxation: 1.9,
  fluidDissipation: 1.0,
  numIters: 20,
  frameNr: 0,
  resolution: 100,
  drag: 1,

  obstacleRadius: 0.15,
  obstacleX: 0,
  obstacleY: 0,

  showObstacle: true,
  showStreamlines: false,
  showVelocities: false,
  showPressure: false,
  showFluid: true,
  showSolid: false,
};

export type SceneConfig = typeof defaultSceneConfig;

function makeSceneConfig(): SceneConfig {
  return {
    ...defaultSceneConfig,
  };
}

function makeFluidPhysics(numY: number, canvasSize: vec2, drag: number) {
  const domainHeight = 1.0;
  const domainWidth = (domainHeight * canvasSize[0]) / canvasSize[1];
  const h = domainHeight / numY;
  const numX = Math.floor(domainWidth / h);
  const density = 1000.0;
  return new FluidPhysics(density, drag, numX, numY, h);
}

export function makeScene(
  canvasSize: vec2,
  overrides: Partial<SceneConfig>
): Scene {
  const sceneConfig = {
    ...makeSceneConfig(),
    ...removeKeysWithUndefinedValues({ ...overrides }),
  };
  const scene: Scene = {
    ...sceneConfig,
    paused: false,
    fluid: makeFluidPhysics(
      sceneConfig.resolution,
      canvasSize,
      sceneConfig.drag
    ),
  };

  const f = scene.fluid;
  const n = f.numY;

  for (let i = 0; i < f.numX; i++) {
    for (let j = 0; j < f.numY; j++) {
      const isSolid = i == 0 || j == 0 || j == f.numY - 1; // Left, bottom, top wall
      f.s[i * n + j] = isSolid ? 0 : 1;
    }
  }

  // Vortex shedding. Set horizontal velocity at column i = 1. i = 0 is left wall.
  const inVel = 2;
  for (let j = 0; j < f.numY; j++) {
    f.u[1 * n + j] = inVel;
  }

  // Short vertical column of black smoke at i = 0
  const pipeH = 0.1 * f.numY;
  const minJ = Math.floor(0.5 * f.numY - 0.5 * pipeH);
  const maxJ = Math.floor(0.5 * f.numY + 0.5 * pipeH);
  for (let j = minJ; j < maxJ; j++) f.m[j] = 0; // Black smoke = 0

  setObstacle(scene, 0.4, 0.5, true, true);


  return scene;
}

export function setObstacle(
  scene: Scene,
  x: number,
  y: number,
  reset: boolean,
  isLeft: boolean = false
): void {
  let vx = 0.0;
  let vy = 0.0;

  if (!reset) {
    // How fast the obstacle moved since last frame
    vx = (x - scene.obstacleX) / scene.dt;
    vy = (y - scene.obstacleY) / scene.dt;
  }

  scene.obstacleX = x;
  scene.obstacleY = y;
  let r = scene.obstacleRadius;
  const f = scene.fluid;
  const n = f.numY;

  // For all cells except the 4 sides
  for (let i = 1; i < f.numX - 2; i++) {
    for (let j = 1; j < f.numY - 2; j++) {
      const dx = (i + 0.5) * f.h - x;
      const dy = (j + 0.5) * f.h - y;
      const insideObstacle = dx * dx + dy * dy < r * r;

      if (insideObstacle) {
        // Set cell to solid
        f.s[i * n + j] = 0.0;

        // Set fluid to white
        f.m[i * n + j] = 1.0;
        

        // New velocity is how fast the obstacle moved since last frame
        f.u[i * n + j] = vx;
        f.u[(i + 1) * n + j] = vx;
        f.v[i * n + j] = vy;
        f.v[i * n + j + 1] = vy;
      } else {
        // Set to fluid
        f.s[i * n + j] = 1.0;
      }
    }
  }
}

function remap(
  n: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number
) {
  const val = ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
  return clamp(val, start2, stop2);
}

function clamp(n: number, min: number, max: number) {
  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  return Math.max(min, Math.min(max, n));
}

const removeKeysWithUndefinedValues = <T extends { [key: string]: unknown }>(
  obj: T
): T => {
  Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);
  return obj;
};
