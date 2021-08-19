export const matrix3 = {
  multiply: (a, b) => ([
    a[0]*b[0] + a[3]*b[1] + a[6]*b[2], /**/ a[1]*b[0] + a[4]*b[1] + a[7]*b[2], /**/ a[2]*b[0] + a[5]*b[1] + a[8]*b[2],
    a[0]*b[3] + a[3]*b[4] + a[6]*b[5], /**/ a[1]*b[3] + a[4]*b[4] + a[7]*b[5], /**/ a[2]*b[3] + a[5]*b[4] + a[8]*b[5],
    a[0]*b[6] + a[3]*b[7] + a[6]*b[8], /**/ a[1]*b[6] + a[4]*b[7] + a[7]*b[8], /**/ a[2]*b[6] + a[5]*b[7] + a[8]*b[8],
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
