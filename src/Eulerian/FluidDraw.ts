import { Scene } from './FluidScene';
import {vec2} from 'gl-matrix'; 

function sizeTransformations(cSize: vec2) {
  const windowScale = window.devicePixelRatio;
  return {
    windowScale,
    pxWidth: Math.floor(cSize[0] * windowScale),
    pxHeight: Math.floor(cSize[1] * windowScale),
    // Grid index --> canvas
    gcX: (gridX: number, h: number) => {
      return gridX * h * cSize[1];
    },
    gcY: (gridY: number, h: number) => {
      return cSize[1] - gridY * h * cSize[1];
    },
    // Simulation units --> canvas, (i.e. vertical Y is 1)
    cX: (simulationX: number) => {
      return simulationX * cSize[1];
    },
    cY: (simulationY: number) => {
      return cSize[1] - simulationY * cSize[1];
    },
    cL: (simulationLength: number) => {
      return simulationLength * cSize[1];
    },
  };
}

// export function draw(scene: Scene, cSize: vec2, c: WebGL2RenderingContext) {
export function draw(scene: Scene, cSize: vec2, c: CanvasRenderingContext2D) {
  const f = scene.fluid;
  const n = f.numY;
  const h = f.h;
  const { windowScale, pxWidth, pxHeight, gcX, gcY, cX, cY, cL } =
    sizeTransformations(cSize);

  c.clearRect(0, 0, cSize[0], cSize[1]);
  c.fillStyle = '#FF0000';

  let minP = f.p[0];
  let maxP = f.p[0];
  for (let i = 0; i < f.numCells; i++) {
    minP = Math.min(minP, f.p[i]);
    maxP = Math.max(maxP, f.p[i]);
  }

  const pxPerCell = Math.ceil(cL(h) * windowScale);
  const id = c.getImageData(0, 0, pxWidth, pxHeight);

  let color = [255, 255, 255, 255];
  const yellow = [255, 255, 0];

  for (let i = 0; i < f.numX; i++) {
    for (let j = 0; j < f.numY; j++) {
      if (scene.showPressure) {
        const p = f.p[i * n + j];
        const s = f.m[i * n + j];

        color = getSciColor(p, minP, maxP);
        if (scene.showFluid) {
          color[0] = Math.max(0.0, color[0] - 255 * s);
          color[1] = Math.max(0.0, color[1] - 255 * s);
          color[2] = Math.max(0.0, color[2] - 255 * s);
        }
      } else if (scene.showFluid) {
        const s = f.m[i * n + j];
        color[0] = 255 * s;
        color[1] = 255 * s;
        color[2] = 255 * s;        
      } else {
        color = [255, 255, 255, 255];
      }

      if (scene.showSolid) {
        const s = f.s[i * n + j]; // 1 = fluid, 0 = solid
        if (s < 1) {
          const opacity = 1.0 - s;
          color = blendColors(yellow, color, opacity);
        }
      }

      const x = Math.floor(gcX(i, h) * windowScale);
      const y = Math.floor(gcY(j + 1, h) * windowScale);

      for (let xx = 0; xx < pxPerCell; xx++) {
        for (let yy = 0; yy < pxPerCell; yy++) {
          const n = 4 * (y * pxWidth + yy * pxWidth + x + xx);
          id.data[n] = color[0];
          id.data[n + 1] = color[1];
          id.data[n + 2] = color[2];
          id.data[n + 3] = 255;
        }
      }
    }
  }

  c.putImageData(id, 0, 0);

  if (scene.showVelocities) {
    c.strokeStyle = '#AAAAAA';
    const scale = 0.02;

    for (let i = 0; i < f.numX; i++) {
      for (let j = 0; j < f.numY; j++) {
        const u = f.u[i * n + j];
        const v = f.v[i * n + j];

        const x0 = cX(i * h);
        const x1 = cX(i * h + u * scale);
        const y = cY((j + 0.5) * h);

        c.beginPath();
        c.moveTo(x0, y);
        c.lineTo(x1, y);
        c.stroke();

        const x = cX((i + 0.5) * h);
        const y0 = cY(j * h);
        const y1 = cY(j * h + v * scale);

        c.beginPath();
        c.moveTo(x, y0);
        c.lineTo(x, y1);
        c.stroke();
      }
    }
  }

  if (scene.showStreamlines) {
    const numSegs = 15;

    c.strokeStyle = '#0099ff';

    for (let i = 1; i < f.numX - 1; i += 5) {
      for (let j = 1; j < f.numY - 1; j += 5) {
        let x = (i + 0.5) * f.h;
        let y = (j + 0.5) * f.h;

        c.beginPath();
        c.moveTo(cX(x), cY(y));

        for (let n = 0; n < numSegs; n++) {
          const u = f.sampleField(x, y, 'U_FIELD');
          const v = f.sampleField(x, y, 'V_FIELD');
          x += u * 0.01;
          y += v * 0.01;
          if (x > f.numX * f.h) break;

          c.lineTo(cX(x), cY(y));
        }
        c.stroke();
      }
    }
  }

  if (scene.showObstacle && scene.obstacleX) {
    const r = scene.obstacleRadius + f.h;

    c.fillStyle = scene.showPressure ? '#000000' : '#DDDDDD';
    c.beginPath();
    c.arc(cX(scene.obstacleX), cY(scene.obstacleY), cL(r), 0.0, 2.0 * Math.PI);
    c.closePath();
    c.fill();

    c.lineWidth = 3.0;
    c.strokeStyle = '#000000';
    c.beginPath();
    c.arc(cX(scene.obstacleX), cY(scene.obstacleY), cL(r), 0.0, 2.0 * Math.PI);
    c.closePath();
    c.stroke();
    c.lineWidth = 1.0;
  }

  if (scene.showPressure) {
    const str =
      'pressure: ' + minP.toFixed(0) + ' - ' + maxP.toFixed(0) + ' N/m';
    c.fillStyle = '#000000';
    c.font = '16px Arial';
    c.fillText(str, 10, 35);
  }

  // Check that grid corners are aligned with the canvas
  // c.beginPath();
  // c.lineWidth = 3.0;
  // c.strokeStyle = '#ff00ff';
  // c.rect(gcX(0, h), gcY(1, h), h * cSize[1], h * cSize[1]);
  // c.rect(gcX(f.numX - 1, h), gcY(f.numY, h), h * cSize[1], h * cSize[1]);
  // c.closePath();
  // c.stroke();
}

