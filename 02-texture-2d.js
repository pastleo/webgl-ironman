import { createShader, createProgram, loadImage } from './lib/utils.js';

const vertexShaderSource = `
attribute vec2 a_position;
attribute vec2 a_texcoord;

uniform vec2 u_resolution;

varying vec2 v_texcoord;

void main() {
  gl_Position = vec4(
    a_position / u_resolution * vec2(2, -2) + vec2(-1, 1),
    0, 1
  );
  v_texcoord = a_texcoord;
}
`;

const fragmentShaderSource = `
precision mediump float;

varying vec2 v_texcoord;

uniform sampler2D u_texture;

void main() {
  gl_FragColor = texture2D(u_texture, v_texcoord);
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
    texcoord: gl.getAttribLocation(program, 'a_texcoord'),
  };
  const uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    texture: gl.getUniformLocation(program, 'u_texture'),
  };

  // const image = await loadImage('https://i.imgur.com/ISdY40yh.jpg');
  // const image = await loadImage('https://i.imgur.com/vryPVknh.jpg');
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // gl.texImage2D(
  //   gl.TEXTURE_2D,
  //   0, // level
  //   gl.RGB, // internalFormat
  //   gl.RGB, // format
  //   gl.UNSIGNED_BYTE, // type
  //   image, // data
  // );

  const whiteColor = [255, 255, 255, 255];
  const blackColor = [0, 0, 0, 255];
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    2, // width
    2, // height
    0, // border
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    new Uint8Array([
      ...whiteColor, ...blackColor,
      ...blackColor, ...whiteColor,
    ])
  );

  // gl.generateMipmap(gl.TEXTURE_2D);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  const buffers = {};

  // a_position
  buffers.position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

  gl.enableVertexAttribArray(attributes.position);
  gl.vertexAttribPointer(
    attributes.position,
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

  // a_texcoord
  buffers.texcoord = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoord);

  gl.enableVertexAttribArray(attributes.texcoord);
  gl.vertexAttribPointer(
    attributes.texcoord,
    2, // size
    gl.FLOAT, // type
    false, // normalize
    0, // stride
    0, // offset
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0, 0, // A
      8, 0, // B
      8, 8, // C

      0, 0, // D
      8, 8, // E
      0, 8, // F
    ]),
    gl.STATIC_DRAW,
  );

  return {
    gl,
    program, attributes, uniforms,
    buffers, texture,
  };
}

function render(app) {
  const {
    gl,
    program, uniforms,
    texture,
  } = app;

  gl.canvas.width = gl.canvas.clientWidth;
  gl.canvas.height = gl.canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.useProgram(program);

  gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height);

  // texture uniform
  const textureUnit = 0;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.uniform1i(uniforms.texture, textureUnit);
  
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

async function main() {
  const app = await setup();
  window.app = app;
  window.gl = app.gl;

  render(app);
}

main();