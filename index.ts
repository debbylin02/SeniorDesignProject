import { createFluidSim } from './src/Eulerian/FluidSim';
import {vec2} from 'gl-matrix'; 

const fluidSim = createFluidSim({
  initialScene: 'Wind Scene',
  canvasDomId: 'myCanvas',
  buttonsDomId: 'inputDiv',
  canvasSize: vec2.fromValues(window.innerWidth - 80, window.innerHeight - 270),
  resolutionOverride: undefined,
  autostart: true,
});

