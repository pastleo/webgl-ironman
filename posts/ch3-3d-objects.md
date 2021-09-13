---
tags: webgl, ironman, post
---

CH3: 3D and Objects [WebGL 鐵人]
===

## Day 11: Orthogonal 3D 投影

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 11 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

["Orthogonal" 查詢字典](https://dictionary.cambridge.org/zht/%E8%A9%9E%E5%85%B8/%E8%8B%B1%E8%AA%9E-%E6%BC%A2%E8%AA%9E-%E7%B9%81%E9%AB%94/orthogonal)的話得到的意思是：直角的，正交的，垂直的，而 [orthogonal 3D projection](https://en.wikipedia.org/wiki/Orthographic_projection) 筆者的理解是：從 3D 場景中選取一個長方體區域作為 clip space 投影到畫布上，事實上與先前 2D 投影非常類似，只是多一個維度 `z`，在 orthogonal 3D 投影時叫做深度，本篇的目標將以 orthogonal 3D 投影的方式渲染一個 P 文字形狀的 3D 物件

### `03-3d-objects.html` / `03-3d-objects.html`

這個章節使用新的一組 `.html` / `.js` 作為開始，完整程式碼可以在這邊找到：[github.com/pastleo/webgl-ironman/commit/bc7c806](https://github.com/pastleo/webgl-ironman/commit/bc7c806896a3bcae9a4480ffa93822cd568e96e3)，絕大部分的程式碼在先前的章節都有相關的說明了，以下幾點比較值得注意的：

* vertex attribute 有：`a_position`, `a_color`，`a_color` 作為 fragment shader 輸出顏色使用，顯示的結果將會是一個一個由 `a_color` 指定的色塊（或是漸層，如果一個三角形內的顏色不同的話）
* `lib/matrix.js` 內實做了三維運算需要的 `matrix4` 系列 function，同樣因為平移需要再加上一個運算時多餘的維度而成為四維矩陣
  * 在三維場景中能夠以 x 軸、y 軸、z 軸旋轉，因此旋轉部份有 `xRotate`, `yRotate`, `zRotate`
* `a_position`, `a_color` 在起始點的 buffer 傳入空陣列、`viewMatrix`, `worldMatrix` 起始點為 `matrix4.identity()`，什麼都不做、`gl.drawArrays(gl.TRIANGLES, 0, 0);` 繪製 0 個頂點，這些都將在本篇補上
* 本篇不會用到動畫效果，因此 `startLoop` 被註解不會用到

仔細看的話，會發現在 vertex shader 中的 `a_position` 宣告型別為 `vec4`，可以直接與 4x4 矩陣 `u_matrix` 相乘，但是在設定傳入的資料時候 `gl.vertexAttribPointer()` 指定的長度只有 3，那麼剩下的向量第四個元素（接下來稱為 w）的值怎麼辦？有意思的是，在提供的資料長度不足或是沒有提供時 x, y, z 預設值為 `0`，而 w 很有意思地預設值是 `1` ，對於所有 `vec4` 的 vertex attribute 都是如此，這樣一來就可以符合平移時多餘維度為 `1` 的需求，很巧的是，如果今天這個 attribute 是顏色，那意義上就變成 alpha 預設值是 `1`

### P 文字形狀的 3D 物件

以下是筆者在設計時畫的圖：

![P-model](https://i.imgur.com/lwCIhBu.png)

* 最左邊的圖表示此物件正面的樣子，第二張為從上方透視的底面，這兩張表示了各個頂點的編號
  * 同時以 `a`, `b`, `c`, `d` 表示特定邊長的長度，以便為各個頂點定位座標
* 右邊兩張圖表示各個長方形的編號，最右邊的圖表示從上方透視的底面

這邊的任務是要為此 3D 物件產生對應的 `a_position`, `a_color` 陣列，可以想像要建立的資料不少，直接寫在 `setup()` 內很快就會讓 `setup()` 失去焦點，因此建立 `function createModelBufferArrays()`，選定 `a`, `b`, `c`, `d` 的數值後第一步驟就是產生各個頂點的座標：

```javascript=
function createModelBufferArrays() {
  // positions
  const a = 40, b = 200, c = 60, d = 45;

  const points = [0, d].flatMap(z => ([
    [0, 0, z], // 0, 13
    [0, b, z],
    [a, b, z],
    [a, 0, z],
    [2*a+c, 0, z], // 4, 17
    [a, a, z],
    [2*a+c, a, z],
    [a, 2*a, z],
    [2*a+c, 2*a, z], // 8, 21
    [a, 3*a, z],
    [2*a+c, 3*a, z],
    [a+c, a, z],
    [a+c, 2*a, z], // 12, 25
  ]));
}
```

在上圖中頂點的編號對應 `points` 陣列中的 index 值，因為正面、底面的座標位置只有 `z` 軸前後的差別，因此用 `flatMap` 讓程式碼更少一點，筆者在程式碼中某些座標的右方有註解表示其對應的頂點編號

不過 `points` 不能當成 `a_position` 陣列，`a_position` 陣列必須是一個個三角形的頂點，以P 文字形狀的 3D 物件來說，所以的面都可以由長方形組成，兩個三角形可以形成一個長方形，因此寫一個 function 接受四個頂點座標，產生兩個三角形的 `a_position` 陣列：

```javascript=
function rectVertices(a, b, c, d) {
  return [
    ...a, ...b, ...c,
    ...a, ...c, ...d,
  ];
}
```

有了這個工具之後，`a_position` 就可以以長方形為單位寫成：

```javascript=
const a_position = [
  ...rectVertices(points[0], points[1], points[2], points[3]), // 0
  ...rectVertices(points[3], points[5], points[6], points[4]),
  ...rectVertices(points[7], points[9], points[10], points[8]),
  ...rectVertices(points[11], points[12], points[8], points[6]),
  ...rectVertices(points[13], points[16], points[15], points[14]), // 4
  ...rectVertices(points[16], points[17], points[19], points[18]),
  ...rectVertices(points[20], points[21], points[23], points[22]),
  ...rectVertices(points[24], points[19], points[21], points[25]),
  ...rectVertices(points[0], points[13], points[14], points[1]), // 8
  ...rectVertices(points[0], points[4], points[17], points[13]),
  ...rectVertices(points[4], points[10], points[23], points[17]),
  ...rectVertices(points[9], points[22], points[23], points[10]),
  ...rectVertices(points[9], points[2], points[15], points[22]), // 12
  ...rectVertices(points[2], points[1], points[14], points[15]),
  ...rectVertices(points[5], points[7], points[20], points[18]),
  ...rectVertices(points[5], points[18], points[24], points[11]),
  ...rectVertices(points[11], points[24], points[25], points[12]), // 16
  ...rectVertices(points[7], points[12], points[25], points[20]),
];
```

同樣地，在 `a_position` 陣列中某些 `rectVertices()` 呼叫右方有註解表示其對應在上圖中的長方形

完成 `a_position` 之後，`a_color` 也要為三角形每個頂點產生對應資料，筆者的設計是一個平面使用一個顏色，也就是一個長方形（兩個三角形，共 6 個頂點）的顏色至少都會一樣，同時希望面的顏色是隨機，因此寫了以下 function:

```javascript=
function rectColor(color) {
  return Array(6).fill(color).flat();
}

function randomColor() {
  return [Math.random(), Math.random(), Math.random()];
}
```

筆者私心想要正面顏色使用筆者的主題顏色，除此之外隨機產生，因此 `a_color` 的產生如下：

```javascript=
// a_color
const frontColor = [108/255, 225/255, 153/255];
const backColor = randomColor();
const a_color = [
  ...rectColor(frontColor), // 0
  ...rectColor(frontColor),
  ...rectColor(frontColor),
  ...rectColor(frontColor),
  ...rectColor(backColor), // 4
  ...rectColor(backColor),
  ...rectColor(backColor),
  ...rectColor(backColor),
  ...rectColor(randomColor()), // 8
  ...rectColor(randomColor()),
  ...rectColor(randomColor()),
  ...rectColor(randomColor()),
  ...rectColor(randomColor()), // 12
  ...rectColor(randomColor()),
  ...rectColor(randomColor()),
  ...rectColor(randomColor()),
  ...rectColor(randomColor()), // 16
  ...rectColor(randomColor()),
];
```

最後回傳整個『P 文字形狀的 3D 物件』相關的全部資料，除了 vertex attributes 之外，待會 `gl.drawArrays()` 需要知道要繪製的頂點數量，在這邊也以 `numElements` 回傳：

```javascript=
return {
  numElements: a_position.length / 3,
  attribs: {
    a_position, a_color,
  },
}
```

### Orthogonal 3D 繪製

辛苦寫好了 `createModelBufferArrays`，當然得在 `setup()` 呼叫，把 attribute 資料傳送到對應的 buffer 內：

```javascript=
// async function setup() {
// ...
const modelBufferArrays = createModelBufferArrays();

// ...

gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array(modelBufferArrays.attribs.a_position),
  gl.STATIC_DRAW,
);

// ...

gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array(modelBufferArrays.attribs.a_color),
  gl.STATIC_DRAW,
);

// ...

return {
  gl,
  program, attributes, uniforms,
  buffers, modelBufferArrays,
  state: {
  },
  time: 0,
};
```

同時也把 `modelBufferArrays` 也回傳，在 `render()` 使用，並讓 `viewMatrix` 使用 `matrix4.projection()` 產生，orthogonal projection 就是在這行發生：

```diff=
function render(app) {
   const {
     gl,
     program, uniforms,
+    modelBufferArrays,
     state,
   } = app;
   
   // ...

-  const viewMatrix = matrix4.identity();
+  const viewMatrix = matrix4.projection(gl.canvas.width, gl.canvas.height, 400);
   const worldMatrix = matrix4.identity();
  
   // ...
  
-  gl.drawArrays(gl.TRIANGLES, 0, 0);
+  gl.drawArrays(gl.TRIANGLES, 0, modelBufferArrays.numElements);
 }
```

存檔，來看看結果：

![p-incorrect-front-color](https://i.imgur.com/z9XzYtT.png)

> 因為是其他顏色是隨機產生，讀者跟著跑到這邊的話看到的不一定是這個顏色

有東西是有東西，但是正面顏色怎麼不是主題色？像是這張圖的底色才是筆者的主題色：

![bottom-color-is-the-theme](https://i.imgur.com/YVaY90B.png)

事實上，在 WebGL 繪製時，假設先繪製了一個三角形，然後再繪製了一個三角形在同一個位置，那麼後面的三角形會覆蓋掉之前的顏色，也就是說當前看到的顏色是底面的顏色（上方程式碼中的 `backColor`），解決這個問題的其中一個方法是啟用『只繪製正面面向觀看者的三角形』功能 `gl.CULL_FACE`，當三角形的頂點順序符合右手開掌的食指方向時，大拇指的方向即為三角形正面，如下圖所示的長方形（或是說兩個三角形）的正面朝觀看者：

![cull-face](https://i.imgur.com/8IzUFEo.png)

筆者已經在上方建立 `a_position` 時使得組成底面的三角形面向下，因此只要加上這行：

```javascript=
gl.enable(gl.CULL_FACE);
```

底面就會因為面向下，其正面沒有對著觀看者，不會被繪製，可以看到正面了：

![p-correct-color](https://i.imgur.com/adMzAOZ.png)

### 轉一下，看起來比較 3D

因為使用 `matrix4.projection()` 做 orthogonal 投影，其實就是投影到 xy 平面上，這個 3D 模組投影下去看不出來是 3D 的，因此串上各個 transform，尤其是旋轉，使之看起來真的是 3D，首先在 `setup()` 回傳初始 tranform 值：

```javascript=
// async function setup() {
// ...
return {
  gl,
  program, attributes, uniforms,
  buffers, modelBufferArrays,
  state: {
    projectionZ: 400,
    translate: [150, 100, 0],
    rotate: [degToRad(30), degToRad(30), degToRad(0)],
    scale: [1, 1, 1],
  },
  time: 0,
};
```

可以注意到除了 `translate`, `rotate`, `scale` 之外，筆者也加上 `projectionZ`，之後讓使用者可以控制 z 軸 clip space，接著在 `render()` 串上 `worldMatrix` 矩陣的產生：

```javascript=
const viewMatrix = matrix4.projection(gl.canvas.width, gl.canvas.height, state.projectionZ);
const worldMatrix = matrix4.multiply(
  matrix4.translate(...state.translate),
  matrix4.xRotate(state.rotate[0]),
  matrix4.yRotate(state.rotate[1]),
  matrix4.zRotate(state.rotate[2]),
  matrix4.scale(...state.scale),
);
```

結果看起來像是這樣，是 3D 了，但是顯然怪怪的：

![without-depth-test](https://i.imgur.com/uU245to.png)

在上面已經啟用 `gl.CULL_FACE`，不面向觀看者的面確實不會被繪製，但是不夠，下圖箭頭指著的面是面向觀看者的，因為在 `a_position` 上排列在正面之後，導致正面繪製之後被面覆蓋過去：

![without-depth-test-problem-surfaces](https://i.imgur.com/CN820bX.png)

調換 `a_position` 或許可以解決，不過如果讓使用者可以旋轉，旋轉到背面時那麼又會露出破綻，因此需要另一個功能：`gl.DEPTH_TEST`，也就是深度測試，在 vertex shader 輸出的 `gl_Position.z` 除了給 clip space 之外，也可以作為深度資訊，如果準備要畫上的 pixel 比原本畫布上的來的更接近觀看者，顏色才會覆蓋上去，因此加入這行啟用這個功能：

```javascript=
gl.enable(gl.DEPTH_TEST);
```

耶，一切就正確囉：

![correct-3d-p](https://i.imgur.com/8BIiA6q.png)

最後筆者也加入使用者控制 transform 功能，本篇完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/7664b6b](https://github.com/pastleo/webgl-ironman/commit/7664b6ba35cc19fa3aa7d045c2e75111bde95a6e)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/7664b6ba35cc19fa3aa7d045c2e75111bde95a6e/03-3d-objects.html)

不過使用 orthogonal 投影方法畫出來的畫面與我們在生活中從眼睛、相機看到的其實不同，待下篇來介紹更接近現實生活眼睛看到的成像方式：Perspective projection

---

## Day 12: Perspective 3D 成像

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 12 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。介紹完 WebGL 運作方式與 2D transform 後，本章節講述的是建構並 transform 渲染成 3D 物件，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

使用 perspective 3D 投影渲染物件時，相當於模擬現實生活眼睛、相機捕捉的光線形成的投影，也是大多 3D 遊戲使用的投影方式，學會這種投影方式，才算是真正進入 3D 渲染的世界，那麼我們就開始吧

### Orthogonal vs Perspective

先來回顧一下 orthogonal 投影，在這行產生的 transform 矩陣只是調整輸入座標使之落在 clip space 內：

```javascript=
const viewMatrix = matrix4.projection(gl.canvas.width, gl.canvas.height, state.projectionZ);
```

為了讓輸入座標可以用螢幕長寬的 pixel 定位，這個轉換只是做拉伸（0 ~ 螢幕寬高 => 0 ~ 2）及平移（0 ~ 2 => -1 ~ +1），Orthogonal 投影視覺化看起來像是這樣：

![orthogonal-projection-visualized](https://static.pastleo.me/assets/day12-orthogonal-projection-210827030418.svg)

> 沒錯，orthogonal 投影其實是往 -z 的方向投影，也就是說在 clip space 是以 `z = -1` 的平面進行成像；還有另外一種講法：使用者看者螢幕是看向 clip space 的 +z 方向

現實生活中比較可以找的到以 orthogonal 成像的範例就是影印機的掃描器，有一個大的面接收垂直於該面的光線，而眼睛、相機則是以一個小面積的感光元件，接收特定角度範圍內的光線，這樣的投影方式稱為 perspective projection:

![orthogonal-vs-perspective](https://static.pastleo.me/assets/day12-orthogonal-perspective-210827030358.svg)

上面這張圖是從側面看的，x 軸方向與螢幕平面垂直，而藍色框起來表示可見、會 transform 到 clip space 的區域，在 orthogonal 是一個立方體；在 perspective 這個區域的形狀叫做 [frustum](https://en.wikipedia.org/wiki/Frustum)，這個形狀 3D 的樣子像是這樣：

![wiki-fustum](https://upload.wikimedia.org/wikipedia/commons/8/8f/Square_frustum.png)

### 產生 Perspective transform 矩陣

什麼樣的矩陣可以把 frustum 的區域 transform 成 clip space 呢？很不幸的，其實這樣的矩陣不存在，因為這樣的轉換不是線性變換 (linear transformation)，根據 [3Blue1Brown 的 Youtube 影片 -- 線性變換與矩陣這邊講到的](https://youtu.be/kYB8IZa5AuE?t=152)，線性變換後必須保持網格線平行並間隔均等，想像一下把上面 frustum 側邊的邊拉成 clip space 立方體的平行線，這個 transform 就不是線性的

幸好在 vertex shader 輸出的 `gl_Position.w` (等同於 `gl_Position[3]` ) 有一個我們一直沒用到的功能：頂點位置在進入 clip space 之前，會把 `gl_Position.x`, `gl_Position.y`, `gl_Position.z` 都除以 `gl_Position.w`。有了這個功能，在距離相機越遠的地方輸出越大的 `gl_Position.w`，越遠的地方就能接受更寬廣的 xy 平面區域進入 clip space

產生矩陣的 function 接收以下幾個參數：

```
matrix4.perspective(
  fieldOfView,
  aspect,
  near,
  far,
)
```

`fieldOfView` 表示看出去的角度有多寬，`aspect` 控制畫面寬高比（寬/高），`near` 為靠近相機那面距離相機的距離，`far` 則為最遠相機能看到的距離

產生 perspective transform 矩陣的 function 我們就叫它 `matrix4.perspective()`，網路上當然有許多現成的程式碼/公式可以用，不過筆者認為這一個 transform 很關鍵，就算已經拿到實做，還是想嘗試自己算一下了解這個公式是如何產生的，假設 `matrix4.perspective()` 要製作的矩陣為 `M`:

![perspective-formula-1](https://i.imgur.com/yfbRmva.png)

`FOV` 為 fieldOfView 的縮寫，接著令 `A` 表示 `a_position` 輸入的向量（正確來說，是與 perspective 矩陣 `M` 相乘的向量），`P` 表示輸出給 `gl_Position` 的向量，`P'` 表示 `gl_Position` 的 xyz 除以 w 的向量，也就是 clip space 中的位置：

![perspective-formula-2](https://i.imgur.com/F7agvkE.png)

看下面這張圖，經過 `M` transform 並且除以 `gl_Position.w` 之後，圖中之 `A1` 應該要轉換至 `P1'` (`[1,1,-1]`)；而 `A2` 應該要轉換至 `P2'` (`[1,1,1]`):

![perspective-formula-3](https://i.imgur.com/wGvCe36.png)

定義 `gl_Position.w` 等於負的 `A.z`，使得在距離相機越遠的地方接受更寬廣的區域進入 clip space；`FOV` 表示看出去『畫面上緣與下緣』之間的角度，也就是說 FOV 的直接作用對象是在 y 軸上；對於 x, y 軸來說，這樣的 transform 理論上不會有旋轉或是平移，從 `A` 到 `P` 只有 scalar 做縮放，那麼就來算這兩個 scalar:

![perspective-formula-4](https://i.imgur.com/QAePg77.png)

接著來算 z 軸的部份，從上方 `A1` 轉換至 `P1'`、`A2` 轉換至 `P2'` 的圖來看，z 軸會有平移產生，因此這樣算：

![perspective-formula-5](https://i.imgur.com/HdN2lxl.png)

> 筆者也把公式輸入線上公式視覺化工具來觀察 near, far 與 z 軸輸入輸出的影響：[https://www.desmos.com/calculator/dhsp5blfzg](https://www.desmos.com/calculator/dhsp5blfzg)

> 看到這邊讀者應該也有發現，相機視角對著的方向為 -z，面向螢幕外（螢幕到使用者）的方向為 +z，原因筆者也不知道，在猜應該是業界的慣例

基於先前介紹 scale, translate 時各個數值要放在矩陣的哪個位置，得到矩陣（使用電腦上的行列排法）：

![perspective-formula-6](https://i.imgur.com/41pZMDr.png)

[完整計算流程的 PDF 版本在此](https://static.pastleo.me/assets/day12-perspective-derivation-210827005808.pdf)，並且把矩陣實做到 `lib/matrix.js` 內：

```javascript=
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
```

### 使用 perspective transform

來到主程式，把 `viewMatrix` 從原本 `matrix4.projection()` 改成 `matrix4.perspective()`，`fieldOfView` 先給上 45 度：

```javascript=
  const viewMatrix = matrix4.perspective(45 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 2000);
```

存檔重整後會看到一片慘白，沒有錯誤，但是就是沒東西。以現在來說，因為 `matrix4.perspective()` 是從原點出發向著 `-z` 的方向看，而當初規劃 3D 模組的 z 軸是往 `+z` 的方向長的，更別說頂點時是用螢幕 pixel 為單位製作的，現在看不到東西其實很正常；要看到東西，就得『移動視角』讓物件在 frustum 內，這就留到下篇再來繼續實做

最後筆者也把 `fieldOfView` 的使用者控制實做進去取代原本的 `projectionZ`，完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/871e11d](https://github.com/pastleo/webgl-ironman/commit/871e11decd62313f92d8de254c8930a7b75250d0)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/871e11decd62313f92d8de254c8930a7b75250d0/03-3d-objects.html)

後記：如果把 `fieldOfView` 拉到很大約 160 度以上，其實可以看到右上角出現東西：

![](https://i.imgur.com/su5NpeE.png)

---

## Day 13: 視角 Transform

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 13 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。介紹完 WebGL 運作方式與 2D transform 後，本章節講述的是建構並 transform 渲染成 3D 物件，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

有了 `matrix4.perspective()` 使用眼睛/相機的方式進行成像，反而讓畫面變成一片慘白，假設把 3D 物件本身的 transform 取消，也就是 `worldMatrix` 設定成 `matrix4.identity()`，那麼 3D 物件與 frustum 區域的相對關係看起來像是這樣：

![perspective-obj-visualized-210826210735.svg](https://static.pastleo.me/assets/day13-perspective-obj-visualized-210826210735.svg)

3D 物件不在 frustum 中，因此什麼都看不到，我們當然可以直接把 3D 物件做 translate 移動到 frustum 中，但是在現實生活中，如果架設好了一個場景，放了很多物件，而相機的位置不對，這時候我們會移動的是相機，而不是整個場景，這就是接下來要做的事情

### `viewMatrix` 與視角 transform

先前在製作作用在 `a_position` 上的 `u_matrix` 之前，會先產生兩個矩陣相乘：`viewMatrix` 與 `worldMatrix`，繪製多個物件時 `viewMatrix` 為同一顆相機/畫面下的所有物件共用，`worldMatrix` 則為物件本身的 transform，會因為不同物件而異；接下來要加入的視角 transform 想當然爾為同一顆相機/畫面下的所有物件共用，因此 `viewMatrix` 除了 clip space 的 transform 之外，也要開始包含視角相關的 transform，成為名符其實的 `viewMatrix`

雖然筆者才剛說我們不應該移動整個場景來符合相機位置（就放在 `viewMatrix` 這部份的抽象來說確實像是移動相機本身），但是視角 transform 本身能做的事情就是移動場景，所有的 `a_position` / 物件都會經過視角 transform:

```
clip space <= perspective <= 視角 transform <= worldMatrix transform <= a_position
              ^...viewMatrix transform...^
```

假設我們想要把相機放在這個位置：

![camera-transform](https://static.pastleo.me/assets/day13-camera-transform-210826234836.svg)

把移動相機的 transform 叫做 `cameraMatrix` ，因為視角 transform 只能移動整個場景，所以視角 transform 可以當成『反向做 `cameraMatrix`』，對整個場景做反向的 `cameraMatrix`，在定義 `cameraMatrix` 這件事情上，就真的抽象成移動相機了；反向這件事可以靠[反矩陣（inverse matrix）](https://zh.wikipedia.org/wiki/%E9%80%86%E7%9F%A9%E9%98%B5) 來做到，為什麼的部份筆者只好再推薦一次 [3Blue1Brown 的 Youtube 影片 -- 反矩陣、行空間與零空間](https://youtu.be/uQhTuRlWMxw)，看了精美的動畫之後，希望大家就能理解為什麼反矩陣在幾何上等於把某個 transform 反向的做

以實際作用在 `a_position` 向量上的視角 transform（等於 `inverse(cameraMatrix)`）來說，看起來像是這樣：

![inverse-camera-transform](https://static.pastleo.me/assets/day13-inverse-camera-transform-210827004302.svg)

最後當然得在 `lib/matrix.js` 中加入 `matrix4.inverse(m)` 的實做，不過，有做過三階反矩陣運算就會知道計算量不小，更何況我們需要的是 4x4 四階，寫成程式碼的公式行數實在不少，筆者就不直接放在文章中了，有需要可以在下方完整程式碼中找到

### 實做視角 transform 到 `viewMatrix` 內

要實做上圖紅色箭頭的 `cameraMatrix`，看起來用 `matrix4.translate()` 就足夠，因此在主程式 `render()` 內定義 `viewMatrix` 之前加上：

```javascript=
const cameraMatrix = matrix4.translate(250, 0, 400);
```

並且像是上面說的，使用 `matrix4.inverse(cameraMatrix)` 加入 `viewMatrix`:

```javascript=
const viewMatrix = matrix4.multiply(
  matrix4.perspective(state.fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 2000),
  matrix4.inverse(cameraMatrix),
);
```

存檔看看結果：

![back-of-3d-model](https://i.imgur.com/DShYgvY.png)

這個 P 上下顛倒了，而且現在現在看到的不是正面，在建構模型時，除了其背面往 +z 長之外，我們使用 2D 時慣用的 y 軸正向為螢幕下方方向，這些與 3D 中使用的慣例都是相反的，同時也可以看本篇第一張圖中標示的『螢幕上方方向』想像看到的畫面；如果要重新定位 P 形狀的 3D 模型實在是太累，因此筆者選擇修改 `rotationX` 的預設值轉 `210` 度過去：

```diff
 // async function setup() {
 // ...
   return {
     gl,
     program, attributes, uniforms,
     buffers, modelBufferArrays,
     state: {
       fieldOfView: 45 * Math.PI / 180,
       translate: [150, 100, 0],
-      rotate: [degToRad(30), degToRad(30), degToRad(0)],
+      rotate: [degToRad(210), degToRad(30), degToRad(0)],
       scale: [1, 1, 1],
     },
   }
 }
```

HTML 那邊的預設值也得改一下，看起來就好多囉：

![perspective-front-3d-p](https://i.imgur.com/m7bektf.png)

完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/0c0725d](https://github.com/pastleo/webgl-ironman/commit/0c0725de38dea86000614fef5fade454197438a1)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/0c0725de38dea86000614fef5fade454197438a1/03-3d-objects.html)

---

## Day 14: 使相機看著目標

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 14 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。介紹完 WebGL 運作方式與 2D transform 後，本章節講述的是建構、transform 並渲染 3D 物件，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

有了 perspective 投影以及加入反向 `cameraMatrix` 的 `viewkMatrix` ，我們擁有一套系統來模擬現實生活中眼睛、相機在想要的位置進行成像，方法也跟場景中的 3D 物件類似：在 `cameraMatrix` 中加入想要的 transform。同時也可以來比較一下 orthogonal ([live 版本](https://static.pastleo.me/webgl-ironman/commits/7664b6ba35cc19fa3aa7d045c2e75111bde95a6e/03-3d-objects.html))與 perspective ([live 版本](https://static.pastleo.me/webgl-ironman/commits/0c0725de38dea86000614fef5fade454197438a1/03-3d-objects.html))投影的差別，最大的差別大概就是物件在不同 z 軸位置時成像的『遠近』了：

![orthogonal-vs-perspective-z](https://i.imgur.com/f97cy0g.gif)

### `matrix4.lookAt()`

但是相機往往不會直直地往 -z 方向看，而且常常要對著某個目標，因此再介紹一個常用的 function:

```
matrix4.lookAt(
  cameraPosition,
  target,
  up,
)
```

其前兩個參數意義蠻明顯的，分別是相機要放在什麼位置、看著的目標；接著不知道讀者在閱讀這系列文章時，有沒有常常歪著頭看螢幕，對，`up` 就是控制這件事情，如果傳入 `[0, 1, 0]` 即表示正正的看，沒有歪著頭看

關於 `matrix4.lookAt()` 的實做，想當然爾會有 `cameraPosition` 的平移，因此矩陣的一部分已經知道：

```
[
  ?, ?, ?, 0,
  ?, ?, ?, 0,
  ?, ?, ?, 0,
  cameraPosition.x, cameraPosition.y, cameraPosition.z, 1,
]
```

剩下的 `?` 部份則是相機的方向，首先需要知道從 `cameraPosition` 到 `target` 的方向向量 `k`，接著拿 `up` 與 `k` 向量做[外積](https://zh.wikipedia.org/wiki/%E5%8F%89%E7%A7%AF)得到與兩者都垂直的向量 `i`，最後拿 `k`, `i` 做外積得到與兩者都垂直的向量 `j`，我們就得到 [3Blue1Brown 這部 Youtube 影片 -- 三維線性變換](https://youtu.be/rHLEWRxRGiM) 所說的變換矩陣的『基本矢量』，同時為了避免縮放，`i`, `j`, `k` 都應為[單位向量](https://zh.wikipedia.org/wiki/%E5%8D%95%E4%BD%8D%E5%90%91%E9%87%8F)

在上面這段提到 3 個新的運算：向量差異、外積、單位矩陣化，根據公式在 `lib/matrix.js` 中實做這幾個 function:

```javascript=
export const matrix4 = {
  // ...
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
  // ...
}
```

最後把 `matrix4.lookAt()` 實做起來：

```javascript=
export const matrix4 = {
  // ...
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
  // ...
}
```

一樣，電腦中與上方 3Blue1Brown 影片中數學慣例用的行列是相反的，同時可能會有兩個疑問：最核心的相機方向 `normalize(subtractVectors(cameraPosition, target))` 為何是 `kHat`? 而且 `subtractVectors()` 算出來的向量其實是從 `target` 到 `cameraPosition` 的方向？`matrix4.perspective()` 看著的方向是 -z，要把 -z 轉換成 `target` 到 `cameraPosition` 的方向，這個轉換就是 `kHat`，又因 "-"z 的關係使得 `subtractVectors()` 的參數得反向

### 使用 `matrix4.lookAt()`

回到主程式，讓 `cameraMatrix` 使用 `matrix4.lookAt()` 產生的矩陣：

```javascript=
const cameraMatrix = matrix4.lookAt([250, 0, 400], [250, 0, 0], [0, 1, 0]);
```

筆者使相機位置與之前 translate 時的位置相同，而且目標會使得相機平平的往 -z 看過去，因此改完之後不會有變化：

![use-lookat](https://i.imgur.com/PigZHJ7.png)

### 移動相機

為了看出 `matrix4.lookAt()` 的功能，接下來加入相機位置的控制，不過這次不要再用 `<input type='range' />` 的 slider 了，筆者決定使用鍵盤 WASD/上下左右、用滑鼠/觸控按住畫面上下左右半部來移動相機

因為要接入的事件很多，而且這些事件都是按下開始移動，放開時候停止，因此讓這些事件 handler 設定相機的速度，再由 `requestAnimationFrame` 的迴圈來進行相機位置的更新，我們加上這兩個狀態：

```diff=
 // async function setup() {
 // ...
   return {
     gl,
     program, attributes, uniforms,
     buffers, modelBufferArrays,
     state: {
       fieldOfView: 45 * Math.PI / 180,
       translate: [150, 100, 0],
       rotate: [degToRad(210), degToRad(30), degToRad(0)],
       scale: [1, 1, 1],
+      cameraPosition: [250, 0, 400],
+      cameraVelocity: [0, 0, 0],
     },
     time: 0,

  };
```

在 `render()` 中讓 `matrix4.lookAt()` 串上剛建立的狀態：

```diff=
-  const cameraMatrix = matrix4.lookAt([250, 0, 400], [250, 0, 0], [0, 1, 0]);
+  const cameraMatrix = matrix4.lookAt(state.cameraPosition, [250, 0, 0], [0, 1, 0]);
```

啟用 `startLoop`，使用 `cameraVelocity` 來更新 `cameraPosition`:

```javascript=
function startLoop(app, now = 0) {
  const timeDiff = now - app.time;
  app.time = now;

  app.state.cameraPosition[0] += app.state.cameraVelocity[0] * timeDiff;
  app.state.cameraPosition[1] += app.state.cameraVelocity[1] * timeDiff;
  app.state.cameraPosition[2] += app.state.cameraVelocity[2] * timeDiff;
  document.getElementById('camera-position').textContent = (
    `cameraPosition: [${app.state.cameraPosition.map(f => f.toFixed(2)).join(', ')}]`
  );

  render(app, timeDiff);
  requestAnimationFrame(now => startLoop(app, now));
}
```

同時筆者打算在畫面上面顯示當前的 `cameraPosition`，因此得在 HTML 加入 `<p id='camera-position'></p>`，最後就是監聽 [`keydown`](https://developer.mozilla.org/en-US/docs/Web/API/Document/keydown_event), [`keyup`](https://developer.mozilla.org/en-US/docs/Web/API/Document/keyup_event), [`mousedown`](https://developer.mozilla.org/en-US/docs/Web/API/Element/mousedown_event), [`mouseup`](https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseup_event), [`touchstart`](https://developer.mozilla.org/en-US/docs/Web/API/Element/touchstart_event), [`touchend`](https://developer.mozilla.org/en-US/docs/Web/API/Document/touchend_event) 並處理這些事件，這些程式碼比較冗長、瑣碎，筆者就不放在文章中了，有需要可以在完整程式碼中找到：

* [github.com/pastleo/webgl-ironman/commit/8c76e3d](https://github.com/pastleo/webgl-ironman/commit/8c76e3d8c873aff43eb34ce98c89440789ed15a1)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/8c76e3d8c873aff43eb34ce98c89440789ed15a1/03-3d-objects.html)

就可以用比較直覺的方法在 xy 平面上移動相機囉，在手機上用起來像是這樣：

![touch-demo](https://i.imgur.com/5Z7DdVS.gif)

---

## Day 15: Multiple objects (上)

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 15 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。介紹完 WebGL 運作方式與 2D transform 後，本章節講述的是建構、transform 並渲染多個 3D 物件，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

到目前的範例，畫面上都只有一個物件，既然已經介紹完 3D 物件的產生、在空間中的 transform、相機控制以及 perspective 投影到畫布上，接下來來讓所謂『場景』比較有場景的感覺，加入一顆球體以及地板：

![target-look](https://i.imgur.com/8w9MLzT.png)

### 重構程式碼使得加入多物件變得容易

之前在準備 P 字母 3D 模型資料準備的時候，分別對 `a_position`, `a_color` 製作了 attributes 資料, vertexAttribArray 以及 buffer，這些都屬於 P 字母這個『物件』的內容，接下來要加入其他物件，因此建立一個 `objects` 來存這些物件，在 `objects` 下每個物件自己再有一個 Javascript object 來存放 attributes, vertexAttribArray 以及 buffer 等資訊：

```javascript
async function setup() {
  // ...
  const objects = {};
  // ...
}
```

把原本 `modelBufferArrays.attribs`, `modelBufferArrays.numElements`, `buffers` 放置到 `objects.pModel` 內：

```javascript=
async function setup() {
  // ...
  { // pModel
    const { attribs, numElements } = createModelBufferArrays();

    const buffers = {};

    // a_position
    buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(attributes.position, /* ... */);

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.a_position),
      gl.STATIC_DRAW,
    );

    // a_color
    buffers.color = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);

    gl.enableVertexAttribArray(attributes.color);
    gl.vertexAttribPointer(attributes.color, /* ... */);

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.a_color),
      gl.STATIC_DRAW,
    );

    objects.pModel = {
      attribs, numElements,
      buffers,
    };
  }
  // ...
}
```

在 `setup()` / `render()` 改傳 `objects`:

```diff=
 async function setup() {
   // ...
   return {
     gl,
     program, attributes, uniforms,
-    buffers, modelBufferArrays,
+    objects,
     state: {/* ... */},
     time: 0,
   };
 }
 
 function render(app) {
   const {
     gl,
     program, uniforms,
-    modelBufferArrays,
+    objects,
     state,
   } = app;
 
 }
```

最後修改讓原本使用 `modelBufferArrays` 的程式改從 `objects` 取用，並把 P 物件本身的 transform (`worldMatrix`) 放在專屬的程式碼區域：

```javascript=
function render(app) {
  // ...
  { // pModel
    const worldMatrix = matrix4.multiply(
      matrix4.translate(...state.translate),
      matrix4.xRotate(state.rotate[0]),
      matrix4.yRotate(state.rotate[1]),
      matrix4.zRotate(state.rotate[2]),
      matrix4.scale(...state.scale),
    );

    gl.uniformMatrix4fv(
      uniforms.matrix,
      false,
      matrix4.multiply(viewMatrix, worldMatrix),
    );

    gl.drawArrays(gl.TRIANGLES, 0, objects.pModel.numElements);
  }
  // ...
}
```

### 加入純色物件繪製功能

因為待會要加入的物件都是純色，因此不需要傳送 `a_color` 進去指定每個 vertex / 三角形的顏色，我們可以讓 fragment shader 接收 uniform `u_color` 來指定整個物件的顏色：

```c=
precision highp float;

uniform vec3 u_color;

varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color + u_color, 1);
}
```

這邊直接讓兩種來源相加：`v_color + u_color`，因為在 `a_color` 沒輸入的時候 RGB 三個 channel 都會是 0，因此 `v_color` 就會是 `[0, 0, 0]`，對於 `a_color` 有值的 P 物件來說，我們要做的就是在繪製 P 物件時把 `u_color` 設定成 `[0, 0, 0]`；同時要記得取得 uniform 的位置：

```diff=
 async function setup() {
   // ...
   const uniforms = {
     matrix: gl.getUniformLocation(program, 'u_matrix'),
+    color: gl.getUniformLocation(program, 'u_color'),
   };
   // ...
 }
```

最後在 `render()` 時給 P 物件的 `u_color` 設定成 `[0, 0, 0]`:

```javascript=
{ // pModel
  // ...
  gl.uniform3f(uniforms.color, 0, 0, 0);
  // ... gl.drawArrays(...)
}
```

### TWGL: A Tiny WebGL helper Library

我們接下來要產生球體以及地板所需的 `a_position`，也就是每個三角形各個頂點的位置，難道我們又要寫一長串程式來產生這些資料了嗎？幸好網路上有大大已經幫我們寫好了 -- [TWGL: A Tiny WebGL helper Library](https://twgljs.org/docs/index.html)

這個套件裡面不僅可以產生球體、平面等物件所需的資料，同時他也是一層對 WebGL 的薄薄包裝，讀者們應該也有感受到 WebGL API 的冗長，像是從 [Day 6](https://ithelp.ithome.com.tw/articles/10260664) 開始我們自己包裝的 `createShader` / `createProgram`，到 vertex attribute, buffer 等操作都有，使得程式碼可以減少不少，在套件首頁上就有不少使用 WebGL API 以及 TWGL 的比較；不過本篇就先只用到 [`twgl.primitives`](https://twgljs.org/docs/module-twgl_primitives.html) 來產生球體、平面物件的資料

引入這個套件有[很多方法](https://github.com/greggman/twgl.js#download)，筆者使用 [unpkg](https://unpkg.com/) 所提供的 CDN 服務，在 [ES module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) 中，直接引用：

```javascript=
import * as twgl from 'https://unpkg.com/twgl.js@4.19.2/dist/4.x/twgl-full.module.js';
```

### 建立球體、地板物件

首先是球體，使用 [`twgl.primitives.createSphereVertices(radius, subdivisionsAxis, subdivisionsHeight)`](https://twgljs.org/docs/module-twgl_primitives.html#.createSphereVertices) 產生球體資料，第一個參數表示半徑、第二三個參數表示要分成多少個區段產生頂點，分越多這個球體就越精緻，我們先用這樣的設定印出來看看：

```javascript=
console.log(
  twgl.primitives.createSphereVertices(10, 32, 32)
)
```

![twgl.primitives.createSphereVertices](https://i.imgur.com/E5yuzhx.png)

看起來 `position` 會是我們需要的資料，同時還有 `texcoord` 取用 texture 的對應位置、`normal` 法向量，那麼 `indices` 是什麼？在 WebGL 中，還有一種繪製模式 [`gl.drawElements()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements) 使得繪製時透過 `indices` 扮演類似指標的角色去取得其指向之 vertex attribute 的值，可以避免重複的 vertex 資料，不過這個模式之後再來深入介紹，本篇不使用，如果要取得以三角形 vertex 為單位的 attribute 資料，我們需要 [twgl.primitives.deindexVertices()](https://twgljs.org/docs/module-twgl_primitives.html#.deindexVertices) 跟著 `indices` 指標取得直接資料，並且透過 `position` 資料長度除以 3 得到 `numElements` 要繪製的頂點數量，接下來 `createBuffer`, `enableVertexAttribArray` 等與之前類似：

```javascript=
async function setup() {
  // ...
  { // ball
    const attribs = twgl.primitives.deindexVertices(
      twgl.primitives.createSphereVertices(10, 32, 32)
    );
    const numElements = attribs.position.length / attribs.position.numComponents;

    const buffers = {};

    // a_position
    buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(
      attributes.position,
      3, // size
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.position),
      gl.STATIC_DRAW,
    );

    objects.ball = {
      attribs, numElements,
    };
  }
  // ...
}
```

準備好資料後，在 `render()` 加上球體的繪製：

```javascript=
function render(app) {
  // ...
  { // ball
    const worldMatrix = matrix4.multiply(
      matrix4.translate(300, -80, 0),
      matrix4.scale(3, 3, 3),
    );

    gl.uniformMatrix4fv(
      uniforms.matrix,
      false,
      matrix4.multiply(viewMatrix, worldMatrix),
    );

    gl.uniform3f(uniforms.color, 67/255, 123/255, 208/255);

    gl.drawArrays(gl.TRIANGLES, 0, objects.ball.numElements);
  }
  // ...
}
```

存檔重整後，球體有出現了，但是原本的 P 物體消失，畫面中還有一條不知道是什麼的東西：

![only-sphere-is-drawn](https://i.imgur.com/oxg2XIG.png)

為什麼呢？在 `render()` 分別繪製 P 物件以及球體時，只有切換了 uniform，而在 `setup()` 設定好的 vertex attribute 與 buffer 之間的關係顯然在 `render()` 這邊沒有進行切換，事實上，在 `setup()` 中第二次呼叫的 `gl.vertexAttribPointer()` 就把 position attribute 改成與球體的 position buffer 綁定，因此最後繪製時兩次 `gl.drawArrays()` 都是繪製球體，只是第一次繪製時候 `objects.pModel.numElements` 比球體頂點數少很多所以只有一小條出現

要解決這個問題，我們需要 Vertex Attribute Object 這個功能，將在下一篇繼續介紹，本篇的完整程式碼：

* [github.com/pastleo/webgl-ironman/commit/19a76e0](https://github.com/pastleo/webgl-ironman/commit/19a76e043f4a7c7480f0ecb3ef8c18418f2d19bf)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/19a76e043f4a7c7480f0ecb3ef8c18418f2d19bf/03-3d-objects.html)

---

## Day 16: Multiple objects (下)

大家好，我是西瓜，你現在看到的是 2021 iThome 鐵人賽『如何在網頁中繪製 3D 場景？從 WebGL 的基礎開始說起』系列文章的第 16 篇文章。本系列文章從 WebGL 基本運作機制以及使用的原理開始介紹，最後建構出繪製 3D、光影效果之網頁。介紹完 WebGL 運作方式與 2D transform 後，本章節講述的是建構、transform 並渲染多個 3D 物件，如果在閱讀本文時覺得有什麼未知的東西被當成已知的，可能可以在[前面的文章中](https://ithelp.ithome.com.tw/users/20140099/ironman/3929)找到相關的內容

在上一篇我們輸入了兩組 3D 物件的資料，但是最後因為沒有改變 vertex attribute 使用的 buffer 導致繪製了不符合預期的結果，要能讓 vertex attribute 與 buffer 的關聯快速做切換，我們需要 [`OES_vertex_array_object`](https://developer.mozilla.org/en-US/docs/Web/API/OES_vertex_array_object) 這個 WebGL extension

### Vertex Attribute Object (VAO)

回想一下 [Day 3](https://ithelp.ithome.com.tw/articles/10259806) 把 buffer 與 vertex attribute 建立關係的部份，也就是下圖紅色框起來的區域

![vertex-attrib-pointer](https://static.pastleo.me/assets/day16-vertex-attrib-pointer-210901230025.svg)

經過 `gl.bindBuffer()` 指定對準的 buffer，接著呼叫 `gl.vertexAttribPointer()` 來指定 vertex 的 attribute 使用對準好的 buffer，也就是說在不使用 vertex attribute object （接下來簡稱 VAO）的情況下，我們其實也可以在每次 `gl.drawArrays()` 之前更換 vertex attribute 使用的 buffer，但是對於每一個 attribute 就要執行一次 `gl.bindBuffer()` 以及 `gl.vertexAttribPointer()`，如果我們有兩個或甚至更多 attribute 的時候，除了程式碼更複雜之外，多餘的 GPU call 也會讓性能下降

因此，VAO 就來拯救我們了，透過建立一個 VAO，我們會獲得一個『工作空間』，在這個工作空間建立好 vertex attribute 與 buffer 的關聯，接著切換到其他 VAO/工作空間 指定 attribute-buffer 時，不會影響到原本 VAO/工作空間 attribute-buffer 的關聯，要執行繪製時再切換回原本的 VAO 進行繪製；假設我們有兩個物件分別叫做 `Obj 1`, `Obj 2`，有兩個 attribute `A` 與 `B`，那麼 VAO 使用下來會像是這樣：

![vertex-attrib-object](https://static.pastleo.me/assets/day16-vertex-attrib-object-210901234903.svg)

### 啟用 VAO 功能

這個功能屬於 WebGL extension，不過不是指要從 [Chrome web store](https://chrome.google.com/webstore/category/extensions) 或是 [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/extensions/) 下載的瀏覽器擴充套件，比較像是 WebGL spec 上沒有指定要支援，但是各家瀏覽器可以自行加入的功能，所以得看各家瀏覽器的臉色來決定特定功能能不能用，幸好 [`OES_vertex_array_object`](https://caniuse.com/mdn-api_oes_vertex_array_object) 相容性相當不錯，為了啟用此 WebGL extension，在 `canvas.getContext('webgl');` 之後放上這些程式：

```javascript=
// after canvas.getContext('webgl');
const oesVaoExt = gl.getExtension('OES_vertex_array_object');
if (oesVaoExt) {
  gl.createVertexArray = (...args) => oesVaoExt.createVertexArrayOES(...args);
  gl.deleteVertexArray = (...args) => oesVaoExt.deleteVertexArrayOES(...args);
  gl.isVertexArray = (...args) => oesVaoExt.isVertexArrayOES(...args);
  gl.bindVertexArray = (...args) => oesVaoExt.bindVertexArrayOES(...args);
} else {
  throw new Error('Your browser does not support WebGL ext: OES_vertex_array_object')
}
```

`gl.getExtension()` 取得 WebGL extension，經過 `if` 檢查沒問題有東西的話，在 `gl` 物件上直接建立對應的 function 方便之後操作

> 事實上，這是模仿 WebGL2 的 API，在 WebGL2 中，vertex attribute object 的功能變成 spec 的一部分

### 建立並使用『工作空間』

在 `setup()` 時，要分別為 P 物件以及球體建立並切換到各自的『工作空間』，再進行 buffer 與 attribute 的綁定，同時也把建立的 `vao` 放入該物件的 js object 中：

```javascript=
async function setup() {
  // ...
  { // pModel
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // gl.bindBuffer, gl.vertexAttribPointer ...

    objects.pModel = {
      attribs, numElements,
      vao, buffers,
    }
  }
  // ...
  { // ball
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // gl.bindBuffer, gl.vertexAttribPointer ...

    objects.ball = {
      attribs, numElements,
      vao, buffers,
    };
  }
  // ...
}
```

在 `render()` 繪製物件之前先切到對應的 VAO，那麼之前設定好的 attribute-buffer 關聯就跟著回來了：

```javascript=
function render(app) {
  // ...
  { // pModel
    gl.bindVertexArray(objects.pModel.vao);

    // gl.drawArrays()...
  }
  // ...
  { // ball
    gl.bindVertexArray(objects.ball.vao);

    // gl.drawArrays()...
  }
}
```

存檔重整，P 物件與球體都正常的畫出來囉：

![p-and-sphere-both-rendered](https://i.imgur.com/4AeJR61.png)

### 補上地板

地板只是一個 plane，也就是 2 個三角形、6 個頂點即可做出來，手刻 `a_position` 的 buffer 資料並不是難事，不過筆者這邊透過上篇 import 進來的 [twgl](https://twgljs.org/docs/index.html) 幫忙，使用 [`twgl.primitives.createPlaneVertices`](https://twgljs.org/docs/module-twgl_primitives.html#.createPlaneVertices) 建立 xz 平面，長寬都給 `1`，大小再透過 transform 調整，並且記得加上 VAO 的建立與切換，剩下的程式碼就跟球體那邊差不多依樣畫葫蘆：

```javascript=
async function setup() {
  // ...
  { // ground
    const attribs = twgl.primitives.deindexVertices(
      twgl.primitives.createPlaneVertices(1, 1)
    );
    const numElements = attribs.position.length / attribs.position.numComponents;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffers = {};

    // a_position
    buffers.position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(
      attributes.position,
      3, // size
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(attribs.position),
      gl.STATIC_DRAW,
    );

    objects.ground = {
      attribs, numElements,
      vao, buffers,
    };
  }
  // ...
}
```

渲染部份也是：

```javascript=
function render(app) {
  // ...
  { // ground
    gl.bindVertexArray(objects.ground.vao);

    const worldMatrix = matrix4.multiply(
      matrix4.translate(250, -100, -50),
      matrix4.scale(500, 1, 500),
    );

    gl.uniformMatrix4fv(
      uniforms.matrix,
      false,
      matrix4.multiply(viewMatrix, worldMatrix),
    );

    gl.uniform3f(uniforms.color, 0.5, 0.5, 0.5);

    gl.drawArrays(gl.TRIANGLES, 0, objects.ground.numElements);
  }
  // ...
}
```

存檔重整，就得到 P 物件、球體加上地板，開始有場景的感覺了：

![finished-objects](https://i.imgur.com/8w9MLzT.png)

本篇的完整程式碼可以在這邊找到：

* [github.com/pastleo/webgl-ironman/commit/dc00ec4](https://github.com/pastleo/webgl-ironman/commit/dc00ec4ee62961b3adb2a5a9135ead94944e9d48)
* [live 版本](https://static.pastleo.me/webgl-ironman/commits/dc00ec4ee62961b3adb2a5a9135ead94944e9d48/03-3d-objects.html)

3D & 多個物件（Objects）就到這邊，讀者可以嘗試移動視角感受一下這個 3D 場景，不知道有沒有覺得球體感覺很不立體，因為我們在這個物件渲染時不論從哪邊看，每個面都是 `uniform` 指定的統一純色，在下個章節將加入光對於物體表面顏色的影響，使物體看起來更立體