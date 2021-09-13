---
tags: webgl, ironman, post
---

CH5: Framebuffer & Shadow [WebGL 鐵人]
===

## Day 22: Framebuffer

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 22 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

在上個章節的最後我們不僅有散射光、反射光，還有使得物體表面有更多凹凸細節的 normal map，筆者從這個實做成果再進行修改，材質改用 [Commission - Medieval](https://opengameart.org/content/commission-medieval) 的 `scale`，並且加上環境光 `u_ambient` 使物體有一個最低亮度，最後讓相機操作更加完整：透過拖曳平移視角，使用滑鼠右鍵、滾輪或是多指手勢可對視角進行縮放、轉動。這個章節便從這個進度作為起始點

### `05-framebuffer-shadow.html` / `05-framebuffer-shadow.js`

![05-framebuffer-shadow-start](https://i.imgur.com/ewVh0cw.png)

完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/c175474](https://github.com/pastleo/webgl-ironman/commit/c175474f41e96622bd6a6f4b38fdb7edd8f2abf0)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/c175474f41e96622bd6a6f4b38fdb7edd8f2abf0/05-framebuffer-shadow.html)

可以發現點光源改回平行光了，而且會隨著時間改變方向，然後地板變成全黑的了，因為這是本章接下來要實做的

### Framebuffer 是什麼

簡單來說，這是一個 WebGL 渲染的目標，本系列文到這邊渲染的目標皆為 `<canvas />` 元件，畫給使用者看的，而 framebuffer 可以改變這件事，其中一個選項是使之渲染到 texture 上

為什麼要渲染到 texture 上呢？假設今天有一面鏡子，鏡子上所看到的圖像，等同於從鏡子中的相機看回原本世界，因此可以先從鏡子內繪製一次場景到一個 texture 上，接著繪製鏡子時就可以拿此 texture 來繪製；甚至感覺比較沒有關聯的陰影效果也需要透過 framebuffer 的功能，事先請 GPU 做一些運算，在正式『畫』的時候使用

### 初嘗 Framebuffer

在實做鏡面或是陰影之前，先來專注在 framebuffer 這個功能上，畢竟想想也知道鏡子、陰影需要的不會只是 framebuffer，還需要一些能夠讓物件位置成像能對得起來的方法，因此本篇的目標是：渲染到 texture 上，接著渲染地板時使用該 texture，效果上來說像是把畫面上的球體變到黑色地板中

首先在 `setup()` 中建立 framebuffer，並且把目標對準（bind）新建立的 framebuffer:

```javascript=
const framebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
```

同時也建立好 texture 作為 framebuffer 渲染的目標，筆者先命名為 `fb`，framebuffer 的縮寫：

```javascript=
textures.fb = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, textures.fb);

const width = 2048;
const height = 2048;

gl.texImage2D(
  gl.TEXTURE_2D,
  0, // level
  gl.RGBA, // internalFormat
  width,
  height,
  0, // border
  gl.RGBA, // format
  gl.UNSIGNED_BYTE, // type
  null, // data
);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
```

可以看到建立了一個 2048x2048 大小的 texture，並且傳 `null` 讓資料留白，同時也得關閉 mipmap 功能，畢竟渲染到 texture 上之後，如果還要呼叫 `gl.generateMipmap()` 計算縮圖就太浪費資源了，有需要的話可以回去參考 [Day 7](https://ithelp.ithome.com.tw/articles/10261025) 的講解

然後是建立『framebuffer 與 texture 的關聯』：

```javascript=
gl.framebufferTexture2D(
  gl.FRAMEBUFFER,
  gl.COLOR_ATTACHMENT0, // attachment
  gl.TEXTURE_2D,
  textures.fb,
  0, // level
);
```

呼叫 [`gl.framebufferTexture2D()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/framebufferTexture2D) 使得當下對準的 framebuffer 的一個 attachment 對準指定的 texture，因為我們現在關心的是顏色，`gl.COLOR_ATTACHMENT0` 使得渲染到 framebuffer 時，『顏色（`gl_FragColor`）』部份會寫入，最後 `level` 表示要寫入 mipmap 的哪一層

建立完成後，在 `app` 下加入 `framebuffers` 物件來存放建立好的 framebuffer:

```diff=
 async function setup() {
 // ...

+  const framebuffers = {}

   {
     const framebuffer = gl.createFramebuffer();
     gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

     // ...
     
+    framebuffers.fb = {
+      framebuffer, width, height,
+    };
   }

   return {
     gl,
     programInfo,
-    textures, objects,
+    textures, framebuffers, objects,
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
```

### 渲染到 Framebuffer

如果接下來會需要先渲染到 framebuffer，再渲染到畫面，那麼可以想見某些物體會需要繪製兩次，為了避免重複程式碼，筆者把標注 `ball`, `ground` 的花括弧 `{}` 區域獨立成兩個 function:

* `function renderBall(app, viewMatrix)`
* `function renderGround(app, viewMatrix)`

準備完成後，在 `render()` 設定好全域 uniform 之後，呼叫 `gl.bindFramebuffer()` 切換到 framebuffer， 像這樣渲染到 framebuffer 並寫入 `textures.fb`:

```javascript=
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.fb.framebuffer);
gl.viewport(0, 0, framebuffers.fb.width, framebuffers.fb.height);

renderBall(app, viewMatrix);
```

要記得使用 `gl.viewport()` 設定渲染長寬跟 texture 一樣大，接著就跟原本渲染到畫面上一樣，因此直接呼叫 `renderBall()` 渲染球體

那麼要怎麼讓渲染目標切換回 `<canvas />` 呢？呼叫 `gl.bindFramebuffer()` 並傳入 `null` 即可，不過一樣要記得把渲染長寬設定好：

```javascript=
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

gl.canvas.width = gl.canvas.clientWidth;
gl.canvas.height = gl.canvas.clientHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

renderGround(app, viewMatrix);
```

呼叫 `renderGround()` 渲染地板的同時，設定其 uniform 時在 `u_diffuseMap` 填上 `textures.fb` 使地板顯示在 framebuffer 時渲染的樣子：

```diff=
 function renderGround(app, viewMatrix) {
   // ...

   twgl.setUniforms(programInfo, {
     u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
     u_worldMatrix: worldMatrix,
     u_normalMatrix: matrix4.transpose(matrix4.inverse(worldMatrix)),
     u_diffuse: [0, 0, 0],
-    u_diffuseMap: textures.nil,
+    u_diffuseMap: textures.fb,
     u_normalMap: textures.nilNormal,
     u_specular: [1, 1, 1],
     u_specularExponent: 200,
     u_emissive: [0, 0, 0],
   });
   
   twgl.drawBufferInfo(gl, objects.ground.bufferInfo);
 }
```

存檔重整，轉一下的確看得出來球體渲染在一幅畫上的感覺，但是平移會看到殘影：

![framebuffer-texture-rendered-but-with-afterimage](https://i.imgur.com/DEJpmey.gif)

有殘影是因為上一次渲染到 texture 的東西不會被自動清除，因此透過 [Day 1](https://ithelp.ithome.com.tw/articles/10258943) 的油漆工具清除 framebuffer-texture:

```diff
 async function setup() {
   // ...

   gl.enable(gl.CULL_FACE);
   gl.enable(gl.DEPTH_TEST);
+  gl.clearColor(1, 1, 1, 1);
   return {
     // ...
   };
 }

 function render(app) {
   // ...

   gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.fb.framebuffer);
   gl.viewport(0, 0, framebuffers.fb.width, framebuffers.fb.height);
+  gl.clear(gl.COLOR_BUFFER_BIT);

   renderBall(app, viewMatrix);
 }
```

![afterimage-gone](https://i.imgur.com/APYDKy2.gif)

雖然清除的顏色是白色，但是因為光線方向會移動導致散射（`textures.fb` 設定在 `u_diffuseMap` 上）亮度下降，除此之外球體成功透過 framebuffer 渲染到 texture，並繪製在平面上了，完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/b2f600f](https://github.com/pastleo/webgl-ironman/commit/b2f600f414eefb2a4de751585f0410b39eb5da70)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/b2f600f414eefb2a4de751585f0410b39eb5da70/05-framebuffer-shadow.html)

---

## Day 23: 鏡面效果

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 23 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。本章節講述的是如何透過 framebuffer 使 WebGL 預先計算資料到 texture，並透過這些預計算的資料製作鏡面、陰影效果，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

取得了 framebuffer 這個工具，把球體畫在在一幅畫中，已經完成鏡面效果所需要的基石，本篇來把鏡面效果實做出來

### 透過 [TWGL](https://twgljs.org/docs/index.html) 簡化建立 framebuffer 的程式碼

上篇建立 framebuffer 時直接使用 WebGL API 來建立 framebuffer，其實 [TWGL](https://twgljs.org/docs/index.html) 已經有時實做好一定程度的包裝，我們可以呼叫 [`twgl.createFramebufferInfo()`](https://twgljs.org/docs/module-twgl.html#.createFramebufferInfo)，它會建立好 framebuffer, textures 並且為他們建立關聯：

```javascript=
framebuffers.mirror = twgl.createFramebufferInfo(
  gl,
  null, // attachments
  2048, // width
  2048, // height
);
```

`attachments` 讓開發者可以指定要寫入的 texture 的設定，例如說 `gl.COLOR_ATTACHMENT0` 所對應的顏色部份要寫入的 texture 的設定，筆者傳 null 讓 twgl 使用預設值建立一個顏色 texture 以及一個深度資訊 texture，因為接下來要實做的功能為鏡面，把此 framebuffer 命名為 `framebuffers.mirror`

那麼要怎麼取得自動建立的 texture 呢？嘗試用 Console 查看建立的物件 `framebufferInfo` 看起來像是這樣：

![framebuffer-info-content](https://i.imgur.com/QdQMtFg.png)

看起來就放在 `attachments` 下呢，那麼把 texture 指定到 `textures` 物件中以便之後取用：

```javascript=
textures.mirror = framebuffers.mirror.attachments[0];
```

值得注意的是，`framebufferInfo` 同時包含了長寬資訊，如果使用 [`twgl.bindFramebufferInfo()`](https://twgljs.org/docs/module-twgl.html#.bindFramebufferInfo) 來做 framebuffer 的切換，它同時會幫我們呼叫 `gl.viewport()` 調整渲染區域，因此在繪製階段也使用 twgl 所提供的工具：

```diff=
 function render(app) {
   // ...

-  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.fb.framebuffer);
-  gl.viewport(0, 0, framebuffers.fb.width, framebuffers.fb.height);
-  gl.clear(gl.COLOR_BUFFER_BIT);
+  twgl.bindFramebufferInfo(gl, framebuffers.mirror);
+  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   renderBall(app, viewMatrix);
   // ...
 }
```

可以發現在 `gl.clear()` 時除了清除 `gl.COLOR_BUFFER_BIT`，也要清除`gl.DEPTH_BUFFER_BIT`，這是因為 `twgl.createFramebufferInfo()` 所建立的組合預設包含了一張深度資訊，這個資訊也得清除以避免第二次渲染到 framebuffer 時產生問題

### 繪製鏡像中的世界

目前在 framebuffer 中繪製的球體就是正常狀態下看到的球體，那麼要怎麼繪製『鏡像』的樣子呢？想像一個觀察著看著鏡面中的一顆球：

![mirrored-camera](https://static.pastleo.me/assets/day23-mirrored-camera-210915225707.svg)

橘色箭頭為實際光的路線，把光線打直可以獲得一個鏡面中的觀察者看著真實世界（灰色箭頭與眼睛），因此繪製鏡像中的世界時，把相機移動到鏡面中拍一次，我們就獲得了鏡面世界的成像，準備好在繪製場景時使用

筆者為此章節實做的相機控制方式使用了不同於 `matrix4.lookAt()` 的 `cameraMatrix` 產生方式：

```javascript=
const cameraMatrix = matrix4.multiply(
  matrix4.translate(...state.cameraViewing),
  matrix4.yRotate(state.cameraRotationXY[1]),
  matrix4.xRotate(state.cameraRotationXY[0]),
  matrix4.translate(0, 0, state.cameraDistance),
);
```

用白話文來說，目前的相機一開始在 `[0, 0, 0]` 看著 -z 方向，先往 +z 方向移動 `state.cameraDistance`、轉動 x 軸 `state.cameraRotationXY[0]`、轉動 y 軸 `state.cameraRotationXY[1]`，這時相機會在半徑為 `state.cameraDistance` 的球體表面上看著原點，最後 `state.cameraViewing` 的平移是指移動相機所看的目標，如果使用 `y = 0` 形成的平面作為鏡面，只要讓轉動 x 軸時反向，就變成對應在鏡面中的相機，並且進而算出鏡面使用的 `viewMatrix`:

```javascript=
const mirrorCameraMatrix = matrix4.multiply(
  matrix4.translate(...state.cameraViewing),
  matrix4.yRotate(state.cameraRotationXY[1]),
  matrix4.xRotate(-state.cameraRotationXY[0]),
  matrix4.translate(0, 0, state.cameraDistance),
);

const mirrorViewMatrix = matrix4.multiply(
  matrix4.perspective(state.fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 2000),
  matrix4.inverse(mirrorCameraMatrix),
);
```

接著讓地板為 `y = 0` 形成的平面，與球體一同向 +y 方向移動一單位：

```diff=
 function renderBall(app, viewMatrix) {
   // ...
   const worldMatrix = matrix4.multiply(
-    matrix4.translate(0, 0, 0),
     matrix4.scale(1, 1, 1),
   );
   
   // ...
 }

 function renderGround(app, viewMatrix) {
   // ...
-  const worldMatrix = matrix4.multiply(
-    matrix4.translate(0, -1, 0),
-    matrix4.scale(10, 1, 10),
-  );
+  const worldMatrix = matrix4.scale(10, 1, 10);

   // ...
 }
```

最後在繪製鏡像中的世界時使用 `mirrorViewMatrix`:

```diff=
 function render(app) {
   // ...

   twgl.bindFramebufferInfo(gl, framebuffers.mirror);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

-  renderBall(app, viewMatrix);
+  renderBall(app, mirrorViewMatrix);

   // ...
 }
```

### 正式渲染鏡面時取用 texture 中對應的位置

儘管繪製出鏡面世界中的樣子，拍了一張鏡面世界的照片，但是要怎麼在正式『畫』的時候找到鏡面世界的照片對應的位置呢？請看下面這張圖：

![mirror-texcoord](https://static.pastleo.me/assets/day23-mirror-texcoord-210916120504.svg)

物件上的一個點 A，是經過物件自身 `worldMatrix` transform 的位置，再經過 `mirrorViewMatrix` transform 到鏡面世界的照片上（點 B）；正式『畫』鏡面物件時，我們知道的是 C 點的位置（`worldPosition`），**而這個點座落在 A 與 B 點之間，因此拿著 C 點做 `mirrorViewMatrix` transform 便可以獲得對應的 B 點**，這時 B 點是 clip space 中的位置，只要再將此位置向量加一除以二就能得到 texture 上的位置囉

也就是說，在正式『畫』的時候也會需要 `mirrorViewMatrix`，uniform 命名為 `u_mirrorMatrix`，並且在 vertex shader 中計算出 B 點，透過 varying `v_mirrorTexcoord` 傳送給 fragment shader:

```diff=
 // ...
+uniform mat4 u_mirrorMatrix;
+varying vec4 v_mirrorTexcoord;

 void main() {
   // ...

-  vec3 worldPosition = (u_worldMatrix * a_position).xyz;
-  v_surfaceToViewer = u_worldViewerPosition - worldPosition;
+  vec4 worldPosition = u_worldMatrix * a_position;
+  v_surfaceToViewer = u_worldViewerPosition - worldPosition.xyz;
+
+  v_mirrorTexcoord = u_mirrorMatrix * worldPosition;
 }
```

到 fragment shader，筆者打算讓鏡面世界的照片放在 `u_diffuseMap`，不過鏡面物體取用 texture 的方式將會與其他物件不同，因此加入一個 uniform `u_useMirrorTexcoord` 來控制是否要使用 `v_mirrorTexcoord`

```diff=
 // ...
+uniform bool u_useMirrorTexcoord;
+varying vec4 v_mirrorTexcoord;

 void main() {
+  vec2 texcoord = u_useMirrorTexcoord ?
+    (v_mirrorTexcoord.xy / v_mirrorTexcoord.w) * 0.5 + 0.5 :
+    v_texcoord;
-  vec3 diffuse = u_diffuse + texture2D(u_diffuseMap, v_texcoord).rgb;
+  vec3 diffuse = u_diffuse + texture2D(u_diffuseMap, texcoord).rgb;
   vec3 ambient = u_ambient * diffuse;
-  vec3 normal = texture2D(u_normalMap, v_texcoord).xyz * 2.0 - 1.0;
+  vec3 normal = texture2D(u_normalMap, texcoord).xyz * 2.0 - 1.0;

   // ...
 }
```

可以注意到 `u_useMirrorTexcoord` 為 true 時，有個 `(v_mirrorTexcoord.xy / v_mirrorTexcoord.w)`，為什麼要除以 `.w` 呢？還記得 [Day 12](https://ithelp.ithome.com.tw/articles/10262793) 時，頂點位置在進入 clip space 之前，會把 `gl_Position.x`, `gl_Position.y`, `gl_Position.z` 都除以 `gl_Position.w`，而 varying `v_mirrorTexcoord` 當然就沒有這樣的行為了，我們得自己實做，然後 `* 0.5 + 0.5` 就是把 clip space 位置（-1 ~ +1）轉換成 texture 上的 texcoord (0 ~ +1)

完成 shader 的修改，剩下的就是把需要餵進去的 uniform 餵進去，並且在正式『
『畫』的時候也畫出球體：

```diff=
 function render(app) {
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);

   gl.canvas.width = gl.canvas.clientWidth;
   gl.canvas.height = gl.canvas.clientHeight;
   gl.viewport(0, 0, canvas.width, canvas.height);

+  renderBall(app, viewMatrix);
-  renderGround(app, viewMatrix);
+  renderGround(app, viewMatrix, mirrorViewMatrix);
 }
 
-function renderGround(app, viewMatrix) {
+function renderGround(app, viewMatrix, mirrorViewMatrix) {
   // ...

   twgl.setUniforms(programInfo, {
     // ...
-    u_diffuseMap: textures.fb,
+    u_diffuseMap: textures.mirror,
     // ...
+    u_useMirrorTexcoord: true,
+    u_mirrorMatrix: mirrorViewMatrix,
   });

   twgl.drawBufferInfo(gl, objects.ground.bufferInfo);
+
+  twgl.setUniforms(programInfo, {
+    u_useMirrorTexcoord: false,
+  });
 }
```

在最後還有特地把 `u_useMirrorTexcoord` 關閉，因為只有地板物件會需要這個特殊的模式，而 uniform 是跟著 program 的，畫完此物件立刻關閉可以避免影響到其他物件的渲染

鏡面效果就完成了：

![mirror-demo](https://i.imgur.com/a7DHFIe.gif)

本篇的完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/bc5bfae](https://github.com/pastleo/webgl-ironman/commit/bc5bfae5d1541a3a54f78fdc2752d388415fba3c)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/bc5bfae5d1541a3a54f78fdc2752d388415fba3c/05-framebuffer-shadow.html)

---

## Day 24: 陰影（上）

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 24 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。本章節講述的是如何透過 framebuffer 使 WebGL 預先計算資料到 texture，並透過這些預計算的資料製作鏡面、陰影效果，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

有了 framebuffer 的幫助，我們可以動用 GPU 的力量事先運算，在正式繪製畫面時使用。繼鏡面完成之後，根據 [Day 22](TBD) 所說，另一個 framebuffer 的應用是陰影，接下來就來介紹如何製作出陰影效果

### 如何『拍攝』深度照片

陰影的產生是因為物體表面到光源之間有其他物體而被遮住，為了得知有沒有被遮住，我們可以從光源出發『拍攝』一次場景，從上篇改用 twgl 時有提到 framebuffer 也可以包含深度資訊，實際繪製畫面時就可以利用深度資訊來得知是否在陰影下

![shadow](https://static.pastleo.me/assets/day24-shadow-210917230141.svg)

但是目前的光源是平行光，這樣要怎麼拍攝？首先，利用 [Day 11](https://ithelp.ithome.com.tw/articles/10262395) 的 Orthogonal 3D 投影，如果光線是直直往 +y 的方向與地面垂直倒是蠻容易想像的，不過如果不是的時候，那麼感覺拍攝的範圍就沒辦法很大（淡藍色區域為投影區域，藍色面為成像面）：

![orthogonal-light-projection](https://static.pastleo.me/assets/day24-orthogonal-light-projection-210917232509.svg)

筆者想到在矩陣運算中還有一個叫做 [shear](https://zh.wikipedia.org/wiki/%E9%94%99%E5%88%87)，可以把一個空間中的矩形轉換成平行四邊形，透過這個工具，可以使得投影區域為平行四邊形：

![shear-orthogonal-light-projection](https://static.pastleo.me/assets/day24-shear-orthogonal-light-projection-210917233947.svg)

### 建立存放深度資訊的 texture

如果去看 `twgl.createFramebufferInfo()` 預設建立的 framebuffer 與 textures 組合，可以看到一個存放顏色的 texture，但是另一個存放深度資訊卻不是 texture，是一個叫做 `WebGLRenderbuffer` 的東西：

![WebGLTexture-and-WebGLRenderbuffer](https://i.imgur.com/eJSgjy8.png)

經過測試，`WebGLRenderbuffer` 無法當成 texture 使用，為了建立能放深度資訊的 texture，需要 WebGL extension [`WEBGL_depth_texture`](https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_depth_texture)，跟 [Day 16](https://ithelp.ithome.com.tw/articles/10265070) 的 VAO 功能一樣，不是 WebGL spec 的一部分，幸好 [`WEBGL_depth_texture` 在主流瀏覽器中都有支援](https://caniuse.com/?search=WEBGL_depth_texture)，只是需要寫一點程式來啟用：

```javascript=
async function setup() {
  const gl = canvas.getContext('webgl');
  // ...

  const webglDepthTexExt = gl.getExtension('WEBGL_depth_texture');
  if (!webglDepthTexExt) {
    throw new Error('Your browser does not support WebGL ext: WEBGL_depth_texture')
  }

  // ...
}
```

啟用後，建立 framebuffer-texture 時便可指定 texture 的格式為 `gl.DEPTH_COMPONENT` 存放深度資訊，筆者將此 framebuffer-texture 命名為 `lightProjection`:

```javascript=
async function setup() {
  // ...

  framebuffers.lightProjection = twgl.createFramebufferInfo(gl, [{
    attachmentPoint: gl.DEPTH_ATTACHMENT,
    format: gl.DEPTH_COMPONENT,
  }], 2048, 2048);
  textures.lightProjection = framebuffers.lightProjection.attachments[0];

  // ...
}
```

### 建立一組拍攝深度用的 shader

在拍攝深度時，顏色計算就變成多餘的，同時為了預覽深度照片的成像，因此建立了一個簡單的 fragment shader，待會會與現有的 `vertexShaderSource` 連結：

```c=
precision highp float;

varying float v_depth;

void main() {
  gl_FragColor = vec4(v_depth, v_depth, v_depth, 1);
}
```

可以看到這個 fragment shader 需要 varying `v_depth`，因此在 vertex shader 中輸出：

```diff=
+varying float v_depth;

 void main() {
   // ...
 
+  v_depth = gl_Position.z / gl_Position.w * 0.5 + 0.5;
 }
```

因為 `gl_Position.z / gl_Position.w` clip space 中的範圍是 -1 ~ +1，因此 `* 0.5 + 0.5` 使之介於 0 ~ +1 用於顏色輸出，並且使用 `twgl.createProgramInfo()` 建立 `depthProgramInfo`:

```diff=
 async function setup() {
   // ...
+  const depthProgramInfo = twgl.createProgramInfo(gl, 
+    [vertexShaderSource, depthFragmentShaderSource]
+  );

   return {
     gl,
-    programInfo,
+    programInfo, depthProgramInfo,
     // ...
   }
 }
```

### 產生 light projection 用的 transform matrix

現有的光線方向向量是由 `state.lightRotationXY` 所控制，根據產生程式：

```javascript=
const lightDirection = matrix4.transformVector(
  matrix4.multiply(
    matrix4.yRotate(state.lightRotationXY[1]),
    matrix4.xRotate(state.lightRotationXY[0]),
  ),
  [0, -1, 0, 1],
).slice(0, 3);
```

光線一開始向著 -y 方向，接著旋轉 x 軸 `state.lightRotationXY[0]` 以及 y 軸 `state.lightRotationXY[1]`，場景物件放置在 xz 平面上，因此 shear 時使用的角度為旋轉 x 軸的 `state.lightRotationXY[0]`，整個 transform 經過以下步驟：

1. 移動視角，因 `matrix4.projection()` 捕捉的正面看著 +z，需要先旋轉使之看著 -y，接著旋轉 y 軸 `state.lightRotationXY[1]`，這兩個轉換就是 [Day 13](https://ithelp.ithome.com.tw/articles/10263278) 的視角 transform，需要做反矩陣
2. shearing，同樣因為 `matrix4.projection()` 捕捉的正面看著 +z，依據角度偏移 y 值：`y' = y + z * tan(state.lightRotationXY[0])`
3. 使用 `matrix4.projection()` 進行投影，捕捉場景中 xz 介於 0 ~ 20，y （深度）介於 0 ~ 10 的物件
4. `matrix4.projection()` 會把原點偏移到左上，透過 `matrix4.translate(1, -1, 0)` 轉換回來，最後捕捉場景中 xz 介於 -10 ~ +10，y 介於 -5 ~ +5 的物件

把這些 transform 通通融合進 `lightProjectionViewMatrix`:

```javascript=
function render(app) {
  // ...
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

  // ...
}
```

### 視覺化深度到畫面上看看

因為現在有多個 program，得在 `renderBall()` 以及 `renderGround()` 時指定使用的 program，因此加入 `programInfo` 參數到這兩個 function

```diff=
-function renderBall(app, viewMatrix) {
-  const { gl, programInfo, textures, objects } = app;
+function renderBall(app, viewMatrix, programInfo) {
+  const { gl, textures, objects } = app;
   // ...
 }

-function renderGround(app, viewMatrix, mirrorViewMatrix) {
-  const { gl, programInfo, textures, objects } = app;
+function renderGround(app, viewMatrix, mirrorViewMatrix, programInfo) {
+  const { gl, textures, objects } = app;
   // ...
 }
```

並且修改現有渲染到畫面上的流程使用 `depthProgramInfo` 以及 `lightProjectionViewMatrix`:

```diff=
 function render(app) {
   const {
     gl,
     framebuffers,
-    programInfo,
+    programInfo, depthProgramInfo,
     state,
   } = app;

   twgl.bindFramebufferInfo(gl, framebuffers.mirror);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

-  renderBall(app, mirrorViewMatrix);
+  renderBall(app, mirrorViewMatrix, programInfo);

   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
   // ...

-  renderBall(app, viewMatrix);
-  renderGround(app, viewMatrix, mirrorViewMatrix);
+  gl.useProgram(depthProgramInfo.program);
+
+  renderBall(app, lightProjectionViewMatrix, depthProgramInfo);
+  renderGround(app, lightProjectionViewMatrix, mirrorViewMatrix, depthProgramInfo);
 }
```

我們就獲得了灰階的深度視覺化：

![visualized-depth](https://i.imgur.com/JrP7q8N.gif)

至於回到正式『畫』時使用這些資訊繪製陰影的部份，將在下篇繼續實做，本篇的完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/598a7f8](https://github.com/pastleo/webgl-ironman/commit/598a7f8c4ca6aeb84fb2371a01e2dd5d432a8432)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/598a7f8c4ca6aeb84fb2371a01e2dd5d432a8432/05-framebuffer-shadow.html)

---

## Day 25: 陰影（下）

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 25 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。本章節講述的是如何透過 framebuffer 使 WebGL 預先計算資料到 texture，並透過這些預計算的資料製作鏡面、陰影效果，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

在 [Day 24](TBD) 渲染好深度並繪製到畫面上，可以看到中間一顆球的輪廓，並且在其頂部的地方顏色深度更深，表示更接近深度投影的投影面，接下來讓這個拍攝深度的目標移動到 framebuffer/texture 去，並且在渲染給使用者時使用

### 移動拍攝深度資訊的目標至 framebuffer

現在開始除了鏡面的 framebuffer 渲染之外又要多了光源投影，為了讓渲染到不同 framebuffer 之程式能夠在程式碼中比較好分辨，筆者建立一個 `{}` 區域來表示這個區域在做光源投影：

```javascript=
function render(app) {
  // ...

  { // lightProjection
    gl.useProgram(depthProgramInfo.program);

    twgl.bindFramebufferInfo(gl, framebuffers.lightProjection);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    renderBall(app, lightProjectionViewMatrix, depthProgramInfo);
    renderGround(app, lightProjectionViewMatrix, mirrorViewMatrix, depthProgramInfo);
  }
  
  // ...
}
```

把這個區域放置在鏡面 framebuffer 渲染前，畢竟在鏡面世界可以看到陰影。因為渲染到鏡面世界時與正式渲染都使用主要的 `programInfo`，把 `gl.useProgram()` 移動下來與設定全域 uniform 到此 `programInfo` 的 `twgl.setUniforms()` 放在一起，同時也把鏡面世界的渲染用 `{}` 包起來：

```diff=
 function render(app) {
   const {
     gl,
-    framebuffers,
+    framebuffers, textures,
     programInfo, depthProgramInfo,
     state,
   } = app;
  
-  gl.useProgram(programInfo.program);
-
   const lightProjectionViewMatrix = matrix4.multiply( /* ... */)
   // ...
   
   { // lightProjection
     // ...
   }
   
+  gl.useProgram(programInfo.program);
   twgl.setUniforms(programInfo, {
     u_worldViewerPosition: cameraMatrix.slice(12, 15),
     u_lightDirection: lightDirection,
     u_ambient: [0.4, 0.4, 0.4],
   });
  
-  twgl.bindFramebufferInfo(gl, framebuffers.mirror);
-  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
+  { // mirror
+    twgl.bindFramebufferInfo(gl, framebuffers.mirror);
+    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
-  renderBall(app, mirrorViewMatrix, programInfo);
+    renderBall(app, mirrorViewMatrix, programInfo);
+  }
   // ...
 }
```

最後是讓正式『畫』的程式回復使用 `viewMatrix`, `programInfo`:

```diff=
 function render(app) {
   // ...
   { // mirror
     // ...
   }
   
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);

   gl.canvas.width = gl.canvas.clientWidth;
   gl.canvas.height = gl.canvas.clientHeight;
   gl.viewport(0, 0, canvas.width, canvas.height);

-  gl.useProgram(depthProgramInfo.program);
-
-  renderBall(app, lightProjectionViewMatrix, depthProgramInfo);
-  renderGround(app, lightProjectionViewMatrix, mirrorViewMatrix, depthProgramInfo);
+  renderBall(app, viewMatrix, programInfo);
+  renderGround(app, viewMatrix, mirrorViewMatrix, programInfo);
 }
```

### 計算是否在陰影下

這麼一來深度資訊就會存在 `textures.lightProjection` 中，接下來請參考這張圖：

![using-light-projection](https://static.pastleo.me/assets/day25-using-light-projection-210919171329.svg)

經過光源投影之後，B 點上的深度來自 A 點，如果從 C 進行光源投影同樣會到達 B 點的位置，但是深度將會比較深，我們可以利用這一點來檢查是否在陰影下，把 C 點投影到 B 點的原理其實跟 [Day 23](TBD) 鏡面計算 texture 位置一樣，將在 fragment shader 中得到的表面位置進行 framebuffer 的 view matrix 轉換，也就是 `lightProjectionViewMatrix`

把光源投影的 view 矩陣用名為 `u_lightProjectionMatrix` 的 uniform 傳入，並且在 vertex shader 中 transform 成 `v_lightProjection` 投影後的位置：

```diff=
 uniform mat4 u_mirrorMatrix;
+uniform mat4 u_lightProjectionMatrix;

 // ...

 varying float v_depth;
+varying vec4 v_lightProjection;

 void main() {
   v_depth = gl_Position.z / gl_Position.w * 0.5 + 0.5;
+  v_lightProjection = u_lightProjectionMatrix * worldPosition;
 }
```

在 fragment shader 方面，接收 `u_lightProjectionMatrix` 以及 `v_lightProjection`，並且跟 `v_mirrorTexcoord` 一樣要除以 `.w` 使之與 clip space 中的位置相同，接著需要兩個深度：

* 由 `v_lightProjection.z / v_lightProjection.w` 計算而來的 `lightToSurfaceDepth`: 表示該點（可能為 A 或是 C 點）投影下去的深度
* 從 `u_lightProjectionMap` 查詢到的值：光源投影時該點的深度，也就是 B 點上的值

```c=
// ...
uniform sampler2D u_lightProjectionMap;
varying vec4 v_lightProjection;

void main() {
  // ...

  vec2 lightProjectionCoord =
    v_lightProjection.xy / v_lightProjection.w * 0.5 + 0.5;
  float lightToSurfaceDepth =
    v_lightProjection.z / v_lightProjection.w * 0.5 + 0.5;
  float lightProjectedDepth = texture2D(
    u_lightProjectionMap,
    lightProjectionCoord
  ).r;
}
```

除了 `lightProjectionCoord` 要 `* 0.5 + 0.5` 以符合 texture 上的座標範圍外，`v_lightProjection.z / v_lightProjection.w` 在 clip space 為 -1 ~ +1，也要傳換成 0 ~ +1，以符合深度 texture 『顏色』的 channel 值域。資料準備就緒，進行深度比較：

```c=
float occulusion = lightToSurfaceDepth > lightProjectedDepth ? 0.5 : 0.0;

diffuseBrightness *= 1.0 - occulusion;
specularBrightness *= 1.0 - occulusion * 2.0;
```

筆者使用 `occulusion` 表示『有多少成的光源被遮住』，並設定成在陰影下時減少 50% 的散射光亮度以及全部反射光，結果長這樣：

![shadow-too-sensitive](https://i.imgur.com/ORrrktQ.gif)

真的該有陰影的地方是有陰影了：

![correct-shadow-regions](https://i.imgur.com/rj4SM0M.png)

不過顯然陰影區域太大，而且球體上光照的區域也有一點一點的陰影，為什麼會這樣呢？儘管像是上方示意圖中的 A 點，光源投影下來的深度與後來重算的深度可能因為 GPU 計算過程中浮點數的微小差異而導致 `lightToSurfaceDepth > lightProjectedDepth` 成立，為了避免這個問體我們讓 `lightToSurfaceDepth` 必須比 `lightProjectedDepth` 還要大出一定的數值才判定為有陰影，筆者讓這個值為 `0.01`:

```diff=
 void main() {
   // ..
-  float occulusion = lightToSurfaceDepth > lightProjectedDepth ? 0.5 : 0.0;
+  float occulusion = lightToSurfaceDepth > 0.01 + lightProjectedDepth ? 0.5 : 0.0;
 }
```

陰影功能就完成囉：

![finished-shadow](https://i.imgur.com/GeXxthU.gif)

完整的程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/1ff8ad4](https://github.com/pastleo/webgl-ironman/commit/1ff8ad4b0a0e1ae30471ed0fbb4ab4852832d882)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/1ff8ad4b0a0e1ae30471ed0fbb4ab4852832d882/05-framebuffer-shadow.html)

好了，花了這麼多篇介紹光線相關的效果，從散射光、反射光到鏡面與陰影，這些效果加在一起可以製作出頗生動的畫面，不覺得上面的畫面蠻漂亮的嗎？在此同時本系列技術文章也將進入尾聲，下個章節將製作一個完整的場景作為完結作品：帆船與海