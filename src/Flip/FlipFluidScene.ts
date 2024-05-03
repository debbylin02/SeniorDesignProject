export class FlipFluidScene {

	// class variables 
	
	gravity: number;	// Gravity value in m/s^2
	dt: number;			// Time step 
	flipRatio: number;	// Ratio of FLIP to PIC blending - used to blend velocities 
	
	numPressureIters: number;	// Number of pressure solver iterations
	numParticleIters: number;	// Number of particle solver iterations
	frameNr: number;			// Current frame number
	
	overRelaxation: number;		// Over-relaxation factor for pressure solver
	compensateDrift: boolean;	// Compensate drift is used to prevent particles from drifting away
	separateParticles: boolean;	// Flag to indicate if particles should be separated
	
	obstacleX: number;			// X-coordinate of obstacle position
	obstacleY: number;			// Y-coordinate of obstacle position
	obstacleVelX: number;		// X-velocity of obstacle 
	obstacleVelY: number;		// Y-velocity of obstacle  
	obstacleRadius: number;		// Radius of obstacle 
	
	// simulation booleans
	paused: boolean;	 
	showObstacle: boolean;
	showParticles: boolean;
	showGrid: boolean;

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
	}
}

