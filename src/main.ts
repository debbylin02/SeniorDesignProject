import { vec3 } from 'gl-matrix';
import { FlipFluid } from './Flip/FlipFluid';
import { FlipFluidScene } from './Flip/FlipFluidScene';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import { createShader, resetGL } from './rendering/gl/ShaderHelper';
import ShaderProgram, { Shader } from './rendering/gl/ShaderProgram';
import { setGL } from './globals';

	let scene = new FlipFluidScene();
	let fluid : FlipFluid; 
	let simHeight: number;;	
	let cScale: number;
	let simWidth: number;
	let canvas: HTMLCanvasElement;
	let gl: WebGL2RenderingContext;
	let isFirstSetup = true; 

	// GUI controls 
	const controls = {
	'Load Scene': setupScene, // A function pointer, essentially
	// 'TESTETSETSTE': setupScene, // A function pointer, essentially
	'Obstacle radius' : 0.1,
	'Resolution' : 100,
	'Gravity': -9.81,
	// 'Streamlines': true,
	'Speed Display': false,
	'Density Display': true,
	'Particle': true,
	'Grid': false,
	'Compensate Drift': true,
	'Separate Particles': true,
	'PIC - FLIP Ratio': 0.9,
	'Fluid color' : [0, 0, 255, 1],
	'Play simulation': false, 
	// 'Play simulation': toggleStart,
	};

	// Set up the GUI
	let gui = new DAT.GUI();
	// Add controls to the gui
	gui.add(controls, 'Load Scene');
	gui.add(controls, 'Obstacle radius', 0.05, 0.2).step(0.005);   
	gui.add(controls, 'Resolution', 10, 200).step(10).onChange(setupScene); // reset scene if resolution changes
	gui.add(controls, 'Gravity', -15.00, -8.0).step(0.01);
	gui.add(controls, 'Speed Display');
	gui.add(controls, 'Density Display');
	gui.add(controls, 'Particle');
	gui.add(controls, 'Grid');
	gui.add(controls, 'Compensate Drift');
	gui.add(controls, 'Separate Particles');
	gui.add(controls, 'PIC - FLIP Ratio', 0.0, 1.0).step(0.1);
	gui.addColor(controls, 'Fluid color'); 
	gui.add(controls, 'Play simulation');
	
	

	// -------- Buffers for drawing --------------------- 
	var pointVertexBuffer: WebGLBuffer | null = null;
	var pointColorBuffer: WebGLBuffer | null = null;

	var gridVertBuffer: WebGLBuffer | null = null;
	var gridColorBuffer: WebGLBuffer | null = null;

	var obstacleVertBuffer: WebGLBuffer | null = null;
	var obstacleIdBuffer: WebGLBuffer | null = null;

	// --------------------------------------------------------------

	function resetGl() {
		// clear gl/reset viewport 
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	}

	function resetAndClear() {
		// clear gl/reset viewport 
		resetGl(); 
		
		// delete buffers 
		pointVertexBuffer = null;
		pointColorBuffer = null;
		gridVertBuffer = null;
		gridColorBuffer = null;
		obstacleVertBuffer = null;
		obstacleIdBuffer = null;
	}

		
	

	// --------------------------------------------------------------

	function setObstacle(x: number, y: number, reset: boolean) {

		var vx = 0.0;
		var vy = 0.0;

		if (!reset) {
			vx = (x - scene.obstacleX) / scene.dt;
			vy = (y - scene.obstacleY) / scene.dt;
		}

		scene.obstacleX = x;
		scene.obstacleY = y;
		var r = scene.obstacleRadius;
		var f = fluid;
		var n = f.fNumY;
		var cd = Math.sqrt(2) * f.h;

		for (var i = 1; i < f.fNumX-2; i++) {
			for (var j = 1; j < f.fNumY-2; j++) {

				f.s[i*n + j] = 1.0;

				var dx = (i + 0.5) * f.h - x;
				var dy = (j + 0.5) * f.h - y;

				if (dx * dx + dy * dy < r * r) {
					f.s[i*n + j] = 0.0;
					f.u[i*n + j] = vx;
					f.u[(i+1)*n + j] = vx;
					f.v[i*n + j] = vy;
					f.v[i*n + j+1] = vy;
				}
			}
		}
		
		scene.showObstacle = true;
		scene.obstacleVelX = vx;
		scene.obstacleVelY = vy;
	}

	function setupScene() 
	{
		// stop simulation 
		controls['Play simulation'] = false;

		resetAndClear(); // Clear the canvas and reset the buffers

		gui.updateDisplay();

		scene.obstacleRadius = controls['Obstacle radius'];
		scene.overRelaxation = 1.9;

		scene.dt = 1.0 / 60.0;
		scene.numPressureIters = 50;
		scene.numParticleIters = 2;

		// var res = 100;
		var res = controls['Resolution'];
		scene.gravity = controls['Gravity'];

		// Calculate simHeight based on the ratio of the current resolution to the base resolution
		let baseResolution = 100;

		simHeight = 3.0 * (baseResolution / res);
		cScale = canvas.height / simHeight;
		simWidth = canvas.width / cScale;


		// need to adjusting for resolution
		// Adjust simHeight based on the resolution
		// simHeight = 3.0 * (res / 100);
		var tankHeight = 1.0 * simHeight;
		var tankWidth = 1.0 * simWidth;
		var h = tankHeight / (res);

		var density = 1000.0;

		var relWaterHeight = 0.8
		var relWaterWidth = 0.6

		// dam break
		// compute number of particles

		var r = 0.3 * h;	// particle radius w.r.t. cell size
		var dx = 2.0 * r;
		var dy = Math.sqrt(3.0) / 2.0 * dx;

 		var numX = Math.floor((relWaterWidth * tankWidth - 2.0 * h - 2.0 * r) / dx);
		var numY = Math.floor((relWaterHeight * tankHeight - 2.0 * h - 2.0 * r) / dy);
		var maxParticles = numX * numY;		

		// create fluid
		fluid = new FlipFluid(density, tankWidth, tankHeight, h, r, maxParticles);

		// create particles
		fluid.numParticles = numX * numY;
		
		var p = 0;
		for (var i = 0; i < numX; i++) {
			for (var j = 0; j < numY; j++) {
				fluid.particlePos[p++] = h + r + dx * i + (j % 2 == 0 ? 0.0 : r);
				fluid.particlePos[p++] = h + r + dy * j
			}
		}

		// setup grid cells for tank
		var n = fluid.fNumY;

		for (var i = 0; i < fluid.fNumX; i++) {
			for (var j = 0; j < fluid.fNumY; j++) {
				var s = 1.0;	// fluid
				if (i == 0 || i == fluid.fNumX-1 || j == 0)
					s = 0.0;	// solid
				fluid.s[i*n + j] = s
			}
		}

		// set obstacle
		setObstacle(3.0, 2.0, true);
	}
