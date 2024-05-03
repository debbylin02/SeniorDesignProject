import { vec3 } from "gl-matrix";

// ----------------- start of simulator ------------------------------
enum FieldType {
	U_FIELD = 0,
	V_FIELD = 1
}

enum CellType {
	FLUID_CELL = 0,
	AIR_CELL = 1,
	SOLID_CELL = 2
}

export class FlipFluid {
	density: any;
	fNumX: number;
	fNumY: number;
	h: number;
	fInvSpacing: number;
	fNumCells: number;
	u: Float32Array;
	v: Float32Array;
	du: Float32Array;
	dv: Float32Array;
	prevU: Float32Array;
	prevV: Float32Array;
	p: Float32Array;
	s: Float32Array;
	cellType: Int32Array;
	cellColor: Float32Array;
	maxParticles: any;
	particlePos: Float32Array;
	particleColor: Float32Array;
	particleVel: Float32Array;
	particleDensity: Float32Array;
	particleRestDensity: number;
	particleRadius: any;
	pInvSpacing: number;
	pNumX: number;
	pNumY: number;
	pNumCells: number;
	numCellParticles: Int32Array;
	firstCellParticle: Int32Array;
	cellParticleIds: Int32Array;
	numParticles: number;
	
	// from the scene obstacle 
	obstacleVelX: number;
	obstacleVelY: number;

	// color based on velocity/density 
	colorVelocity: boolean;
	colorDensity: boolean;
	baseColor: vec3;

	constructor(density: number, width: number, height: number, spacing: number, particleRadius: number, maxParticles: number | Iterable<number>) {

		// fluid
		this.density = density;
		this.fNumX = Math.floor(width / spacing) + 1;
		this.fNumY = Math.floor(height / spacing) + 1;
		this.h = Math.max(width / this.fNumX, height / this.fNumY);

		this.fInvSpacing = 1.0 / this.h;
		this.fNumCells = this.fNumX * this.fNumY;

		this.u = new Float32Array(this.fNumCells);
		this.v = new Float32Array(this.fNumCells);
		this.du = new Float32Array(this.fNumCells);
		this.dv = new Float32Array(this.fNumCells);
		this.prevU = new Float32Array(this.fNumCells);
		this.prevV = new Float32Array(this.fNumCells);
		this.p = new Float32Array(this.fNumCells);
		this.s = new Float32Array(this.fNumCells);
		this.cellType = new Int32Array(this.fNumCells);
		this.cellColor = new Float32Array(3 * this.fNumCells);

		// base blue color for particles 
		this.baseColor = vec3.fromValues(0.0, 0.0, 1.0);

		// particles
		this.maxParticles = maxParticles;

		this.particlePos = new Float32Array(2 * this.maxParticles);
		this.particleColor = new Float32Array(3 * this.maxParticles);
		for (var i = 0; i < this.maxParticles; i++)
			this.particleColor[3 * i + 2] = 1.0;

		this.particleVel = new Float32Array(2 * this.maxParticles);
		this.particleDensity = new Float32Array(this.fNumCells);
		this.particleRestDensity = 0.0;

		this.particleRadius = particleRadius;
		this.pInvSpacing = 1.0 / (2.2 * particleRadius);
		this.pNumX = Math.floor(width * this.pInvSpacing) + 1;
		this.pNumY = Math.floor(height * this.pInvSpacing) + 1;
		this.pNumCells = this.pNumX * this.pNumY;

		this.numCellParticles = new Int32Array(this.pNumCells);
		this.firstCellParticle = new Int32Array(this.pNumCells + 1);
		this.cellParticleIds = new Int32Array(this.maxParticles);

		this.numParticles = 0;

		this.obstacleVelX = 0;
		this.obstacleVelY = 0; 

		this.colorVelocity = false;
		this.colorDensity = true;
	}

	setObstacleVelocity(vx: number, vy: number) {
		this.obstacleVelX = vx;
		this.obstacleVelY = vy;
	}

	clamp(x: number, min: number, max: number) 
	{
		if (x < min)
			return min;
		else if (x > max)
			return max;
		else 
			return x;
	}

	integrateParticles(dt: number, gravity: number) 
	{
		for (var i = 0; i < this.numParticles; i++) {
			this.particleVel[2 * i + 1] += dt * gravity;
			this.particlePos[2 * i] += this.particleVel[2 * i] * dt;
			this.particlePos[2 * i + 1] += this.particleVel[2 * i + 1] * dt;
		}
	}

