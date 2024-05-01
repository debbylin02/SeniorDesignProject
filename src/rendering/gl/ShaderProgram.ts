import {vec2, vec3, vec4, mat4} from 'gl-matrix';
// import Drawable from './Drawable';
import {gl} from '../../globals';

var activeProgram: WebGLProgram;

export class Shader {
    shader: WebGLShader;

    constructor(type: number, source: string) {
        this.shader = gl.createShader(type) as WebGLShader;
        gl.shaderSource(this.shader, source);
        gl.compileShader(this.shader);
    
        if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
          throw gl.getShaderInfoLog(this.shader);
        }
    }

};

class ShaderProgram {
    prog: WebGLProgram;

    attrPosition: number;
    attrColor: number; // used by point-vert 

    domainSize: WebGLUniformLocation;
    pointSize: WebGLUniformLocation;
    drawObstacle: WebGLUniformLocation;
    color: WebGLUniformLocation; // used by mesh-vert
    scale: WebGLUniformLocation;
    translation: WebGLUniformLocation; 


    constructor(shaders: Array<Shader>) {
        this.prog = <WebGLProgram> gl.createProgram();

        for (let shader of shaders) {
        gl.attachShader(this.prog, shader.shader);
        }
        gl.linkProgram(this.prog);
        if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
            throw gl.getProgramInfoLog(this.prog);
        }

        // get attribute locations 
        this.attrPosition = gl.getAttribLocation(this.prog, "attrPosition");
        this.attrColor = gl.getAttribLocation(this.prog, "attrColor");

        // get uniform locations
        this.domainSize = gl.getUniformLocation(this.prog, "domainSize") as WebGLUniformLocation;
        this.pointSize = gl.getUniformLocation(this.prog, "pointSize") as WebGLUniformLocation;
        this.drawObstacle = gl.getUniformLocation(this.prog, "drawObstacle") as WebGLUniformLocation;
        this.color = gl.getUniformLocation(this.prog, "color") as WebGLUniformLocation;
        this.scale = gl.getUniformLocation(this.prog, "scale") as WebGLUniformLocation;
        this.translation = gl.getUniformLocation(this.prog, "translation") as WebGLUniformLocation;
    }

    use() {
        if (activeProgram !== this.prog) {
        gl.useProgram(this.prog);
        activeProgram = this.prog;
        }
    }

  
    // ---------------------- setters ----------------------
    setDomainSize(simWidth: number, simHeight: number){
        this.use();
        if(this.domainSize !== null)
        {
        gl.uniform2f(this.domainSize, simWidth, simHeight);
        }
    }

    setColor(color: number[]) {
        this.use();
        if (this.color !== -1) {
        gl.uniform3f(this.color, color[0], color[1], color[2]);
        }
    }

    setPointSize(size: number) {
        this.use();
        if (this.pointSize !== -1) {
        gl.uniform1f(this.pointSize, size);
        }
    }

    setDrawObstacle(drawObstacle: number){
        this.use();
        if(this.drawObstacle !== null)
        {
        gl.uniform1f(this.drawObstacle, drawObstacle);
        }
    }

    setScale(scale: number){
        this.use();
        if(this.scale !== null)
        {
        gl.uniform1f(this.scale, scale);
        }
    }

    setTranslation(translationX : number, translationY : number){
        this.use();
        if(this.translation !== null)
        {
        gl.uniform2f(this.translation, translationX, translationY);
        }
    }


    draw() {
        // this.use();

        // if (this.attrPos != -1 && d.bindPos()) {
        //   gl.enableVertexAttribArray(this.attrPos);
        //   gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
        // }

        // if (this.attrNor != -1 && d.bindNor()) {
        //   gl.enableVertexAttribArray(this.attrNor);
        //   gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
        // }

        // if (this.attrCol != -1 && d.bindCol()) {
        //   gl.enableVertexAttribArray(this.attrCol);
        //   gl.vertexAttribPointer(this.attrCol, 4, gl.FLOAT, false, 0, 0);
        // }

        // d.bindIdx();
        // gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);

        // if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
        // if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
        // if (this.attrCol != -1) gl.disableVertexAttribArray(this.attrCol);
    }
};

export default ShaderProgram;
