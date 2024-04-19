// import {vec2, vec3, vec4, mat4} from 'gl-matrix';
// import Drawable from './Drawable';
// import {gl} from '../../globals';

// var activeProgram: WebGLProgram;

// export class Shader {
//   shader: WebGLShader;

//   constructor(type: number, source: string) {
//     this.shader = <WebGLShader> gl.createShader(type);
//     gl.shaderSource(this.shader, source);
//     gl.compileShader(this.shader);

//     if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
//       throw gl.getShaderInfoLog(this.shader);
//     }
//   }
// };

// class ShaderProgram {
//   prog: WebGLProgram;

//   attrPos: number;
//   attrNor: number;
//   attrCol: number;

//   unifModel: WebGLUniformLocation;
//   unifModelInvTr: WebGLUniformLocation;
//   unifViewProj: WebGLUniformLocation;

//   // colors 
//   unifColor: WebGLUniformLocation;
//   unifBottomColor: WebGLUniformLocation;

//   // added time 
//   unifTime: WebGLUniformLocation; 

//   // flame size 
//   unifFlameSize: WebGLUniformLocation; 

//   constructor(shaders: Array<Shader>) {
//     this.prog = <WebGLProgram> gl.createProgram();

//     for (let shader of shaders) {
//       gl.attachShader(this.prog, shader.shader);
//     }
//     gl.linkProgram(this.prog);
//     if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
//       throw gl.getProgramInfoLog(this.prog);
//     }

//     // this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
//     // this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
//     // this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");

//     // this.unifModel      = gl.getUniformLocation(this.prog, "u_Model");
//     // this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
//     // this.unifViewProj   = gl.getUniformLocation(this.prog, "u_ViewProj");
//     // this.unifColor      = gl.getUniformLocation(this.prog, "u_Color");

//     // // bottom color 
//     // this.unifBottomColor = gl.getUniformLocation(this.prog, "u_BottomColor");
    
//     // // added for time 
//     // this.unifTime = gl.getUniformLocation(this.prog, "u_Time"); 

//     // // added for flame size 
//     // this.unifFlameSize = gl.getUniformLocation(this.prog, "u_FlameSize"); 
//   }

//   use() {
//     if (activeProgram !== this.prog) {
//       gl.useProgram(this.prog);
//       activeProgram = this.prog;
//     }
//   }

//   setModelMatrix(model: mat4) {
//     this.use();
//     if (this.unifModel !== -1) {
//       gl.uniformMatrix4fv(this.unifModel, false, model);
//     }

//     if (this.unifModelInvTr !== -1) {
//       let modelinvtr: mat4 = mat4.create();
//       mat4.transpose(modelinvtr, model);
//       mat4.invert(modelinvtr, modelinvtr);
//       gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
//     }
//   }

//   setViewProjMatrix(vp: mat4) {
//     this.use();
//     if (this.unifViewProj !== -1) {
//       gl.uniformMatrix4fv(this.unifViewProj, false, vp);
//     }
//   }

//   setGeometryColor(color: vec4) {
//     this.use();
//     if (this.unifColor !== -1) {
//       gl.uniform4fv(this.unifColor, color);
//     }
//   }

//   // bottom color 
//   setBottomColor(color: vec4) {
//     this.use();
//     if (this.unifBottomColor !== -1) {
//       gl.uniform4fv(this.unifBottomColor, color);
//     }
//   }

//   // setting the unifTime variable 
//   setTime(t: GLint){
//     this.use(); 
//     if(this.unifTime !== -1)
//     {
//         gl.uniform1i(this.unifTime, t);
//     }
//   }

//   // setting the unifFlameSize variable
//   setFlameSize(size: GLfloat){
//     this.use(); 
//     if(this.unifFlameSize !== -1)
//     {
//       gl.uniform1f(this.unifFlameSize, size);
//     }
//   }

//   draw() {
//     // this.use();

//     // if (this.attrPos != -1 && d.bindPos()) {
//     //   gl.enableVertexAttribArray(this.attrPos);
//     //   gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
//     // }

//     // if (this.attrNor != -1 && d.bindNor()) {
//     //   gl.enableVertexAttribArray(this.attrNor);
//     //   gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
//     // }

//     // if (this.attrCol != -1 && d.bindCol()) {
//     //   gl.enableVertexAttribArray(this.attrCol);
//     //   gl.vertexAttribPointer(this.attrCol, 4, gl.FLOAT, false, 0, 0);
//     // }

//     // d.bindIdx();
//     // gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);

//     // if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
//     // if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
//     // if (this.attrCol != -1) gl.disableVertexAttribArray(this.attrCol);
//   }
// };

// export default ShaderProgram;