	pushParticlesApart(numIters: number) 
	{
		var colorDiffusionCoeff = 0.001;

		// count particles per cell

		this.numCellParticles.fill(0);

		for (var i = 0; i < this.numParticles; i++) {
			var x = this.particlePos[2 * i];
			var y = this.particlePos[2 * i + 1];

			var xi = this.clamp(Math.floor(x * this.pInvSpacing), 0, this.pNumX - 1);
			var yi = this.clamp(Math.floor(y * this.pInvSpacing), 0, this.pNumY - 1);
			var cellNr = xi * this.pNumY + yi;
			this.numCellParticles[cellNr]++;
		}

		// partial sums

		var first = 0;

		for (var i = 0; i < this.pNumCells; i++) {
			first += this.numCellParticles[i];
			this.firstCellParticle[i] = first;
		}
		this.firstCellParticle[this.pNumCells] = first;		// guard

		// fill particles into cells

		for (var i = 0; i < this.numParticles; i++) {
			var x = this.particlePos[2 * i];
			var y = this.particlePos[2 * i + 1];

			var xi = this.clamp(Math.floor(x * this.pInvSpacing), 0, this.pNumX - 1);
			var yi = this.clamp(Math.floor(y * this.pInvSpacing), 0, this.pNumY - 1);
			var cellNr = xi * this.pNumY + yi;
			this.firstCellParticle[cellNr]--;
			this.cellParticleIds[this.firstCellParticle[cellNr]] = i;
		}

		// push particles apart
		let minDist = 2.0 * this.particleRadius;
		let minDist2 = minDist * minDist;

		for (let iter = 0; iter < numIters; iter++) {

			for (let i = 0; i < this.numParticles; i++) {
				let px = this.particlePos[2 * i];
				let py = this.particlePos[2 * i + 1];

				let pxi = Math.floor(px * this.pInvSpacing);
				let pyi = Math.floor(py * this.pInvSpacing);
				let x0 = Math.max(pxi - 1, 0);
				let y0 = Math.max(pyi - 1, 0);
				let x1 = Math.min(pxi + 1, this.pNumX - 1);
				let y1 = Math.min(pyi + 1, this.pNumY - 1);

				for (let xi = x0; xi <= x1; xi++) {
					for (let yi = y0; yi <= y1; yi++) {
						let cellNr = xi * this.pNumY + yi;
						let first = this.firstCellParticle[cellNr];
						let last = this.firstCellParticle[cellNr + 1];
						for (let j = first; j < last; j++) {
							let id = this.cellParticleIds[j];
							if (id == i)
								continue;
							let qx = this.particlePos[2 * id];
							let qy = this.particlePos[2 * id + 1];

							let dx = qx - px;
							let dy = qy - py;
							let d2 = dx * dx + dy * dy;
							if (d2 > minDist2 || d2 == 0.0) 
								continue;
							let d = Math.sqrt(d2);
							let s = 0.5 * (minDist - d) / d;
							dx *= s;
							dy *= s;
							this.particlePos[2 * i] -= dx;
							this.particlePos[2 * i + 1] -= dy;
							this.particlePos[2 * id] += dx;
							this.particlePos[2 * id + 1] += dy;

							// diffuse colors

							for (var k = 0; k < 3; k++) {
								var color0 = this.particleColor[3 * i + k];
								var color1 = this.particleColor[3 * id + k];
								var color = (color0 + color1) * 0.5;
								this.particleColor[3 * i + k] = color0 + (color - color0) * colorDiffusionCoeff;
								this.particleColor[3 * id + k] = color1 + (color - color1) * colorDiffusionCoeff;
							}
						}
					}
				}
			}
		}
	}

