import { vec3 } from "gl-matrix";
import { FlipFluid } from "./FlipFluid";
import { gl } from "../globals";

// Enum to define the cell types
enum CellType {
	FLUID_CELL = 0,
	AIR_CELL = 1,
	SOLID_CELL = 2
}

export class MarchingSquares {
	
	// offsets for marching squares algorithm 
	MARCHING_SQUARES_VERTEX_OFFSETS = [
		[], // Case 0: Empty configuration
		[[0, 0.5], [0.5, 0]], // Case 1: One corner inside (bottom right)
		[[0.5, 0], [1, 0.5]], // Case 2: One corner inside (bottom left)
		[[1, 0.5], [0.5, 1]], // Case 3: Two corners inside (bottom)
		[[0.5, 1], [0, 0.5]], // Case 4: One corner inside (top left)
		[[0, 0.5], [0.5, 1]], // Case 5: Two corners inside (left)
		[[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]], // Case 6: Three corners inside (left, bottom)
		[[1, 0.5], [0.5, 0]], // Case 7: One corner inside (bottom right)
		[[0.5, 1], [1, 0.5]], // Case 8: One corner inside (top right)
		[[0, 0.5], [0.5, 0], [1, 0.5], [0.5, 1]], // Case 9: Three corners inside (bottom, right)
		[[0.5, 0], [0, 0.5]], // Case 10: One corner inside (top left)
		[[1, 0.5], [0.5, 0], [0, 0.5], [0.5, 1]], // Case 11: Three corners inside (top, left)
		[[0, 0.5], [0.5, 1]], // Case 12: Two corners inside (top)
		[[0.5, 0], [1, 0.5], [0, 0.5], [0.5, 1]], // Case 13: Three corners inside (top, right)
		[[1, 0.5], [0.5, 1]], // Case 14: Two corners inside (right)
		[]  // Case 15: Empty configuration
	];
	
	// Initialize the edgeTable for the marching squares algorithm
	// Each entry in the table corresponds to a unique cell configuration
	// The value is a bitmask representing which edges are part of the polygon
	edgeTable = [
		0b0000, // 0: 0000 (no edges)
		0b0001, // 1: 0001 (bottom edge)
		0b0010, // 2: 0010 (right edge)
		0b0000, // 3: 0011 (bottom-right corner)
		0b0100, // 4: 0100 (top edge)
		0b1001, // 5: 0101 (bottom and top edges)
		0b0011, // 6: 0110 (right and top edges)
		0b0101, // 7: 0111 (bottom, top, and right edges)
		0b1000, // 8: 1000 (left edge)
		0b1010, // 9: 1001 (left and bottom edges)
		0b1100, // 10: 1010 (left and right edges)
		0b0000, // 11: 1011 (left, right, and bottom edges)
		0b1101, // 12: 1100 (left and top edges)
		0b1011, // 13: 1101 (left, top, and bottom edges)
		0b1110, // 14: 1110 (left, top, and right edges)
		0b0000, // 15: 1111 (all edges)
	];
	
	// coordinates of the vertices that define the boundary of the fluid region
	vertices: Float32Array; 
	// indices of the vertices that define the edges of the fluid region (pairs of vertices)
	edges: Float32Array;     

	// intersections 
	intersections: number[][] = [];

	fluid: FlipFluid; 
	constructor(fluid: FlipFluid) {
		this.vertices = new Float32Array(0);
		this.edges = new Float32Array(0);
		this.fluid = fluid;
	}

	
	// ----------------- marching squares ------------------------------
	// Assume `gridSize` is the size of your grid
	// Assume `cellSize` is the size of each cell in your grid
	// Assume `cellType` is your existing Int32Array
	// Assume `particleDensity` is your existing Float32Array

	createMarchingSquares() {
		let n = this.fluid.fNumY; // Number of cells in the y-direction
		let cellTypeArray = this.fluid.cellType; // Array of cell types

		for (let y = 0; y < this.fluid.fNumY - 1; y++) {
			for (let x = 0; x < this.fluid.fNumX - 1; x++) {
				// Determine the cell configuration based on the cell types
				let cellConfig = 0;
				cellConfig |= (cellTypeArray[y * n + x] === CellType.FLUID_CELL) ? 1 : 0;
				cellConfig |= (cellTypeArray[y * n + x + 1] === CellType.FLUID_CELL) ? 2 : 0;
				// Use a lookup table to determine the edges and intersection points
				let edges = this.edgeTable[cellConfig];
				this.intersections = [];
				for (let i = 0; i < 4; i++) {
					if (edges & (1 << i)) {
						let edgePoints = this.calculateEdgeIntersection(x, y, i);
						if (edgePoints) {
							this.intersections.push(edgePoints);
						}
					}
				}

				// Render the polygon using the intersection points
				// this.renderPolygon(intersections);
			}
		}
	}

	calculateEdgeIntersection(x: number, y: number, edgeIndex: number) {
		// Calculate the intersection point on the specified edge
		// Return the intersection point as [x, y] coordinates

		let p1, p2;
		let cellWidth = 1.0; // Assuming each cell is 1 unit wide
		let cellHeight = 1.0; // Assuming each cell is 1 unit high
	
		// Determine the endpoints of the edge based on the edge index
		switch (edgeIndex) {
			case 0: // Bottom edge
				p1 = [x * cellWidth, y * cellHeight];
				p2 = [(x + 1) * cellWidth, y * cellHeight];
				break;
			case 1: // Right edge
				p1 = [(x + 1) * cellWidth, y * cellHeight];
				p2 = [(x + 1) * cellWidth, (y + 1) * cellHeight];
				break;
			case 2: // Top edge
				p1 = [(x + 1) * cellWidth, (y + 1) * cellHeight];
				p2 = [x * cellWidth, (y + 1) * cellHeight];
				break;
			case 3: // Left edge
				p1 = [x * cellWidth, (y + 1) * cellHeight];
				p2 = [x * cellWidth, y * cellHeight];
				break;
			default:
				return null; // Invalid edge index
		}
	
		// Calculate the fluid density values at the edge endpoints
		let d1 = this.fluid.particleDensity[y * this.fluid.pNumX + x];
		let d2 = this.fluid.particleDensity[y * this.fluid.pNumX + x + 1];
		let t = d1 / (d1 - d2); // Interpolation factor
	
		// Calculate the intersection point using linear interpolation
		let ix = p1[0] + t * (p2[0] - p1[0]);
		let iy = p1[1] + t * (p2[1] - p1[1]);
	
		return [ix, iy];
	}
		

}
