import { vec3 } from "gl-matrix";

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
	
	MARCHING_SQUARES_EDGE_INDICES = [
		[], // Case 0: Empty configuration
		[0, 1], // Case 1
		[1, 2], // Case 2
		[0, 2], // Case 3
		[0, 3], // Case 4
		[1, 3, 0, 2], // Case 5
		[2, 3], // Case 6
		[2, 1], // Case 7
		[3, 1], // Case 8
		[0, 1, 3, 2], // Case 9
		[3, 2], // Case 10
		[0, 2, 1, 3], // Case 11
		[1, 2], // Case 12
		[0, 1], // Case 13
		[1, 3], // Case 14
		[]  // Case 15: Empty configuration
	];
	
	// coordinates of the vertices that define the boundary of the fluid region
	vertices: Float32Array; 
	// indices of the vertices that define the edges of the fluid region (pairs of vertices)
	edges: Float32Array;     

	constructor() {
		this.vertices = new Float32Array(0);
		this.edges = new Float32Array(0);
	}

	
	// ----------------- marching squares ------------------------------
	marchingSquaresAlgo(cellTypeArray: Int32Array, fNumY: number, fNumX: number, h: number, fInvSpacing: number) 
	{
		const n = fNumY;
		const h1 = fInvSpacing;
		const h2 = 0.5 * h;

		const vertices = [];
		const edges = [];

		// iterates over each cell in the grid to get fluid boundaries
		for (let xi = 0; xi < fNumX - 1; xi++) {
			for (let yi = 0; yi < fNumY - 1; yi++) {
				const cellNr = xi * n + yi;
				const cellType = cellTypeArray[cellNr];
				
				// Determine the configuration index based on the cell type
				let configIndex = 0;
				if (cellType === CellType.FLUID_CELL) {
					configIndex += 1;
				}
				if (cellTypeArray[(xi + 1) * n + yi] === CellType.FLUID_CELL) {
					configIndex += 2;
				}
				if (cellTypeArray[(xi + 1) * n + yi + 1] === CellType.FLUID_CELL) {
					configIndex += 4;
				}
				if (cellTypeArray[xi * n + yi + 1] === CellType.FLUID_CELL) {
					configIndex += 8;
				}
				
				// Determine the vertices and edges based on the configuration index
				const vertexOffsets = this.MARCHING_SQUARES_VERTEX_OFFSETS[configIndex];
				const edgeIndices = this.MARCHING_SQUARES_EDGE_INDICES[configIndex];
				
				for (let i = 0; i < vertexOffsets.length; i++) {
					const offset = vertexOffsets[i];
					const x = (xi + offset[0]) * h + h2;
					const y = (yi + offset[1]) * h + h2;
					vertices.push(x, y);
				}
				
				for (let i = 0; i < edgeIndices.length; i += 2) {
					const index1 = edgeIndices[i];
					const index2 = edgeIndices[i + 1];
					const vertex1 = vertices[index1];
					const vertex2 = vertices[index2];
					edges.push(vertex1, vertex2);
				}
			}
		}
		
		// Use the vertices and edges for further processing
		this.edges = Float32Array.from(edges);
		this.vertices = Float32Array.from(vertices);
	}

}