	handleParticleCollisions(obstacleX: number, obstacleY: number, obstacleRadius: any) 
	{
		var h = 1.0 / this.fInvSpacing;
		var r = this.particleRadius;
		var or = obstacleRadius;
		var or2 = or * or;
		var minDist = obstacleRadius + r;
		var minDist2 = minDist * minDist;

		var minX = h + r;
		var maxX = (this.fNumX - 1) * h - r;
		var minY = h + r;
		var maxY = (this.fNumY - 1) * h - r;


		for (var i = 0; i < this.numParticles; i++) {
			var x = this.particlePos[2 * i];
			var y = this.particlePos[2 * i + 1];

			var dx = x - obstacleX;
			var dy = y - obstacleY;
			var d2 = dx * dx + dy * dy;

			// obstacle collision

			if (d2 < minDist2) {

				// var d = Math.sqrt(d2);
				// var s = (minDist - d) / d;
				// x += dx * s;
				// y += dy * s;

				this.particleVel[2 * i] = this.obstacleVelX;
				this.particleVel[2 * i + 1] = this.obstacleVelY;
			}

			// wall collisions

			if (x < minX) {
				x = minX;
				this.particleVel[2 * i] = 0.0;

			}
			if (x > maxX) {
				x = maxX;
				this.particleVel[2 * i] = 0.0;
			}
			if (y < minY) {
				y = minY;
				this.particleVel[2 * i + 1] = 0.0;
			}
			if (y > maxY) {
				y = maxY;
				this.particleVel[2 * i + 1] = 0.0;
			}
			this.particlePos[2 * i] = x;
			this.particlePos[2 * i + 1] = y;
		}
	}

	updateParticleDensity()
	{
		var n = this.fNumY;
		var h = this.h;
		var h1 = this.fInvSpacing;
		var h2 = 0.5 * h;

		// get particle density 
		var d = this.particleDensity;

		d.fill(0.0);

		for (var i = 0; i < this.numParticles; i++) {
			var x = this.particlePos[2 * i];
			var y = this.particlePos[2 * i + 1];

			x = this.clamp(x, h, (this.fNumX - 1) * h);
			y = this.clamp(y, h, (this.fNumY - 1) * h);

			var x0 = Math.floor((x - h2) * h1);
			var tx = ((x - h2) - x0 * h) * h1;
			var x1 = Math.min(x0 + 1, this.fNumX-2);
			
			var y0 = Math.floor((y-h2)*h1);
			var ty = ((y - h2) - y0*h) * h1;
			var y1 = Math.min(y0 + 1, this.fNumY-2);

			var sx = 1.0 - tx;
			var sy = 1.0 - ty;

			if (x0 < this.fNumX && y0 < this.fNumY) d[x0 * n + y0] += sx * sy;
			if (x1 < this.fNumX && y0 < this.fNumY) d[x1 * n + y0] += tx * sy;
			if (x1 < this.fNumX && y1 < this.fNumY) d[x1 * n + y1] += tx * ty;
			if (x0 < this.fNumX && y1 < this.fNumY) d[x0 * n + y1] += sx * ty;
		}

		if (this.particleRestDensity == 0.0) {
			var sum = 0.0;
			var numFluidCells = 0;

			for (var i = 0; i < this.fNumCells; i++) {
				if (this.cellType[i] == CellType.FLUID_CELL) {
					sum += d[i];
					numFluidCells++;
				}
			}

			if (numFluidCells > 0)
				this.particleRestDensity = sum / numFluidCells;
		}

// 			for (var xi = 1; xi < this.fNumX; xi++) {
// 				for (var yi = 1; yi < this.fNumY; yi++) {
// 					var cellNr = xi * n + yi;
// 					if (this.cellType[cellNr] != FLUID_CELL)
// 						continue;
// 					var hx = this.h;
// 					var hy = this.h;

// 					if (this.cellType[(xi - 1) * n + yi] == SOLID_CELL || this.cellType[(xi + 1) * n + yi] == SOLID_CELL)
// 						hx -= this.particleRadius;
// 					if (this.cellType[xi * n + yi - 1] == SOLID_CELL || this.cellType[xi * n + yi + 1] == SOLID_CELL)
// 						hy -= this.particleRadius;

// 					var scale = this.h * this.h / (hx * hy)
// 					d[cellNr] *= scale;
// 				}
// 			}
	}

