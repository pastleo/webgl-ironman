import * as twgl from 'https://unpkg.com/twgl.js@4.19.2/dist/4.x/twgl-full.module.js';
import { loadImage } from './lib/utils.js';
import { matrix4 } from './lib/matrix.js';

const vertexShaderSource = `
attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec4 a_normal;

uniform mat4 u_matrix;
uniform mat4 u_normalMatrix;

varying vec2 v_texcoord;
varying vec3 v_normal;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = vec2(a_texcoord.x, 1.0 - a_texcoord.y);
  v_normal = (u_normalMatrix * a_normal).xyz;
}
`;

const fragmentShaderSource = `
precision highp float;

uniform vec3 u_diffuse;
uniform sampler2D u_texture;
uniform vec3 u_lightDir;

varying vec2 v_texcoord;
varying vec3 v_normal;

void main() {
  vec3 diffuse = u_diffuse + texture2D(u_texture, v_texcoord).rgb;
  vec3 normal = normalize(v_normal);
  vec3 surfaceToLightDir = normalize(-u_lightDir);
  float diffuseBrightness = clamp(dot(surfaceToLightDir, normal), 0.0, 1.0);
  gl_FragColor = vec4(diffuse * diffuseBrightness, 1);
}
`;

const CAMERA_MOVE_SPEED = 0.005;

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

  const program = twgl.createProgram(gl, [vertexShaderSource, fragmentShaderSource]);

  const attributes = {
    position: gl.getAttribLocation(program, 'a_position'),
    texcoord: gl.getAttribLocation(program, 'a_texcoord'),
    normal: gl.getAttribLocation(program, 'a_normal'),
  };
  const uniforms = {
    matrix: gl.getUniformLocation(program, 'u_matrix'),
    normalMatrix: gl.getUniformLocation(program, 'u_normalMatrix'),
    diffuse: gl.getUniformLocation(program, 'u_diffuse'),
    texture: gl.getUniformLocation(program, 'u_texture'),
    lightDir: gl.getUniformLocation(program, 'u_lightDir'),
  };

  const textures = Object.fromEntries(
    await Promise.all(Object.entries({
      wood: 'https://i.imgur.com/SJdQ7Twh.jpg',
      steel: 'https://i.imgur.com/vqKuF5Ih.jpg',
    }).map(async ([name, url]) => {
      const image = await loadImage(url);
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0, // level
        gl.RGB, // internalFormat
        gl.RGB, // format
        gl.UNSIGNED_BYTE, // type
        image, // data
      );

      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

      return [name, texture];
    }))
  );

  { // null texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0, // level
      gl.RGBA, // internalFormat
      1, // width
      1, // height
      0, // border
      gl.RGBA, // format
      gl.UNSIGNED_BYTE, // type
      new Uint8Array([
        0, 0, 0, 255
      ])
    );

    textures.nil = texture;
  }

  const objects = {};

  { // ball
    const attribs = twgl.primitives.createSphereVertices(1, 32, 32);
    const numElements = attribs.indices.length;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffers = {};

    // a_position
    buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(
      attributes.position,
      attribs.position.numComponents, // size
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

    // a_texcoord
    buffers.texcoord = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoord);

    gl.enableVertexAttribArray(attributes.texcoord);
    gl.vertexAttribPointer(
      attributes.texcoord,
      attribs.texcoord.numComponents, // size
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.texcoord),
      gl.STATIC_DRAW,
    );

    // a_normal
    buffers.normal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);

    gl.enableVertexAttribArray(attributes.normal);
    gl.vertexAttribPointer(
      attributes.normal,
      attribs.normal.numComponents, // size
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.normal),
      gl.STATIC_DRAW,
    );

    // indices
    buffers.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, attribs.indices, gl.STATIC_DRAW);

    objects.ball = {
      attribs, numElements,
      vao, buffers,
    };
  }

  { // ground
    const attribs = twgl.primitives.createPlaneVertices()
    const numElements = attribs.indices.length;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffers = {};

    // a_position
    buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(
      attributes.position,
      attribs.position.numComponents, // size
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

    // a_texcoord
    buffers.texcoord = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoord);

    gl.enableVertexAttribArray(attributes.texcoord);
    gl.vertexAttribPointer(
      attributes.texcoord,
      attribs.texcoord.numComponents, // size
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.texcoord),
      gl.STATIC_DRAW,
    );

    // a_normal
    buffers.normal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);

    gl.enableVertexAttribArray(attributes.normal);
    gl.vertexAttribPointer(
      attributes.normal,
      attribs.normal.numComponents, // size
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.normal),
      gl.STATIC_DRAW,
    );

    // indices
    buffers.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, attribs.indices, gl.STATIC_DRAW);

    objects.ground = {
      attribs, numElements,
      vao, buffers,
    };
  }

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  return {
    gl,
    program, attributes, uniforms,
    textures, objects,
    state: {
      fieldOfView: degToRad(45),
      lightDir: [0, -1, 0],
      cameraPosition: [0, 0, 8],
      cameraVelocity: [0, 0, 0],
    },
    time: 0,
  };
}

