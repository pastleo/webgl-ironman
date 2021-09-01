import { createShader, createProgram } from './lib/utils.js';
import { matrix4 } from './lib/matrix.js';
import * as twgl from 'https://unpkg.com/twgl.js@4.19.2/dist/4.x/twgl-full.module.js';

const vertexShaderSource = `
attribute vec4 a_position;
attribute vec3 a_color;

uniform mat4 u_matrix;

varying vec3 v_color;

void main() {
  gl_Position = u_matrix * a_position;
  v_color = a_color;
}
`;

const fragmentShaderSource = `
precision highp float;

uniform vec3 u_color;

varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color + u_color, 1);
}
`;

async function setup() {
  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl');

  const oesVaoExt = gl.getExtension('OES_vertex_array_object');
  if (oesVaoExt) {
    gl.createVertexArray = (...args) => oesVaoExt.createVertexArrayOES(...args);
    gl.deleteVertexArray = (...args) => oesVaoExt.deleteVertexArrayOES(...args);
    gl.isVertexArray = (...args) => oesVaoExt.isVertexArrayOES(...args);
    gl.bindVertexArray = (...args) => oesVaoExt.bindVertexArrayOES(...args);
  } else {
    throw new Error('Your browser does not support WebGL ext: OES_vertex_array_object')
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = createProgram(gl, vertexShader, fragmentShader);

  const attributes = {
    position: gl.getAttribLocation(program, 'a_position'),
    color: gl.getAttribLocation(program, 'a_color'),
  };
  const uniforms = {
    matrix: gl.getUniformLocation(program, 'u_matrix'),
    color: gl.getUniformLocation(program, 'u_color'),
  };

  const objects = {};

  { // pModel
    const { attribs, numElements } = createModelBufferArrays();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffers = {};

    // a_position
    buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(
      attributes.position,
      3, // size
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.a_position),
      gl.STATIC_DRAW,
    );

    // a_color
    buffers.color = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);

    gl.enableVertexAttribArray(attributes.color);
    gl.vertexAttribPointer(
      attributes.color,
      3, // size
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.a_color),
      gl.STATIC_DRAW,
    );

    objects.pModel = {
      attribs, numElements,
      vao, buffers,
    };
  }

  { // ball
    const attribs = twgl.primitives.deindexVertices(
      twgl.primitives.createSphereVertices(10, 32, 32)
    );
    const numElements = attribs.position.length / attribs.position.numComponents;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffers = {};

    // a_position
    buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(
      attributes.position,
      3, // size
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.position),
      gl.STATIC_DRAW,
    );

    objects.ball = {
      attribs, numElements,
      vao, buffers,
    };
  }

  { // ground
    const attribs = twgl.primitives.deindexVertices(
      twgl.primitives.createPlaneVertices(1, 1)
    );
    const numElements = attribs.position.length / attribs.position.numComponents;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffers = {};

    // a_position
    buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(
      attributes.position,
      3, // size
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.position),
      gl.STATIC_DRAW,
    );

    objects.ground = {
      attribs, numElements,
      vao, buffers,
    };
  }

  return {
    gl,
    program, attributes, uniforms,
    objects,
    state: {
      fieldOfView: 45 * Math.PI / 180,
      translate: [150, 100, 0],
      rotate: [degToRad(180), degToRad(0), degToRad(0)],
      scale: [1, 1, 1],
      cameraPosition: [250, 0, 400],
      cameraVelocity: [0, 0, 0],
    },
    time: 0,
  };
}

