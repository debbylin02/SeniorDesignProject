#version 300 es
precision highp float;

// The vertex shader used to render the background of the scene


in vec2 attrPosition;
in vec3 attrColor;
uniform vec2 domainSize;
uniform float pointSize;

out vec3 fs_Col;

void main() {
vec4 screenTransform = 
  vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
gl_Position =
  vec4(attrPosition * screenTransform.xy + screenTransform.zw, 0.0, 1.0);

gl_PointSize = pointSize;
}