	transferVelocities(toGrid: boolean, flipRatio: number )
	{
		var n = this.fNumY;
		var h = this.h;
		var h1 = this.fInvSpacing;
		var h2 = 0.5 * h;

		if (toGrid) {

			this.prevU.set(this.u);
			this.prevV.set(this.v);

			this.du.fill(0.0);
			this.dv.fill(0.0);
			this.u.fill(0.0);
			this.v.fill(0.0);

			for (var i = 0; i < this.fNumCells; i++) 
				this.cellType[i] = this.s[i] == 0.0 ? CellType.SOLID_CELL : CellType.AIR_CELL;

			for (var i = 0; i < this.numParticles; i++) {
				var x = this.particlePos[2 * i];
				var y = this.particlePos[2 * i + 1];
				var xi = this.clamp(Math.floor(x * h1), 0, this.fNumX - 1);
				var yi = this.clamp(Math.floor(y * h1), 0, this.fNumY - 1);
				var cellNr = xi * n + yi;
				if (this.cellType[cellNr] == CellType.AIR_CELL)
					this.cellType[cellNr] = CellType.FLUID_CELL;
			}
		}

		for (let component = 0; component < 2; component++) {

			var dx = component == 0 ? 0.0 : h2;
			var dy = component == 0 ? h2 : 0.0;

			var f = component == 0 ? this.u : this.v;
			var prevF = component == 0 ? this.prevU : this.prevV;
			let d = component == 0 ? this.du : this.dv;

			for (var i = 0; i < this.numParticles; i++) {
				var x = this.particlePos[2 * i];
				var y = this.particlePos[2 * i + 1];

				x = this.clamp(x, h, (this.fNumX - 1) * h);
				y = this.clamp(y, h, (this.fNumY - 1) * h);

				var x0 = Math.min(Math.floor((x - dx) * h1), this.fNumX - 2);
				var tx = ((x - dx) - x0 * h) * h1;
				var x1 = Math.min(x0 + 1, this.fNumX-2);
				
				var y0 = Math.min(Math.floor((y-dy)*h1), this.fNumY-2);
				var ty = ((y - dy) - y0*h) * h1;
				var y1 = Math.min(y0 + 1, this.fNumY-2);

				var sx = 1.0 - tx;
				var sy = 1.0 - ty;

				var d0 = sx*sy;
				var d1 = tx*sy;
				var d2 = tx*ty;
				var d3 = sx*ty;

				var nr0 = x0*n + y0;
				var nr1 = x1*n + y0;
				var nr2 = x1*n + y1;
				var nr3 = x0*n + y1;

				if (toGrid) {
					var pv = this.particleVel[2 * i + component];
					f[nr0] += pv * d0;  d[nr0] += d0;
					f[nr1] += pv * d1;  d[nr1] += d1;
					f[nr2] += pv * d2;  d[nr2] += d2;
					f[nr3] += pv * d3;  d[nr3] += d3;
				}
				else {
					var offset = component == 0 ? n : 1;
					var valid0 = this.cellType[nr0] != CellType.AIR_CELL || this.cellType[nr0 - offset] != CellType.AIR_CELL ? 1.0 : 0.0;
					var valid1 = this.cellType[nr1] != CellType.AIR_CELL || this.cellType[nr1 - offset] != CellType.AIR_CELL ? 1.0 : 0.0;
					var valid2 = this.cellType[nr2] != CellType.AIR_CELL || this.cellType[nr2 - offset] != CellType.AIR_CELL ? 1.0 : 0.0;
					var valid3 = this.cellType[nr3] != CellType.AIR_CELL || this.cellType[nr3 - offset] != CellType.AIR_CELL ? 1.0 : 0.0;

					var v = this.particleVel[2 * i + component];
					var dVal = valid0 * d0 + valid1 * d1 + valid2 * d2 + valid3 * d3;

					if (dVal > 0.0) {

						var picV = (valid0 * d0 * f[nr0] + valid1 * d1 * f[nr1] + valid2 * d2 * f[nr2] + valid3 * d3 * f[nr3]) / dVal;
						var corr = (valid0 * d0 * (f[nr0] - prevF[nr0]) + valid1 * d1 * (f[nr1] - prevF[nr1])
							+ valid2 * d2 * (f[nr2] - prevF[nr2]) + valid3 * d3 * (f[nr3] - prevF[nr3])) / dVal;
						var flipV = v + corr;

						this.particleVel[2 * i + component] = (1.0 - flipRatio) * picV + flipRatio * flipV;
					}
				}
			}

			if (toGrid) {
				for (var i = 0; i < f.length; i++) {
					if (d[i] > 0.0)
						f[i] /= d[i];
				}

				// restore solid cells

				for (var i = 0; i < this.fNumX; i++) {
					for (var j = 0; j < this.fNumY; j++) {
						var solid = this.cellType[i * n + j] == CellType.SOLID_CELL;
						if (solid || (i > 0 && this.cellType[(i - 1) * n + j] == CellType.SOLID_CELL))
							this.u[i * n + j] = this.prevU[i * n + j];
						if (solid || (j > 0 && this.cellType[i * n + j - 1] == CellType.SOLID_CELL))
							this.v[i * n + j] = this.prevV[i * n + j];
					}
				}
			}
		}
	}

