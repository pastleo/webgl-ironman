import * as twgl from 'https://unpkg.com/twgl.js@4.19.2/dist/4.x/twgl-full.module.js';
import * as WebGLObjLoader from './vendor/webgl-obj-loader.esm.js';
import listenToInputs, { update as inputUpdate } from './lib/input.js';
import { degToRad } from './lib/utils.js';
import { matrix4 } from './lib/matrix.js';

const vertexShaderSource = `
attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec4 a_normal;

uniform mat4 u_matrix;
uniform mat4 u_worldMatrix;
uniform mat4 u_normalMatrix;
uniform vec3 u_worldViewerPosition;

uniform mat4 u_reflectionMatrix;
uniform mat4 u_lightProjectionMatrix;

varying vec2 v_texcoord;
varying vec3 v_worldSurface;
varying vec3 v_surfaceToViewer;

varying mat3 v_normalMatrix;

varying vec4 v_reflectionTexcoord;
varying float v_depth;
varying vec4 v_lightProjection;

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

  vec4 worldPosition = u_worldMatrix * a_position;
  v_worldSurface = worldPosition.xyz;
  v_surfaceToViewer = u_worldViewerPosition - v_worldSurface;

  v_reflectionTexcoord = u_reflectionMatrix * worldPosition;
  v_depth = gl_Position.z / 2.0 + 0.5;
  v_lightProjection = u_lightProjectionMatrix * worldPosition;
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

uniform sampler2D u_lightProjectionMap;

varying vec2 v_texcoord;
varying vec3 v_surfaceToViewer;

varying mat3 v_normalMatrix;

varying vec4 v_lightProjection;

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

  vec2 lightProjectionCoord = v_lightProjection.xy / v_lightProjection.w * 0.5 + 0.5;
  float lightToSurfaceDepth = v_lightProjection.z / v_lightProjection.w * 0.5 + 0.5;
  float lightProjectedDepth = texture2D(u_lightProjectionMap, lightProjectionCoord).r;

  float occulusion = lightToSurfaceDepth > 0.01 + lightProjectedDepth ? 0.5 : 0.0;

  diffuseBrightness *= 1.0 - occulusion;
  specularBrightness *= 1.0 - occulusion * 2.0;

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

const depthFragmentShaderSource = `
precision highp float;

varying float v_depth;

void main() {
  gl_FragColor = vec4(v_depth, v_depth, v_depth, 1);
}
`;

const oceanFragmentShaderSource = `
precision highp float;

uniform vec3 u_lightDirection;
uniform vec3 u_ambient;

uniform vec3 u_diffuse;
uniform vec3 u_specular;
uniform float u_specularExponent;
uniform vec3 u_emissive;

uniform sampler2D u_normalMap;
uniform sampler2D u_diffuseMap;

uniform sampler2D u_lightProjectionMap;
uniform float u_time;

varying vec2 v_texcoord;
varying vec3 v_worldSurface;
varying vec3 v_surfaceToViewer;

varying mat3 v_normalMatrix;

varying vec4 v_reflectionTexcoord;
varying vec4 v_lightProjection;

void main() {
  vec2 reflectionTexcoord = (v_reflectionTexcoord.xy / v_reflectionTexcoord.w) * 0.5 + 0.5;
  vec3 normal = texture2D(u_normalMap, v_texcoord * 256.0).xyz * 2.0 - 1.0;

  reflectionTexcoord += normal.xy * 0.1;
  vec3 diffuse = u_diffuse + texture2D(u_diffuseMap, reflectionTexcoord).rgb;
  vec3 ambient = u_ambient * diffuse;

  normal = normalize(v_normalMatrix * normal);
  vec3 surfaceToLightDirection = normalize(-u_lightDirection);
  float diffuseBrightness = clamp(dot(surfaceToLightDirection, normal) + 0.5, 0.0, 1.0);

  vec3 surfaceToViewerDirection = normalize(v_surfaceToViewer);
  vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewerDirection);
  float specularBrightness = clamp(pow(dot(halfVector, normal), u_specularExponent), 0.0, 1.0);

  vec2 lightProjectionCoord = v_lightProjection.xy / v_lightProjection.w * 0.5 + 0.5;
  lightProjectionCoord += normal.xy * 0.01;
  float lightToSurfaceDepth = v_lightProjection.z / v_lightProjection.w * 0.5 + 0.5;
  float lightProjectedDepth = texture2D(u_lightProjectionMap, lightProjectionCoord).r;

  float occulusion = lightToSurfaceDepth > 0.01 + lightProjectedDepth ? 0.5 : 0.0;

  diffuseBrightness *= 1.0 - occulusion;
  specularBrightness *= 1.0 - occulusion * 2.0;

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

