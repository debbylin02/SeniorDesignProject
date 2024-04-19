import {vec2} from 'gl-matrix'; 

export interface CanvasListener {
  startDrag: (x: number, y: number, isLeft: boolean) => void;
  endDrag: () => void;
  drag: (x: number, y: number, isLeft: boolean) => void;
  keyDown: (key: 'm' | 'p') => void;
}

export class Canvas {
  #context: CanvasRenderingContext2D;
  #canvas: HTMLCanvasElement;
  #size: vec2 = vec2.fromValues(0.0, 0.0);
  #listener: CanvasListener | undefined;

  constructor(canvas: HTMLCanvasElement, newSize: vec2) {
    this.#canvas = canvas;
    this.#context = canvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;
    this.setCanvasSize(newSize);
    
    this.setupListeners();
  }

  setListener(listener: CanvasListener) {
    this.#listener = listener;
  }

  public get width(): number {
    return this.#size[0];
  }

  public get height(): number {
    return this.#size[1];
  }

  public get context(): CanvasRenderingContext2D {
    return this.#context;
  }

  setCanvasSize(newSize: vec2) {
    this.#size = newSize;

    this.#canvas.style.width = newSize[0] + 'px';
    this.#canvas.style.height = newSize[1] + 'px';

    const scale = window.devicePixelRatio;
    this.#canvas.width = Math.floor(newSize[0] * scale);
    this.#canvas.height = Math.floor(newSize[1] * scale);
    this.#context.scale(scale, scale);
    this.#canvas.focus();
  }

  get midpoint(): vec2 {
    return this.fromNormalizedCoordinate(vec2.fromValues(0.5, 0.5));
  }

  fromNormalizedCoordinate(coord: vec2): vec2 {
    // return this.#size.componentMul(coord);
    let convertedCoord = vec2.fromValues(0, 0);
    return vec2.mul(convertedCoord, this.#size, coord); 
    // new Vec2(this.x * other.x, this.y * other.y);
  }

  toNormalizedCoordinate(pos: vec2): vec2 {
    // return pos.componentDiv(this.#size);
    let normalizedCoord = vec2.fromValues(0, 0);
    return vec2.div(normalizedCoord, this.#size, pos); 
  }

  private setupListeners() {
    const getPos = (clientX: number, clientY: number) => {
      const rect = this.#canvas.getBoundingClientRect();
      return { x: clientX - rect.x, y: clientY - rect.y };
    };

    document.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'p':
          this.#listener?.keyDown('p');
          break;
        case 'm':
          this.#listener?.keyDown('m');
          break;
      }
    });

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    });

    this.#canvas.addEventListener('mousedown', (e) => {
      const { x, y } = getPos(e.clientX, e.clientY);
      this.#listener?.startDrag(x, y, e.buttons === 1);
    });

    this.#canvas.addEventListener('mouseup', (e) => {
      this.#listener?.endDrag();
    });

    this.#canvas.addEventListener('mousemove', (e) => {
      const { x, y } = getPos(e.clientX, e.clientY);
      this.#listener?.drag(x, y, e.buttons === 1);
    });

    this.#canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const { x, y } = getPos(e.touches[0].clientX, e.touches[0].clientY);
      this.#listener?.startDrag(x, y, e.touches.length === 1);
    });

    this.#canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const { x, y } = getPos(e.touches[0].clientX, e.touches[0].clientY);
        this.#listener?.drag(x, y, e.touches.length === 1);
      },
      { passive: false }
    );

    this.#canvas.addEventListener('touchend', (e) => {
      this.#listener?.endDrag();
    });
  }
}
