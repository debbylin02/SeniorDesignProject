#version 300 es
precision highp float;

in vec2 attrPosition;
in vec3 attrColor;
uniform vec2 domainSize;
uniform float pointSize;
uniform float drawObstacle;

out vec3 fs_Col;
out float fragDrawDisk;

void main() {
vec4 screenTransform = 
  vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
gl_Position =
  vec4(attrPosition * screenTransform.xy + screenTransform.zw, 0.0, 1.0);

gl_PointSize = pointSize;
fs_Col = attrColor;
fragDrawDisk = drawObstacle;
}