import { createShader, createProgram, loadImage } from './lib/utils.js';

const vertexShaderSource = `
attribute vec2 a_position;

uniform vec2 u_resolution;

void main() {
  gl_Position = vec4(
    a_position / u_resolution * vec2(2, -2) + vec2(-1, 1),
    0, 1
  );
}
`;

const fragmentShaderSource = `
precision mediump float;

void main() {
  gl_FragColor = vec4(0.5, 0.5, 0.5, 1);
}
`;

async function main() {
  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl');
  window.gl = gl;

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = createProgram(gl, vertexShader, fragmentShader);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');

  // a_position
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(
    positionAttributeLocation,
    2, // size
    gl.FLOAT, // type
    false, // normalize
    0, // stride
    0, // offset
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      100, 50, // A
      250, 50, // B
      250, 200, // C

      100, 50, // D
      250, 200, // E
      100, 200, // F
    ]),
    gl.STATIC_DRAW,
  );

  gl.useProgram(program);

  gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

main();