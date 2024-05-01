// import {gl} from '../../globals';

// abstract class Drawable {
//   count: number = 0;

//   bufPos: WebGLBuffer | null = null;
//   bufCol: WebGLBuffer | null = null;
//   bufIdx: WebGLBuffer | null = null;
  
//   posBound: boolean = false;
//   colBound: boolean = false;
//   idxBound: boolean = false;
  
//   abstract create() : void;

//   destory() {
//     gl.deleteBuffer(this.bufIdx);
//     gl.deleteBuffer(this.bufPos);
//     gl.deleteBuffer(this.bufCol);
//   }

//   generateIdx() {
//     this.idxBound = true;
//     this.bufIdx = gl.createBuffer();
//   }

//   generatePos() {
//     this.posBound = true;
//     this.bufPos = gl.createBuffer();
//   }

//   generateCol() {
//     this.colBound = true;
//     this.bufCol = gl.createBuffer();
//   }


//   bindIdx(): boolean {
//     if (this.idxBound) {
//       gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
//     }
//     return this.idxBound;
//   }

//   bindPos(): boolean {
//     if (this.posBound) {
//       gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
//     }
//     return this.posBound;
//   }

//   bindCol(): boolean { 
//     if (this.colBound) {
//       gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
//     }
//     return this.colBound;
//   }

//   elemCount(): number {
//     return this.count;
//   }

//   drawMode(): GLenum {
//     return gl.TRIANGLES;
//   }
// };

// export default Drawable;
