// import {vec2, vec3, vec4, mat4} from 'gl-matrix';
// import Drawable from './Drawable';
// import {gl} from '../../globals';

export function resetGL(gl: WebGL2RenderingContext) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

export function resetAndClear(gl: WebGL2RenderingContext) {
    resetGL(gl);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

export function createShader(gl: WebGL2RenderingContext, vsSource: string, fsSource: string) {
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