	solveIncompressibility(numIters: number, dt: number, overRelaxation: number, compensateDrift = true) 
	{
		// Reset pressure field
		this.p.fill(0.0);
		
		// Store previous velocity values
		this.prevU.set(this.u);
		this.prevV.set(this.v);

		var n = this.fNumY;
		var cp = this.density * this.h / dt;

		// Iterate over each cell in the grid
		for (var i = 0; i < this.fNumCells; i++) {
			var u = this.u[i];
			var v = this.v[i];
		}

		// Perform the incompressibility solve for a specified number of iterations
		for (var iter = 0; iter < numIters; iter++) {
			// Iterate over each cell in the grid (excluding boundary cells)
			for (var i = 1; i < this.fNumX-1; i++) {
				for (var j = 1; j < this.fNumY-1; j++) {
					// Check if the cell is a fluid cell
					if (this.cellType[i*n + j] != CellType.FLUID_CELL)
						continue;

					var center = i * n + j;
					var left = (i - 1) * n + j;
					var right = (i + 1) * n + j;
					var bottom = i * n + j - 1;
					var top = i * n + j + 1;

					// Calculate the sum of pressure values of neighboring cells
					var s = this.s[center];
					var sx0 = this.s[left];
					var sx1 = this.s[right];
					var sy0 = this.s[bottom];
					var sy1 = this.s[top];
					var s = sx0 + sx1 + sy0 + sy1;
					if (s == 0.0)
						continue;

					// Calculate the divergence of velocity at the cell
					var div = this.u[right] - this.u[center] + this.v[top] - this.v[center];

					// Compensate for particle drift if enabled
					if (this.particleRestDensity > 0.0 && compensateDrift) {
						// k = stiffness coefficient 
						var k = 1.0;
						var compression = this.particleDensity[i*n + j] - this.particleRestDensity;
						if (compression > 0.0)
							div = div - k * compression;
					}

					// Calculate the pressure value at the cell
					var p = -div / s;
					p *= overRelaxation;
					this.p[center] += cp * p;

					// Update the velocity values based on the pressure gradient
					this.u[center] -= sx0 * p;
					this.u[right] += sx1 * p;
					this.v[center] -= sy0 * p;
					this.v[top] += sy1 * p;
				}
			}
		}
	}

	
	// ----------------- coloring -----------------------------
	updateParticleColors() 
	{
		// set all particles to blue
		// for (var i = 0; i < this.numParticles; i++) {
		// 	this.particleColor[3 * i] *= 0.99; 
		// 	this.particleColor[3 * i + 1] *= 0.99
		// 	this.particleColor[3 * i + 2] = 
		// 		this.clamp(this.particleColor[3 * i + 2] + 0.001, 0.0, 1.0)
		// }

		// inverse grid spacing -> map particle to grid 
		var h1 = this.fInvSpacing; 

		for (var i = 0; i < this.numParticles; i++) {

			// set particle color to base color
			this.particleColor[3 * i] = this.baseColor[0];
			this.particleColor[3 * i + 1] = this.baseColor[1];
			this.particleColor[3 * i + 2] = this.baseColor[2];

			// var s = 0.01; // for smoother transition

			// // red, green, blue
			// this.particleColor[3 * i] = this.clamp(this.particleColor[3 * i] - s, 0.0, 1.0);
			// this.particleColor[3 * i + 1] = this.clamp(this.particleColor[3 * i + 1] - s, 0.0, 1.0);
			// this.particleColor[3 * i + 2] = this.clamp(this.particleColor[3 * i + 2] + s, 0.0, 1.0);

			// get particle position 
			var x = this.particlePos[2 * i];
			var y = this.particlePos[2 * i + 1];
			var xi = this.clamp(Math.floor(x * h1), 1, this.fNumX - 1);
			var yi = this.clamp(Math.floor(y * h1), 1, this.fNumY - 1);

			// get grid cell that particle is in 
			var cellNr = xi * this.fNumY + yi;

			// ------- set particle color based on density -------
			// check particle rest density - avg density of water cells before sim starts 
			var d0 = this.particleRestDensity;

			// check if air or fluid cell based on density 
			if (d0 > 0.0) {

				// ----- set particle color based on velocity -------
				if (this.colorVelocity) {
					var velX = this.particleVel[2 * i];
					var velY = this.particleVel[2 * i + 1];
					var speed = Math.sqrt(velX * velX + velY * velY)

					let maxSpeed = 10.0; // Maximum speed value
					let t = Math.max(0, Math.min(1, speed / maxSpeed)); // Ensures t is within 0 to 1
					t = this.clamp(t, 0.0, 1.0); // Clamp t to be within 0 to 1 


					// get current particle color
					let currentR = this.particleColor[3 * i];
					let currentG = this.particleColor[3 * i + 1];
					let currentB = this.particleColor[3 * i + 2];

					// complimentary color v1 
					// let targetR = 1.0 - currentR;
					// let targetG = 1.0 - currentG;
					// let targetB = 1.0 - currentB;

					// complimentary color v2 
					let targetR = 1.0 - currentR;
					let targetG = currentG;
					let targetB = 1.0 - currentB;
			
					// Linearly interpolate between current color and target color based on t
					this.particleColor[3 * i]     = currentR + (targetR - currentR) * t;
					this.particleColor[3 * i + 1] = currentG + (targetG - currentG) * t;
					this.particleColor[3 * i + 2] = currentB + (targetB - currentB) * t;
				}
				
				// ----- Color based on densitiy -----
				if (this.colorDensity) {
					var relDensity = this.particleDensity[cellNr] / d0;
					// lower density -> lighter color  
					if (relDensity < 0.7) {
						var s = 0.8;
						this.particleColor[3 * i] = s;
						this.particleColor[3 * i + 1] = s;
						this.particleColor[3 * i + 2] = 1.0;
					}
				}
			}
		}
	}



	
	clip(value: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, value));
	}

	setSciColor(cellNr: number, val: number, minVal: number, maxVal: number) 
	{
		val = Math.min(Math.max(val, minVal), maxVal- 0.0001);
		var d = maxVal - minVal;
		val = d == 0.0 ? 0.5 : (val - minVal) / d;
		var m = 0.25;
		var num = Math.floor(val / m);
		var s = (val - num * m) / m;
		var r, g, b;

		switch (num) {
			case 0 : r = 0.0; g = s; b = 1.0; break;
			case 1 : r = 0.0; g = 1.0; b = 1.0-s; break;
			case 2 : r = s; g = 1.0; b = 0.0; break;
			case 3 : r = 1.0; g = 1.0 - s; b = 0.0; break;
		}

		this.cellColor[3 * cellNr] = r as number;
		this.cellColor[3 * cellNr + 1] = g as number;
		this.cellColor[3 * cellNr + 2] = b as number;
	}

	// compute cell color for fluid cells based on density 
	updateCellColors() 
	{
		this.cellColor.fill(0.0);

		for (var i = 0; i < this.fNumCells; i++) {

			if (this.cellType[i] == CellType.SOLID_CELL) {
				this.cellColor[3*i] = 0.5;
				this.cellColor[3*i + 1] = 0.5;
				this.cellColor[3*i + 2] = 0.5;
			}
			else if (this.cellType[i] == CellType.FLUID_CELL) {
				var d = this.particleDensity[i];
				if (this.particleRestDensity > 0.0)
					d /= this.particleRestDensity;
				this.setSciColor(i, d, 0.0, 2.0);
			}
		}
	}

	simulate(dt: number, gravity: number, flipRatio: number, numPressureIters: any, numParticleIters: number, overRelaxation: any, compensateDrift: boolean | undefined, separateParticles: any, obstacleX: number, abstacleY: number, obstacleRadius: any) 
	{
		var numSubSteps = 1;
		var sdt = dt / numSubSteps;

		for (var step = 0; step < numSubSteps; step++) {
			this.integrateParticles(sdt, gravity);
			if (separateParticles)
				this.pushParticlesApart(numParticleIters); 
			this.handleParticleCollisions(obstacleX, abstacleY, obstacleRadius)
			this.transferVelocities(true, flipRatio);
			this.updateParticleDensity();
			this.solveIncompressibility(numPressureIters, sdt, overRelaxation, compensateDrift);
			this.transferVelocities(false, flipRatio);
		}

		this.updateParticleColors();
		this.updateCellColors();

	}
}