function render(app) {
  const {
    gl,
    program, uniforms,
    objects,
    state,
  } = app;

  gl.canvas.width = gl.canvas.clientWidth;
  gl.canvas.height = gl.canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.useProgram(program);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  const cameraMatrix = matrix4.lookAt(state.cameraPosition, [250, 0, 0], [0, 1, 0]);

  const viewMatrix = matrix4.multiply(
    matrix4.perspective(state.fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 2000),
    matrix4.inverse(cameraMatrix),
  );

  { // pModel
    gl.bindVertexArray(objects.pModel.vao);
    const worldMatrix = matrix4.multiply(
      matrix4.translate(...state.translate),
      matrix4.xRotate(state.rotate[0]),
      matrix4.yRotate(state.rotate[1]),
      matrix4.zRotate(state.rotate[2]),
      matrix4.scale(...state.scale),
    );

    gl.uniformMatrix4fv(
      uniforms.matrix,
      false,
      matrix4.multiply(viewMatrix, worldMatrix),
    );

    gl.uniform3f(uniforms.color, 0, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, objects.pModel.numElements);
  }

  { // ball
    gl.bindVertexArray(objects.ball.vao);

    const worldMatrix = matrix4.multiply(
      matrix4.translate(300, -80, 0),
      matrix4.scale(3, 3, 3),
    );

    gl.uniformMatrix4fv(
      uniforms.matrix,
      false,
      matrix4.multiply(viewMatrix, worldMatrix),
    );

    gl.uniform3f(uniforms.color, 67/255, 123/255, 208/255);

    gl.drawArrays(gl.TRIANGLES, 0, objects.ball.numElements);
  }

  { // ground
    gl.bindVertexArray(objects.ground.vao);

    const worldMatrix = matrix4.multiply(
      matrix4.translate(250, -100, -50),
      matrix4.scale(500, 1, 500),
    );

    gl.uniformMatrix4fv(
      uniforms.matrix,
      false,
      matrix4.multiply(viewMatrix, worldMatrix),
    );

    gl.uniform3f(uniforms.color, 0.5, 0.5, 0.5);

    gl.drawArrays(gl.TRIANGLES, 0, objects.ground.numElements);
  }
}

function startLoop(app, now = 0) {
  const timeDiff = now - app.time;
  app.time = now;

  app.state.cameraPosition[0] += app.state.cameraVelocity[0] * timeDiff;
  app.state.cameraPosition[1] += app.state.cameraVelocity[1] * timeDiff;
  app.state.cameraPosition[2] += app.state.cameraVelocity[2] * timeDiff;
  document.getElementById('camera-position').textContent = (
    `cameraPosition: [${app.state.cameraPosition.map(f => f.toFixed(2)).join(', ')}]`
  );

  render(app, timeDiff);
  requestAnimationFrame(now => startLoop(app, now));
}

async function main() {
  const app = await setup();
  window.app = app;
  window.gl = app.gl;

  const controlsForm = document.getElementById('controls');
  controlsForm.addEventListener('input', () => {
    const formData = new FormData(controlsForm);

    app.state.fieldOfView = parseFloat(formData.get('field-of-view')) * Math.PI / 180;
    app.state.translate[0] = parseFloat(formData.get('translate-x'));
    app.state.translate[1] = parseFloat(formData.get('translate-y'));
    app.state.translate[2] = parseFloat(formData.get('translate-z'));
    app.state.rotate[0] = parseFloat(formData.get('rotation-x')) * Math.PI / 180;
    app.state.rotate[1] = parseFloat(formData.get('rotation-y')) * Math.PI / 180;
    app.state.rotate[2] = parseFloat(formData.get('rotation-z')) * Math.PI / 180;
    app.state.scale[0] = parseFloat(formData.get('scale-x'));
    app.state.scale[1] = parseFloat(formData.get('scale-y'));
    app.state.scale[2] = parseFloat(formData.get('scale-z'));
  });

  document.addEventListener('keydown', event => {
    handleKeyDown(app, event);
  });
  document.addEventListener('keyup', event => {
    handleKeyUp(app, event);
  });

  app.gl.canvas.addEventListener('mousedown', event => {
    handlePointerDown(app, event);
  });
  app.gl.canvas.addEventListener('mouseup', () => {
    handlePointerUp(app);
  });
  app.gl.canvas.addEventListener('touchstart', event => {
    handlePointerDown(app, event.touches[0]);
  });
  app.gl.canvas.addEventListener('touchend', () => {
    handlePointerUp(app);
  });

  startLoop(app);
}
main();

