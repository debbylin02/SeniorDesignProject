#version 300 es
precision highp float;


out vec4 out_Col;  // Define an output variable for the fragment shader

void main() {
    out_Col = vec4(1.0, 0.0, 0.0, 1.0);  // Set output color to red
}
