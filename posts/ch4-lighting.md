---
tags: webgl, ironman, post
---

CH4: Lighting [WebGL 鐵人]
===

## Day 17: Normals & Lighting

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 17 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

在這個章節中將會加入『光』的元素，使得物體在有光照射的時候才會有顏色，並利用上個章節提到的 [twgl](https://twgljs.org/docs/index.html) 讓程式碼可以寫的比較愉快，最後加入反射光的計算，使得渲染的成像更真實一些

### `04-lighting.html` / `04-lighting.js`

這個章節使用新的一組 `.html` / `.js` 作為開始，完整程式碼可以在這邊找到：[github.com/pastleo/webgl-ironman/commit/2d72d48](https://github.com/pastleo/webgl-ironman/commit/2d72d48e66e41a968c65b4870c1cfb8391157710)，這次的起始點跑起來就有一個木質地板跟一顆球：

![start-point-screenshot](https://i.imgur.com/qqlb60i.png)

> 雖然是 CC0，不過筆者還是標注一下好了，這個場景中使用到的 texture 是在 [opengameart.org](https://opengameart.org) 找到的：[Commission - Medieval](https://opengameart.org/content/commission-medieval), [2048² wooden texture](https://opengameart.org/content/2048%C2%B2-wooden-texture)

需要複習『在 WebGL 裡頭使用圖片 (texture) 進行繪製』的話，請參考 [Day 6](https://ithelp.ithome.com.tw/articles/10260664) 的內容，在這個起始點也拿 [Day 14](https://ithelp.ithome.com.tw/articles/10263716) 實做的相機控制過來，完整的 live 版本在此：

[https://static.pastleo.me/webgl-ironman/commits/2d72d48e66e41a968c65b4870c1cfb8391157710/04-lighting.html](https://static.pastleo.me/webgl-ironman/commits/2d72d48e66e41a968c65b4870c1cfb8391157710/04-lighting.html)

目前木質地板與球只是按照原本 texture 上的顏色進行繪製，本篇的目標是加入一個從無限遠的地方照射過來的白色平行光 (directional light)，並且在物體表面計算『[散射 (diffuse)](https://zh.wikipedia.org/wiki/%E6%BC%AB%E5%8F%8D%E5%B0%84)』之後從任意角度觀察到的顏色，在[維基百科上的這張圖](https://en.wikipedia.org/wiki/Diffuse_reflection#/media/File:Lambert2.gif)表示了散射光的方向：

![wiki-diffuse-light](https://upload.wikimedia.org/wikipedia/commons/b/bd/Lambert2.gif)

### 法向量 Normal

因為是白光，所以散射之後的顏色其實就是原本的顏色經過一個明暗度的處理，而明暗度要怎麼計算呢？筆者畫了下方的意示圖嘗試解釋，首先，如果是在光照不到的區域，像是紅色面，與光平行或是背對著光，那麼就會是全黑；被照射到的區域，如綠色與藍色面，因為一個單位的光通量在與垂直的面上可以形成較小的區域（在綠色面上的橘色線段較藍色面短），一個單位的面積獲得的光通量就比較高，因此綠色面比藍色面來的更亮

![directional-diffuse](https://static.pastleo.me/assets/day17-directional-diffuse-210903233209.svg)

總和以上，入射角越垂直面接近[法向量](https://zh.wikipedia.org/wiki/%E6%B3%95%E7%BA%BF)，明暗度越高，不過在 fragment shader 內，把向量算回角度再做比較會太傷本，我們可以取光方向反向的[單位向量](https://zh.wikipedia.org/wiki/%E5%8D%95%E4%BD%8D%E5%90%91%E9%87%8F)，再與法向量（也必須是單位向量）做[內積](https://zh.wikipedia.org/wiki/%E7%82%B9%E7%A7%AF)，這樣一來會得到 -1 ~ +1 之間的值表示明暗度；幸好 [`twgl.primitives`](https://twgljs.org/docs/module-twgl_primitives.html) 產生的資料不只有 position, texcoord，還有 normal，也就是法向量，場景中的球以及地板都是使用 TWGL 生成的，這邊就先來把 normal 傳入 vertex shader 內：

```diff=
 const vertexShaderSource = `
 attribute vec4 a_position;
 attribute vec2 a_texcoord;
+attribute vec4 a_normal;
 // ...
 void main() {
   // ...
 }
 `;

 const attributes = {
   // ...
+  normal: gl.getAttribLocation(program, 'a_normal'),
 };
```

```javascript=
async function setup() {
  // ...
  { // both ball and ground
    // ...
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
    // ...
  }
  // ...
}
```

### 法向量的旋轉

計算明暗度會在面投影到螢幕的每個 pixel 上進行，也就是 fragment shader，vertex shader 主要的工作是把 `a_normal` pass 到 fragment shader，但是有一個問題：物體會旋轉，我們讓頂點的位置透過 `u_matrix` 做 transform，假設有一個物體轉了 90 度，那麼法向量也應該一起轉 90 度才對

但是我們不能直接讓 `a_normal` 與 `u_matrix` 相乘得到旋轉後的結果，不僅因為 `u_matrix` 可能包含了平移、縮放資訊，還有投影到螢幕上的 transform，因此要多傳送一個矩陣，這個矩陣只包含了 `worldMatrix` （物件本身的 transform 矩陣）的旋轉。至於從 `worldMatrix` 中抽取只包含旋轉的矩陣，在下面這兩個網頁中有一些數學方法導出接下來的公式：

* [https://en.wikipedia.org/wiki/Normal_(geometry)#Transforming_normals](https://en.wikipedia.org/wiki/Normal_(geometry)#Transforming_normals)
* [https://paroj.github.io/gltut/Illumination/Tut09%20Normal%20Transformation.html](https://paroj.github.io/gltut/Illumination/Tut09%20Normal%20Transformation.html)

筆者嘗試理解並統整成[這份筆記](https://static.pastleo.me/assets/day17-transform-normal-210904003536.pdf)，結論是：把 `worldMatrix` 取反矩陣，再取[轉置矩陣](https://zh.wikipedia.org/wiki/%E8%BD%AC%E7%BD%AE%E7%9F%A9%E9%98%B5)，就可以得到 transform 法向量用的矩陣 -- 也就是只包含旋轉的 `worldMatrix`

在 `lib/matrix.js` 中已經有 `matrix4.inverse()`，要補的是 `matrix4.transpose()`，根據其定義，實做並不難：

```javascript=
export const matrix4 = {
  // ...
  transpose: m => {
    return [
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15],
    ];
  },
  // ...
}
```

假設待會實做在 vertex shader 內轉換 normal 的矩陣叫做 `u_normalMatrix`，在 `setup()` 中先取得 `uniform` 位置：

```javascript=
async function setup() {
  // ...
  const uniforms = {
    // ...
    normalMatrix: gl.getUniformLocation(program, 'u_normalMatrix'),
    // ...
  };
  // ...
}
```

在 `render()` 這邊計算物件的 `worldMatrix` 後，依照上面講的公式實做計算 `u_normalMatrix`:

```javascript=
function render(app) {
  // ...
  { // both ball and ground
    // const worldMatrix = matrix4.multiply( ... )
    gl.uniformMatrix4fv(
      uniforms.normalMatrix,
      false,
      matrix4.transpose(matrix4.inverse(worldMatrix)),
    );
  }
  // ...
}
```

在 vertex shader 內就可以直接相乘，並透過 varying `v_normal` 傳送到 fragment shader:

```diff=
 attribute vec4 a_position;
 attribute vec2 a_texcoord;
+attribute vec4 a_normal;
  
 uniform mat4 u_matrix;
+uniform mat4 u_normalMatrix;
  
 varying vec2 v_texcoord;
+varying vec3 v_normal;
  
 void main() {
   gl_Position = u_matrix * a_position;
   v_texcoord = vec2(a_texcoord.x, 1.0 - a_texcoord.y);
+  v_normal = (u_normalMatrix * a_normal).xyz;
 }
```

### 計算散射亮度 Diffuse

為了方便調整光線方向觀察不同方向的成像，筆者加入 uniform `u_lightDir`，並且一開始讓他直直向下(-y 方向) 照射：

```javascript=
async function setup() {
  // ...
  const uniforms = {
    // ...
    lightDir: gl.getUniformLocation(program, 'u_lightDir'),
    // ...
  };
  // ...
  
  return {
    // ...
    state: {
      // ...
      lightDir: [0, -1, 0],
    },
  };
}
```

因為整個場景的光線方向都是固定的，因此在 `render()` 物件以外的範圍設定 `u_lightDir`:

```javascript=
function render(app) {
  // ...
  gl.uniform3f(uniforms.lightDir, ...state.lightDir);
  // ...
}
```

最後終於可以來寫 fragment shader 實做計算明暗度計算：

```c=
precision highp float;

uniform vec3 u_color;
uniform sampler2D u_texture;
uniform vec3 u_lightDir;

varying vec2 v_texcoord;
varying vec3 v_normal;

void main() {
  vec3 color = u_color + texture2D(u_texture, v_texcoord).rgb;
  vec3 normal = normalize(v_normal);
  vec3 surfaceToLightDir = normalize(-u_lightDir);
  float colorLight = clamp(dot(surfaceToLightDir, normal), 0.0, 1.0);
  gl_FragColor = vec4(color * colorLight, 1);
}
```

`main()` 的第 2 行使用 [glsl 內建的 normalize function](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/normalize.xhtml) 計算 `v_normal` 的單位向量，因為從 vertex shader 過來的 varying 經過『補間』處理可能導致不是單位向量，第 13 行計算『表面到光源』的方向，同樣使之為單位向量

`main()` 的第 4 行大概就是本篇最關鍵的一行，如同上方講的使用 [glsl 的內積 function](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/dot.xhtml) 計算明暗度：`dot(surfaceToLightDir, normal)` ，不過為了避免數值跑到負的，再套上 [glsl 的 clamp](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/clamp.xhtml) 把範圍限制在 0~1 之間，最後乘上原本的顏色 `color`，把明暗度套用上去，存檔重整後：

![directional-light-applied](https://i.imgur.com/H8ct0vR.png)

筆者稍微把視角往右上角調整了一下，可以看到球體的因為向著正下方的光線，只有上方比較亮，而地板因為原本就是向上的，所以就沒有變化

到了這邊其實應該把 `color` 改名成 `diffuse`，因為一個物體其實可以分成不同種類的光對其表面產生的顏色，今天實做的是散射光，之後還會有反射光、自發光等；同時筆者也加上光線方向的使用者控制，完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/407adda](https://github.com/pastleo/webgl-ironman/commit/407adda1739a431146abaa78fea6db61a483a933)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/407adda1739a431146abaa78fea6db61a483a933/04-lighting.html)

光源方向調整起來像是這樣：

![adjusting-light-dir](https://i.imgur.com/zCGNnQw.gif)

---

## Day 18: Indexed Element、請 TWGL 替程式碼減肥

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 18 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。繪製出簡易的 3D 場景後，本章節加入光照效果使得成像更加真實，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

筆者在練習寫 WebGL 嘗試自己建立一些 vertice 資料時，因為必須以三角形頂點為單位，輸入的資料會有不少重複部份，顯然有些浪費記憶體；同時，實做出的程式碼中也會有許多重複的部份，最明顯的應該屬 `setup()` 中對於每個物件、每個 attribute 進行 `gl.createBuffer()`, `gl.vertexAttribPointer()` 到 `gl.bufferData()`。在之前 attribute 還不算太多時還可以接受，但是加入 [Day 17](https://ithelp.ithome.com.tw/articles/10265910) 為了與光線運算的 normal (法向量) 後，筆者覺得開始覺得是時候正視並處理這兩個問題，因此本篇將使用 indexed element 的功能來減少記憶體的消耗、[TWGL](https://twgljs.org/docs/index.html) 使得重複的程式可以更簡短

### Indexed Element

在 [Day 15](https://ithelp.ithome.com.tw/articles/10264281) 有簡短提過這個，不過礙於篇幅可能沒有敘述得很完整，這邊筆者舉一個範例，如果我們要繪製這樣的正方形，各個點的座標以及分成的三角形如下：

![indexd-element-example](https://static.pastleo.me/assets/210905155406.svg)

至今以來的繪製方法都是讓輸入的每個 attribute buffer 都以三角形頂點為單位輸入，雖然這邊只有 4 個點，但是我們必須輸入 6 個頂點，像是這樣：

![without-indexed-element-buffer](https://static.pastleo.me/assets/210905160303.svg)

光是這樣就可以明顯看到有兩組資料是完全重複的，在複雜的 3D 物件中很可能會有更多重複的資料造成記憶體的浪費，因此 WebGL 提供另一種繪製模式 [`gl.drawElements()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements) 透過一個叫做 `ELEMENT_ARRAY_BUFFER` （下圖中的 `element index buffer`）的 buffer 當成指標，每次 vertex shader 執行時取得的所有 attribute 將變成指標所指向的那組資料，以這個正方形舉例的話，所需要傳送的 buffer 以及示意圖如下：

![indexd-element-buffers](https://static.pastleo.me/assets/210905162158.svg)

### 改用 Indexed Element

之前不想要用 indexed element 功能，因此使用 `twgl.primitives.deindexVertices()` 展開 `twgl.primitives` 產生的頂點資料，現在可以不用展開了：

```diff=
 async function setup() {
   { // both ball and ground
-    const attribs = twgl.primitives.deindexVertices(
-      twgl.primitives.createXXXVertices(/* ... */)
-    );
-    const numElements = attribs.position.length / attribs.position.numComponents;
+    const attribs = twgl.primitives.createXXXVertices(/* ... */);
+    const numElements = attribs.indices.length;
     const vao = gl.createVertexArray();
     gl.bindVertexArray(vao);
     // ...
   }
   // ...
 }
```

並且把 `attribs.indices` 輸入 `ELEMENT_ARRAY_BUFFER`:

```javascript=
async function setup() {
  // ...
  { // both ball and ground
    // ...

    // indices
    buffers.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, attribs.indices, gl.STATIC_DRAW);
    
    // ...
  }
  // ...
}
```

最後把 `gl.drawArrays()` 直接使用 buffer 的繪製模式改用 `gl.drawElements()`:

```diff=
 async function setup() {
   // ...
   { // ball
     // ...
-    gl.drawArrays(gl.TRIANGLES, 0, objects.ball.numElements);
+    gl.drawElements(gl.TRIANGLES, objects.ball.numElements, gl.UNSIGNED_SHORT, 0);
   }
   // ...
   { // ground
     // ...
-    gl.drawArrays(gl.TRIANGLES, 0, objects.ground.numElements);
+    gl.drawElements(gl.TRIANGLES, objects.ground.numElements, gl.UNSIGNED_SHORT, 0);
   }
 }
```

這邊可以看到 `gl.drawElements()` 的第三個參數給 `gl.UNSIGNED_SHORT`，表示 `ELEMENT_ARRAY_BUFFER` 也就是 `attribs.indices` 的格式：`Uint16Array`。改完重整後沒有變化、沒有錯誤的話就對了，到此進度的程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/c1b9e69](https://github.com/pastleo/webgl-ironman/commit/c1b9e69b1ca898c68b3ab702c9b0f75dc0900fe5)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/c1b9e69b1ca898c68b3ab702c9b0f75dc0900fe5/04-lighting.html)

### 使用 TWGL 建立 `programInfo`、設定 uniforms

事實上，WebGL 有提供 API 來列舉、取得 GLSL program 中的 [attribute](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getActiveAttrib) 以及 [uniform](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getActiveUniform) 資訊，因此先前寫的 `gl.getAttribLocation()` / `gl.getUniformLocation()` 是可以被自動化的，這個自動化在 TWGL 中已經幫我們實做於 [`twgl.createProgramInfo()`](https://twgljs.org/docs/module-twgl.html#.createProgramInfo)，看看他回傳的結果：

```javascript=
console.log(
  twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource])
);
```

![programInfo](https://i.imgur.com/fyqCV7d.png)

可以看到 attributes 跟 uniforms 都已經被偵測好，而且我們需要的變數位置也可以透過 `.attribSetters.a_xxx.location` 來取得，因此可以把取得 attributes, uniforms 的部份取代掉，並修改取得變數位置的方式：

```diff=
 async function setup() {
   // ...
-  const program = twgl.createProgram(gl, [vertexShaderSource, fragmentShaderSource]);
-
-  const attributes = {
-    position: gl.getAttribLocation(program, 'a_position'),
-    texcoord: gl.getAttribLocation(program, 'a_texcoord'),
-    normal: gl.getAttribLocation(program, 'a_normal'),
-  };
-  const uniforms = {
-    matrix: gl.getUniformLocation(program, 'u_matrix'),
-    normalMatrix: gl.getUniformLocation(program, 'u_normalMatrix'),
-    diffuse: gl.getUniformLocation(program, 'u_diffuse'),
-    texture: gl.getUniformLocation(program, 'u_texture'),
-    lightDir: gl.getUniformLocation(program, 'u_lightDir'),
-  };
+  const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);
   // ...

   { // both ball and ground
     // ...

     // for all attributes
     buffers.xxx = gl.createBuffer();
     gl.bindBuffer(gl.ARRAY_BUFFER, buffers.xxx);

-    gl.enableVertexAttribArray(attributes.xxx);
+    gl.enableVertexAttribArray(programInfo.attribSetters.a_xxx.location);
     gl.vertexAttribPointer(
-      attributes.xxx,
+      programInfo.attribSetters.a_xxx.location,
       attribs.xxx.numComponents, // size
       gl.FLOAT, // type
       false, // normalize
       0, // stride
       0, // offset
     );
     // ...
   }
   // ...
 }
```

原本設定 uniform 的 `gl.uniformXX()` 每次呼叫只能設定一個 uniform，而且如果是設定 texture，則還要多呼叫 `gl.bindTexture()`, `gl.activeTexture()` 等，這部份在 [`twgl.createProgramInfo()`](https://twgljs.org/docs/module-twgl.html#.createProgramInfo) 時因為有偵測型別，如果使用 [`twgl.setUniforms`](https://twgljs.org/docs/module-twgl.html#.setUniforms)，就能一次設定許多 uniform 並且看變數型別做對應的設定，同時我們也讓 `setup()` 與 `render()` 使用 `programInfo` 來傳送：

```diff=
 async function setup() {
   // ...
   return {
     gl,
-    program, attributes, uniforms,
+    programInfo,
     textures, objects,
     // ...
   }
 }
 
 function render(app) {
   const {
     gl,
-    program, uniforms,
+    programInfo,
     textures, objects,
     state,
   } = app;
   // ...

-  gl.useProgram(program);
+  gl.useProgram(programInfo.program);
   // ...

-  gl.uniform3f(uniforms.lightDir, ...state.lightDir);
-
-  const textureUnit = 0;
+  twgl.setUniforms(programInfo, {
+    u_lightDir: state.lightDir,
+  });
   // ...

   { // both ball and ground
     // ...

-    gl.uniformMatrix4fv(
-      uniforms.matrix,
-      false,
-      matrix4.multiply(viewMatrix, worldMatrix),
-    );
-
-    gl.uniformMatrix4fv(
-      uniforms.normalMatrix,
-      false,
-      matrix4.transpose(matrix4.inverse(worldMatrix)),
-    );
-
-    gl.uniform3f(uniforms.diffuse, 0, 0, 0);
-
-    gl.bindTexture(gl.TEXTURE_2D, textures.still);
-    gl.activeTexture(gl.TEXTURE0 + textureUnit);
-    gl.uniform1i(uniforms.texture, textureUnit);
+    twgl.setUniforms(programInfo, {
+      u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
+      u_normalMatrix: matrix4.transpose(matrix4.inverse(worldMatrix)),
+      u_diffuse: [0, 0, 0],
+      u_texture: textures.still,
+    });
     // ...
   }
   // ...
 }
```

改用 `programInfo` 以及 `twgl.setUniforms()` 後，原本的功能依然運作正常，同樣地放上到此進度的程式碼：

* [github.com/pastleo/webgl-ironman/commit/4816914](https://github.com/pastleo/webgl-ironman/commit/481691448c0507168e891bfde0043a005b9673c1)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/481691448c0507168e891bfde0043a005b9673c1/04-lighting.html)

### 使用 TWGL 的 `bufferInfo` 取代繁瑣的 attribute-buffer 設定

在每個物件裡頭的每個 attribute，都要分別 `gl.createBuffer()`, `gl.bindBuffer()`, `gl.enableVertexAttribArray()`, `gl.vertexAttribPointer()` 並且傳送資料 `gl.bufferData()`，有經驗的開發者應該很快可以看得出來這邊可以用某種資料結構描述這些 attribute 的設定值以及資料，老實說，透過 `twgl.primitives.createXXXVertices()` 所建立的 `attribs` 其實就是這樣的資料結構，我們可以整組傳給 [`twgl.createBufferInfoFromArrays()`](https://twgljs.org/docs/module-twgl.html#.createBufferInfoFromArrays) 把所有的 buffer 一次建立好，並且透過 [`twgl.createVAOFromBufferInfo()`](https://twgljs.org/docs/module-twgl_vertexArrays.html#.createVAOFromBufferInfo) 建立 buffer-attribute 關聯與 VAO。要刪除的行數實在太多，這邊直接寫改完後 `setup()` 內準備物件資料的樣子：

```javascript=
async function setup() {
  // ...

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
  
  // ...
}
```

不過這邊有一個問題，在 vertex shader 中 attribute 的變數名稱都有 `a_` 開頭方便我們知道這是一個 attribute，但是 `twgl.primitives.createXXXVertices()` 所回傳的資料無法直接跟 vertex shader 的 attribute 變數名稱對起來，幸好 TWGL 有提供 [`twgl.setAttributePrefix()`](https://twgljs.org/docs/module-twgl_attributes.html#.setAttributePrefix) 設定 attribute 的 prefix，像這樣執行於 `setup()` 一開始即可：

```javascript=
async function setup() {
  // ...

  twgl.setAttributePrefix('a_');
  // before create bufferInfos
}
```

嘗試看一下 `bufferInfo` 上的資料結構，可以看到 `numElements` 表示 `gl.drawElement()` / `gl.drawArrays()` 時要畫多少個頂點、`elementType` 也先幫我們填好 `gl.UNSIGNED_SHORT`，也就是說 `gl.drawElement()` 所需要的資訊已經在 `bufferInfo` 中了：

![bufferInfo-data-structure](https://i.imgur.com/cvO8JSS.png)

因此最後使用 [`twgl.drawBufferInfo`](https://twgljs.org/docs/module-twgl.html#.drawBufferInfo) 好好運用套件定義好的資料結構：

```diff=
 function render(app) {
   // ...

   { // ball
     // ...

-    gl.drawElements(gl.TRIANGLES, objects.ball.numElements, gl.UNSIGNED_SHORT, 0);
+    twgl.drawBufferInfo(gl, objects.ball.bufferInfo);
   }
  
   { // ground
     // ...

-    gl.drawElements(gl.TRIANGLES, objects.ground.numElements, gl.UNSIGNED_SHORT, 0);
+    twgl.drawBufferInfo(gl, objects.ground.bufferInfo);
   }
 }
```

> 筆者在學得使用 `bufferInfo` 後有一次忘記使用 VAO，最後 debug 了半天才發現：buffer-attribute 的關聯是存放在 VAO 『工作區域』的，`twgl.createBufferInfoFromArrays()` 跟 `twgl.drawBufferInfo()` 是不會幫忙處理的，因此要記得使用 `twgl.createVAOFromBufferInfo()` 建立好 VAO 並且透過 `gl.bindVertexArray()` 好好切換工作區域

功能依舊，但是程式碼簡短了非常多，本篇的完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/377616e](https://github.com/pastleo/webgl-ironman/commit/377616ebd68e1aaa990fff4f5616037187d3d708)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/377616ebd68e1aaa990fff4f5616037187d3d708/04-lighting.html)

![adjusting-light-dir](https://i.imgur.com/zCGNnQw.gif)

---

## Day 19: 反射光

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 19 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。繪製出簡易的 3D 場景後，本章節加入光照效果使得成像更加真實，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

有了散射光的計算，物體的表面根據有沒有被光照射到而顯示；而本篇將介紹計算上較為複雜的 [specular 反射光](https://en.wikipedia.org/wiki/Specular_reflection)，筆者覺得加上這個效果之後，物體就可以呈現金屬、或是光滑表面的質感，開始跳脫死板的顏色，接下來以此畫面為目標：

![specular-target](https://i.imgur.com/oKObBRT.png)

### 反射光的計算方法與所需要的資料

在反射光的 wiki 中，反射光的意示圖如下：

![specualr-reflection](https://upload.wikimedia.org/wikipedia/commons/1/10/Reflection_angles.svg)

入射角與反射角的角度相同，也就是 `θi` 與 `θr` 相同，在本篇實做目標擷圖中，其中球體上的白色反光區域，就是光線入射角與反射角角度很接近的地方；而在 fragment shader 內，與計算散射時一樣，與其計算角度，不如利用單位向量的[內積](https://zh.wikipedia.org/wiki/%E7%82%B9%E7%A7%AF)，先計算光線方向反向 `surfaceToLightDirection` 與表面到相機方向 `surfaceToViewerDirection` 的『中間向量』，也就是 `surfaceToLightDirection` 與 `surfaceToViewerDirection` 兩個向量箭頭頂點的中間位置延伸而成的單位向量 `halfVector`，再拿 `halfVector` 與法向量做內積得到反射光的明暗度：

![](https://static.pastleo.me/assets/day19-specular-calc-210913142412.svg)

為了知道表面 O 點到相機方向，我們要在 shader 內計算出表面的位置，也就是只有經過 `worldMatrix` 做 transform 的位置，因此除了同時包含 `worldMatrix` 與 `viewMatrix` 的 `u_matrix` 之外，也得傳 `worldMatrix`，我們就叫這個 uniform `u_worldMatrix`；另外也需要傳送相機的位置進去 `u_worldViewerPosition`:

```diff=
 function render(app) {
   // ...

   twgl.setUniforms(programInfo, {
+    u_worldViewerPosition: state.cameraPosition,
     u_lightDir: state.lightDir,
   });

   // ...

   { // both ball and ground
     // ...
     const worldMatrix = matrix4.multiply(/* ... */);

     twgl.setUniforms(programInfo, {
       u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
+      u_worldMatrix: worldMatrix,
       u_normalMatrix: matrix4.transpose(matrix4.inverse(worldMatrix)),
       u_diffuse: [0, 0, 0],
       u_texture: textures.steel,
     });
     // ...
   }
 }
```

### Vertex Shader: 計算表面到相機方向

應該不難想像，面上某個點的『表面到相機方向』是三角形頂點到相機方向的中間值，符合 [Day 5](https://ithelp.ithome.com.tw/articles/10260366) 的 varying 特性，也就是說我們可以讓這個方向由頂點計算出來，用 varying 傳送給 fragment shader，fragment shader 收到的表面到相機方向就會是平滑補間後的結果，筆者把這個方向叫做 `v_surfaceToViewer`。有了 `u_worldMatrix` 以及 `u_worldViewerPosition`，計算出 `v_surfaceToViewer`:

```diff=
 attribute vec4 a_position;
 attribute vec2 a_texcoord;
 attribute vec4 a_normal;
  
 uniform mat4 u_matrix;
+uniform mat4 u_worldMatrix;
 uniform mat4 u_normalMatrix;
+uniform vec3 u_worldViewerPosition;
  
 varying vec2 v_texcoord;
 varying vec3 v_normal;
+varying vec3 v_surfaceToViewer;
  
 void main() {
   gl_Position = u_matrix * a_position;
   v_texcoord = vec2(a_texcoord.x, 1.0 - a_texcoord.y);
   v_normal = (u_normalMatrix * a_normal).xyz;
+  vec3 worldPosition = (u_worldMatrix * a_position).xyz;
+  v_surfaceToViewer = u_worldViewerPosition - worldPosition;
 }

```

### Fragment Shader: 實做反射光計算

照著上方所說得來實做，並讓結果 `specular` 直接加在顏色的所有 channel 上：

```diff=
 precision highp float;

 uniform vec3 u_diffuse;
 uniform sampler2D u_texture;
 uniform vec3 u_lightDir;

 varying vec2 v_texcoord;
 varying vec3 v_normal;
+varying vec3 v_surfaceToViewer;
  
 void main() {
   vec3 diffuse = u_diffuse + texture2D(u_texture, v_texcoord).rgb; 
   vec3 normal = normalize(v_normal);
   vec3 surfaceToLightDir = normalize(-u_lightDir);
   float diffuseLight = clamp(dot(surfaceToLightDir, normal), 0.0, 1.0);
-  gl_FragColor = vec4(diffuse * diffuseLight, 1);
+
+  vec3 surfaceToViewerDirection = normalize(v_surfaceToViewer);
+  vec3 halfVector = normalize(surfaceToLightDir + surfaceToViewerDirection);
+  float specularBrightness = dot(halfVector, normal);
+
+  gl_FragColor = vec4(
+    diffuse * diffuseLight + specularBrightness,
+    1
+  );
 }
```

先是把 `v_surfaceToViewer` 轉成單位向量，而 `surfaceToLightDir` 在先前已經有算出來為單位向量，兩者長度皆為 `1`，加在一起除以二可以得到『中間向量』，但是之後也得轉換成為單位向量，除以二的步驟就可以省略，因此平均向量 `halfVector` 這樣算：`normalize(surfaceToLightDir + surfaceToViewerDirection)`，最後與法向量做內積

### 縮小反射範圍

如果存檔去看渲染結果，看起來像是這樣：

![rendering-without-pow](https://i.imgur.com/7eVexif.png)

顯然跟目標擷圖不一樣，為什麼呢？想想看，如果 `halfVector` 與法向量相差 60 度，那麼我們做完內積之後，可以獲得 0.5 的 specular，這樣的反射範圍顯然太大，我們希望內積之後的值非常接近 1 才能讓 specular 有值，再套上 n 次方可以做到這件事，假設 n 為 40，那麼線圖看起來像是這樣，接近 0.9 時數值才開始明顯大於 0:

![40-pow](https://i.imgur.com/N32ZMSl.png)

> 本圖擷取自此：[https://www.desmos.com/calculator/yfa2jzzejm](https://www.desmos.com/calculator/yfa2jzzejm)，讀者可以來這邊拉左方的 n 值感受一下

其實這個 n 的值可以根據不同物件材質而有所不同，因此加上 `u_specularExponent` 來控制，同時也加入控制反射光顏色的 uniform，稱為 `u_specular`，筆者在此順便在 state 中加入對球體、地板不同的 specularExponent:

```diff=
 async function setup() {
   // ...
   return {
     // ...
     state: {
       // ...
+      ballSpecularExponent: 40,
+      groundSpecularExponent: 100,
     },
     time: 0,
   }
 }
```

並且把 uniform 傳送設定好，反射光設定成白光：

```diff=
 function render(app) {
   // ...

   twgl.setUniforms(programInfo, {
     u_worldViewerPosition: state.cameraPosition,
     u_lightDir: state.lightDir,
+    u_specular: [1, 1, 1],
   });

   // ...

   { // ball
     // ...
     const worldMatrix = matrix4.multiply(/* ... */);

     twgl.setUniforms(programInfo, {
       // ...
       u_diffuse: [0, 0, 0],
       u_texture: textures.steel,
+      u_specularExponent: state.ballSpecularExponent,
     });
     // ...
   }
   
   { // ground
     // ...
     const worldMatrix = matrix4.multiply(/* ... */);

     twgl.setUniforms(programInfo, {
       // ...
       u_diffuse: [0, 0, 0],
       u_texture: textures.steel,
+      u_specularExponent: state.groundSpecularExponent,
     });
     // ...
   }
```

最後實做到 fragment shader 內，[`pow()`](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/pow.xhtml) GLSL 有內建，同時也加上 [`clamp()`](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/clamp.xhtml) 避免數值跑到負的：

```diff=
 precision highp float;

 uniform vec3 u_diffuse;
 uniform sampler2D u_texture;
 uniform vec3 u_lightDir;
+uniform vec3 u_specular;
+uniform float u_specularExponent;

 varying vec2 v_texcoord;
 varying vec3 v_normal;
 varying vec3 v_surfaceToViewer;

 void main() {
   vec3 diffuse = u_diffuse + texture2D(u_texture, v_texcoord).rgb;  
   vec3 normal = normalize(v_normal);
   vec3 surfaceToLightDir = normalize(-u_lightDir);
   float diffuseBrightness = clamp(dot(surfaceToLightDir, normal), 0.0, 1.0);

   vec3 surfaceToViewerDirection = normalize(v_surfaceToViewer);
   vec3 halfVector = normalize(surfaceToLightDir + surfaceToViewerDirection);
-  float specularBrightness = dot(halfVector, normal);
+  float specularBrightness = clamp(pow(dot(halfVector, normal), u_specularExponent), 0.0, 1.0);

   gl_FragColor = vec4(
-    diffuse * diffuseLight + specularBrightness,
+    diffuse * diffuseLight +
+    u_specular * specularBrightness,
     1
   );

```

如果把 HTML 對於 `ballSpecularExponent`, `groundSpecularExponent` 的控制加上，便可以動態調整反射光的區域：

![specular-live-adjustment](https://i.imgur.com/GJV7q7s.gif)

本篇的完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/eede827](https://github.com/pastleo/webgl-ironman/commit/eede827f74a5c41444a3375e5318a49556d16a86)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/eede827f74a5c41444a3375e5318a49556d16a86/04-lighting.html)

---

## Day 20: 點光源與自發光

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 20 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。繪製出簡易的 3D 場景後，本章節加入光照效果使得成像更加真實，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

從無限遠照射場景的平行光適合用來模擬太陽這類型的光源，如果是室內的燈泡光源呢？本篇將在場景中加入一個黃色自發光燈泡，並把平行光改成以這顆燈泡作為點光源

### 輸入光源位置並計算光線方向

在平行光的環境下，所有位置的光線方向都一樣，因此只需要一個 uniform `u_lightDir` 便可以，但是在點光源的情況下會因為頂點/表面位置不同而有不同的光線方向，而光線方向可以透過 vertex shader 計算，並利用平滑補間使得 fragment shader 得到對應表面所街收到的光線方向，因此在 vertex shader 中使用 uniform 接收光源位置 `u_worldLightPosition`，並且計算出光線方向使用 varying `v_surfaceToLight` 傳給 fragment shader 使用：


```diff=
 attribute vec4 a_position;
 attribute vec2 a_texcoord;
 attribute vec4 a_normal;

 uniform mat4 u_matrix;
 uniform mat4 u_worldMatrix;
 uniform mat4 u_normalMatrix;
 uniform vec3 u_worldViewerPosition;
+uniform vec3 u_worldLightPosition;
  
 varying vec2 v_texcoord;
 varying vec3 v_normal;
 varying vec3 v_surfaceToViewer;
+varying vec3 v_surfaceToLight;

 void main() {
   gl_Position = u_matrix * a_position;
   v_texcoord = vec2(a_texcoord.x, 1.0 - a_texcoord.y);
   v_normal = (u_normalMatrix * a_normal).xyz;
   vec3 worldPosition = (u_worldMatrix * a_position).xyz;
   v_surfaceToViewer = u_worldViewerPosition - worldPosition;
+  v_surfaceToLight = u_worldLightPosition - worldPosition;
 }
```

在 fragment shader 上做的事情不會很困難，就只是從 `u_lightDir` 改用 `v_surfaceToLight`

```diff=
 precision highp float;

 uniform vec3 u_diffuse;
 uniform sampler2D u_texture;
-uniform vec3 u_lightDir;
 uniform vec3 u_specular;
 uniform float u_specularExponent;
  
 varying vec2 v_texcoord;
 varying vec3 v_normal;
 varying vec3 v_surfaceToViewer;
+varying vec3 v_surfaceToLight;
  
 void main() {
   vec3 diffuse = u_diffuse + texture2D(u_texture, v_texcoord).rgb; 
   vec3 normal = normalize(v_normal);
-  vec3 surfaceToLightDir = normalize(-u_lightDir);
-  float diffuseBrightness = clamp(dot(surfaceToLightDir, normal), 0.0, 1.0);
+  vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
+  float diffuseBrightness = clamp(dot(surfaceToLightDirection, normal), 0.0, 1.0);
  
   vec3 surfaceToViewerDirection = normalize(v_surfaceToViewer);
-  vec3 halfVector = normalize(surfaceToLightDir + surfaceToViewerDirection);
+  vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewerDirection);
   float specularBrightness = clamp(pow(dot(halfVector, normal), u_specularExponent), 0.0, 1.0);

   gl_FragColor = vec4(
     diffuse * diffuseBrightness +
     u_specular * specularBrightness,
     1
   );
 }
```

筆者設定光源的初始位置在 `[0, 2, 0]`，並且設定該設定的 uniform:

```diff=
 async function setup() {
   // ...
   return {
     // ...
     state: {
-      lightDir: [0, -1, 0],
+      lightPosition: [0, 2, 0],
     }
   }
 }

 function render(app) {
   twgl.setUniforms(programInfo, {
     u_worldViewerPosition: state.cameraPosition,
-    u_lightDir: state.lightDir,
+    u_worldLightPosition: state.lightPosition,
     u_specular: [1, 1, 1],
 });
```

同時也將從 DOM 進行的使用者控制部份調整好，程式碼比較瑣碎筆者就不列了，改完之後可以調整光源的 y 軸位置，觀察接近地面時反射光的表現：

![light-position-demo](https://i.imgur.com/aQAkuSH.gif)

### 加入燈泡表示點光源位置

我們就用小球來表示點光源的位置，可以重複使用現有的 `objects.ball` 物件，因此不需要修改 `setup()`，直接在 `render()` 多渲染一次 `objects.ball`，並利用 `worldMatrix` 使得物件縮小且平移至光源位置：

```javascript=
function render(app) {
  // ...
  { // light bulb
    gl.bindVertexArray(objects.ball.vao);

    const worldMatrix = matrix4.multiply(
      matrix4.translate(...state.lightPosition),
      matrix4.scale(0.1, 0.1, 0.1),
    );

    twgl.setUniforms(programInfo, {
      u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
      u_worldMatrix: worldMatrix,
      u_normalMatrix: matrix4.transpose(matrix4.inverse(worldMatrix)),
      u_diffuse: [1, 1, 1],
      u_texture: textures.nil,
      u_specularExponent: 1000,
    });

    twgl.drawBufferInfo(gl, objects.ball.bufferInfo);
  }
  // ...
}
```

雖然筆者把燈泡的 `u_diffuse` 給上 `[1, 1, 1]`，但是因為光源在球體內部，因此燈泡球體呈現黑色：

![with-black-bulb](https://i.imgur.com/AJl8msj.gif)

### Emissive 自發光

為了讓燈泡球體有顏色，我們可以在 fragment shader 中加上一個 uniform，計算 `gl_FragColor` 時直接加上這個顏色，這個顏色即為自發光，變數名稱命名為 `u_emissive`:

```diff=
 precision highp float;

 uniform sampler2D u_texture;
 uniform vec3 u_specular;
 uniform float u_specularExponent;
+uniform vec3 u_emissive;

 // ...

 void main() {
   // ...

   gl_FragColor = vec4(
     diffuse * diffuseBrightness +
-    u_specular * specularBrightness,
+    u_specular * specularBrightness +
+    u_emissive,
     1
   );
 }
```

接下來對各個物件指定自發光顏色，筆者讓原本的球體也有一點點的亮度 `[0.15, 0.15, 0.15]`，而原本的燈泡就給黃色 `[1, 1, 0]`:

```diff=
 function render(app) {
   // ...
   
   { // ball
     twgl.setUniforms(programInfo, {
       // ...
+      u_emissive: [0.15, 0.15, 0.15],
     });
   }
   
   { // light bulb
     twgl.setUniforms(programInfo, {
       // ...
+      u_emissive: [1, 1, 0],
     });
   }

   { // ground
     twgl.setUniforms(programInfo, {
       // ...
+      u_emissive: [0, 0, 0],
     });
   }
 }
```

今天的目標就完成啦：

![yellow-bulb-point-lighting](https://i.imgur.com/0TXVRo1.gif)

> 事實上，物件『材質』對於光的反應、產生的顏色很可能遠不只這個系列文所提到的散射光、反射光、自發光，以[這篇讀取 .obj/.mtl 3D 模型材質資料的文章來看](https://webgl2fundamentals.org/webgl/lessons/webgl-load-obj-w-mtl.html)，至少就還有環境光（ambient）等等

本篇完整的程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/9298ed9](https://github.com/pastleo/webgl-ironman/commit/9298ed989831b5740c321a9babe266f418cbd3c2)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/9298ed989831b5740c321a9babe266f418cbd3c2/04-lighting.html)

---

## Day 21: Normal & Specular Map

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 21 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。繪製出簡易的 3D 場景後，本章節加入光照效果使得成像更加真實，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

在尋找 3D 材質素材時，找到的素材包含的檔案常常不只有材質本身的顏色（diffuse 用），筆者撰寫這個章節所使用的 [Commission - Medieval (其中之 steel)](https://opengameart.org/content/commission-medieval), [2048² wooden texture](https://opengameart.org/content/2048%C2%B2-wooden-texture)，分別包含了一個 normal map:

![steel-normal-map](https://i.imgur.com/tEOKqeb.jpg)

![wood-normal-map](https://i.imgur.com/f6JzpIU.jpg)

先前物件表面的法向量由頂點決定，因為 varying 的『平滑補間』，使得光線照射物體時看起來很平順，而這些 normal map 則是可以讓物件對於光具有更多表面的細節，看起來更真實、細緻

### Normal 法向量之 Texture

上面兩張『圖片』，使用 texture 的方式載入，觀察其顏色的 RGB 數值會發現大部分的 RGB 數值都相當接近 `[127, 127, 255]`，減掉 127 再除以 128 會得到介於 -1 ~ +1 之間的數，這時與其說是顏色，一個 RGB 表示的其實是 `[x, y, z]` 單位向量來表示該表面位置的法向量，而且絕大部分的區域都是 `[0, 0, 1]` 指向 +z，整張 texture 稱為 normal map

除了使用 `setup()` 讀取這兩張圖之外，也加入一個 null normal map，如果有物件不使用 normal map 時使用，使表面法向量一律指向 +z，RGB 值輸入 `[127, 127, 255]`:

```diff=
 async function setup() {
   // ...
   const textures = Object.fromEntries(
     await Promise.all(Object.entries({
       wood: 'https://i.imgur.com/SJdQ7Twh.jpg',
       steel: 'https://i.imgur.com/vqKuF5Ih.jpg',
+      woodNormal: 'https://i.imgur.com/f6JzpIUh.jpg',
+      steelNormal: 'https://i.imgur.com/tEOKqebh.jpg',
     }).map(async ([name, url]) => {
       // ...
     }))
   );
   
   // ...
  
+  { // null normal texture
+    const texture = gl.createTexture();
+    gl.bindTexture(gl.TEXTURE_2D, texture);
+
+    gl.texImage2D(
+      gl.TEXTURE_2D,
+      0, // level
+      gl.RGBA, // internalFormat
+      1, // width
+      1, // height
+      0, // border
+      gl.RGBA, // format
+      gl.UNSIGNED_BYTE, // type
+      new Uint8Array([
+        127, 127, 255, 255
+      ])
+    );
+
+    textures.nilNormal = texture;
+  }
```

### Normal Map Transform

在 [Day 17](https://ithelp.ithome.com.tw/articles/10265910) 中，我們有處理了 vertex attribue 中法向量的旋轉，但是現在得在原本 vertex 法向量的基礎上，再加上一層 normal map，也就是說 normal map 的 +z 要轉換成 vertex 的法向量；舉一個例子，如果有一個 vertex 資料形成之三角形的 normal 為 `[1, 0, 0]`，而一個 fragment shader 取到從 normal map 取到表示的法向量為 `[0, 0, 1]`，必須把這個法向量轉換成 `[1, 0, 0]`

為了做這樣的 transform，筆者閱讀 [learnopengl.com 的 normal mapping 的文章](https://learnopengl.com/Advanced-Lighting/Normal-Mapping) 後得知這個轉換很像 [Day 14](https://ithelp.ithome.com.tw/articles/10263716) 的 `matrix4.lookAt()`，但是不太偏好為所有三角形資料計算、輸入 tangent 以及 bitangents，因此嘗試直接在 vertex shader 內實做傳入 up 為 `[0, 1, 0]` 的 `matrix4.lookAt()`，並且把產生的矩陣以 `varying mat3 v_normalMatrix` 傳送到 fragment shader:

```diff=
 varying vec2 v_texcoord;
-varying vec3 v_normal;
 varying vec3 v_surfaceToViewer;
 varying vec3 v_surfaceToLight;
  
+varying mat3 v_normalMatrix;
+
 void main() {
   gl_Position = u_matrix * a_position;
   v_texcoord = vec2(a_texcoord.x, 1.0 - a_texcoord.y);
-  v_normal = (u_normalMatrix * a_normal).xyz;
+
+  vec3 normal = normalize((u_normalMatrix * a_normal).xyz);
+  vec3 normalMatrixI = normal.y >= 1.0 ? vec3(1, 0, 0) : normalize(cross(vec3(0, 1, 0), normal));
+  vec3 normalMatrixJ = normalize(cross(normal, normalMatrixI));
+
+  v_normalMatrix = mat3(
+    normalMatrixI,
+    normalMatrixJ,
+    normal
+  );
+
   vec3 worldPosition = (u_worldMatrix * a_position).xyz;
   vec3 worldPosition = (u_worldMatrix * a_position).xyz;
   v_surfaceToViewer = u_worldViewerPosition - worldPosition;
   v_surfaceToLight = u_worldLightPosition - worldPosition;
 }
```

1. 首先 `vec3 normal = normalize((u_normalMatrix * a_normal).xyz);` 計算原本 vertex normal 要進行的旋轉
2. 原則上 `vec3 normalMatrixI` 為 `vec3(0, 1, 0)` 與 `normal` 的外積，但是為了避免 `normal` 為 `vec3(0, 1, 0)` 導致外積不出結果，遇到這樣的狀況時直接使得 `normalMatrixI` 為 `vec3(1, 0, 0)`
3. `vec3 normalMatrixJ` 為 `normal` 與 `normalMatrixI` 的外積
4. 這麼一來，`normalMatrixI`, `normalMatrixJ`, `normal` 作為變換矩陣的『基本矢量』，組成的矩陣 `v_normalMatrix`，可以把 normal map 法向量 transform 成以 vertex 法向量為基礎之向量

### 在 fragment shader 對 normal map 進行 transform

在 fragment shader 內，從 `u_normalMap` 讀取法向量之後也得來進行矩陣運算了：

```diff=
 precision highp float;
  
 uniform vec3 u_diffuse;
 uniform sampler2D u_texture;
 uniform vec3 u_specular;
 uniform float u_specularExponent;
 uniform vec3 u_emissive;
  
+uniform sampler2D u_normalMap;
+
 varying vec2 v_texcoord;
-varying vec3 v_normal;
 varying vec3 v_surfaceToViewer;
 varying vec3 v_surfaceToLight;
  
+varying mat3 v_normalMatrix;
+
 void main() {
   vec3 diffuse = u_diffuse + texture2D(u_texture, v_texcoord).rgb;
-  vec3 normal = normalize(v_normal);
+  vec3 normal = texture2D(u_normalMap, v_texcoord).xyz * 2.0 - 1.0;
+  normal = normalize(v_normalMatrix * normal);
   vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
   float diffuseBrightness = clamp(dot(surfaceToLightDirection, normal), 0.0, 1.0);
```

值得注意的是，在 normal map 的原始資料輸入 `[127, 127, 255]` 作為法向量 `[0, 0, 1]`，但在 `texture2D(u_normalMap, v_texcoord).xyz` 取出資料時會得到 `[0.5, 0.5, 1]`，因此乘以 2 減 1

最後當然得在對應的物件渲染時設定好 `u_normalMap` 要使用的 normal map:

```diff=
 function render(app) {
   // ...
   { // ball
     // ...
     twgl.setUniforms(programInfo, {
       // ...
+      u_normalMap: textures.steelNormal,
     });
     // ...
   }
   
   { // light bulb
     // ...
     twgl.setUniforms(programInfo, {
       // ...
+      u_normalMap: textures.nilNormal,
     });
     // ...
   }

   { // ground
     // ...
     twgl.setUniforms(programInfo, {
       // ...
+      u_normalMap: textures.woodNormal,
     });
     // ...
   }
```

存檔重整之後，可以看到因為木質地板光澤有更多細節，使得這個『平面』立體了起來：

![normal-map-implemented](https://i.imgur.com/banYBOw.png)

這時因為有複數個 texture 在 fragment shader 中使用，`u_texture` 開始顯得不知道是指哪一個，因此筆者把這個 uniform 改名為 `u_diffuseMap`，畢竟他是負責 diffuse 顏色的；在 [2048² wooden texture](https://opengameart.org/content/2048%C2%B2-wooden-texture) 這個材質中有提供 specular map，因此也順便實做 `u_specularMap`，運作方式類似 `u_diffuseMap`，完整程式碼可以在這邊找到：

* [https://github.com/pastleo/webgl-ironman/commit/d8caac2](https://github.com/pastleo/webgl-ironman/commit/d8caac27143cd54a4521dc205c5946d8763b3763)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/d8caac27143cd54a4521dc205c5946d8763b3763/04-lighting.html)

在場景中加入光以及物體表面上的散射、反射光之後，物體是否看起來更加真實了呢？針對光的討論差不多就到這邊，既然有了光，那麼影子呢？在實做陰影之前，要先學會如何讓 WebGL 渲染到 texture 上，使我們可以請 GPU 先進行一些運算，並在實際渲染畫面時取用先運算好的資料