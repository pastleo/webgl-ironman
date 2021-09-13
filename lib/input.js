import { degToRad } from './utils.js';

const CAMERA_MAX_ROTATION_X = degToRad(-0.5);
const CAMERA_MIN_ROTATION_X = degToRad(-90);

function moveCameraAngle(state, angles) {
  state.cameraRotationXY[0] += angles[0];
  state.cameraRotationXY[1] += angles[1];

  if (state.cameraRotationXY[0] > CAMERA_MAX_ROTATION_X) {
    state.cameraRotationXY[0] = CAMERA_MAX_ROTATION_X;
  } else if (state.cameraRotationXY[0] < CAMERA_MIN_ROTATION_X) {
    state.cameraRotationXY[0] = CAMERA_MIN_ROTATION_X;
  }
}

function moveViewing(state, viewingMove) {
  const dx = viewingMove[0] * Math.cos(-state.cameraRotationXY[1]) - viewingMove[1] * Math.sin(-state.cameraRotationXY[1]);
  const dz = viewingMove[0] * Math.sin(-state.cameraRotationXY[1]) + viewingMove[1] * Math.cos(-state.cameraRotationXY[1]);
  state.cameraViewing[0] += dx * state.cameraDistance / 10;
  state.cameraViewing[2] += dz * state.cameraDistance / 10;
}

function adjCameraDistance(state, delta) {
  state.cameraDistance += delta;
  if (state.cameraDistance > 100) state.cameraDistance = 100;
  else if (state.cameraDistance < 4) state.cameraDistance = 4;
}

