export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (ok) return shader;

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

export function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const ok = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (ok) return program;

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

export async function loadImage(url) {
  return new Promise(resolve => {
    const image = new Image();

    // CROSS_ORIGIN
    // https://webgl2fundamentals.org/webgl/lessons/webgl-cors-permission.html
    if ((new URL(url)).host !== location.host) {
      image.crossOrigin = '';
    }

    image.onload = function() {
      resolve(image);
    };
    image.src = url;
  })
}

export function degToRad(deg) {
  return deg * Math.PI / 180;
}
