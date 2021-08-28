export const matrix3 = {
  multiply: (a, b, ...rest) => {
    const multiplication = [
      a[0]*b[0] + a[3]*b[1] + a[6]*b[2], /**/ a[1]*b[0] + a[4]*b[1] + a[7]*b[2], /**/ a[2]*b[0] + a[5]*b[1] + a[8]*b[2],
      a[0]*b[3] + a[3]*b[4] + a[6]*b[5], /**/ a[1]*b[3] + a[4]*b[4] + a[7]*b[5], /**/ a[2]*b[3] + a[5]*b[4] + a[8]*b[5],
      a[0]*b[6] + a[3]*b[7] + a[6]*b[8], /**/ a[1]*b[6] + a[4]*b[7] + a[7]*b[8], /**/ a[2]*b[6] + a[5]*b[7] + a[8]*b[8],
    ];

    if (rest.length === 0) return multiplication;
    return matrix3.multiply(multiplication, ...rest);
  },

  identity: () => ([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ]),

  translate: (x, y) => ([
    1, 0, 0,
    0, 1, 0,
    x, y, 1,
  ]),

  scale: (sx, sy) => ([
    sx, 0,  0,
    0,  sy, 0,
    0,  0,  1,
  ]),

  rotate: rad => {
    const c = Math.cos(rad), s = Math.sin(rad);
    return [
      c, s, 0,
      -s, c, 0,
      0, 0, 1,
    ]
  },

  projection: (width, height) => (
    matrix3.multiply(
      matrix3.translate(-1, 1),
      matrix3.scale(2 / width, -2 / height),
    )
  ),

  log: matrix => {
    console.group();
    console.log(matrix.slice(0, 3))
    console.log(matrix.slice(3, 6))
    console.log(matrix.slice(6, 9))
    console.groupEnd();
  }
}