function render(app) {
  const {
    gl,
    program, uniforms,
    textures, objects,
    state,
  } = app;

  gl.canvas.width = gl.canvas.clientWidth;
  gl.canvas.height = gl.canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.useProgram(program);

  const cameraMatrix = matrix4.lookAt(state.cameraPosition, [0, 0, 0], [0, 1, 0]);

  const viewMatrix = matrix4.multiply(
    matrix4.perspective(state.fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 2000),
    matrix4.inverse(cameraMatrix),
  );

  gl.uniform3f(uniforms.lightDir, ...state.lightDir);

  const textureUnit = 0;

  { // ball
    gl.bindVertexArray(objects.ball.vao);

    const worldMatrix = matrix4.multiply(
      matrix4.translate(0, 0, 0),
      matrix4.scale(1, 1, 1),
    );

    gl.uniformMatrix4fv(
      uniforms.matrix,
      false,
      matrix4.multiply(viewMatrix, worldMatrix),
    );

    gl.uniformMatrix4fv(
      uniforms.normalMatrix,
      false,
      matrix4.transpose(matrix4.inverse(worldMatrix)),
    );

    gl.uniform3f(uniforms.diffuse, 0, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, textures.steel);
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.uniform1i(uniforms.texture, textureUnit);

    gl.drawElements(gl.TRIANGLES, objects.ball.numElements, gl.UNSIGNED_SHORT, 0);
  }

  { // ground
    gl.bindVertexArray(objects.ground.vao);

    const worldMatrix = matrix4.multiply(
      matrix4.translate(0, -1, 0),
      matrix4.scale(10, 1, 10),
    );

    gl.uniformMatrix4fv(
      uniforms.matrix,
      false,
      matrix4.multiply(viewMatrix, worldMatrix),
    );

    gl.uniformMatrix4fv(
      uniforms.normalMatrix,
      false,
      matrix4.transpose(matrix4.inverse(worldMatrix)),
    );

    gl.uniform3f(uniforms.diffuse, 0, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, textures.wood);
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.uniform1i(uniforms.texture, textureUnit);

    gl.drawElements(gl.TRIANGLES, objects.ground.numElements, gl.UNSIGNED_SHORT, 0);
  }
}

function startLoop(app, now = 0) {
  const timeDiff = now - app.time;
  app.time = now;

  app.state.cameraPosition[0] += app.state.cameraVelocity[0] * timeDiff;
  app.state.cameraPosition[1] += app.state.cameraVelocity[1] * timeDiff;
  app.state.cameraPosition[2] += app.state.cameraVelocity[2] * timeDiff;

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

    app.state.lightDir[0] = parseFloat(formData.get('light-dir-x'));
    app.state.lightDir[1] = parseFloat(formData.get('light-dir-y'));
    app.state.lightDir[2] = parseFloat(formData.get('light-dir-z'));
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

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function handleKeyDown(app, event) {
  switch (event.code) {
    case 'KeyA':
    case 'ArrowLeft':
      app.state.cameraVelocity[0] = -CAMERA_MOVE_SPEED;
      break;
    case 'KeyD':
    case 'ArrowRight':
      app.state.cameraVelocity[0] = CAMERA_MOVE_SPEED;
      break;
    case 'KeyW':
    case 'ArrowUp':
      app.state.cameraVelocity[1] = CAMERA_MOVE_SPEED;
      break;
    case 'KeyS':
    case 'ArrowDown':
      app.state.cameraVelocity[1] = -CAMERA_MOVE_SPEED;
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
      app.state.cameraVelocity[0] = CAMERA_MOVE_SPEED;
    } else {
      app.state.cameraVelocity[0] = -CAMERA_MOVE_SPEED;
    }
  } else {
    if (y < 0) {
      app.state.cameraVelocity[1] = CAMERA_MOVE_SPEED;
    } else {
      app.state.cameraVelocity[1] = -CAMERA_MOVE_SPEED;
    }
  }
}

function handlePointerUp(app) {
  app.state.cameraVelocity[0] = 0;
  app.state.cameraVelocity[1] = 0;
  app.state.cameraVelocity[2] = 0;
}
