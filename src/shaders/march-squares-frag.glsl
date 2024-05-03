#version 300 es
precision highp float;

in vec3 fs_Col;
out vec4 out_Col;

void main() {
  out_Col = vec4(fs_Col, 1.0);
}