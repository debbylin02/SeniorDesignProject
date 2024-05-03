// import { FlipFluid } from "./FlipFluid";

export class FlipFluidScene {

	// class variables 
	gravity: number;
	dt: number;
	flipRatio: number;
	numPressureIters: number;
	numParticleIters: number;
	frameNr: number;
	overRelaxation: number;
	compensateDrift: boolean;
	separateParticles: boolean;
	obstacleX: number;
	obstacleY: number;
	obstacleRadius: number;
	paused: boolean;
	showObstacle: boolean;
	obstacleVelX: number;
	obstacleVelY: number;
	showParticles: boolean;
	showGrid: boolean;
	showMarchingSquares: boolean;

	constructor() {
		this.gravity = -9.81;
		this.dt = 1.0 / 120.0;
		this.flipRatio = 0.9;
		this.numPressureIters = 100;
		this.numParticleIters = 2;
		this.frameNr = 0;
		this.overRelaxation = 1.9;
		this.compensateDrift = true;
		this.separateParticles = true;
		this.obstacleX = 0.0;
		this.obstacleY = 0.0;
		this.obstacleRadius = 0.15;
		this.paused = true;
		this.showObstacle = true;
		this.obstacleVelX = 0.0;
		this.obstacleVelY = 0.0;
		this.showParticles = true;
		this.showGrid = false;
		this.showMarchingSquares = false;
	}
}