function createModelBufferArrays() {
  // positions
  const a = 40, b = 200, c = 60, d = 45;

  const points = [0, d].flatMap(z => ([
    [0, 0, z], // 0, 13
    [0, b, z],
    [a, b, z],
    [a, 0, z],
    [2*a+c, 0, z], // 4, 17
    [a, a, z],
    [2*a+c, a, z],
    [a, 2*a, z],
    [2*a+c, 2*a, z], // 8, 21
    [a, 3*a, z],
    [2*a+c, 3*a, z],
    [a+c, a, z],
    [a+c, 2*a, z], // 12, 25
  ]));
  const a_position = [
    ...rectVertices(points[0], points[1], points[2], points[3]), // 0
    ...rectVertices(points[3], points[5], points[6], points[4]),
    ...rectVertices(points[7], points[9], points[10], points[8]),
    ...rectVertices(points[11], points[12], points[8], points[6]),
    ...rectVertices(points[13], points[16], points[15], points[14]), // 4
    ...rectVertices(points[16], points[17], points[19], points[18]),
    ...rectVertices(points[20], points[21], points[23], points[22]),
    ...rectVertices(points[24], points[19], points[21], points[25]),
    ...rectVertices(points[0], points[13], points[14], points[1]), // 8
    ...rectVertices(points[0], points[4], points[17], points[13]),
    ...rectVertices(points[4], points[10], points[23], points[17]),
    ...rectVertices(points[9], points[22], points[23], points[10]),
    ...rectVertices(points[9], points[2], points[15], points[22]), // 12
    ...rectVertices(points[2], points[1], points[14], points[15]),
    ...rectVertices(points[5], points[7], points[20], points[18]),
    ...rectVertices(points[5], points[18], points[24], points[11]),
    ...rectVertices(points[11], points[24], points[25], points[12]), // 16
    ...rectVertices(points[7], points[12], points[25], points[20]),
  ];

  // a_color
  const frontColor = [108/255, 225/255, 153/255];
  const backColor = randomColor();
  const a_color = [
    ...rectColor(frontColor), // 0
    ...rectColor(frontColor),
    ...rectColor(frontColor),
    ...rectColor(frontColor),
    ...rectColor(backColor), // 4
    ...rectColor(backColor),
    ...rectColor(backColor),
    ...rectColor(backColor),
    ...rectColor(randomColor()), // 8
    ...rectColor(randomColor()),
    ...rectColor(randomColor()),
    ...rectColor(randomColor()),
    ...rectColor(randomColor()), // 12
    ...rectColor(randomColor()),
    ...rectColor(randomColor()),
    ...rectColor(randomColor()),
    ...rectColor(randomColor()), // 16
    ...rectColor(randomColor()),
  ];

  return {
    numElements: a_position.length / 3,
    attribs: {
      a_position, a_color,
    },
  }
}

function rectVertices(a, b, c, d) {
  return [
    ...a, ...b, ...c,
    ...a, ...c, ...d,
  ];
}

function rectColor(color) {
  return Array(6).fill(color).flat();
}

function randomColor() {
  return [Math.random(), Math.random(), Math.random()];
}

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function handleKeyDown(app, event) {
  switch (event.code) {
    case 'KeyA':
    case 'ArrowLeft':
      app.state.cameraVelocity[0] = -0.5;
      break;
    case 'KeyD':
    case 'ArrowRight':
      app.state.cameraVelocity[0] = 0.5;
      break;
    case 'KeyW':
    case 'ArrowUp':
      app.state.cameraVelocity[1] = 0.5;
      break;
    case 'KeyS':
    case 'ArrowDown':
      app.state.cameraVelocity[1] = -0.5;
      break;
  }
}

function handleKeyUp(app, event) {
  switch (event.code) {
    case 'KeyA':
    case 'ArrowLeft':
    case 'KeyD':
    case 'ArrowRight':
      app.state.cameraVelocity[0] = 0;
      break;
    case 'KeyW':
    case 'ArrowUp':
    case 'KeyS':
    case 'ArrowDown':
      app.state.cameraVelocity[1] = 0;
      break;
  }
}

function handlePointerDown(app, touchOrMouseEvent) {
  const x = touchOrMouseEvent.pageX - app.gl.canvas.width / 2;
  const y = touchOrMouseEvent.pageY - app.gl.canvas.height / 2;

  if (x * x > y * y) {
    if (x > 0) {
      app.state.cameraVelocity[0] = 0.5;
    } else {
      app.state.cameraVelocity[0] = -0.5;
    }
  } else {
    if (y < 0) {
      app.state.cameraVelocity[1] = 0.5;
    } else {
      app.state.cameraVelocity[1] = -0.5;
    }
  }
}

function handlePointerUp(app) {
  app.state.cameraVelocity[0] = 0;
  app.state.cameraVelocity[1] = 0;
  app.state.cameraVelocity[2] = 0;
}