// ----------------- Drawing utils ------------------------------

function setColor(
  r: number,
  g: number,
  b: number,
  c: CanvasRenderingContext2D
) {
  c.fillStyle = `rgb(
      ${Math.floor(255 * r)},
      ${Math.floor(255 * g)},
      ${Math.floor(255 * b)})`;
  c.strokeStyle = `rgb(
      ${Math.floor(255 * r)},
      ${Math.floor(255 * g)},
      ${Math.floor(255 * b)})`;
}

function blendColors(top: number[], bottom: number[], opacity: number) {
  return [
    opacity * top[0] + (1 - opacity) * bottom[0],
    opacity * top[1] + (1 - opacity) * bottom[1],
    opacity * top[2] + (1 - opacity) * bottom[2],
  ];
}

function blendWhite(color: number[], lightness: number) {
  return [
    lightness * 255 + (1 - lightness) * color[0],
    lightness * 255 + (1 - lightness) * color[1],
    lightness * 255 + (1 - lightness) * color[2],
  ];
}

function getSciColor(val: number, minVal: number, maxVal: number) {
  val = Math.min(Math.max(val, minVal), maxVal - 0.0001);
  const d = maxVal - minVal;
  val = d == 0.0 ? 0.5 : (val - minVal) / d;
  const m = 0.25;
  const num = Math.floor(val / m);
  const s = (val - num * m) / m;
  let r: number, g: number, b: number;

  switch (num) {
    case 0:
      r = 0.0;
      g = s;
      b = 1.0;
      break;
    case 1:
      r = 0.0;
      g = 1.0;
      b = 1.0 - s;
      break;
    case 2:
      r = s;
      g = 1.0;
      b = 0.0;
      break;
    case 3:
      r = 1.0;
      g = 1.0 - s;
      b = 0.0;
      break;
  }

  return [255 * r!, 255 * g!, 255 * b!, 255];
}
