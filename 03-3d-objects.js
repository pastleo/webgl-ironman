import { createShader, createProgram } from './lib/utils.js';
import { matrix4 } from './lib/matrix.js';

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

varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 1);
}
`;

async function setup() {
  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl');

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = createProgram(gl, vertexShader, fragmentShader);

  const attributes = {
    position: gl.getAttribLocation(program, 'a_position'),
    color: gl.getAttribLocation(program, 'a_color'),
  };
  const uniforms = {
    matrix: gl.getUniformLocation(program, 'u_matrix'),
  };

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
    new Float32Array([]),
    gl.STATIC_DRAW,
  );

  // a_color
  buffers.position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

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
    new Float32Array([]),
    gl.STATIC_DRAW,
  );

  return {
    gl,
    program, attributes, uniforms,
    buffers,
    state: {
    },
    time: 0,
  };
}

function render(app) {
  const {
    gl,
    program, uniforms,
    state,
  } = app;

  gl.canvas.width = gl.canvas.clientWidth;
  gl.canvas.height = gl.canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.useProgram(program);

  const viewMatrix = matrix4.identity();
  const worldMatrix = matrix4.identity();

  gl.uniformMatrix4fv(
    uniforms.matrix,
    false,
    matrix4.multiply(viewMatrix, worldMatrix),
  );

  gl.drawArrays(gl.TRIANGLES, 0, 0);
}

// function startLoop(app, now = 0) {
//   const timeDiff = now - app.time;
//   app.time = now;

//   render(app, timeDiff);
//   requestAnimationFrame(now => startLoop(app, now));
// }

async function main() {
  const app = await setup();
  window.app = app;
  window.gl = app.gl;

  const controlsForm = document.getElementById('controls');
  controlsForm.addEventListener('input', () => {
    // const formData = new FormData(controlsForm);
  });

  // startLoop(app);
  render(app);
}
main();