const skyboxVS = `
attribute vec2 a_position;
uniform mat4 u_matrix;

varying vec3 v_normal;

void main() {
  gl_Position = vec4(a_position, 1, 1);
  v_normal = (u_matrix * gl_Position).xyz;
}`;
const skyboxFS = `
precision highp float;

varying vec3 v_normal;

uniform samplerCube u_skyboxMap;

void main() {
  gl_FragColor = textureCube(u_skyboxMap, normalize(v_normal));
}`;

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

  const webglDepthTexExt = gl.getExtension('WEBGL_depth_texture');
  if (!webglDepthTexExt) {
    throw new Error('Your browser does not support WebGL ext: WEBGL_depth_texture')
  }

  twgl.setAttributePrefix('a_');

  const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);
  const depthProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, depthFragmentShaderSource]);
  const oceanProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, oceanFragmentShaderSource]);
  const skyboxProgramInfo = twgl.createProgramInfo(gl, [skyboxVS, skyboxFS]);

  const textures = twgl.createTextures(gl, {
    oceanNormal: {
      src: 'https://i.imgur.com/eCBtjB8h.jpg',
      min: gl.LINEAR_MIPMAP_LINEAR, mag: gl.LINEAR, crossOrigin: true,
    },
    nil: { src: [0, 0, 0, 255] },
    nilNormal: { src: [127, 127, 255, 255] },
    skybox: {
      target: gl.TEXTURE_CUBE_MAP,
      src: [
        'https://i.imgur.com/vYEUTTe.png',
        'https://i.imgur.com/CQYYFPo.png',
        'https://i.imgur.com/Ol4h1f1.png',
        'https://i.imgur.com/qYV0zv9.png',
        'https://i.imgur.com/uapdS7d.png',
        'https://i.imgur.com/MPL3hRV.png',
      ],
      crossOrigin: true,
    },
  });

  const framebuffers = {};
  framebuffers.reflection = twgl.createFramebufferInfo(gl, null, 2048, 2048);
  textures.reflection = framebuffers.reflection.attachments[0];

  framebuffers.lightProjection = twgl.createFramebufferInfo(gl, [{
    attachmentPoint: gl.DEPTH_ATTACHMENT,
    format: gl.DEPTH_COMPONENT,
  }], 2048, 2048);
  textures.lightProjection = framebuffers.lightProjection.attachments[0];

  const objects = {};

  { // plane
    const attribs = twgl.primitives.createPlaneVertices()
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, attribs);
    const vao = twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo);

    objects.plane = {
      attribs,
      bufferInfo,
      vao,
    };
  }

  { // skybox
    const attribs = twgl.primitives.createXYQuadVertices()
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, attribs);
    const vao = twgl.createVAOFromBufferInfo(gl, skyboxProgramInfo, bufferInfo);

    objects.skybox = {
      attribs,
      bufferInfo,
      vao,
    };
  }

  objects.boat = await loadBoatModel(gl, textures, programInfo);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  return {
    gl,
    programInfo, depthProgramInfo, oceanProgramInfo, skyboxProgramInfo,
    textures, framebuffers, objects,
    state: {
      fieldOfView: degToRad(45),
      cameraRotationXY: [degToRad(-45), 0],
      cameraDistance: 15,
      cameraViewing: [0, 0, 0],
      cameraViewingVelocity: [0, 0, 0],
      lightRotationXY: [0, 0],
      resolutionRatio: 1,
    },
    time: 0,
  };
}

