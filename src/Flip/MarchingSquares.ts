import { vec3 } from "gl-matrix";
import { FlipFluid } from "./FlipFluid";
import { gl } from "../globals";

// Enum to define the cell types
enum CellType {
	FLUID_CELL = 0,
	AIR_CELL = 1,
	SOLID_CELL = 2
}

// Enum for edge types
const EdgeType = {
    EMPTY: 0,
    SOLID: 1
};


export class MarchingSquares {
	
	// Define the intersection patterns for each configuration
	binaryIntersectionPatterns = [
		0b0000, // Configuration 0: No intersection
		0b0001, // Configuration 1: Bottom
		0b0010, // Configuration 2: Right
		0b1000, // Configuration 3: Top
		0b0100, // Configuration 4: Left
		0b1010, // Configuration 5: Bottom-Right
		0b1100, // Configuration 6: Top-Right
		0b0110, // Configuration 7: Top-Left
		0b0011, // Configuration 8: Left-Bottom
		0b1100, // Configuration 9: Top-Left, Bottom-Right
		0b1110, // Configuration 10: Top-Left, Top-Right
		0b0111, // Configuration 11: Bottom-Left, Top-Right
		0b1011, // Configuration 12: Bottom-Left, Bottom-Right
		0b1001, // Configuration 13: Bottom-Left, Top
		0b0101, // Configuration 14: Bottom, Top-Right
		0b1111  // Configuration 15: All edges
	];
	

	edgeIntersectionPatterns = [    
		[],                                 // 0: 0000
		[1, 2],                             // 1: 0001
		[2, 3],                             // 2: 0010
		[1, 3],                             // 3: 0011
		[3, 0],                             // 4: 0100
		[1, 0, 2, 3],                       // 5: 0101
		[0, 2],                             // 6: 0110
		[1, 0],                             // 7: 0111
		[0, 1],                             // 8: 1000
		[0, 1, 2, 3],                       // 9: 1001
		[0, 2],                             // 10: 1010
		[0, 3],                             // 11: 1011
		[1, 3],                             // 12: 1100
		[0, 3],                             // 13: 1101
		[2, 3],                             // 14: 1110
		[]                                  // 15: 1111
	];


	// coordinates of the vertices that define the boundary of the fluid region
	vertices: Float32Array; 
	// indices of the vertices that define the edges of the fluid region (pairs of vertices)
	edges: Float32Array;     

	// intersections 
	intersections: number[][] = [];

	// cell types 
	cellTypeArray: Int32Array;

	fluid: FlipFluid; 
	constructor(fluid: FlipFluid) {
		this.vertices = new Float32Array(0);
		this.edges = new Float32Array(0);
		this.fluid = fluid;
		this.cellTypeArray = fluid.cellType;
	}

	// --------- get cell type / configuration ---------------

	checkBoundaries(x: number, y: number) {
		return x >= 0 && x < this.fluid.fNumX && y >= 0 && y < this.fluid.fNumY;
	}

	getCellTypeAt(x: number, y: number) { 
		// Determine the cell type  
		var n = this.fluid.fNumY; // Number of cells in the y-direction
		var cellNr = x * n + y;

		// check if beyond boundaries
		if (!this.checkBoundaries(x, y)) {
			return CellType.SOLID_CELL;
		} 

		var cellType = this.cellTypeArray[cellNr];
		return cellType; 
	}

	getCellConfiguration(x: number, y: number) {
		const cellType = this.getCellTypeAt(x, y);

		// Get the cell types of the neighboring cells
		const top = this.getCellTypeAt(x, y - 1);
		const right = this.getCellTypeAt(x + 1, y);
		const bottom = this.getCellTypeAt(x, y + 1);
		const left = this.getCellTypeAt(x - 1, y);
	
		let configuration = 0;

		if (top === CellType.FLUID_CELL) configuration += 1;
		if (right === CellType.FLUID_CELL) configuration += 2;
		if (bottom === CellType.FLUID_CELL) configuration += 4;
		if (left === CellType.FLUID_CELL) configuration += 8;
	
		return configuration;
	}

	getIntersectionPattern(x: number, y: number) {
		// get cell configuration
		const config = this.getCellConfiguration(x, y);
		// return this.edgeIntersectionPatterns[config];
		return this.binaryIntersectionPatterns[config];
	}

	// ----------------- marching squares ------------------------------
	interpolateVertex(x: number, y: number, edge: number) {
		const cellCenterX = (x + 0.5) * this.fluid.h;
		const cellCenterY = (y + 0.5) * this.fluid.h;
	
		let vertexX, vertexY;
		switch (edge) {
			case 0: // Top edge
				vertexX = cellCenterX;
				vertexY = cellCenterY - this.fluid.h / 2;
				break;
			case 1: // Right edge
				vertexX = cellCenterX + this.fluid.h / 2;
				vertexY = cellCenterY;
				break;
			case 2: // Bottom edge
				vertexX = cellCenterX;
				vertexY = cellCenterY + this.fluid.h / 2;
				break;
			case 3: // Left edge
				vertexX = cellCenterX - this.fluid.h / 2;
				vertexY = cellCenterY;
				break;
			default:
				throw new Error("Invalid edge index");
		}
	
		return [vertexX, vertexY];
	}

	
	createMarchingSquares() {
		let n = this.fluid.fNumY; // Number of cells in the y-direction
	
		// Loop through each cell in the grid
		for (var i = 0; i <  this.fluid.fNumX - 1; i++) {
			for (var j = 0; j < this.fluid.fNumY - 1; j++) {

				// Determine the intersection pattern for the current cell
				var intersectionPattern = this.getIntersectionPattern(i, j);

				// Generate vertices for the intersected edges
				var vert = [];
				var edges = []; 
				for (var k = 0; k < 4; k++) {
					if (intersectionPattern & (1 << k)) {
						// returns [vertexX, vertexY];
						var interpolated = this.interpolateVertex(i, j, k);
						vert.push(interpolated[0], interpolated[1]);
					}
				}

				this.vertices = new Float32Array(vert);

				// Generate triangles based on the intersection pattern
				if (vert.length === 2) {
					// Handle cases with 2 vertices (single line)
				} else if (vert.length === 3) {
					// Handle cases with 3 vertices (triangle)
				}
			}
		}
	}

		

}
