#version 300 es
precision highp float;


in vec2 attrPosition;
uniform vec2 domainSize;
uniform vec3 color;
uniform vec2 translation;
uniform float scale;

out vec3 fs_Col;

void main() {
  vec2 v = translation + attrPosition * scale;
vec4 screenTransform = 
  vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
gl_Position =
  vec4(v * screenTransform.xy + screenTransform.zw, 0.0, 1.0);

fs_Col = color;
}