function render(app) {
  const {
    gl,
    framebuffers, textures,
    programInfo, depthProgramInfo, oceanProgramInfo, skyboxProgramInfo,
    state,
  } = app;

  const lightProjectionViewMatrix = matrix4.multiply(
    matrix4.translate(1, -1, 0),
    matrix4.projection(20, 20, 10),
    [ // shearing
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, Math.tan(state.lightRotationXY[0]), 1, 0,
      0, 0, 0, 1,
    ],
    matrix4.inverse(
      matrix4.multiply(
        matrix4.yRotate(state.lightRotationXY[1]),
        matrix4.xRotate(degToRad(90)),
      )
    ),
  );

  const projectionMatrix = matrix4.perspective(state.fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 2000);

  const reflectionCameraMatrix = matrix4.multiply(
    matrix4.translate(...state.cameraViewing),
    matrix4.yRotate(state.cameraRotationXY[1]),
    matrix4.xRotate(-state.cameraRotationXY[0]),
    matrix4.translate(0, 0, state.cameraDistance),
  );
  const inversedReflectionCameraMatrix = matrix4.inverse(reflectionCameraMatrix);
  const reflectionMatrix = matrix4.multiply(projectionMatrix, inversedReflectionCameraMatrix);

  const cameraMatrix = matrix4.multiply(
    matrix4.translate(...state.cameraViewing),
    matrix4.yRotate(state.cameraRotationXY[1]),
    matrix4.xRotate(state.cameraRotationXY[0]),
    matrix4.translate(0, 0, state.cameraDistance),
  );
  const inversedCameraMatrix = matrix4.inverse(cameraMatrix);
  const viewMatrix = matrix4.multiply(projectionMatrix, inversedCameraMatrix);

  const lightDirection = matrix4.transformVector(
    matrix4.multiply(
      matrix4.yRotate(state.lightRotationXY[1]),
      matrix4.xRotate(state.lightRotationXY[0]),
    ),
    [0, -1, 0, 1],
  ).slice(0, 3);

  const globalUniforms = {
    u_worldViewerPosition: cameraMatrix.slice(12, 15),
    u_lightDirection: lightDirection,
    u_lightProjectionMatrix: lightProjectionViewMatrix,
    u_lightProjectionMap: textures.lightProjection,
  }

  { // lightProjection
    gl.useProgram(depthProgramInfo.program);

    twgl.bindFramebufferInfo(gl, framebuffers.lightProjection);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    renderBoat(app, lightProjectionViewMatrix, depthProgramInfo);
    renderOcean(app, lightProjectionViewMatrix, reflectionMatrix, depthProgramInfo);
  }

  gl.useProgram(programInfo.program);
  twgl.setUniforms(programInfo, globalUniforms);

  { // reflection
    twgl.bindFramebufferInfo(gl, framebuffers.reflection);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderBoat(app, reflectionMatrix, programInfo);

    gl.useProgram(skyboxProgramInfo.program);
    renderSkybox(app, projectionMatrix, inversedReflectionCameraMatrix);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  twgl.resizeCanvasToDisplaySize(gl.canvas, state.resolutionRatio);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.useProgram(programInfo.program);

  renderBoat(app, viewMatrix, programInfo);

  gl.useProgram(oceanProgramInfo.program);
  twgl.setUniforms(oceanProgramInfo, globalUniforms);
  renderOcean(app, viewMatrix, reflectionMatrix, oceanProgramInfo);

  gl.useProgram(skyboxProgramInfo.program);
  renderSkybox(app, projectionMatrix, inversedCameraMatrix);
}

function renderBoat(app, viewMatrix, programInfo) {
  const { gl, textures, objects } = app;

  const worldMatrix = matrix4.multiply(
    matrix4.yRotate(degToRad(45)),
    matrix4.translate(0, 0, 0),
    matrix4.scale(1, 1, 1),
  );

  twgl.setUniforms(programInfo, {
    u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
    u_worldMatrix: worldMatrix,
    u_normalMatrix: matrix4.transpose(matrix4.inverse(worldMatrix)),
    u_normalMap: textures.nilNormal,
  });

  objects.boat.forEach(({ bufferInfo, vao, uniforms }) => {
    gl.bindVertexArray(vao);
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, bufferInfo);
  });
}