export const matrix4 = {
  multiply: (a, b, ...rest) => {
    const multiplication = [
      b[0]*a[0] + b[1]*a[4] + b[2]*a[8] + b[3]*a[12],     /**/ b[0]*a[1] + b[1]*a[5] + b[2]*a[9] + b[3]*a[13],     /**/ b[0]*a[2] + b[1]*a[6] + b[2]*a[10] + b[3]*a[14],     /**/ b[0]*a[3] + b[1]*a[7] + b[2]*a[11] + b[3]*a[15],
      b[4]*a[0] + b[5]*a[4] + b[6]*a[8] + b[7]*a[12],     /**/ b[4]*a[1] + b[5]*a[5] + b[6]*a[9] + b[7]*a[13],     /**/ b[4]*a[2] + b[5]*a[6] + b[6]*a[10] + b[7]*a[14],     /**/ b[4]*a[3] + b[5]*a[7] + b[6]*a[11] + b[7]*a[15],
      b[8]*a[0] + b[9]*a[4] + b[10]*a[8] + b[11]*a[12],   /**/ b[8]*a[1] + b[9]*a[5] + b[10]*a[9] + b[11]*a[13],   /**/ b[8]*a[2] + b[9]*a[6] + b[10]*a[10] + b[11]*a[14],   /**/ b[8]*a[3] + b[9]*a[7] + b[10]*a[11] + b[11]*a[15],
      b[12]*a[0] + b[13]*a[4] + b[14]*a[8] + b[15]*a[12], /**/ b[12]*a[1] + b[13]*a[5] + b[14]*a[9] + b[15]*a[13], /**/ b[12]*a[2] + b[13]*a[6] + b[14]*a[10] + b[15]*a[14], /**/ b[12]*a[3] + b[13]*a[7] + b[14]*a[11] + b[15]*a[15],
    ];

    if (rest.length === 0) return multiplication;
    return matrix4.multiply(multiplication, ...rest);
  },

  identity: () => ([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]),

  projection: (width, height, depth) => ([
    2 / width, 0, 0, 0,
    0, -2 / height, 0, 0,
    0, 0, 2 / depth, 0,
    -1, 1, 0, 1,
  ]),

  translate: (tx, ty, tz) => ([
    1,  0,  0,  0,
    0,  1,  0,  0,
    0,  0,  1,  0,
    tx, ty, tz, 1,
  ]),

  scale: (sx, sy, sz) => ([
    sx, 0,  0,  0,
    0,  sy, 0,  0,
    0,  0,  sz, 0,
    0,  0,  0,  1,
  ]),

  xRotate: angleInRadians => {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return [
      1, 0,  0, 0,
      0, c,  s, 0,
      0, -s, c, 0,
      0, 0,  0, 1,
    ]
  },
  yRotate: angleInRadians => {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return [
      c, 0, -s, 0,
      0, 1, 0,  0,
      s, 0, c,  0,
      0, 0, 0,  1,
    ]
  },
  zRotate: angleInRadians => {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return [
      c,  s, 0, 0,
      -s, c, 0, 0,
      0,  0, 1, 0,
      0,  0, 0, 1,
    ]
  },

  perspective: (fieldOfView, aspect, near, far) => {
    const f = Math.tan(Math.PI / 2 - fieldOfView / 2);
    const rangeInv = 1.0 / (near - far);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, far * near * rangeInv * 2, 0,
    ]
  },

  lookAt: (cameraPosition, target, up) => {
    const kHat = matrix4.normalize(
        matrix4.subtractVectors(cameraPosition, target)
    );
    const iHat = matrix4.normalize(matrix4.cross(up, kHat));
    const jHat = matrix4.normalize(matrix4.cross(kHat, iHat));

    return [
      iHat[0], iHat[1], iHat[2], 0,
      jHat[0], jHat[1], jHat[2], 0,
      kHat[0], kHat[1], kHat[2], 0,
      cameraPosition[0],
      cameraPosition[1],
      cameraPosition[2],
      1,
    ];
  },

  subtractVectors: (a, b) => ([
    a[0] - b[0], a[1] - b[1], a[2] - b[2]
  ]),
  cross: (a, b) => ([
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]),
  normalize: v => {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    // make sure we don't divide by 0.
    if (length > 0.00001) {
      return [v[0] / length, v[1] / length, v[2] / length];
    } else {
      return [0, 0, 0];
    }
  },
  inverse: m => {
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m03 = m[0 * 4 + 3];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m13 = m[1 * 4 + 3];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const m23 = m[2 * 4 + 3];
    const m30 = m[3 * 4 + 0];
    const m31 = m[3 * 4 + 1];
    const m32 = m[3 * 4 + 2];
    const m33 = m[3 * 4 + 3];
    const tmp_0  = m22 * m33;
    const tmp_1  = m32 * m23;
    const tmp_2  = m12 * m33;
    const tmp_3  = m32 * m13;
    const tmp_4  = m12 * m23;
    const tmp_5  = m22 * m13;
    const tmp_6  = m02 * m33;
    const tmp_7  = m32 * m03;
    const tmp_8  = m02 * m23;
    const tmp_9  = m22 * m03;
    const tmp_10 = m02 * m13;
    const tmp_11 = m12 * m03;
    const tmp_12 = m20 * m31;
    const tmp_13 = m30 * m21;
    const tmp_14 = m10 * m31;
    const tmp_15 = m30 * m11;
    const tmp_16 = m10 * m21;
    const tmp_17 = m20 * m11;
    const tmp_18 = m00 * m31;
    const tmp_19 = m30 * m01;
    const tmp_20 = m00 * m21;
    const tmp_21 = m20 * m01;
    const tmp_22 = m00 * m11;
    const tmp_23 = m10 * m01;

    const t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
             (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    const t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
             (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    const t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
             (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    const t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
             (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    const d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
      d * t0,
      d * t1,
      d * t2,
      d * t3,
      d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
           (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
           (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
           (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
           (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
           (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
           (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
           (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
           (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
           (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
           (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
           (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
           (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02)),
    ];
  },

  log: matrix => {
    console.group();
    console.log(matrix.slice(0, 4))
    console.log(matrix.slice(4, 8))
    console.log(matrix.slice(8, 12))
    console.log(matrix.slice(12))
    console.groupEnd();
  },
}
