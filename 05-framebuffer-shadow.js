import * as twgl from 'https://unpkg.com/twgl.js@4.19.2/dist/4.x/twgl-full.module.js';
import listenToInputs, { update as inputUpdate } from './lib/input.js';
import { loadImage, degToRad } from './lib/utils.js';
import { matrix4 } from './lib/matrix.js';

const vertexShaderSource = `
attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec4 a_normal;

uniform mat4 u_matrix;
uniform mat4 u_worldMatrix;
uniform mat4 u_normalMatrix;
uniform vec3 u_worldViewerPosition;

varying vec2 v_texcoord;
varying vec3 v_surfaceToViewer;

varying mat3 v_normalMatrix;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = vec2(a_texcoord.x, 1.0 - a_texcoord.y);

  vec3 normal = normalize((u_normalMatrix * a_normal).xyz);
  vec3 normalMatrixI = normal.y >= 1.0 ? vec3(1, 0, 0) : normalize(cross(vec3(0, 1, 0), normal));
  vec3 normalMatrixJ = normalize(cross(normal, normalMatrixI));

  v_normalMatrix = mat3(
    normalMatrixI,
    normalMatrixJ,
    normal
  );

  vec3 worldPosition = (u_worldMatrix * a_position).xyz;
  v_surfaceToViewer = u_worldViewerPosition - worldPosition;
}
`;

const fragmentShaderSource = `
precision highp float;

uniform vec3 u_lightDirection;
uniform vec3 u_ambient;

uniform vec3 u_diffuse;
uniform vec3 u_specular;
uniform float u_specularExponent;
uniform vec3 u_emissive;

uniform sampler2D u_normalMap;
uniform sampler2D u_diffuseMap;

varying vec2 v_texcoord;
varying vec3 v_surfaceToViewer;

varying mat3 v_normalMatrix;

void main() {
  vec3 diffuse = u_diffuse + texture2D(u_diffuseMap, v_texcoord).rgb;
  vec3 ambient = u_ambient * diffuse;
  vec3 normal = texture2D(u_normalMap, v_texcoord).xyz * 2.0 - 1.0;
  normal = normalize(v_normalMatrix * normal);
  vec3 surfaceToLightDirection = normalize(-u_lightDirection);
  float diffuseBrightness = clamp(dot(surfaceToLightDirection, normal), 0.0, 1.0);

  vec3 surfaceToViewerDirection = normalize(v_surfaceToViewer);
  vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewerDirection);
  float specularBrightness = clamp(pow(dot(halfVector, normal), u_specularExponent), 0.0, 1.0);

  gl_FragColor = vec4(
    clamp(
      diffuse * diffuseBrightness +
      u_specular * specularBrightness +
      u_emissive,
      ambient, vec3(1, 1, 1)
    ),
    1
  );
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

  twgl.setAttributePrefix('a_');

  const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);

  const textures = Object.fromEntries(
    await Promise.all(Object.entries({
      scale: 'https://i.imgur.com/IuTNc8Ah.jpg',
      scaleNormal: 'https://i.imgur.com/kWO2b7jh.jpg',
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

  { // null normal texture
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
        127, 127, 255, 255
      ])
    );

    textures.nilNormal = texture;
  }

  const objects = {};

  { // ball
    const attribs = twgl.primitives.createSphereVertices(1, 32, 32);
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, attribs);
    const vao = twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo);

    objects.ball = {
      attribs,
      bufferInfo,
      vao,
    };
  }

  { // ground
    const attribs = twgl.primitives.createPlaneVertices()
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, attribs);
    const vao = twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo);

    objects.ground = {
      attribs,
      bufferInfo,
      vao,
    };
  }

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  return {
    gl,
    programInfo,
    textures, objects,
    state: {
      fieldOfView: degToRad(45),
      cameraRotationXY: [degToRad(-45), 0],
      cameraDistance: 15,
      cameraViewing: [0, 0, 0],
      cameraViewingVelocity: [0, 0, 0],
      lightRotationXY: [0, 0],
    },
    time: 0,
  };
}

function render(app) {
  const {
    gl,
    programInfo,
    textures, objects,
    state,
  } = app;

  gl.canvas.width = gl.canvas.clientWidth;
  gl.canvas.height = gl.canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.useProgram(programInfo.program);

  const cameraMatrix = matrix4.multiply(
    matrix4.translate(...state.cameraViewing),
    matrix4.yRotate(state.cameraRotationXY[1]),
    matrix4.xRotate(state.cameraRotationXY[0]),
    matrix4.translate(0, 0, state.cameraDistance),
  );

  const viewMatrix = matrix4.multiply(
    matrix4.perspective(state.fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 2000),
    matrix4.inverse(cameraMatrix),
  );

  const lightDirection = matrix4.transformVector(
    matrix4.multiply(
      matrix4.yRotate(state.lightRotationXY[1]),
      matrix4.xRotate(state.lightRotationXY[0]),
    ),
    [0, -1, 0, 1],
  ).slice(0, 3);

  twgl.setUniforms(programInfo, {
    u_worldViewerPosition: cameraMatrix.slice(12, 15),
    u_lightDirection: lightDirection,
    u_ambient: [0.4, 0.4, 0.4],
  });

  { // ball
    gl.bindVertexArray(objects.ball.vao);

    const worldMatrix = matrix4.multiply(
      matrix4.translate(0, 0, 0),
      matrix4.scale(1, 1, 1),
    );

    twgl.setUniforms(programInfo, {
      u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
      u_worldMatrix: worldMatrix,
      u_normalMatrix: matrix4.transpose(matrix4.inverse(worldMatrix)),
      u_normalMap: textures.scaleNormal,
      u_diffuse: [0, 0, 0],
      u_diffuseMap: textures.scale,
      u_specular: [1, 1, 1],
      u_specularExponent: 40,
      u_emissive: [0.15, 0.15, 0.15],
    });

    twgl.drawBufferInfo(gl, objects.ball.bufferInfo);
  }

  { // ground
    gl.bindVertexArray(objects.ground.vao);

    const worldMatrix = matrix4.multiply(
      matrix4.translate(0, -1, 0),
      matrix4.scale(10, 1, 10),
    );

    twgl.setUniforms(programInfo, {
      u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
      u_worldMatrix: worldMatrix,
      u_normalMatrix: matrix4.transpose(matrix4.inverse(worldMatrix)),
      u_diffuse: [0, 0, 0],
      u_diffuseMap: textures.nil,
      u_normalMap: textures.nilNormal,
      u_specular: [1, 1, 1],
      u_specularExponent: 200,
      u_emissive: [0, 0, 0],
    });

    twgl.drawBufferInfo(gl, objects.ground.bufferInfo);
  }
}

function startLoop(app, now = 0) {
  const timeDiff = now - app.time;
  app.time = now;

  inputUpdate(app.input, app.state);
  app.state.lightRotationXY[0] = Math.sin(now * 0.0001) * 0.25 * Math.PI;
  app.state.lightRotationXY[1] += timeDiff * 0.0001;

  render(app, timeDiff);
  requestAnimationFrame(now => startLoop(app, now));
}

async function main() {
  const app = await setup();
  window.app = app;
  window.gl = app.gl;

  app.input = listenToInputs(app.gl.canvas, app.state);

  const controlsForm = document.getElementById('controls');
  controlsForm.addEventListener('input', () => {
    // const formData = new FormData(controlsForm);
  });

  startLoop(app);
}
main();