function main() {
			
	// get canvas and webgl context
	canvas = <HTMLCanvasElement> document.getElementById('canvas');
	gl = <WebGL2RenderingContext> canvas.getContext('webgl2');

	if (!gl) {
		alert('WebGL 2 not supported!');
	}

	// `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
	// Later, we can import `gl` from `globals.ts` to access it
	setGL(gl);
	  

	canvas.width = window.innerWidth - 20;
	canvas.height = window.innerHeight - 20;
	canvas.focus();

	// Initial display for framerate
	
	const stats = Stats();
	stats.setMode(0);
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.left = '0px';
	stats.domElement.style.top = '0px';
	document.body.appendChild(stats.domElement);

	var cnt = 0;


	// drawing -------------------------------------------------------

	// Prepare shader programs
	const meshShaderProgram = new ShaderProgram([
		new Shader(gl.VERTEX_SHADER, require('./shaders/mesh-vert.glsl')),
		new Shader(gl.FRAGMENT_SHADER, require('./shaders/mesh-frag.glsl')),
	]);

	const pointShaderProgram = new ShaderProgram([
		new Shader(gl.VERTEX_SHADER, require('./shaders/point-vert.glsl')),
		new Shader(gl.FRAGMENT_SHADER, require('./shaders/point-frag.glsl')),
	]);

	function draw() 
	{
	
		resetGl(); 

		// grid
		if (gridVertBuffer == null) {
			var f = fluid;
			gridVertBuffer = gl.createBuffer();
			var cellCenters = new Float32Array(2 * f.fNumCells);
			var p = 0;

			for (var i = 0; i < f.fNumX; i++) {
				for (var j = 0; j < f.fNumY; j++) {
					cellCenters[p++] = (i + 0.5) * f.h;	
					cellCenters[p++] = (j + 0.5) * f.h;
				}
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, gridVertBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, cellCenters, gl.DYNAMIC_DRAW);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}

		if (gridColorBuffer == null)
			gridColorBuffer = gl.createBuffer();

		if (scene.showGrid) {

			var pointSize = 0.9 * fluid.h / simWidth * canvas.width;

			// set uniforms and attributes
			pointShaderProgram.use();
			pointShaderProgram.setDomainSize(simWidth, simHeight);
			pointShaderProgram.setPointSize(pointSize);
			pointShaderProgram.setDrawObstacle(0.0);

			gl.bindBuffer(gl.ARRAY_BUFFER, gridVertBuffer);
			var posLoc = pointShaderProgram.attrPosition;
			gl.enableVertexAttribArray(posLoc);
			gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

			gl.bindBuffer(gl.ARRAY_BUFFER, gridColorBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, fluid.cellColor, gl.DYNAMIC_DRAW);

			var colorLoc = pointShaderProgram.attrColor;
			gl.enableVertexAttribArray(colorLoc);
			gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

			gl.drawArrays(gl.POINTS, 0, fluid.fNumCells); 

			gl.disableVertexAttribArray(posLoc);
			gl.disableVertexAttribArray(colorLoc);

			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}

		// water

		if (scene.showParticles) {
			gl.clear(gl.DEPTH_BUFFER_BIT);

			var pointSize = 2.0 * fluid.particleRadius / simWidth * canvas.width;

			// set uniforms and attributes
			pointShaderProgram.use();
			pointShaderProgram.setDomainSize(simWidth, simHeight);
			pointShaderProgram.setPointSize(pointSize);
			pointShaderProgram.setDrawObstacle(1.0);

			if (pointVertexBuffer == null)
				pointVertexBuffer = gl.createBuffer();
			if (pointColorBuffer == null)
				pointColorBuffer = gl.createBuffer();

			gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, fluid.particlePos, gl.DYNAMIC_DRAW);

			var posLoc = pointShaderProgram.attrPosition;
			gl.enableVertexAttribArray(posLoc);
			gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

			gl.bindBuffer(gl.ARRAY_BUFFER, pointColorBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, fluid.particleColor, gl.DYNAMIC_DRAW);

			var colorLoc = pointShaderProgram.attrColor;
			gl.enableVertexAttribArray(colorLoc);
			gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

			gl.drawArrays(gl.POINTS, 0, fluid.numParticles); 

			gl.disableVertexAttribArray(posLoc);
			gl.disableVertexAttribArray(colorLoc);

			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}

		// obstacle 
		var numSegs = 50;

		if (obstacleVertBuffer == null) {

			obstacleVertBuffer = gl.createBuffer();
			var dphi = 2.0 * Math.PI / numSegs;
			var obstacleVerts = new Float32Array(2 * numSegs + 2);
			var p = 0;
			obstacleVerts[p++] = 0.0;
			obstacleVerts[p++] = 0.0;
			for (var i = 0; i < numSegs; i++) {
				obstacleVerts[p++] = Math.cos(i * dphi);
				obstacleVerts[p++] = Math.sin(i * dphi);
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, obstacleVertBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, obstacleVerts, gl.DYNAMIC_DRAW);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);

			obstacleIdBuffer = gl.createBuffer();
			var obstacleIds = new Uint16Array(3 * numSegs);
			p = 0;
			for (var i = 0; i < numSegs; i++) {
				obstacleIds[p++] = 0;
				obstacleIds[p++] = 1 + i;
				obstacleIds[p++] = 1 + (i + 1) % numSegs;
			}

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obstacleIdBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, obstacleIds, gl.DYNAMIC_DRAW);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		}

		gl.clear(gl.DEPTH_BUFFER_BIT);

		var obstacleColor = [1.0, 0.0, 0.0];

		// set uniforms and attributes
		meshShaderProgram.use();
		meshShaderProgram.setDomainSize(simWidth, simHeight);
		meshShaderProgram.setColor(obstacleColor);
		meshShaderProgram.setTranslation(scene.obstacleX, scene.obstacleY);
		meshShaderProgram.setScale(scene.obstacleRadius + fluid.particleRadius);

		posLoc = meshShaderProgram.attrPosition;
		gl.enableVertexAttribArray(posLoc);
		gl.bindBuffer(gl.ARRAY_BUFFER, obstacleVertBuffer);
		gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obstacleIdBuffer);
		gl.drawElements(gl.TRIANGLES, 3 * numSegs, gl.UNSIGNED_SHORT, 0);

		gl.disableVertexAttribArray(posLoc);		
		
	}

		// interaction -------------------------------------------------------

	var mouseDown = false;

	function startDrag(x: number, y: number) {
		let bounds = canvas.getBoundingClientRect();

		let mx = x - bounds.left - canvas.clientLeft;
		let my = y - bounds.top - canvas.clientTop;
		mouseDown = true;

		x = mx / cScale;
		y = (canvas.height - my) / cScale;

		setObstacle(x,y, true);
		scene.paused = false;
	}

	function drag(x: number, y: number) {
		if (mouseDown) {
			let bounds = canvas.getBoundingClientRect();
			let mx = x - bounds.left - canvas.clientLeft;
			let my = y - bounds.top - canvas.clientTop;
			x = mx / cScale;
			y = (canvas.height - my) / cScale;
			setObstacle(x,y, false);
		}
	}

	function endDrag() {
		mouseDown = false;
		scene.obstacleVelX = 0.0;
		scene.obstacleVelY = 0.0;
	}

	// -------------------------- event listeners ---------------------------
	canvas.addEventListener('mousedown', event => {
		startDrag(event.x, event.y);
	});

	canvas.addEventListener('mouseup', event => {
		endDrag();
	});

	canvas.addEventListener('mousemove', event => {
		drag(event.x, event.y);
	});

	canvas.addEventListener('touchstart', event => {
		startDrag(event.touches[0].clientX, event.touches[0].clientY)
	});

	canvas.addEventListener('touchend', event => {
		endDrag()
	});

	canvas.addEventListener('touchmove', event => {
		event.preventDefault();
		event.stopImmediatePropagation();
		drag(event.touches[0].clientX, event.touches[0].clientY)
	}, { passive: false});


	document.addEventListener('keydown', event => {
		switch(event.key) {
			case 'p': scene.paused = !scene.paused; break;
			case 'm': scene.paused = false; simulate(); scene.paused = true; break;
		}
	});

	function simulate() 
	{
		scene.obstacleRadius = controls['Obstacle radius'];
		
		scene.paused = !controls['Play simulation'];
		if (!scene.paused) {
			fluid.colorVelocity = controls['Speed Display'];
			fluid.colorDensity = controls['Density Display'];
			scene.showParticles = controls['Particle'];
			scene.showGrid = controls['Grid'];
			scene.compensateDrift = controls['Compensate Drift'];
			scene.separateParticles = controls['Separate Particles'];
			scene.flipRatio = controls['PIC - FLIP Ratio'];
			
			fluid.baseColor = vec3.fromValues(controls['Fluid color'][0] / 255, controls['Fluid color'][1] / 255, controls['Fluid color'][2] / 255); 
			scene.gravity = controls['Gravity'];

			fluid.simulate(
				scene.dt, scene.gravity, scene.flipRatio, scene.numPressureIters, scene.numParticleIters, 
				scene.overRelaxation, scene.compensateDrift, scene.separateParticles,
				scene.obstacleX, scene.obstacleY, scene.obstacleRadius);
			scene.frameNr++;
		}
			
	}

	function update() {
		stats.begin();
		simulate();

		// gl.viewport(0, 0, window.innerWidth, window.innerHeight); 
		  
		draw();
		stats.end();
		requestAnimationFrame(update);
	}

	// --------------------------------------------------------------
	// call functions 
	setupScene();
	update();
		
	}	
	
	// call main function to start the program
	main(); 