function renderOcean(app, viewMatrix, reflectionMatrix, programInfo) {
  const { gl, textures, objects, time } = app;

  gl.bindVertexArray(objects.plane.vao);

  const worldMatrix = matrix4.scale(4000, 1, 4000);

  twgl.setUniforms(programInfo, {
    u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
    u_worldMatrix: worldMatrix,
    u_normalMatrix: matrix4.transpose(matrix4.inverse(worldMatrix)),
    u_diffuse: [0, 0, 0],
    u_diffuseMap: textures.reflection,
    u_normalMap: textures.oceanNormal,
    u_specular: [1, 1, 1],
    u_specularExponent: 200,
    u_emissive: [0, 0, 0],
    u_ambient: [0.4, 0.4, 0.4],

    u_reflectionMatrix: reflectionMatrix,
    u_time: time / 1000,
  });

  twgl.drawBufferInfo(gl, objects.plane.bufferInfo);
}

function renderSkybox(app, projectionMatrix, inversedCameraMatrix) {
  const { gl, skyboxProgramInfo, objects, textures } = app;
  gl.bindVertexArray(objects.skybox.vao);

  twgl.setUniforms(skyboxProgramInfo, {
    u_skyboxMap: textures.skybox,
    u_matrix: matrix4.inverse(
      matrix4.multiply(
        projectionMatrix,
        [
          ...inversedCameraMatrix.slice(0, 12),
          0, 0, 0, inversedCameraMatrix[15], // remove translation
        ],
      ),
    ),
  });

  gl.depthFunc(gl.LEQUAL);
  twgl.drawBufferInfo(gl, objects.skybox.bufferInfo);
  gl.depthFunc(gl.LESS); // reset to default
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
    const formData = new FormData(controlsForm);
    app.state.resolutionRatio = parseFloat(formData.get('resolution-ratio'));
  });

  if (window.devicePixelRatio > 1) {
    const retinaOption = document.getElementById('resolution-ratio-retina');
    retinaOption.value = window.devicePixelRatio;
    retinaOption.disabled = false;
  }

  startLoop(app);
}
main();

async function loadBoatModel(gl, textures, programInfo) {
  const { boatModel } = await WebGLObjLoader.downloadModels([{
    name: 'boatModel',
    obj: './assets/my-first-boat.obj',
    mtl: true,
  }]);

  const sharedBufferInfo = twgl.createBufferInfoFromArrays(gl, {
    position: { numComponents: 3, data: boatModel.vertices },
    texcoord: { numComponents: 2, data: boatModel.textures },
    normal: { numComponents: 3, data: boatModel.vertexNormals },
  });

  return boatModel.indicesPerMaterial.map((indices, mtlIdx) => {
    const material = boatModel.materialsByIndex[mtlIdx];

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
      indices,
    }, sharedBufferInfo);

    let u_diffuseMap = textures.nil;
    if (material.mapDiffuse.texture) {
      u_diffuseMap = twgl.createTexture(gl, {
        wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE,
        min: gl.LINEAR_MIPMAP_LINEAR,
        src: material.mapDiffuse.texture,
      });
    }

    return {
      bufferInfo,
      vao: twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo),
      uniforms: {
        u_diffuse: material.diffuse,
        u_diffuseMap,
        u_specular: material.specular,
        u_specularExponent: material.specularExponent,
        u_emissive: material.emissive,
        u_ambient: [0.6, 0.6, 0.6],
      },
    }
  });
}
