---
tags: webgl, ironman, post
---

CH6: Boat and Ocean [WebGL 鐵人]
===

## Day 26: 3D 物件檔案 — .obj

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 26 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

到了本系列文章的尾聲，本章節將製作一個完整的場景作為完結作品：主角是一艘帆船，在一片看不到邊的海面上，天氣晴朗。

### `06-boat-ocean.html` / `06-boat-ocean.js`

基於先前製作的光影效果，筆者製作了新的起始點：

* [github.com/pastleo/webgl-ironman/commit/3a8fa96](https://github.com/pastleo/webgl-ironman/commit/3a8fa96c73b9c03779511cf55fd9030b4c07588b)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/3a8fa96c73b9c03779511cf55fd9030b4c07588b/06-boat-ocean.html)

![live-screen-recording](https://i.imgur.com/3PJ0eaU.gif)

此起始點相較於 [Day 25](https://ithelp.ithome.com.tw/articles/10271769)，主要有以下修改：

* 地板（ground）改為海洋（ocean），並且有獨立自己的 fragment shader，目前使用 normal map 使之有一個固定的波紋，在本章將會讓改成隨時間變化的波紋
  * 同時也讓 normal map 取得之法向量對[水面倒影](https://github.com/pastleo/webgl-ironman/commit/3a8fa96c73b9c03779511cf55fd9030b4c07588b#diff-400466703b905719410c55a4a09ba7671c00b4515f8be73365a10739c83f1a0eR151)、[陰影](https://github.com/pastleo/webgl-ironman/commit/3a8fa96c73b9c03779511cf55fd9030b4c07588b#diff-400466703b905719410c55a4a09ba7671c00b4515f8be73365a10739c83f1a0eR164)造成影響（distortion），才不會顯得反射光與倒影、陰影有衝突感
* 使用 [`twgl.createTextures()`](https://twgljs.org/docs/module-twgl.html#.createTextures) 使 texture 之讀取、建立程式可以大幅縮短
* 使用 [`twgl.resizeCanvasToDisplaySize()`](https://twgljs.org/docs/module-twgl.html#.resizeCanvasToDisplaySize) 取代 canvas 之大小調整，同時在右上角讓使用者調整解析度倍率，一般來說是 `普通` 也就是一倍，如果 [`window.devicePixelRatio`](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio) 大於 1（例如 Retina 螢幕），使用者也可以提高使用完整的螢幕解析度

可以看到畫面上有一顆從上上個章節就一直存在的球體，第一個目標就是將之換成新主角 -- 帆船

### `.obj` / `.mtl` 檔案

[`.obj`](https://en.wikipedia.org/wiki/Wavefront_.obj_file) 存放的是 3D 物件資料，精確的說，經過讀取後可以成為 vertex attribute 的資料來源，包含了各個頂點的位置、texcoord、法向量，成為 3D 場景中的一個物件，而 `.mtl` 則是存放材質資料，像是散射光、反射光的顏色等

筆者先前在練習 `.obj` 的讀取時，順便小小學習了 [Blender](https://www.blender.org/) 這套開源的 3D 建模軟體，並且製作了一艘船：

[https://sketchfab.com/3d-models/my-first-boat-f505dd73384245e08765ea6824b12644](https://sketchfab.com/3d-models/my-first-boat-f505dd73384245e08765ea6824b12644)

![boat-screenshot](https://i.imgur.com/xaL3lWI.png)

這個模型就成了筆者接下來練習時需要模型時使用的素材，同時也是我們要放入場景中的帆船，匯出成 `.obj` & `.mtl` 之後，用文字編輯器打開其 `.obj` 可以看到：

```
# Blender v2.93.0 OBJ File: 'my-first-boat.blend'
# www.blender.org
mtllib my-first-boat.mtl
o Cube_Cube.001
v -0.245498 -0.021790 2.757482
v -0.551836 0.552017 2.746644
v -0.371110 -0.118091 0.326329
...
vt 0.559949 0.000000
vt 0.625000 0.000000
vt 0.625000 0.250000
...
vn -0.7759 -0.6250 0.0861
vn 0.0072 -0.0494 -0.9988
vn 0.7941 -0.6020 0.0836
...
usemtl body
...
f 17/1/1 2/2/1 4/3/1 18/4/1
f 18/4/2 4/3/2 8/5/2 19/6/2
f 19/6/3 8/5/3 6/7/3 20/8/3
...
o Cylinder.004_Cylinder.009
v 0.000000 0.308823 0.895517
v 0.000000 0.640209 0.895517
...
```

`.obj` 要紀錄 3D 物件的每個頂點資料，想當然爾檔案通常不小，這個模型有 20.6k 個三角形，檔案大小約 1.3MB，這邊不會看全部的細節，只擷取了一些小片段來觀察其內容

* `mtllib my-first-boat.mtl` 的 `mtllib ` 開頭表示使用了 `my-first-boat.mtl` 這個檔案來描述材質
* `o Cube_Cube.001` 的 `o ` 開頭表示一個子物件的開始，`Cube_Cube.001` 這個名字來自於 blender 中的物件名稱
* `v -0.245498 -0.021790 2.757482` / `vt 0.559949 0.000000` / `vn -0.7759 -0.6250 0.0861` 的 `v ` / `vt ` / `vn ` 開頭分別為位置、texcoord、法向量資料，實際去打開檔案可以看到 `.obj` 絕大部分的內容都像這樣
* `usemtl body` 表示這個子物件要使用的材質的名字，理論上可以在 `.mtl` 中找到對應的名字
* `f 17/1/1 2/2/1 4/3/1 18/4/1` 表示一個『面』，這邊是一個四邊形，有四個頂點，每個頂點分別用一個 index 數字表示使用的哪一筆位置、texcoord、法向量，類似於 [Day 18](https://ithelp.ithome.com.tw/articles/10266668) 之 indexed element
* 接下來看到另一個 `o ` 開頭 `o Cylinder.004_Cylinder.009` 表示另一個子物件的開始，`Cube_Cube.001` 這個名字來自於 blender 中的物件名稱

同樣地，看一下 `.mtl` 的片段：

```
# Blender MTL File: 'my-first-boat.blend'
# Material Count: 10

newmtl Material.001
Ns 225.000000
Ka 1.000000 1.000000 1.000000
Kd 0.352941 0.196078 0.047058
Ks 0.500000 0.500000 0.500000
Ke 0.000000 0.000000 0.000000
Ni 1.450000
d 1.000000
illum 2

...

newmtl flag-my-logo
Ns 225.000000
Ka 1.000000 1.000000 1.000000
Kd 0.000000 0.000000 0.000000
Ks 0.500000 0.500000 0.500000
Ke 0.000000 0.000000 0.000000
Ni 1.450000
d 1.000000
illum 2
map_Kd me.png
```

這個檔案就相對小很多，`newmtl Material.001` 對應 `.obj` 中的材質名稱，接下來則是對於不同光線的顏色或參數，根據[這邊](https://people.sc.fsu.edu/~jburkardt/data/mtl/mtl.html)的定義，`Ka` 表示環境光顏色、`Kd` 散射光顏色、`Ks` 反射光顏色、`Ns` 反射光『範圍參數』（`u_specularExponent`），`Ke` 在 [stackoverflow 上](https://stackoverflow.com/questions/36964747/ke-attribute-in-mtl-files)說是自發光的顏色；最後帆船模型中間船桅上有一面旗子，旗子中的圖案使用了 texture，因此 `flag-my-logo` 這個材質有一個參數 `map_Kd me.png` 表示要使用 `me.png` 這個圖檔作為 texture；剩下的設定在我們的 shader 中也沒有相關的實做，就先忽略不管

開始寫程式讀取 `.obj` 之前，可以從[這邊](https://github.com/pastleo/webgl-ironman/tree/e219cc2624bb1586454c472847b41cdf9ae370f6/assets)下載 `my-first-boat.obj`, `my-first-boat.mtl` 以及 `me.png` 放置在專案 `assets/` 資料夾下

> 這邊的 `.mtl` 檔案與上傳到 [sketchfab.com](https://sketchfab.com/3d-models/my-first-boat-f505dd73384245e08765ea6824b12644) 的有點不同，因為本系列文實做的 shader 會導致一些材質顏色不明顯，因此筆者有手動調整 `.mtl` 部份材質的顏色

### 讀取 `.obj` & `.mtl`

好的，綜觀來看，自己寫讀取程式的話，除了 `.obj` / `.mtl` parser 之外，得從 `f ` 開頭的『面』資料展開成一個個三角形，接著取得要使用的位置、texcoord、法向量，轉換成 buffer 作為 vertex attribute 使用，除此之外還要處理 `.mtl` 的對應、建立子物件等，顯然是個不小的工程；既然 `.obj` 是一種公用格式，那麼應該可以找到現成的讀取工具，筆者找到的是這款：

[https://github.com/frenchtoast747/webgl-obj-loader](https://github.com/frenchtoast747/webgl-obj-loader)

可惜作者沒有提供 ES module 的方式引入，因此筆者 fork 此專案並且修改使之可以產出 ES module 的版本：[github.com/pastleo/webgl-obj-loader](https://github.com/pastleo/webgl-obj-loader)，下載 [build 好的 `webgl-obj-loader.esm.js`](https://github.com/pastleo/webgl-obj-loader/blob/master/dist/webgl-obj-loader.esm.js) 並放至於專案的 `vendor/webgl-obj-loader.esm.js`，接著在 `06-boat-ocean.js` 就可以直接引入：

```javascript=
import * as WebGLObjLoader from './vendor/webgl-obj-loader.esm.js';
```

接著建立一個 function 來串接 `WebGLObjLoader` 讀取 `.obj`, `.mtl` 並傳入 WebGL，經過一些 survey 之後筆者使用它的 `WebGLObjLoader.downloadModels()`，可以同時下載所有需要的檔案並解析好，包含 `.mtl` 甚至 texture 圖檔，先看一下經過 `WebGLObjLoader` 讀取好的資料看起來如何：

```javascript=
async function loadBoatModel(gl) {
  const { boatModel } = await WebGLObjLoader.downloadModels([{
    name: 'boatModel',
    obj: './assets/my-first-boat.obj',
    mtl: true,
  }]);
  
  console.log(boatModel);
}
```

在 `setup()` 中呼叫：

```javascript=
async function setup() {
  // ...
  await loadBoatModel(gl);
  // ...
}
```

![loaded-model-data](https://i.imgur.com/KphMFK3.png)

配合[其文件的說明](https://github.com/frenchtoast747/webgl-obj-loader#meshobjstr)，`.vertices` 對應 `a_position`、`.vertexNormals` 對應 `a_texcoord`、`.textures` 對應 `a_normal`，但是這些 vertex attribute 不能直接使用，而是要透過 `.indices` 指向每個頂點對應的資料，同時 `.indices` 已經是 [Day 18](https://ithelp.ithome.com.tw/articles/10266668) 的 indexed element 所需要之 `ELEMENT_ARRAY_BUFFER`，不像是 `.obj` 中一個個 `f ` 開頭的頂點指向不同組 position/texcoord/normal

那材質的部分呢？在我們的實作中同一個物件一次渲染只能指定一組 `u_diffuse`, `u_specular` 等 uniform 讓物件為一個單色，要不然就是用 `u_diffuseMap` 指定 texture，直接使用 `.indices` 作為 `ELEMENT_ARRAY_BUFFER` 的話便無法使不同子物件使用不同的材質，幸好 `WebGLObjLoader` 所回傳的物件中有 `.indicesPerMaterial`，裡面包含了一個個的 indices 陣列，分別對應一組材質設定，有趣的事情是，這些 indices 所對應的實際 vertex attribute 是共用的，也就是說 position/texcoord/normal 的 buffer 只要建立一組，接下來每個子物件建立各自的 indices buffer 並與共用 position/texcoord/normal 的 buffer 組成『物件』 VAO，最後渲染時各個物件設定好各自的 uniform 後進行繪製即可

因此在 `WebGLObjLoader.downloadModels()` 之後建立共用的 bufferInfo:

```javascript=
async function loadBoatModel(gl) {
  const { boatModel } = await WebGLObjLoader.downloadModels([{ /* ... */ }]);

  const sharedBufferInfo = twgl.createBufferInfoFromArrays(gl, {
    position: { numComponents: 3, data: boatModel.vertices },
    texcoord: { numComponents: 2, data: boatModel.textures },
    normal: { numComponents: 3, data: boatModel.vertexNormals },
  });
}
```

接下來讓 `app.objects.boat` 表示整艘帆船，但是要一個一個繪製子物件，因此使 `app.objects.boat` 為一個陣列，每一個元素包含子物件的 bufferInfo, VAO 以及 uniforms，從 `boatModel.indicesPerMaterial.map()` 出發：

```javascript=
async function loadBoatModel(gl, programInfo) {
  // ...
  return boatModel.indicesPerMaterial.map((indices, mtlIdx) => {
    const material = boatModel.materialsByIndex[mtlIdx];

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
      indices,
    }, sharedBufferInfo);

    return {
      bufferInfo,
      vao: twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo),
    }
  });
}
```

1. 在 `.indicesPerMaterial` 陣列中，第幾個 indices 陣列就使用第幾個 material，因此 `boatModel.materialsByIndex[mtlIdx];` 取得對應的材質設定
2. 使用 [`twgl.createBufferInfoFromArrays()`](https://twgljs.org/docs/module-twgl.html#.createBufferInfoFromArrays) 的第三個參數 `srcBufferInfo` 來『共用』剛才建立的 `sharedBufferInfo`，這感覺其實有點像是 Map 的 merge 或是 [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
3. 為 `loadBoatModel()` 傳入 `programInfo`，以便建立 VAO

這樣一來 vertex attribute buffer, indices buffer 以及 VAO 就準備好了，剩下的就是把材質資料轉成 uniforms key-value 物件，把這邊取得的 `material` 印出來看：

![material-content](https://i.imgur.com/yS8PWRq.png)

雖然這個物件有不少東西，不過要找到 `u_diffuse`, `u_specular` 對應的資料不會很困難，名字幾乎能夠直接對起來；如果是有 texture 的，可以在 `material.mapDiffuse.texture` 找到，而且已經是 [Image](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement) 物件，直接餵給 `twgl.createTexture()` 即可：

```javascript=
async function loadBoatModel(gl, textures, programInfo) {
  // ...

  return boatModel.indicesPerMaterial.map((indices, mtlIdx) => {
    const material = boatModel.materialsByIndex[mtlIdx];

    let u_diffuseMap = textures.nil;
    if (material.mapDiffuse.texture) {
      u_diffuseMap = twgl.createTexture(gl, {
        wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE,
        min: gl.LINEAR_MIPMAP_LINEAR,
        src: material.mapDiffuse.texture,
      });
    }

    return {
      /* bufferInfo, vao */,
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
```

對於沒有使用 texture 的子物件，就跟之前一樣要設定成 `texture.nil` 避免影響到單色渲染，令一個比較特別的是 `u_ambient`，因為筆者為此系列文撰寫的 shader 運作方式與 blender、[sketchfab.com](https://sketchfab.com/3d-models/my-first-boat-f505dd73384245e08765ea6824b12644) 上看到的不同，或許是有些材質的設定沒實做的關係，會顯得特別暗，同時 `u_ambient` 這邊實做的功能是基於 diffuse 的最低亮度，因此筆者一律設定成 `[0.6, 0.6, 0.6]`

因為原本 `u_ambient` 為全域的 uniform，而之後會變成各個物件個別設定，最後在 `setup()` 中傳入所需的參數並接收子物件陣列到 `app.objects.boat` 準備好：

```diff=
 async function setup() {
   // ...
+  objects.boat = await loadBoatModel(gl, textures, programInfo);
   // ...
 }

 function render(app) {
   // ...
   const globalUniforms = {
     u_worldViewerPosition: cameraMatrix.slice(12, 15),
     u_lightDirection: lightDirection,
-    u_ambient: [0.4, 0.4, 0.4],
     // ...
   }
 }
 
 function renderBall(app, viewMatrix, programInfo) {
   // ...
   twgl.setUniforms(programInfo, {
     // ...
     u_emissive: [0.15, 0.15, 0.15],
+    u_ambient: [0.4, 0.4, 0.4],
     // ...
   });
 }

 function renderOcean(app, viewMatrix, reflectionMatrix, programInfo) {
   // ...
   twgl.setUniforms(programInfo, {
     // ...
     u_emissive: [0, 0, 0],
+    u_ambient: [0.4, 0.4, 0.4],
     // ...
   });
   // ...
 }
```

這樣一來 `app.objects.boat` 就準備好帆船的資料了，雖然畫面上沒有變化，但是可以在 Console 上輸入 `app.objects.boat` 來確認：

![app.objects.boat-content](https://i.imgur.com/k2f8EEl.png)

確認資料準備好了，待下篇來把球體換成帆船，繪製 `.obj` 模型到畫面上！本篇的完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/64d48cf](https://github.com/pastleo/webgl-ironman/commit/64d48cf647da5938b491306f60ee15bb8a5611e3)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/64d48cf647da5938b491306f60ee15bb8a5611e3/06-boat-ocean.html)

## Day 27: .obj 之繪製 & Skybox

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 27 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。在本系列文的最後章節將製作一個完整的場景作為完結作品：帆船與海，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

### 繪製 `.obj` 取代球體

[Day 26](https://ithelp.ithome.com.tw/articles/10272436) 經過套件幫忙讀取並準備好 `app.objects.boat`，為繪製到畫面上的部份建立一個 `renderBoat` function:

```javascript=
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
```

* `worldMatrix` 與之前的物件差不多，用來決定整體物件位置的 transform，其中 `matrix4.yRotate(degToRad(45))` 讓帆船可以稍微轉一下不要屁股面對使用者
* [`twgl.setUniforms`](https://twgljs.org/docs/module-twgl.html#.setUniforms) 設定帆船所有子物件共用的 uniforms
* `objects.boat.forEach()` 把所有子物件繪製出來，在 `loadBoatModel()` 就為每個子物件整理好 `bufferInfo`, `vao`, `uniforms`，只要把 VAO 工作區域切換好、設定個別子物件的 uniform（材質設定）便可以進行『畫』的動作

最後把 `renderBall()` 替換成 `renderBoat()`:

```diff=
 function render(app) {
   // ...

   { // lightProjection
     gl.useProgram(depthProgramInfo.program);

     twgl.bindFramebufferInfo(gl, framebuffers.lightProjection);
     gl.clear(gl.DEPTH_BUFFER_BIT);

-    renderBall(app, lightProjectionViewMatrix, depthProgramInfo);
+    renderBoat(app, lightProjectionViewMatrix, depthProgramInfo);
     renderOcean(app, lightProjectionViewMatrix, reflectionMatrix, depthProgramInfo);
   }
   
   { // reflection
     twgl.bindFramebufferInfo(gl, framebuffers.reflection);
     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

-    renderBall(app, reflectionMatrix, programInfo);
+    renderBoat(app, reflectionMatrix, programInfo);
   }
   
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
   
   // ...
  
-  renderBall(app, viewMatrix, programInfo);
+  renderBoat(app, viewMatrix, programInfo);
  
   gl.useProgram(oceanProgramInfo.program);
   twgl.setUniforms(oceanProgramInfo, globalUniforms);
   renderOcean(app, viewMatrix, reflectionMatrix, oceanProgramInfo);
 }
```

新的主角 -- 帆船就出現在畫面中囉：

![boat](https://i.imgur.com/1Puy5go.gif)

筆者也把原本球體相關的程式移除，避免讀取不必要的檔案，程式碼在此：

* [github.com/pastleo/webgl-ironman/commit/91dc64b](https://github.com/pastleo/webgl-ironman/commit/91dc64bcfa495f8039734e4a63c09e775ab616c2)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/91dc64bcfa495f8039734e4a63c09e775ab616c2/06-boat-ocean.html)

在上個章節中實做好的陰影、反射效果，配合海面的 normal map 以及 distortion，只要在 `lightProjection` 以及 `reflection` 執行船體的渲染，帆船的水面倒影、陰影就完成了，這麼一來整個場景已經可以看得出來是一艘帆船在海上囉；但是如果把視角調低，就可以立刻看到我們缺少的東西：天空

![blank-sky](https://i.imgur.com/S4GpFSj.png)

### Skybox

3D 場景中的天空事實上只是一個背景，但是要符合視角方向，因此這個背景就成了一張 360 度的照片，類似於 [Google 街景](https://www.google.com/streetview/)那樣，在 WebGL 中要做出這樣效果可以透過 `gl.TEXTURE_CUBE_MAP` 的 texture 來做到；我們常用的 texture 形式是 `gl.TEXTURE_2D`，在 shader 中以 `texture2D()` 傳入 2D 平面上的位置來取樣，使用 `gl.TEXTURE_CUBE_MAP` 的 texture 時，要給他 6 張圖，分別為 +x, -x, +y, -y, +z, -z，貼在下圖立方體的 6 個面，在 shader 中使用 `textureCube()` 並傳入三維向量（理論上也應該是單位向量），這個向量稱為 normal 法向量，類似於一顆球體表面上某個位置的法向量，取樣的結果將是從立方體正中間往該向量方向出發，其延伸的線與面相交的點的顏色

![cube-map](https://static.pastleo.me/assets/day27-cube-map-210923215958.svg)

若將 `Va` 傳入 `textureCube()`，會取樣到 +x 圖的正中央，`Vb` 的話會取樣到 -y 圖的正中央，`Vc` 的話會取樣到 +y 圖的中間偏左。這樣一來這個天空就像是一個盒子一樣，因此這樣的效果叫做 skybox

### 讀取圖檔並建立 texture cube map

筆者在 [opengameart.org](https://opengameart.org/) 找到 [Sky Box - Sunny Day](https://opengameart.org/content/sky-box-sunny-day) 作為接下來實做 skybox 的素材，把圖貼在文章實在太佔空間，讀者可以點擊這個連結來看：https://imgur.com/a/8EE6sl2

使用 WebGL API 建立、載入 texture 圖片的方法與 [Day 6](https://ithelp.ithome.com.tw/articles/10260664) 的 2D texture 差在兩個地方：

1. `gl.bindTexture()` 時目標為 `gl.TEXTURE_CUBE_MAP` 而非 `gl.TEXTURE_2D`
2. `gl.texImage2D()` 需要呼叫 6 次，把圖片分別輸入到 +x, -x, +y, -y, +z, -z，直接寫下去程式碼會很長：

```javascript=
async function setup() {
  // const textures = ...
  {
    const images = await Promise.all([
      'https://i.imgur.com/vYEUTTe.png',
      'https://i.imgur.com/CQYYFPo.png',
      'https://i.imgur.com/Ol4h1f1.png',
      'https://i.imgur.com/qYV0zv9.png',
      'https://i.imgur.com/uapdS7d.png',
      'https://i.imgur.com/MPL3hRV.png',
    ].map(loadImage));

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      /* level: */ 0, /* internalFormat: */ gl.RGBA, /* format: */ gl.RGBA, /* type: */ gl.UNSIGNED_BYTE,
      images[0],
    );
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      /* level: */ 0, /* internalFormat: */ gl.RGBA, /* format: */ gl.RGBA, /* type: */ gl.UNSIGNED_BYTE,
      images[1],
    );
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      /* level: */ 0, /* internalFormat: */ gl.RGBA, /* format: */ gl.RGBA, /* type: */ gl.UNSIGNED_BYTE,
      images[2],
    );
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      /* level: */ 0, /* internalFormat: */ gl.RGBA, /* format: */ gl.RGBA, /* type: */ gl.UNSIGNED_BYTE,
      images[3],
    );
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      /* level: */ 0, /* internalFormat: */ gl.RGBA, /* format: */ gl.RGBA, /* type: */ gl.UNSIGNED_BYTE,
      images[4],
    );
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      /* level: */ 0, /* internalFormat: */ gl.RGBA, /* format: */ gl.RGBA, /* type: */ gl.UNSIGNED_BYTE,
      images[5],
    );

    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

    textures.skybox = texture;
  }
  // ...
}
```

> 這邊的 `loadImage` 為 `lib/utils.js` 的圖片讀取 async function

看一下 [`twgl.createTextures()`](https://twgljs.org/docs/module-twgl.html#.createTextures) 的文件，可以看到它也可以幫忙載入 texture cube map，既然現有實做中已經使用這個 function 載入 `app.textures`，那麼只要加上這幾行就相當於上面這 48 行程式碼了：

```diff=
 async function setup() {
   const textures = twgl.createTextures(gl, {
     // ...
     nil: { src: [0, 0, 0, 255] },
     nilNormal: { src: [127, 127, 255, 255] },
+    skybox: {
+      target: gl.TEXTURE_CUBE_MAP,
+      src: [
+        'https://i.imgur.com/vYEUTTe.png',
+        'https://i.imgur.com/CQYYFPo.png',
+        'https://i.imgur.com/Ol4h1f1.png',
+        'https://i.imgur.com/qYV0zv9.png',
+        'https://i.imgur.com/uapdS7d.png',
+        'https://i.imgur.com/MPL3hRV.png',
+      ],
+      crossOrigin: true,
+    },
   });
   // ...
 }
```

讀取 6 張圖並建立好 cube texture 後，可以在開發者工具的 Network tab 中看到六張圖

![images-loaded-devtools-network](https://i.imgur.com/bYgd0ls.png)

Cube texture 是準備好了，但是如果要製作出 skybox 效果，還得要為 skybox 建立屬於他的 shader, bufferInfo, VAO，同時還得依據視角產生正確的方向向量以進行 `textureCube()` 從立方體的面上進行取樣，這些工作就留到下一篇繼續討論，到這邊的進度也就只是上面幾行：

* [github.com/pastleo/webgl-ironman/commit/8e3ad9a](https://github.com/pastleo/webgl-ironman/commit/8e3ad9a2ea3c0593197132191ecd911adab6c25b)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/8e3ad9a2ea3c0593197132191ecd911adab6c25b/06-boat-ocean.html)

---

## Day 28: 繪製 Skybox

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 28 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，在本系列文的最後章節將製作一個完整的場景作為完結作品：帆船與海，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

於 [Day 27](https://ithelp.ithome.com.tw/articles/10273128) 建立 cube texture 並把圖片資料下載好，本篇的主要目標就是把 skybox 繪製上去，同時我們也可以讓海面反射天空，使得場景更栩栩如生

### Skybox Shader

因為 skybox 是『背景』，因此 skybox 這個『物件』最終到達 clip space 時應該落在距離觀察位置最遠但是還看得到的地方，回想 [Day 12](https://ithelp.ithome.com.tw/articles/10258991) 這邊提到成像時投影到 `z = -1` 平面、看著 +z 方向，那麼離觀察最遠的平面為 `z = 1`，而且為了填滿整個畫面，skybox 物件在 clip space 中即為 x, y 範圍於 -1 ~ +1 的 `z = 1` 平面，剛好 [`twgl.primitives.createXYQuadVertices()`](https://twgljs.org/docs/module-twgl_primitives.html#.createXYQuadVertices) 幾乎可以直接做出我們需要的這個平面，就差在他沒有 z 的值

這樣聽起來物件的頂點應該是不需要 transform，就只是輸出到 `gl_Position` 的 z 需要設定成 1，比較需要操心的是對 cube texture 取樣時的 normal 法向量，我們將從 clip space 頂點位置出發，透過『某種 transform』指向使用者觀看區域的邊界頂點，接下來就跟一般 texture 一樣利用 varying 補間得到每個 pixel 取用 cube texture 的 normal 法向量

綜合以上，skybox 之 vertex shader 實做：

```c=
attribute vec2 a_position;
uniform mat4 u_matrix;

varying vec3 v_normal;

void main() {
  gl_Position = vec4(a_position, 1, 1);
  v_normal = (u_matrix * gl_Position).xyz;
}
```

`twgl.primitives.createXYQuadVertices()` 頂點將輸入到 `a_position`，我們只需要其 x, y 資料就好因此設定成 `vec2`，`gl_Position` 照著上面所說直接輸出並設定 z 為 1；`u_matrix` 變成轉換成 normal 的矩陣，轉換好透過 `v_normal` 給 fragment shader 使用。fragment shader 的部份就變得很簡單，純粹透過 `v_normal` 把顏色從 cube texture 中取出即可：

```c=
precision highp float;

varying vec3 v_normal;

uniform samplerCube u_skyboxMap;

void main() {
  gl_FragColor = textureCube(u_skyboxMap, normalize(v_normal));
}
```

分別把這兩個 shader 原始碼寫在 [literals string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) 並稱為 `skyboxVS`, `skyboxFS`，接著建立對應的 programInfo 並放在 `app.skyboxProgramInfo`:

```diff=
 async function setup() {
   // ...
   const oceanProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, oceanFragmentShaderSource]);
+  const skyboxProgramInfo = twgl.createProgramInfo(gl, [skyboxVS, skyboxFS]);

   // ...

   return {
     gl,
-    programInfo, depthProgramInfo, oceanProgramInfo,
+    programInfo, depthProgramInfo, oceanProgramInfo, skyboxProgramInfo,
     textures, framebuffers, objects,
     // ...
   }
 }

 function render(app) {
   const {
     gl,
     framebuffers, textures,
-    programInfo, depthProgramInfo, oceanProgramInfo,
+    programInfo, depthProgramInfo, oceanProgramInfo, skyboxProgramInfo,
     state,
   } = app;

   // ...

 }
```

最後把 skybox 『物件』建立好，別忘了其 VAO 要使 buffer 與新的 `skyboxProgramInfo` 綁定：

```javascript=
async function setup() {
  // ...

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

  // ...
}
```

### 取得 Cube texture normal 之『某種 transform』

法向量將從 clip space 頂點位置出發，從上方 vertex shader 實做可以看到直接從 `gl_Position` 出發，也就是這四個位置（實際上為兩個三角形六個頂點）：

```
[-1, -1,  1]
[ 1, -1,  1]
[-1,  1,  1]
[ 1,  1,  1]
```

理論上我們是可以透過 `app.state.cameraRotationXY`（`cameraViewing`, `cameraDistance` 是對平移的控制，可以無視）算出對應的 transform，但是另一個方式是透過現成的 `viewMatrix`，這樣的話視角不使用 `app.state.cameraRotationXY` 時也可以通用

下圖為場景位置到 clip space 轉換從正上方俯瞰的示意圖，原本使用 `viewMatrix` 是要把場景中透過 `worldMatrix` 轉換的物件投影到 clip space，也就是下圖中橘色箭頭方向，但是看著上方四個點的座標，現在的出發點是 clip space 中的位置（下圖黑點），如果轉換成觀察者所能看到最遠平面的四個角落（下圖深藍綠色點），這樣一來再單位矩陣化便成為 cube texture 取樣時所需的 normal 法向量，而這樣的轉換在下圖中為同黑色箭頭，稍微想一下，這個動作其實是把 clip space 轉換回場景位置，那麼說也就是 `viewMatrix` 的『反向』 -- 它的[反矩陣](https://zh.wikipedia.org/wiki/%E9%80%86%E7%9F%A9%E9%98%B5)

![clip-space-to-world-normal](https://static.pastleo.me/assets/day28-clip-space-to-world-normal-210926003129.svg)

不過 `viewMatrix` 會包含平移，需要將平移效果移除，我們把 `viewMatrix` 拆開來看：

```
viewMatrix = 
  matrix4.perspective(...) * matrix4.inverse(cameraMatrix)
```

平移會來自於 `matrix4.inverse(cameraMatrix)`，而平移為 4x4 矩陣中最後一行的前三個元素，只要將之設定為 0 即可。綜合以上，轉換成 normal 所需要的矩陣 `u_matrix` 計算方式為：

```
inversedCameraMatrix = matrix4.inverse(cameraMatrix)
u_matrix = inverse(
  matrix4.perspective(...) *
    [
      ...inversedCameraMatrix[0..3],
      ...inversedCameraMatrix[4..7],
      ...inversedCameraMatrix[8..11],
      0, 0, 0, inversedCameraMatrix[15]
    ]
)
```

> 這邊 `inversedCameraMatrix[0..3]` 表示取得 `inversedCameraMatrix` 的 0, 1, 2, 3 的元素

繼續實做之前，在程式碼中將 `viewMatrix` 的兩個矩陣獨立成 `projectionMatrix` 以及 `inversedCameraMatrix`:


```diff=
 function render(app) {
   // ...
+  const projectionMatrix = matrix4.perspective(state.fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 2000);
+
   // ...
   const cameraMatrix = matrix4.multiply(
     // ...
   );
-
-  const viewMatrix = matrix4.multiply(
-    matrix4.perspective(state.fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 2000),
-    matrix4.inverse(cameraMatrix),
-  );
+  const inversedCameraMatrix = matrix4.inverse(cameraMatrix);
+  const viewMatrix = matrix4.multiply(projectionMatrix, inversedCameraMatrix);
```

### 實做 skybox 的繪製

與其他物件一樣，建立一個 function 來實做 skybox 的繪製，並接收拆分出來的 `projectionMatrix` 以及 `inversedCameraMatrix`：

```javascript=
function renderSkybox(app, projectionMatrix, inversedCameraMatrix) {
  const { gl, skyboxProgramInfo, objects, textures } = app;
  gl.bindVertexArray(objects.skybox.vao);
}
```

照著上方所描述的 `u_matrix` 計算公式實做，並且把 skybox cube texture 傳入 uniform:

```javascript=
function renderSkybox(app, projectionMatrix, inversedCameraMatrix) {
  // ...
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
}
```

uniform 輸入完成，進行『畫』這個動作之前還有一件事，在 clip space `z = 1` 因為沒有『小於』最遠深度 `z = 1` 而不會被判定在 clip space，所以需要設定成『小於等於』，並在『畫』完之後設定回來避免影響到其他物件的繪製：

```javascript=
function renderSkybox(app, projectionMatrix, inversedCameraMatrix) {
  // ...

  gl.depthFunc(gl.LEQUAL);
  twgl.drawBufferInfo(gl, objects.skybox.bufferInfo);
  gl.depthFunc(gl.LESS); // reset to default
}
```

最後在 `render()` 中切換好 shader 並呼叫 `renderSkybox()`:

```diff=
 function render(app) {
   // ...
+  gl.useProgram(skyboxProgramInfo.program);
+  renderSkybox(app, projectionMatrix, inversedCameraMatrix);
 }
```

拉低視角，就可以看到天空囉：

![skybox-rendered](https://i.imgur.com/OOHKYzy.gif)

### 使海面反射 skybox

說到底就是要在繪製鏡像世界時繪製 skybox，在鏡像世界有個自己的 `viewMatrix` 叫做 `reflectionMatrix`，我們也必須把他拆開來：

```diff=
 function render(app) {
   // ...
   const reflectionCameraMatrix = matrix4.multiply(
     // ...
   );
-
-  const reflectionMatrix = matrix4.multiply(
-    matrix4.perspective(state.fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 2000),
-    matrix4.inverse(reflectionCameraMatrix),
-  );
+  const inversedReflectionCameraMatrix = matrix4.inverse(reflectionCameraMatrix);
+  const reflectionMatrix = matrix4.multiply(projectionMatrix, inversedReflectionCameraMatrix);
```

> `projectionMatrix` 跟第一次拆出來的相同，直接共用即可

接下來就是切換 shader 並且在繪製鏡像世界時呼叫 `renderSkybox()`，同時也因為海面會反射整個天空，就不需要自帶顏色了：

```diff=
 function render(app) {
   // ...

   { // reflection
     // ...
     renderBoat(app, reflectionMatrix, programInfo);
+
+    gl.useProgram(skyboxProgramInfo.program);
+    renderSkybox(app, projectionMatrix, inversedReflectionCameraMatrix);
   }

   gl.bindFramebuffer(gl.FRAMEBUFFER, null);

   twgl.resizeCanvasToDisplaySize(gl.canvas, state.resolutionRatio);
   gl.viewport(0, 0, canvas.width, canvas.height);

+  gl.useProgram(programInfo.program);
+
   renderBoat(app, viewMatrix, programInfo);
   // ...
 }

 // ...
 
 function renderOcean(app, viewMatrix, reflectionMatrix, programInfo) {
   // ...

   twgl.setUniforms(programInfo, {
     // ...
-    u_diffuse: [45/255, 141/255, 169/255],
+    u_diffuse: [0, 0, 0],
     // ...
   });

   // ...
 }
```

海面變成天空的鏡子，晴朗天氣的部份也就完成了：

![ocean-reflecting-sunny-sky](https://i.imgur.com/jk0kRi5.gif)

本篇完整的程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/6c36d53](https://github.com/pastleo/webgl-ironman/commit/6c36d537c2c2f148a5fdd0a24bd86cdce61fb365)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/6c36d537c2c2f148a5fdd0a24bd86cdce61fb365/06-boat-ocean.html)

## Day 29: 半透明的文字看板

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 29 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，在本系列文的最後章節將製作一個完整的場景作為完結作品：帆船與海，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

看著 [Day 28](https://ithelp.ithome.com.tw/articles/10273829) 加上天空以及海面上的天空倒影，本章的目標『帆船與海』幾乎可以算是完成了：

![ocean-reflecting-sunny-sky](https://i.imgur.com/jk0kRi5.gif)

但是初次乍到的使用者，除了觀賞畫面之外應該很難知道操作視角的方式，當然我們可以用 HTML 把說明文字加在畫面中，但是這樣的話就太沒挑戰性了，本篇將在場景中加入一段文字簡單說明移動視角的方法：

```
拖曳平移視角

透過滑鼠右鍵、滾輪
或是多指觸控手勢
對視角進行轉動、縮放
```

### 如何在 WebGL 場景中顯示文字？

不論是英文、中文還是任何語言，其實顯示在畫面上時只是一些符號組合在一起形成一幅圖，在 WebGL 中並沒有『透過某個 API 並輸入一個字串，在畫面上就會繪製出該文字』這樣的事情，但是在 [`CanvasRenderingContext2D`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) 中有，而且透過 [`gl.texImage2D()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D) 輸入 texture 資料時可以把 `<canvas></canvas>` DOM 元素餵進去，把畫在該 `<canvas></canvas>` 中的圖傳送到 texture 上

這麼一來，我們可以：

1. 建立另一個暫時用的 `<canvas></canvas>`
2. 透過 `CanvasRenderingContext2D` 繪製文字到 `<canvas></canvas>` 中
3. 建立並將暫時的 `<canvas></canvas>` 輸入到 texture
4. 渲染場景物件時，就當成一般的圖片 texture 進行繪製

### 建立文字 Texture

建立一個 function 叫做 `createTextTexture`，實做完成時會回傳 WebGL texture，在 `setup()` 中呼叫並接收放在 `app.textures.text` 中：

```diff=
 async function setup() {
   // ...
   const textures = twgl.createTextures(gl, {
     // ...
   });

+  textures.text = createTextTexture(gl);
   // ...
 }

+function createTextTexture(gl) {
+}
```

照著上面的第一步：建立一個暫時用的 `<canvas></canvas>`:

```javascript=
function createTextTexture(gl) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
}
```

長寬設定成 1024，這樣的大小應該可以繪製足夠細緻的文字。接下來使用 `canvas.getContext('2d')` 取得 `CanvasRenderingContext2D`，並繪製文字到 `canvas` 上：

```javascript=
function createTextTexture(gl) {
  // const canvas = ...

  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 80px serif';
  ctx.fillText('拖曳平移視角', canvas.width / 2, canvas.height / 5);

  const secondBaseLine = 3 * canvas.height / 5;
  const secondLineHeight = canvas.height / 7;
  ctx.font = 'bold 70px serif';
  ctx.fillText('透過滑鼠右鍵、滾輪', canvas.width / 2, secondBaseLine - secondLineHeight);
  ctx.fillText('或是多指觸控手勢', canvas.width / 2, secondBaseLine);
  ctx.fillText('對視角進行轉動、縮放', canvas.width / 2, secondBaseLine + secondLineHeight);
}
```

這邊用的主要是 [`CanvasRenderingContext2D` 的 API](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)，事實上它也可以用來繪製幾何圖形，不過本文的重點是文字，因此只有使用到相關的功能：

* 雖然原本就應該是乾淨的，不過還是先呼叫 [`.clearRect()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clearRect) 確保整個畫布都是透明黑色 `rgba(0, 0, 0, 0)`
* 繪製文字前，[`.fillStyle`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle) 設定文字顏色，而 [`.textAlign = 'center'`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign), [`.textBaseline = 'middle'`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline) 使待會繪製時以從下筆的點進行水平垂直置中
* [`.font`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font) 設定字型、字體大小
* [`.fillText(string, x, y)`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText) 如同本文一開始說的『透過某個 API 並輸入一個字串，在畫面上就會繪製出該文字』，此處的 `x`, `y` 為下筆的位置

閱讀一下程式碼的話，應該不難發現 `拖曳平移視角` 這行字會是 `80px` 比接下來的文字（`70px`）來的大，而且有不少『下筆』位置的計算，總之繪製完畢之後，`canvas` 看起來像是這樣：

![text-rendered-on-canvas](https://i.imgur.com/Ha0ulrI.png)

有後面的方格是筆者為了避免在文章中什麼都看不到而加上，表示該區域是透明的。`canvas` 準備好了，如同 [Day 6](https://ithelp.ithome.com.tw/articles/10260664) 一樣建立、輸入 texture，只是先前輸入圖片的位置改成繪製好的 `canvas`:

```javascript=
function createTextTexture(gl) {
  // ctx.fillText() ...

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    canvas, // data
  );
  gl.generateMipmap(gl.TEXTURE_2D);

  return texture;
}
```

### 繪製文字 texture 到場景中 -- 1st try

要繪製文字 texture 到場景上，需要一個 3D 物件來當成此 texture 的載體，繪製在其表面，最適合的就是一個平面了，這樣的平面也已經有了，因此直接使用現有的 `objects.plane.vao`，與其他物件一樣建立一個 function 進行繪製：

```javascript=
function renderText(app, viewMatrix, programInfo) {
  const { gl, textures, objects } = app;

  gl.bindVertexArray(objects.plane.vao);

  const textLeftShift = gl.canvas.width / gl.canvas.height < 1.4 ? 0 : -0.9;
  const worldMatrix = matrix4.multiply(
    matrix4.translate(textLeftShift, 0, 0),
    matrix4.xRotate(degToRad(45)),
    matrix4.translate(0, 12.5, 0),
  );

  twgl.setUniforms(programInfo, {
    u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
    u_diffuse: [0, 0, 0],
    u_diffuseMap: textures.text,
  });

  twgl.drawBufferInfo(gl, objects.plane.bufferInfo);
}
```

* `worldMatrix` 的 `matrix4.translate(0, 12.5, 0)` 與 `matrix4.xRotate(degToRad(45))` 是為了讓此文字出現在使用者初始時視角位置的前面
  * `matrix4.translate(textLeftShift, 0, 0)` 的 `textLeftShift` 則是有點 [RWD](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design) 概念，如果裝置為寬螢幕則讓文字面板往左偏移一點使得船可以在一開始不被文字遮到
* 當然得設定 uniform 使得 texture 為剛才建立的文字 texture: `u_diffuseMap: textures.text`
  * 為了避免其他物件設定過的 `u_diffuse`，這邊將之設定成黑色

在 `render(app)` 中呼叫 `renderText(app, viewMatrix, programInfo);`，可以看到黑底白字的說明出現：

![black-bg-and-white-text-but-flipped](https://i.imgur.com/9y6L9Fy.png)

但是上下顛倒了，為了修正這個問題，我們在 `gl.texImage2D()` 輸入文字 texture 之前要設定請 WebGL 把輸入資料的 Y 軸顛倒：

```diff=
 function createTextTexture(gl) {
   // ...

+  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

   gl.texImage2D(
     gl.TEXTURE_2D,
     0, // level
     gl.RGBA, // internalFormat
     gl.RGBA, // format
     gl.UNSIGNED_BYTE, // type
     canvas, // data
   );
   gl.generateMipmap(gl.TEXTURE_2D);

+  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

   // ...
 }
```

為了避免影響到別的 texture 的載入，用完要設定回來。加入這兩行之後文字就正常囉：

![black-bg-and-white-text](https://i.imgur.com/Rejd1sJ.gif)

### 半透明物件

原本半透明的文字 texture 透過 3D 物件渲染到場景變成不透明的了，因為使用的 fragment shader 輸出的 `gl_FragColor` 的第四個元素，也就是 alpha/透明度，固定是 `1`:

```c=
void main() {
  // ...
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
```

這使得窄板螢幕一開始文字會遮住導致看不到主角，是不是有辦法可以讓這個說明看板變成半透明的呢？有的，首先當然是要有一個願意根據 texture 輸出 alpha 值的 fragment shader，因為這個文字看板物件不會需要有光影效果，寫一個簡單的 fragment shader `textFragmentShaderSource` 給它用：

```c=
precision highp float;

uniform vec4 u_bgColor;
uniform sampler2D u_texture;

varying vec2 v_texcoord;

void main() {
  gl_FragColor = u_bgColor + texture2D(u_texture, v_texcoord);
}
```

可以看到除了 `u_texture` 用來輸入文字 texture 之外還有 `u_bgColor`，可以用來輸入整體的底色。與原本的 vertex shader 連結建立對應的 programInfo 並讓看板物件使用：

```diff=
 async function setup() {
   // ...
   const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);
+  const textProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, textFragmentShaderSource]);
   const depthProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, depthFragmentShaderSource]);
   
   // ...
   
   return {
     gl,
-    programInfo, depthProgramInfo, oceanProgramInfo, skyboxProgramInfo,
+    programInfo, textProgramInfo, depthProgramInfo, oceanProgramInfo, skyboxProgramInfo,
     textures, framebuffers, objects,
     // ...
   }
 }
 
 function render(app) {
   const {
     gl,
     framebuffers, textures,
-    programInfo, depthProgramInfo, oceanProgramInfo, skyboxProgramInfo,
+    programInfo, textProgramInfo, depthProgramInfo, oceanProgramInfo, skyboxProgramInfo,
     state,
   } = app;
   
   // ...
   
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);

   twgl.resizeCanvasToDisplaySize(gl.canvas, state.resolutionRatio);
   gl.viewport(0, 0, canvas.width, canvas.height);

   gl.useProgram(programInfo.program);
   
   renderBoat(app, viewMatrix, programInfo);
  
-  renderText(app, viewMatrix, programInfo);
+  gl.useProgram(textProgramInfo.program);
+  renderText(app, viewMatrix, textProgramInfo);

   // ...
 }
 
 function renderText(app, viewMatrix, programInfo) {
   // ...
   
   twgl.setUniforms(programInfo, {
     u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
-    u_diffuse: [0, 0, 0],
-    u_diffuseMap: textures.text,
+    u_bgColor: [0, 0, 0, 0.1],
+    u_texture: textures.text,
   });
   
   // ...
 }
```

修改輸入之 uniform，`u_texture` 輸入文字 texture，而 `u_bgColor` 使得透明度為 `0.1`。看起來像是這樣：

![gray-bg-white-text](https://i.imgur.com/ISorXZA.png)

有變化，但是依然不是半透明的，因為還需要請 WebGL 啟用 `gl.BLEND` 顏色混合功能：

```diff=
 async function setup() {
   // ...

   gl.enable(gl.CULL_FACE);
   gl.enable(gl.DEPTH_TEST);
+  gl.enable(gl.BLEND);
+  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   // ...
 }
```

事實上，`gl.BLEND` 啟用的行為是讓要畫上去的顏色與畫布上現有的顏色進行運算後相加，而運算的方式由 [`gl.blendFunc(sfactor, dfactor)`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc) 設定，

* `sfactor` 表示要畫上去的顏色要乘以什麼，預設值為 `gl.ONE`，設定成 `gl.SRC_ALPHA` 乘以自身之透明度
* `dfactor` 表示畫布上的顏色要乘以什麼，預設值為 `gl.ZERO`，這個顯然也要修改，要不然底下的顏色就等於完全被覆蓋掉

既然是『與畫布上現有的顏色進行運算』，半透明的物件繪製時會需要畫布上已經有繪製好其他物件，我們來看看如果按照『帆船、看板、海洋、天空』的順序繪製會變成什麼樣子：

![transparent-to-boat-but-not-ocean](https://i.imgur.com/pbkdfrI.png)

畫看板時畫布上只有帆船，看板內帆船以外的區域等於是空白畫布的顏色與 `u_bgColor` 混合的結果，又因為深度已經寫入了看板的距離，在繪製海洋時就被判定成在後面而沒有畫上去形成這樣的現象。因此半透明物件應該要最後畫上：

```diff=
 function render(app) {
   // ...

   gl.bindFramebuffer(gl.FRAMEBUFFER, null);

   twgl.resizeCanvasToDisplaySize(gl.canvas, state.resolutionRatio);
   gl.viewport(0, 0, canvas.width, canvas.height);

   gl.useProgram(programInfo.program);

   renderBoat(app, viewMatrix, programInfo);
-
-  gl.useProgram(textProgramInfo.program);
-  renderText(app, viewMatrix, textProgramInfo);

   gl.useProgram(oceanProgramInfo.program);
   twgl.setUniforms(oceanProgramInfo, globalUniforms);
   renderOcean(app, viewMatrix, reflectionMatrix, oceanProgramInfo);

   gl.useProgram(skyboxProgramInfo.program);
   renderSkybox(app, projectionMatrix, inversedCameraMatrix);
+
+  gl.useProgram(textProgramInfo.program);
+  renderText(app, viewMatrix, textProgramInfo);
 }
```

半透明效果就完成囉：

![transparent-text](https://i.imgur.com/9ZvbyEd.png)

不過還有一個小問題，`u_bgColor` 跟文字 texture 的底色都是黑色，半透明的區域顏色應該要比較深才對，怎麼會比較淺呢？如果去修改 HTML 那邊的 `<canvas></canvas>` 給上 CSS 的背景色，就能發現是因為畫布的看板區域對於 HTML 來說是半透明的，因此網頁底下的顏色就透上來了：

```html
<canvas id="canvas" style="background: green;"></canvas>
```

![transparent-with-green](https://i.imgur.com/u6d1NjT.png)

讓 `<canvas></canvas>` 有一個黑色的底色：

```diff=
 <body>
-  <canvas id="canvas"></canvas>
+  <canvas id="canvas" style="background: black;"></canvas>
   <!-- ... -->
 </body>
```

透明的文字看板就大功告成囉：

![transparent-text-completed](https://i.imgur.com/KA3TDva.gif)

完整的程式碼在此：

* [github.com/pastleo/webgl-ironman/commit/5d511d1](https://github.com/pastleo/webgl-ironman/commit/5d511d1d20c3b9abd2cff540179da8c885b95082)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/5d511d1d20c3b9abd2cff540179da8c885b95082/06-boat-ocean.html)

---

## Day 30: 帆船與海

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 30 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，本文將加入一些海面效果作為本系列文的完結作品：帆船與海，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

有了[帆船](https://ithelp.ithome.com.tw/articles/10273128)、[天空、反射天空的海面](https://ithelp.ithome.com.tw/articles/10273829)以及[簡易的操作說明](https://ithelp.ithome.com.tw/articles/10274494)，要說這個是成品應該是沒什麼問題，不過看著那固定的海面以及帆船，如果能讓他們動起來是不是更好？

### Shadertoy

這其實是一個網站：[https://www.shadertoy.com/](https://www.shadertoy.com/)

像是 [codepen](https://codepen.io/), [jsfiddle](https://jsfiddle.net/), [jsbin](https://jsbin.com) 那樣，在網頁中寫程式，然後在旁邊跑起來呈現結果，同時網站也是分享的平台，只是 shadertoy 是專門寫 WebGL shader 的，而且能寫的是 fragment shader，主要的資料來源只有當下 fragment shader 繪製的 pixel 位置以及時間，剩下的就是發揮使用者的想像力（以及數學）來畫出絢麗的畫面，可以在這邊看到許多別人寫好的 shader，像是：

* 雲層：https://www.shadertoy.com/view/3l23Rh
* 火焰：https://www.shadertoy.com/view/MdX3zr
* 海洋：https://www.shadertoy.com/view/Ms2SD1

可以看到這些 shader 的實做蠻複雜的，究竟是什麼演算法使得只透過簡單的資料來源就能得到這麼漂亮的效果？筆者看了 [Youtube 頻道 -- The Art of Code](https://www.youtube.com/channel/UCcAlTqd9zID6aNX3TzwxJXg) 的一些影片之後，了解到這些 shader 多少運用到了 hash & noise 的技巧，這些[偽隨機函數](https://zh.wikipedia.org/wiki/%E4%BC%AA%E9%9A%8F%E6%9C%BA%E6%80%A7)接收二或三維度的座標，接著回傳看似隨機的數值，通常介於 0~1，那麼我們就可以利用這個數字當成一個地方的雲層密度、火焰強度、海浪高度

回到想要讓海面動起來的問題，除了上述的技巧之外，筆者找到一個[水面效果的 shadertoy](https://www.shadertoy.com/view/4dBcRD)，效能蠻好的，有許多地方可以拿來參考，接下來就看要怎麼實做在 `oceanFragmentShaderSource` 吧

### 動態的海面法向量 `oceanNormal`

海面反光計算、倒影陰影的計算都會利用到海面的法向量，在 [Day 21](https://ithelp.ithome.com.tw/articles/10268929) 使用一個 texture 作為 normal map 使得表面可以利用法向量的變化產生凹凸細節，只可惜這一張圖不會動

```c=
vec3 normal = texture2D(u_normalMap, v_texcoord * 256.0).xyz * 2.0 - 1.0;
```

要讓海面動起來，也就是這個 `normal` 要可以根據時間改變，已經有 `uniform float u_time;`，早在這一章節起始點就已經準備好了，其值為 `app.time / 1000`，大約每一秒加一；接著設計一個類似於 shadertoy 那樣的 function，透過海面的 xz 座標來產生偽隨機的法向量：

```diff=
+vec3 oceanNormal(vec2 pos);
+
 void main() {
   vec2 reflectionTexcoord = (v_reflectionTexcoord.xy / v_reflectionTexcoord.w) * 0.5 + 0.5;
-  vec3 normal = texture2D(u_normalMap, v_texcoord * 256.0).xyz * 2.0 - 1.0;
+  vec3 normal = oceanNormal(v_worldSurface.xz);

   reflectionTexcoord += normal.xy * 0.1;
   // ...
 }

+vec3 oceanNormal(vec2 position) {
+}
```

> 不知不覺這篇可能會變成以 C 語言為主，在 `main()` 之前要先宣告 `vec3 oceanNormal(vec2 pos)` 的存在，要不然編譯會失敗

接下來假設會實做一個 function，帶入一組 xz 座標會得到 xyz 填上高度，把這個 function 叫做 `vec3 oceanSurfacePosition(vec2 position)`，那麼 `oceanNormal()` 就可以呼叫 `oceanSurfacePosition()` 三次，第一次帶入原始的 `p1: [x, z]`、第二次 `p2: [x + 0.01, z]`、第三次 `p3: [x, z + 0.01]`，拿 `p1 -> p2` 以及 `p1 -> p3` 兩個向量做外積就可以得到一定準度的法向量，`oceanNormal()` 實做如下：

```c=
#define OCEAN_SAMPLE_DISTANCE 0.01
vec3 oceanNormal(vec2 position) {
  vec3 p1 = oceanSurfacePosition(position);
  vec3 p2 = oceanSurfacePosition(position + vec2(OCEAN_SAMPLE_DISTANCE, 0));
  vec3 p3 = oceanSurfacePosition(position + vec2(0, OCEAN_SAMPLE_DISTANCE));

  return normalize(cross(
    normalize(p2 - p1), normalize(p3 - p1)
  ));
}
```

### 波浪函數

讓假設會有的 `oceanSurfacePosition()` function 成為事實：

```c=
vec3 oceanSurfacePosition(vec2 position) {
  float height = 0.0;
  return vec3(position, height);
}
```

> 為了符合 normal 以 `[0, 0, 1]` 為上面，`height` 輸出到 `z` 的位置，也就跟 normal map 取得的 `vec3` 排列一致

現在要求的是運算 `position` 來取得 `height`，筆者在觀察 [水面效果的 shadertoy](https://www.shadertoy.com/view/4dBcRD) 時發現其第 15 行：

```c=
float wave = exp(sin(x) - 1.0);
```

[輸入到 desmos](https://www.desmos.com/calculator/fhfmlynqtn) 可以看到漂亮的波浪形狀：

![wave-function-graph](https://i.imgur.com/XiDPKSN.png)

[`sin()`](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/sin.xhtml) 的波形本身就是於 +1 ~ -1 之間不停來回，減 1 套 [`exp()`](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/exp.xhtml) [指數函數](https://zh.wikipedia.org/wiki/%E6%8C%87%E6%95%B0%E5%87%BD%E6%95%B0) 得到最大值為 1 的波浪函數，實做給 `height` 試試看

```c=
vec3 oceanSurfacePosition(vec2 position) {
  float height = exp(sin(position.x) - 1.0);
  return vec3(position, height);
}
```

縮小預覽，可以看到規律的波紋與 z 軸平行：

![wave-along-x](https://i.imgur.com/h1jloyy.gif)

如果想要讓帆船的方向與海浪垂直、並且使之跟著時間而波動，定義一個角度以及向量 `direction` 與位置進行內積，加上時間成為波浪函數的 x 軸輸入值 `waveX`:

```c=
vec3 oceanSurfacePosition(vec2 position) {
  float directionRad = -2.355;
  vec2 direction = vec2(cos(directionRad), sin(directionRad));

  float waveX = dot(position, direction) * 2.5 + u_time * 5.0;
  float height = exp(sin(waveX) - 1.0);

  return vec3(position, height);
}
```

> `-2.355` 為 `3.14` 的 `-0.75` 倍，也就是反向旋轉 135 度；將 `dot(position, direction)` 乘上 2.5 可以縮小波長、時間乘上 5.0 加快波浪速度

波浪就動起來囉：

![waving](https://i.imgur.com/XD3mXQl.gif)

但是這樣的波浪未免也太規律，這時來使用上方說到的 hash / noise 的偽隨機技巧，先實做這個 [Youtube 影片 -- Shader Coding: Making a starfield - Part 1 by The Art of Code](https://youtu.be/rvDo9LvfoVE?t=861) 中的 `hash()` function:

```c=
float hash(vec2 p) {
  p = fract(p * vec2(234.83, 194.51));
  p += dot(p, p + 24.9);
  return fract(p.x * p.y);
}
```

[`fract()`](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/fract.xhtml) 用來取小數，這整個 function 其實沒有什麼道理，其中的 `234.83`, `194.51` 等數字也可以隨便改，某種程度算是 seed 吧，總之輸入一個二維向量，得到介於 0~1 的數字

> 算式雖然是說沒什麼道理，但是筆者自己隨便寫一個，要達到一個隨機的感覺其實不容易，可能到數字很大的時候還是會出現特定的規律

接著使用類似此 [Youtube 影片 -- Value Noise Explained! by The Art of Code](https://youtu.be/zXsWftRdsvU) 的技巧，利用 [`floor()`](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/floor.xhtml) 把海面以每個整數分成一格一格，例如 1~1.99999... 為一格，用 `id` 表示當前的格子，每個格子使用同一個 hash 值，拿 hash 出來的偽隨機值當成 `directionRad` 角度偏移量：

```diff=
 vec3 oceanSurfacePosition(vec2 position) {
-  float directionRad = -2.355;
+  vec2 id = floor(position);
+
+  float directionRad = (hash(id) - 0.5) * 0.785 - 2.355;
   vec2 direction = vec2(cos(directionRad), sin(directionRad));

   float waveX = dot(position, direction) * 2.5 + u_time * 5.0;
   float height = exp(sin(waveX) - 1.0);

   return vec3(position, height);
 }
```

因為 `hash(id)` 得到 0~1 之間的數值，減掉 0.5 成為 -0.5~+0.5，最後乘以 0.785，為 45 度 / 180 * 3.14 而來，這麼一來角度將為 -135 + (-22.5 ~ 22.5)，採用 `id` 分格子之後就變成這樣了：

![blocks-waving-differently](https://i.imgur.com/58xejEs.gif)

每格是有不同的方向，但是格子之間都有明顯的一條線，解決這個問題的方法是每個格子去計算鄰近 1 格的海浪，並且海浪的強度會隨著距離來源格子越遠而越弱，為此再建立一個 function 叫做 `localWaveHeight()` 計算一個位置（`position`）能從一個格子（`id`）得到多少的海浪高度：

```c=
float localWaveHeight(vec2 id, vec2 position) {
  float directionRad = (hash(id) - 0.5) * 0.785 - 2.355;
  vec2 direction = vec2(cos(directionRad), sin(directionRad));

  float distance = length(id + 0.5 - position);
  float strength = smoothstep(1.5, 0.0, distance);

  float waveX = dot(position, direction) * 2.5 + u_time * 5.0;
  return exp(sin(waveX) - 1.0) * strength;
}
```

* `directionRad`, `direction`, `waveX` 以及 `exp(sin(waveX) - 1.0)` 是從 `oceanSurfacePosition()` 搬過來的
* `distance` 透過 [`length()`](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/length.xhtml) 計算 `position` 與 `id` 格子中央的距離
* `strength` 表示海浪的強度，如果距離為 0 則強度最強為 1，而且我們只打算取到鄰近 1 格，距離到達 1.5 時表示已經到達影響力的邊緣，這時強度為 0
  * [`smoothstep(edge0, edge1, x)`](https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/smoothstep.xhtml) 可以把輸入值 `x` 介於 edge0 < x < edge1 轉換成 0 ~ 1 之間的值，`x` 超出 edge0 時回傳 0、超出 edge1 時回傳 1，而且此函數是一個曲線，會平滑地到達邊緣，更詳細的資料可以參考[其維基百科](https://en.wikipedia.org/wiki/Smoothstep)

回到 `oceanSurfacePosition()`，這時它的任務便是蒐集鄰近 `id.xy` 相差 -1~+1、共 9 個格子對於當下位置的波浪高度，並且加在一起：

```c=
vec3 oceanSurfacePosition(vec2 position) {
  vec2 id = floor(position);
  
  float height = 0.0;
  
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      height += localWaveHeight(id + vec2(i, j), position);
    }
  }

  return vec3(position, height);
}
```

分成格子產生偽隨機的波浪角度、對鄰近格子進行採樣後，看起來真的像是海浪了：

![waving-without-block-lines](https://i.imgur.com/YCCPlku.gif)

不過海浪似乎有點太高了，而且希望可以更細緻一點，因此在 `oceanSurfacePosition()` 加入這兩行：

```diff=
 vec3 oceanSurfacePosition(vec2 position) {
+  position *= 6.2;
   vec2 id = floor(position);

   float height = 0.0;

   for (int i = -1; i <= 1; i++) {
     for (int j = -1; j <= 1; j++) {
       height += localWaveHeight(id + vec2(i, j), position);
     }
   }

+  height *= 0.15;

   return vec3(position, height);
 }
```

把 `position` 乘以 6.2 可以使格子更小，`height` 則是很直覺地乘以 0.15 降低高度，海面就平靜許多了，筆者也轉一下視角觀察反射光的反應：

![ocean-wave-complete](https://i.imgur.com/FNEVP54.gif)

好的，海面的部份就到這邊，希望讀者覺得這樣的海面有足夠的說服力。既然海面的 normal map texture `oceanNormal` 已經沒有用到，筆者就順手移除來避免下載不必要的檔案

事實上，shadertoy 這樣的做法對於實際應用程式上的效能是不利的，理論上應該可以利用原本的 normal map 以更省力的方式達到類似的效果，即時做 `hash()` 等運算在一些裝置上可能會有點跑不動，這麼做其實某種程度上只是筆者覺得這樣很有趣，不必依靠別人的 normal map；關於效能問題，這也是為什麼筆者在此章節的右上角加上一個解析度的調整，使用者可以自己選擇解析度，如果螢幕以及性能都允許再調到 Retina，例如 iPad pro 或 M1 等級的 apple 裝置，反之如果是舊手機可能普通解析度都有點吃力，這時可以選擇『低』解析度來順跑

### 打磨 -- 帆船的晃動

既然有了波浪，那帆船是不是也該隨著時間前後、上下擺動？類似剛剛使用的海浪技巧，只要把時間套 [`Math.sin()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sin) 函數，剩下的就是 3D 物件的 transform:

```diff=
 function renderBoat(app, viewMatrix, programInfo) {
-  const { gl, textures, objects } = app;
+  const { gl, textures, objects, time } = app;
  
   const worldMatrix = matrix4.multiply(
     matrix4.yRotate(degToRad(45)),
-    matrix4.translate(0, 0, 0),
-    matrix4.scale(1, 1, 1),
+    matrix4.xRotate(Math.sin(time * 0.0011) * 0.03 + 0.03),
+    matrix4.translate(0, Math.sin(time * 0.0017) * 0.05, 0),
   );
   
   // ...
 }
```

![boat-waving-as-well](https://i.imgur.com/IN2bqCD.gif)

本系列文的最終成品也就完成囉！完整程式碼在此：

* [https://github.com/pastleo/webgl-ironman/commit/c441ee5](https://github.com/pastleo/webgl-ironman/commit/c441ee58a22df7f8f108392b047c0e91bc31fc9a)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/c441ee58a22df7f8f108392b047c0e91bc31fc9a/06-boat-ocean.html)

### 感謝各位讀者的閱讀

對於看到這邊的讀者，希望這系列文章有讓各位學習到東西，筆者其實在踏入業界很早期就知道有 WebGL 這個東西的存在，但是因為要做到有些成果需要非常多基石而一直沒有深入下去研究，就如同各位看到的，本系列文於 [Day 11](https://ithelp.ithome.com.tw/articles/10262395) 才在畫面上出現比較實際的 3D 畫面，不過也因此學到非常多東西，已經很久沒有這種跳脫舒適圈的感覺了呢

文章中製作的範例主要是示範該文主旨的概念，筆者為了讓這些成品比較有成品的感覺，所以有時候會直接在程式碼中出現一些調校好的數字，筆者在實做這些範例時當然不會是第一次就完美的，都是一改再改，改完覺得滿意了才用一個理想的順序去描述實做的過程作為文章內容；在本系列文撰寫前，筆者學習 WebGL 的練習有放到 [github.com/pastleo/webgl-practice](https://github.com/pastleo/webgl-practice)，有興趣的讀者可以玩玩後面幾個比較完整的練習的 live 版：

* [perspective, texture and twgl](https://static.pastleo.me/webgl-practice/08-3d-perspective-texture-twgl.html)
* [帆船 obj 檔, lighting and skybox](https://static.pastleo.me/webgl-practice/09-obj-lighting-shadow-skybox.html)，非常接近本系列文最後的成品
* [太空跳棋](https://static.pastleo.me/webgl-practice/10-diamond-chinese-checkers.html)，這應該是筆者使用純 WebGL 製作最複雜的練習，也是一個真的可以玩的遊戲


WebGL 作為底層的技術，懂得活用其功能，尤其是 shader （以及數學）的話，能製作出的效果肯定是不勝枚舉的，本系列文中有許多概念是沒有提到，像是 [raycast 得到滑鼠、觸控位置的 3D 物件](https://webglfundamentals.org/webgl/lessons/webgl-picking.html)、[迷霧效果](https://webglfundamentals.org/webgl/lessons/webgl-fog.html)等，甚至[透過 WebGL 把 GPU 當成無情的運算機器](https://webglfundamentals.org/webgl/lessons/webgl-gpgpu.html)，舉 [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life) 為例，[WebGL 的實做](https://piellardj.github.io/game-of-life-webgl/?page%3Acanvas%3Afullscreen=true&page%3Acanvas%3Asidepane=true&page%3Atabs%3Aneighbours-tabs-0=death&page%3Atabs%3Aneighbours-tabs-1=death&page%3Atabs%3Aneighbours-tabs-2=alive&page%3Atabs%3Aneighbours-tabs-3=alive%3Bbirth&page%3Atabs%3Aneighbours-tabs-4=death&page%3Atabs%3Aneighbours-tabs-5=death&page%3Atabs%3Aneighbours-tabs-6=death&page%3Atabs%3Aneighbours-tabs-7=death&page%3Atabs%3Aneighbours-tabs-8=death)性能顯然遠超過[先前筆者用 rust + webassembly 的版本](https://static.pastleo.me/rs-wasm-glife-20201213/) （[部落格文章](https://pastleo.me/post/20201213-wasm-conway-game-of-life)），現在也可以想像的到使用 WebGL 實做的方向：使用 [framebuffer](https://ithelp.ithome.com.tw/articles/10269682)，在 fragment shader 讀取上回合地圖 texture 相關的 cell 來繪製該回合的地圖

在最後筆者要感謝 [@greggman](https://greggman.com/) 撰寫的 [WebGL2 Fundamentals](https://webgl2fundamentals.org/), [WebGL Fundamentals](https://webglfundamentals.org/) 甚至 [Three.js Fundamentals](https://threejsfundamentals.org/)，有完整、深入的教學讓筆者可以有系統地學習，補足電腦繪圖的知識，在進行 3D 遊戲程式設計的時候也更加順利，因此寫下這系列文章分享給各位讀者