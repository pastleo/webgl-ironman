const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');
window.gl = gl;

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

gl.clearColor(108/255, 225/255, 153/255, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (ok) return shader;

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const ok = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (ok) return program;

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

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
void main() {
  gl_FragColor = vec4(0.4745, 0.3333, 0.2823, 1);
}
`;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);

const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');

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
    150, 60,
    180, 82.5,
    120, 82.5,
  ]),
  gl.STATIC_DRAW,
);

gl.useProgram(program);
gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
gl.drawArrays(gl.TRIANGLES, 0, 3);