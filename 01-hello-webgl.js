const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');
window.gl = gl;

gl.clearColor(108/255, 225/255, 153/255, 1);
gl.clear(gl.COLOR_BUFFER_BIT);
