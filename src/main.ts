import { vec3 } from 'gl-matrix';
import { FlipFluid } from './Flip/FlipFluid';
import { FlipFluidScene } from './Flip/FlipFluidScene';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';

	let scene = new FlipFluidScene();
	let fluid : FlipFluid; 
	let simHeight: number;;	
	let cScale: number;
	let simWidth: number;
	let canvas: HTMLCanvasElement;
	let gl: WebGL2RenderingContext;

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
	
	
	var pointShader: WebGLShader;
	var meshShader: WebGLShader;

	var pointVertexBuffer: WebGLBuffer | null = null;
	var pointColorBuffer: WebGLBuffer | null = null;

	var gridVertBuffer: WebGLBuffer | null = null;
	var gridColorBuffer: WebGLBuffer | null = null;

	var diskVertBuffer: WebGLBuffer | null = null;
	var diskIdBuffer: WebGLBuffer | null = null;

	function resetAndClear() {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		pointVertexBuffer = null;
		pointColorBuffer = null;
		gridVertBuffer = null;
		gridColorBuffer = null;
		diskVertBuffer = null;
		diskIdBuffer = null;
	}

	function createShader(gl: WebGL2RenderingContext, vsSource: string, fsSource: string) {
		const vsShader = <WebGLShader>gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vsShader, vsSource);
		gl.compileShader(vsShader);
		if (!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS))
			console.log("vertex shader compile error: " + gl.getShaderInfoLog(vsShader));

		const fsShader = <WebGLShader>gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fsShader, fsSource);
		gl.compileShader(fsShader);
		if (!gl.getShaderParameter(fsShader, gl.COMPILE_STATUS))
			console.log("fragment shader compile error: " + gl.getShaderInfoLog(fsShader));

		var shader = <WebGLProgram>gl.createProgram();
		gl.attachShader( shader, vsShader);
		gl.attachShader( shader, fsShader);
		gl.linkProgram( shader);

		return shader;
	}


		
	function draw() 
	{
	
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		// prepare shaders

		if (pointShader == null)
			pointShader = createShader(gl, require('./shaders/point-vert.glsl'), require('./shaders/point-frag.glsl'));
		if (meshShader == null)
			meshShader = createShader(gl, require('./shaders/mesh-vert.glsl'), require('./shaders/mesh-frag.glsl'));

		// grid

		if (gridVertBuffer == null) {
			var f = fluid;
			gridVertBuffer = gl.createBuffer();
			var cellCenters = new Float32Array(2 * f.fNumCells);
			var p = 0;

			for (var i = 0; i < f.fNumX; i++) {
				for (var j = 0; j < f.fNumY; j++) {
					cellCenters[p++] = (i + 0.5) * f.h;	// check f.h size 
					cellCenters[p++] = (j + 0.5) * f.h;

					console.log("f.h: ", f.h, " cell center: ", cellCenters[p-2], " , " , cellCenters[p-1]);
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
			// var pointSize = 10 * fluid.h / simWidth * canvas.width;

			gl.useProgram(pointShader);
			gl.uniform2f(gl.getUniformLocation(pointShader, 'domainSize'), simWidth, simHeight);
			gl.uniform1f(gl.getUniformLocation(pointShader, 'pointSize'), pointSize);
			gl.uniform1f(gl.getUniformLocation(pointShader, 'drawDisk'), 0.0);

			gl.bindBuffer(gl.ARRAY_BUFFER, gridVertBuffer);
			var posLoc = gl.getAttribLocation(pointShader, 'attrPosition');
			gl.enableVertexAttribArray(posLoc);
			gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

			gl.bindBuffer(gl.ARRAY_BUFFER, gridColorBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, fluid.cellColor, gl.DYNAMIC_DRAW);

			var colorLoc = gl.getAttribLocation(pointShader, 'attrColor');
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

			gl.useProgram(pointShader);
			gl.uniform2f(gl.getUniformLocation(pointShader, 'domainSize'), simWidth, simHeight);
			gl.uniform1f(gl.getUniformLocation(pointShader, 'pointSize'), pointSize);
			gl.uniform1f(gl.getUniformLocation(pointShader, 'drawDisk'), 1.0);

			if (pointVertexBuffer == null)
				pointVertexBuffer = gl.createBuffer();
			if (pointColorBuffer == null)
				pointColorBuffer = gl.createBuffer();

			gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, fluid.particlePos, gl.DYNAMIC_DRAW);

			var posLoc = gl.getAttribLocation(pointShader, 'attrPosition');
			gl.enableVertexAttribArray(posLoc);
			gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

			gl.bindBuffer(gl.ARRAY_BUFFER, pointColorBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, fluid.particleColor, gl.DYNAMIC_DRAW);

			var colorLoc = gl.getAttribLocation(pointShader, 'attrColor');
			gl.enableVertexAttribArray(colorLoc);
			gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

			gl.drawArrays(gl.POINTS, 0, fluid.numParticles); 

			gl.disableVertexAttribArray(posLoc);
			gl.disableVertexAttribArray(colorLoc);

			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}

		// disk

		// prepare disk mesh

		var numSegs = 50;

		if (diskVertBuffer == null) {

			diskVertBuffer = gl.createBuffer();
			var dphi = 2.0 * Math.PI / numSegs;
			var diskVerts = new Float32Array(2 * numSegs + 2);
			var p = 0;
			diskVerts[p++] = 0.0;
			diskVerts[p++] = 0.0;
			for (var i = 0; i < numSegs; i++) {
				diskVerts[p++] = Math.cos(i * dphi);
				diskVerts[p++] = Math.sin(i * dphi);
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, diskVertBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, diskVerts, gl.DYNAMIC_DRAW);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);

			diskIdBuffer = gl.createBuffer();
			var diskIds = new Uint16Array(3 * numSegs);
			p = 0;
			for (var i = 0; i < numSegs; i++) {
				diskIds[p++] = 0;
				diskIds[p++] = 1 + i;
				diskIds[p++] = 1 + (i + 1) % numSegs;
			}

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, diskIdBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, diskIds, gl.DYNAMIC_DRAW);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		}

		gl.clear(gl.DEPTH_BUFFER_BIT);

		var diskColor = [1.0, 0.0, 0.0];

		gl.useProgram(meshShader);
		gl.uniform2f(gl.getUniformLocation(meshShader, 'domainSize'), simWidth, simHeight);
		gl.uniform3f(gl.getUniformLocation(meshShader, 'color'), diskColor[0], diskColor[1], diskColor[2]);
		gl.uniform2f(gl.getUniformLocation(meshShader, 'translation'), scene.obstacleX, scene.obstacleY);
		gl.uniform1f(gl.getUniformLocation(meshShader, 'scale'), scene.obstacleRadius + fluid.particleRadius);

		posLoc = gl.getAttribLocation(meshShader, 'attrPosition');
		gl.enableVertexAttribArray(posLoc);
		gl.bindBuffer(gl.ARRAY_BUFFER, diskVertBuffer);
		gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, diskIdBuffer);
		gl.drawElements(gl.TRIANGLES, 3 * numSegs, gl.UNSIGNED_SHORT, 0);

		gl.disableVertexAttribArray(posLoc);		
		
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

			
		// Calculate scale based on simHeight
		// adjusting for resolution
		// simHeight = 3.0;

		// Calculate simHeight based on the ratio of the current resolution to the base resolution
		let baseResolution = 100;

		simHeight = 3.0 * (baseResolution / res);
		// Calculate the aspect ratio of the canvas
		// let canvasAspectRatio = canvas.width / canvas.height;

		cScale = canvas.height / simHeight;
		// simWidth = simHeight * canvasAspectRatio;
		simWidth = canvas.width / cScale;


		// need to adjusting for resolution
		// Adjust simHeight based on the resolution
		// simHeight = 3.0 * (res / 100);
		var tankHeight = 1.0 * simHeight;
		var tankWidth = 1.0 * simWidth;

		// var baseResolution = 100;  // The resolution where current settings work well
		// var baseH = tankHeight / baseResolution;  // This calculates to the ideal cell size at the base resolution
		// var h = baseH * (baseResolution / res);


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
		
		console.log("Number of particles: ", fluid.numParticles);
		console.log("h: ", h);
		console.log("simHeight: ", simHeight);
		console.log("simWidth: ", simWidth);
		console.log("tankHeight: ", tankHeight);
		console.log("tankWidth: ", tankWidth);
		console.log("NumX: ", numX);
		console.log("NumY: ", numY);

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



		setObstacle(3.0, 2.0, true);
	}
	function main() {
			
		// get canvas and webgl context
		canvas = <HTMLCanvasElement> document.getElementById('canvas');
		gl = <WebGL2RenderingContext> canvas.getContext('webgl2');

		if (!gl) {
			alert('WebGL 2 not supported!');
		}

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


	// draw -------------------------------------------------------


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
	// document.addEventListener('DOMContentLoaded', () => {
	// 	const checkbox = document.querySelector('#densityCheckbox') as HTMLInputElement;
	// 	if (checkbox) {
	// 		checkbox.addEventListener('click', () => {
	// 			fluid.colorDensity = !fluid.colorDensity;
	// 		});
	// 	}
	// });


	// document.addEventListener('DOMContentLoaded', () => {
	// 	const checkbox = document.querySelector('#densityCheckbox') as HTMLInputElement;
	// 	if (checkbox) {
	// 		checkbox.addEventListener('click', () => {
	// 			fluid.colorDensity = !fluid.colorDensity;
	// 		});
	// 	}
	// });

	// document.addEventListener('DOMContentLoaded', () => {
	// 	const checkbox = document.querySelector('#velocityCheckbox') as HTMLInputElement;
	// 	if (checkbox) {
	// 		checkbox.addEventListener('click', () => {
	// 			fluid.colorVelocity = !fluid.colorVelocity;
	// 		});
	// 	}
	// });

	// document.addEventListener('DOMContentLoaded', () => {
	// 	const checkbox = document.querySelector('#particleCheckbox') as HTMLInputElement;
	// 	if (checkbox) {
	// 		checkbox.addEventListener('click', () => {
	// 			scene.showParticles = !scene.showParticles;
	// 		});
	// 	}
	// });

	// document.addEventListener('DOMContentLoaded', () => {
	// 	const checkbox = document.querySelector('#gridCheckbox') as HTMLInputElement;
	// 	if (checkbox) {
	// 		checkbox.addEventListener('click', () => {
	// 			scene.showGrid = !scene.showGrid;
	// 		});
	// 	}
	// });

	// document.addEventListener('DOMContentLoaded', () => {
	// 	const checkbox = document.querySelector('#compensateDriftCheckbox') as HTMLInputElement;
	// 	if (checkbox) {
	// 		checkbox.addEventListener('click', () => {
	// 			scene.compensateDrift = !scene.compensateDrift;
	// 		});
	// 	}
	// });

	// document.addEventListener('DOMContentLoaded', () => {
	// 	const checkbox = document.querySelector('#seperateParticlesCheckbox') as HTMLInputElement;
	// 	if (checkbox) {
	// 		checkbox.addEventListener('click', () => {
	// 			scene.separateParticles = !scene.separateParticles;
	// 		});
	// 	}
	// });

	// document.addEventListener('DOMContentLoaded', function() {
	// 	const slider = document.getElementById('flipSlider') as HTMLInputElement; // Access the slider by its ID
	// 	if (slider) {
	// 		slider.addEventListener('change', function() {
	// 			scene.flipRatio = 0.1 * parseFloat(this.value); // Update the flipRatio based on slider value
	// 			// console.log("Flip Ratio set to:", scene.flipRatio); // Optional: for debugging
	// 		});
	// 	} else {
	// 		console.error('PIC FLIP slider not found!'); // Error handling if the slider is not found
	// 	}
	// });
	

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