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

  log: matrix => {
    console.group();
    console.log(matrix.slice(0, 4))
    console.log(matrix.slice(4, 8))
    console.log(matrix.slice(8, 12))
    console.log(matrix.slice(12))
    console.groupEnd();
  }
}