export default function listenToInputs(canvas, state) {
  const input = { keyboard: {} };

  document.addEventListener('keydown', event => {
    input.keyboard[event.code] = true;
  });
  document.addEventListener('keyup', event => {
    delete input.keyboard[event.code];
  });

  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('mousedown', event => {
    event.preventDefault();
    if (input.mousedown) return;

    input.mousedown = event.button === 0 ? 'left' : 'else';
    input.mouseCoord = [event.offsetX, event.offsetY];
  });
  canvas.addEventListener('mouseup', () => {
    if (input.mousedown && !input.mousemove && input.mousedown !== 'left') return;

    input.mousedown = false;
    input.mousemove = false;
  });

  canvas.addEventListener('touchstart', event => {
    input.touched = true;
    input.touchCoord = pointerOffset(event.touches[0], canvas);
  });
  canvas.addEventListener('touchend', event => {
    event.preventDefault();

    input.touched = false;
    input.touchmove = false;
    delete input.pitchSq;
  });

  canvas.addEventListener('mousemove', event => {
    if (input.mousedown) {
      const { offsetX, offsetY } = event;
      const [preOffsetX, preOffsetY] = input.mouseCoord;

      if (
        input.mousemove ||
        ((offsetX - preOffsetX) * (offsetX - preOffsetX) + (offsetY - preOffsetY) * (offsetY - preOffsetY)) > 48
      ) {
        input.mousemove = true;
        if (input.mousedown === 'left') {
          moveViewing(state, [(preOffsetX - offsetX) / 100, (preOffsetY - offsetY) / 100]);
        } else {
          moveCameraAngle(state, [(preOffsetY - offsetY) / 100, (preOffsetX - offsetX) / 100])
        }

        input.mouseCoord = [offsetX, offsetY];
      }
    }
  })

  canvas.addEventListener('touchmove', event => {
    if (!input.touched) return;

    const [offsetX, offsetY] = multiTouchOffset(event.touches, canvas);
    const [preOffsetX, preOffsetY] = input.touchCoord;
    input.touchCoord = [offsetX, offsetY];

    if (event.touches.length >= 2) {
      input.touchmove = true;

      if (input.touched !== 'multi') {
        input.touched = 'multi';
      } else {
        moveCameraAngle(state, [(preOffsetY - offsetY) / 100, (preOffsetX - offsetX) / 100])

        if (event.touches.length === 2) {
          const offsets = [pointerOffset(event.touches[0], canvas), pointerOffset(event.touches[1], canvas)];
          const pitchSq = (offsets[0][0] - offsets[1][0]) * (offsets[0][0] - offsets[1][0]) +
            (offsets[0][1] - offsets[1][1]) * (offsets[0][1] - offsets[1][1]);

          if (input.pitchSq) {
            const prePicthSq = input.pitchSq;
            adjCameraDistance(state, (prePicthSq - pitchSq) / 2000);
          }
          input.pitchSq = pitchSq;
        }
      }
    } else if (
      input.touchmove ||
      ((offsetX - preOffsetX) * (offsetX - preOffsetX) + (offsetY - preOffsetY) * (offsetY - preOffsetY)) > 48
    ) {
      input.touchmove = true;

      moveViewing(state, [(preOffsetX - offsetX) / 100, (preOffsetY - offsetY) / 100]);
    }
  });

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  canvas.addEventListener('wheel', event => {
    event.preventDefault();

    if (isMac) {
      const absDeltaY = Math.abs(event.deltaY);
      if (!input.touchpadDetected) {
        if (absDeltaY > 0) {
          input.wheelMinDeltaY = Math.min(absDeltaY, input.wheelMinDeltaY || Infinity);
        }
        if (input.wheelMinDeltaY) {
          const mouseWheelSteps = absDeltaY / input.wheelMinDeltaY;
          if (input.wheelMinDeltaY === 1 || mouseWheelSteps % 1 > 0) {
            input.touchpadDetected = true;
          }
        }
      }
    }

    let distanceDelta = 0, angleDelta = [0, 0];

    if (event.ctrlKey) {
      // touchpad pinch-to-zoom, on chrome, firefox, edge
      // https://kenneth.io/post/detecting-multi-touch-trackpad-gestures-in-javascript
      distanceDelta += event.deltaY / 2;
    } else if (input.touchpadDetected) {
      angleDelta[0] += event.deltaY / 200;
      angleDelta[1] += event.deltaX / 200;
    } else {
      distanceDelta += event.deltaY / 50;
      angleDelta[1] += event.deltaX / 100;
    }

    adjCameraDistance(state, distanceDelta);
    moveCameraAngle(state, angleDelta);
  })

  // non-standard gesture events, only supported in Safari
  // https://kenneth.io/post/detecting-multi-touch-trackpad-gestures-in-javascript
  canvas.addEventListener('gesturestart', event => {
    event.preventDefault();
    input.gestureRotation = event.rotation;
    input.gestureScale = event.scale;
  });
  canvas.addEventListener('gesturechange', event => {
    event.preventDefault();

    if (input.touched) return;

    const preRotation = input.gestureRotation;
    const preScale = input.gestureScale;
    input.gestureRotation = event.rotation;
    input.gestureScale = event.scale;

    moveCameraAngle(state,
      [0, degToRad(input.gestureRotation - preRotation)],
    );
    adjCameraDistance(state, (preScale - input.gestureScale) * 20);
  });

  return input;
}

export function update(input, state) {
  const { keyboard } = input;
  const viewingMove = [0, 0];
  if (keyboard.KeyA || keyboard.ArrowLeft) {
    viewingMove[0] = -0.1;
  } else if (keyboard.KeyD || keyboard.ArrowRight) {
    viewingMove[0] = 0.1;
  } else {
    viewingMove[0] = 0;
  }
  if (keyboard.KeyW || keyboard.ArrowUp) {
    viewingMove[1] = -0.1;
  } else if (keyboard.KeyS || keyboard.ArrowDown) {
    viewingMove[1] = 0.1;
  } else {
    viewingMove[1] = 0;
  }

  moveViewing(state, viewingMove);
}

function pointerOffset(touchOrEvent, canvas) {
  return [touchOrEvent.pageX - canvas.offsetLeft, touchOrEvent.pageY - canvas.offsetTop];
}

function multiTouchOffset(touches, canvas) {
  return Array(touches.length).fill().map(
    (_, i) => pointerOffset(touches[i], canvas)
  ).reduce(
    ([cx, cy], [x, y]) => ([cx + x, cy + y]),
    [0, 0]
  ).map(d => d / touches.length);
}
