#version 300 es
precision highp float;

in vec3 fs_Col;
in float fragDrawDisk;

out vec4 out_Col;  // Define an output variable for the fragment shader

void main() {
    if (fragDrawDisk == 1.0) {
        float rx = 0.5 - gl_PointCoord.x;
        float ry = 0.5 - gl_PointCoord.y;
        float r2 = rx * rx + ry * ry;
        if (r2 > 0.25) {
            discard;  // Discard the fragment if the condition is met
        }
    }
    out_Col = vec4(fs_Col, 1.0);  // Use the defined output variable
}
