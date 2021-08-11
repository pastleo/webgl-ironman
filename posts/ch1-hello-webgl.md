---
tags: webgl, ironman, post
---

CH1: hello WebGL [WebGL 鐵人]
===

## Day 1: Hello WebGL

大家好，大家都叫我西瓜。因為想轉職寫遊戲，而遊戲中會讓人第一個想到、也是能在第一瞬間吸引人的就是畫面了，筆者從事網站開發多年，也很順勢的從 WebGL 開始學習，這系列文章將以做出範例的方式，跟大家分享這幾個月學習的心得

這系列文章假設讀者能夠看懂 Javascript，並且對於 Web 技術有基礎的了解

### WebGL 是啥？為何是 WebGL？

簡單來說，[WebGL](https://zh.wikipedia.org/wiki/WebGL) 是一組在 Web 上操作 GPU 的 Javascript API，而 WebGL 絕大部分的 API 都可以找到 [openGL](https://zh.wikipedia.org/wiki/OpenGL) 上對應的版本，且名字幾乎沒有差別，openGL 通常，猜測制定 WebGL 標準時只打算做一層薄薄的包裝，這樣一方面瀏覽器可能比較好實做，但是也因此 WebGL 直接使用時是非常底層的，甚至偶爾會需要去算線性代數、矩陣的東西

看到這邊讀者們可能會想說：哇，我要來把 Tab 關掉了，洗洗睡。老實說，如果對於基礎原理沒有興趣，想要『快速』做出東西，這邊確實可以左轉 [three.js](https://threejs.org/) 或是 [babylon.js](https://www.babylonjs.com/)，筆者是基於下面這個因素決定學習 WebGL 的：

> 當你了解其原理時，比較不容易受到框架、潮流演進的影響

為什麼？在了解原理的狀況下，比較能知道框架幫你做了什麼，遇到什麼框架不好做、或是做起來效能不好的時候可能比較容易想到方法應對；前端技術更迭速度大家都知道，但是基礎原理是不會有太大的變化的；最後，透過 WebGL 學到的原理多多少少也能應用在其他平台上吧

### 準備開發環境

要製作範例，我們會需要編輯器，任何純文字編輯器皆可，接著透過瀏覽器執行網頁，理論上最新版 Chrome, Firefox, Edge 以及 Safari 都可以，[WebGL 在這些瀏覽器都可以使用](https://caniuse.com/webgl)，筆者將使用 Chrome 示範；除此之外，我們需要一種方法讓瀏覽器讀取我們寫的網頁，這邊可以使用任何靜態網頁伺服器，例如：

* [Visual Studio Code Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)，如果編輯器使用 Visual Studio Code，這會是最方便的選擇
* nodeJS 的 [http-server](https://www.npmjs.com/package/http-server)，安裝後在 commandline 上執行 `http-server` 會開啟網頁伺服器，以當前的工作目錄當成網站根目錄，預設把 port 開在 `8080`，可以透過 `http://localhost:8080` 打開網站，同時具有檢視資料夾的功能
* `ruby -run -ehttpd . -p8000`: ruby 內建的網頁伺服器，與 `http-server` 類似，執行後 commandline 當前的工作目錄當成網站根目錄，`-p8000` 意思是 port 開在 `8000`，可以透過 `http://localhost:8000` 打開網站
* `python3 -m http.server` / `python -m SimpleHTTPServer`: python 內建的網頁伺服器，預設把 port 開在 `8000`，可以透過 `http://localhost:8000` 打開網站

準備好開發用網頁伺服器，就可以來建立第一個範例的 HTML 檔案: `01-hello-webgl.html`

```html=
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>01-hello-webgl</title>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module" src="01-hello-webgl.js"></script>
</body>
</html>
```

這邊可以看到有一個 `<canvas id="canvas"></canvas>`，這就是 WebGL 操作的『畫布』，WebGL 繪製的東西將透過這個元素呈現，另外 `<script type="module" src="01-hello-webgl.js"></script>` 以 [ES Module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) 的形式引入我們主要要寫的 Javascript: `01-hello-webgl.js`

```javascript=
console.log('hello')
```

先這樣就好，使用瀏覽器透過網站伺服器打開 `01-hello-webgl.html`，並且按下 F12 或是右鍵檢視元件開啟開發者工具，接著應該可以在 Console 看到 `hello` 表示一切正常：

![console-hello](https://i.imgur.com/WpR0wK8.png)

為了確保之後對原始碼的更動在瀏覽器重整時使用更動後的版本，建議切換至 Network tab 關閉快取，以 Chrome 為例：

![disable-cache](https://i.imgur.com/6ZI6puk.png)

### 取得 WebGL instance

要取得 WebGL instance，我們透過 `<canvas />` JS DOM API 的 [`.getContext()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) 並且傳入 `'webgl'` 來取得，像是這樣：

```javascript=
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');
window.gl = gl;
```

第一行[透過 id 取得元素](https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById)，取得 `gl` 之後也設定到 `window.gl` 上方便在開發工具 Console 中玩轉：

![window.gl](https://i.imgur.com/cIAuIcX.png)

> 另一個常見的繪製 API 為 [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)，這時要傳入的字串就變成 `'2d'`: `.getContext('2d')`，在之後繪製文字的時候會需要這邊的幫忙

### 好歹畫點東西吧

老實說，我們距離繪製一些有意義的東西還有點遙遠，不過倒是可以先找個顏色填滿（事實上是清除）畫面讓第一天有點東西

首先要透過 `gl.clearColor(red, green, blue, alpha)` 設定清除用的顏色，這邊 red, green, blue, alpha 是介於 0 - 1 之間的浮點數，設定好之後，`gl.clear(gl.COLOR_BUFFER_BIT)` 進行清除，而 `gl.COLOR_BUFFER_BIT` 是用來指定清除顏色的部份，以筆者的主題色 `#6bde99` / `rgb(107 222 153)` 為例，大概像是這樣：

```javascript=
gl.clearColor(108/255, 225/255, 153/255, 1);
gl.clear(gl.COLOR_BUFFER_BIT);
```

![clear-color](https://i.imgur.com/L1ywviD.png)

雖然只是拿油漆工具填滿整張畫布，但是第一天至少讓畫面有點東西了，畫面上的綠色區塊就是 `<canvas>`，因為我們沒有設定長寬，在 Chrome 上預設的大小是 300x150

光是從 `gl.clearColor` / `gl.clear` 這兩個就可以感受到 WebGL 是來自另外一個世界的 API，在 GPU 這邊許多東西都是介於 0 到 1 之間的浮點數，而 `gl.COLOR_BUFFER_BIT` 更是體現跟底層溝通用的 bit flag

本篇的完整程式碼可以在這邊找到：[TO BE FILLED: fa8d0f6]()，明天開始來繪製 GL 最常見的基本元素：三角形，並介紹繪製的基本流程

---

## Day 2: 畫一個三角形（上）

在讓電腦繪製一個三維場景時，我們實際在做的事情把這三維場景中物體的『表面』畫在畫面上，而構成一個面最少需要三個點，三個點構成一個三角形，而所有更複雜的形狀或是表面都可以用複數個三角形做出來，因此使用 3D 繪製相關的工具時基本的單位往往是三角形，我們就來使用 WebGL 畫一個三角形吧！

### WebGL 的繪製流程

在使用 WebGL 時，你寫的主程式 (`.js`) 在 CPU 上跑，透過 WebGL API 對 GPU 『一個口令，一個動作』；不像是 HTML/CSS 那樣，給系統一個結構，然後系統會根據這個結構直接生成畫面。而且我們還要先告訴好 GPU 『怎麼畫』、『畫什麼』，講好之後再叫 GPU 進行『畫』這個動作

#### 『怎麼畫』

我們會把一種特定格式的程式（program）傳送到 GPU 上，在『畫』的動作時執行，這段程式稱為 shader，而且分成 vertex（頂點）及 fragment（片段）兩種 shader，vertex shader 負責計算每個形狀（通常是三角形）的每個頂點在畫布上的位置、fragment shader 負責計算填滿形狀時每個 pixel 使用的顏色，兩者組成這個所謂特定格式的程式

#### 『畫什麼』

除了 shader 之外，還要傳送給程式（主要是 vertex shader）使用的資料，在 shader 中這些資料叫做 attribute，並且透過 buffer 來傳送到 GPU 上

#### 『畫』這個動作

首先執行 vertex shader，每執行一次產生一個頂點，且每次執行只會從 buffer 中拿出對應的片段作為 attribute，接著 GPU 會把每三個頂點組成三角形（模式是三角形的話），接著[點陣化（rasterization）](https://zh.wikipedia.org/wiki/%E6%A0%85%E6%A0%BC%E5%8C%96)以對應螢幕的 pixel，最後為每個 pixel 分別執行 fragment shader

以接下來要畫的三角形為例，筆者畫了簡易的示意圖表示這個流程：

![draw-flow](https://static.pastleo.me/assets/day2-01-draw-flow-210806011748.svg)

> 為什麼是這樣的流程其實筆者也不得而知，或許就是[維基百科 openGL 頁面這邊所說的：『它是為大部分或者全部使用硬體加速而設計的』](https://zh.wikipedia.org/wiki/OpenGL#%E8%A8%AD%E8%A8%88)，稍微想像一下，每個頂點位置以及每個 pixel 著色的計算工作可以高度平行化，而在顯示卡硬體上可以針對這個特性使這些工作平行地在大量的 [ALU](https://zh.wikipedia.org/wiki/%E7%AE%97%E8%A1%93%E9%82%8F%E8%BC%AF%E5%96%AE%E5%85%83) / [FPU](https://zh.wikipedia.org/wiki/%E6%B5%AE%E7%82%B9%E8%BF%90%E7%AE%97%E5%99%A8) 上同時計算以達到加速效果

### 建立 shader

當筆者第一次看到這個的時候，第一個反應是『原來可以在瀏覽器裡面寫 C 呀』，這個語言稱為 [OpenGL Shading Language](https://zh.wikipedia.org/wiki/GLSL)，簡稱 GLSL，雖然看起來很像 C 語言，但是不能直接當成 C 來寫，他有自己的[資料格式](https://www.khronos.org/opengl/wiki/Data_Type_(GLSL))，我們直接來看畫三角形用的 vertex shader:

```c=
attribute vec2 a_position;
 
void main() {
  gl_Position = vec4(a_position, 0, 1);
}
```

* 每次 shader 執行時跑 `void main()`
* `attribute vec2 a_position` 是從 buffer 拿出對應的部份作為 attribute 變數 `a_position`，型別 `vec2` 表示有兩個浮點數的 vector
  * 接下來要繪製的三角形在 2D 上，只需要 x, y 即可，因此使用 `vec2`
* `gl_Position` 是 GLSL 規定用來輸出在畫布上位置的變數，其型別是 `vec4`
  * 這個變數的第一到第三個元素分別是 x, y, z，必須介於 `-1` 至 `+1` 才會落在畫布中，這個範圍稱為 clip space
  * `vec4()` 建構一個 `vec4`，理論上應該寫成 `vec4(x, y, z, w)`，因為 `a_position` 是 `vec2`，這邊有語法糖自動展開，所以也可以寫成 `vec4(a_position[0], a_position[1], 0, 1)`
  * 第四個元素我們先傳 `1`，到後面的章節再討論
  
> 假設有個 `vec4` 的變數叫做 `var`，不僅可以使用 `var[i]` 這樣的寫法取得第 i 個元素（當然，從 0 開始），還可以用 `var.x` / `var.y` / `var.z` / `var.w` 取得第一、第二、第三、第四個元素，甚至有種叫做 [swizzling](https://www.khronos.org/opengl/wiki/Data_Type_(GLSL)#Swizzling) 的寫法：`var.xzz` 等同於 `vec3(var[0], var[2], var[2])`

這個 shader 其實沒做什麼事，只是直接把輸入到 buffer 的位置資料放到 `gl_Position`，接著是 fragment shader，這次更簡單了：

```c=
void main() {
  gl_FragColor = vec4(0.4745, 0.3333, 0.2823, 1);
}
```

* 每個 pixel 都要跑一次 `void main()`
* `gl_FragColor` 是 GLSL 規定用來輸出在畫布上顏色的變數，其型別是 `vec4`
  * 各個元素分別是介於 `0` 到 `1` 之間的 red, green, blue, alpha

為了不要讓資訊量太爆炸，我們先不要介紹更多功能，這個 fragment shader 只會輸出一種顏色，所以我們會得到的三角形是純色的

#### 編譯、連結 shader 成為 program

由於 shader 建立的 WebGL API 實在太繁瑣，這邊直接建立兩個 function:

```javascript=
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (ok) return shader;

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const ok = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (ok) return program;

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}
```

我們可以分別把 vertex shader, fragment shader 的 GLSL 原始碼以 [template literals (backtick 字串)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) 寫在 `.js` 中，並傳給 `createShader(gl, type, source)` 的 `source` 進行『編譯』:

```javascript=
const vertexShaderSource = `
attribute vec2 a_position;
 
void main() {
  gl_Position = vec4(a_position, 0, 1);
}
`;
 
const fragmentShaderSource = `
void main() {
  gl_FragColor = vec4(0.4745, 0.3333, 0.2823, 1);
}
`;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
```

編譯完成後，使用 `createProgram(gl, vertexShader, fragmentShader)` 把 GPU 內『怎麼畫』的流程串起來：

```javascript=
const program = createProgram(gl, vertexShader, fragmentShader);
```

這樣一來 `program` 就建立完成，本篇的完整程式碼可以在這邊找到：[TO BE FILLED: 97dc748]()，下一篇我們再繼續『畫什麼』的資料部份

---

## Day 3: 畫一個三角形（下）

在上一篇 WebGL 的繪製流程，同時也建立了 shader 並鍊結成 program，如果有需要可以回到上一篇複習：[Day 2: 畫一個三角形（上）]()，而接下來要告訴 GPU 『畫什麼』，精確來說，就是提供上一篇 vertex shader 中 `a_position` 所需的資料

### 取得 Attribute 位置

這個有點指標的感覺，`gl.getAttribLocation` 可以取得 attribute 在 program 中的位置，同時也把取得的值印出來看看：

```javascript=
const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
console.log({ positionAttributeLocation })
// => {positionAttributeLocation: 0}
```

就是單純的數字，待會這個數字會用來跟 buffer 綁定

> 找不到的時候這個數字會是 `-1`，如果 GLSL 裡面寫了一些沒有被使用到的 attribute 變數，那在 GPU 編譯的過程中會消失，所以就算 GLSL 原始碼有宣告 attribute，有可能因為被判定沒有使用到變數導致 `gl.getAttribLocation` 拿到 `-1`

### 建立並使用 Buffer

```javascript=
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
```

使用 `gl.createBuffer()` 便可建立 buffer，然後使用 `gl.bindBuffer()` 『設定目前使用中的 array buffer』；在 WebGL API 中，有許多內部的『對準的目標』（binding point），而看到 `bind` 的字眼時，他們的功能往往是去設定這些『對準的目標』，設定完成後，接下來呼叫的其他 WebGL API 就會對著設定好的目標做事

除此之外，`gl.bindBuffer()` 第一個參數傳入了 `gl.ARRAY_BUFFER`，在 [mdn](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bindBuffer) 上這個參數叫做 target，表示 buffer 不只有一種，而 `gl.ARRAY_BUFFER` 這種 buffer 才能與 vertex shader 的 attribute 連結，描述這層連結關係的功能叫做 vertex attribute array

### Vertex Attribute Array

首先在 attribute `a_position` 位置上啟用這個功能：

```javascript=
gl.enableVertexAttribArray(positionAttributeLocation);
```

啟用之後，設定 attribute 拿資料的方法：

```javascript=
gl.vertexAttribPointer(
  positionAttributeLocation,
  2, // size
  gl.FLOAT, // type
  false, // normalize
  0, // stride
  0, // offset
);
```

雖然看似沒有提到任何 buffer 的東西，但是經過筆者測試這行執行下去的時候會讓 attribute 設定成與目前『對準的 `ARRAY_BUFFER` 目標』關聯，同時來看一下各個[參數](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer)：

* 第一個參數 `index`: 看到傳入 `positionAttributeLocation` 應該可以猜到，就是要設定的 attribute 位置
* 第二個參數 `size`: 筆者認為這是這個 API 最重要的參數，設定了每次 vertex shader 執行時該 attribute 要從 buffer 中拿出多少個數值，依序填入 `vecX` 的各個元素，這邊使用 `2` 剛好填滿 shader 中的 `attribute vec2 a_position` 
  * 事實上，就算 attribute 是 `vec4` 且 size 只餵 2 進去也是可以的，剩下的空間 WebGL 會有預設值填上，預設值的部份與之後 3D 相關，之後再來討論
* 第三個參數 `type` 與第四個參數 `normalized`: 設定原始資料與 attribute 的轉換，`type` 指的是原始資料的型別，此範例直接一點傳入 `gl.FLOAT` ，而 `normalize` 在整數型別時可以把資料除以該型別的最大值使 attribute 變成介於 -1 ~ +1 之間的浮點數，此範例不使用此功能傳 `false` 進去即可
  * 假設今天原始資料是 0~255 整數表示的 RGB，那麼就可以用 `type: gl.UNSIGNED_BYTE` 搭配 `normalize: true` 使用，在 shader 中 attribute 就會直接是符合 `gl_FragColor` 的顏色資料
* 第五個參數 `stride` 與第六個參數 `offset`: 控制讀取 buffer 時的位置，`stride` 表示這次與下次 vertex shader 執行時 attribute 讀取的起始位置的距離，設定為 `0` 表示每份資料是緊密排列的，`offset` 則是第一份資料距離開始位置的距離，這兩個參數的單位皆為 byte

筆者畫了一份示意圖表示這個範例呼叫 `gl.vertexAttribPointer()` 後 buffer 與 attribute 的運作關係

![01-vertex-attrib-pointer](https://static.pastleo.me/assets/day3-01-vertex-attrib-pointer-210807233834.svg)

本範例沒有使用到 `stride` 與 `offset`，既然都有上圖了那就舉個使用 `stride` 與 `offset` 的狀況：

![02-vertex-attrib-pointer](https://static.pastleo.me/assets/day3-02-vertex-attrib-pointer-210807233838.svg)

### 傳入資料到 buffer，設定三角形的位置

在上面已經使用 `gl.bindBuffer()` 設定好『對準的 `ARRAY_BUFFER` 目標』，接下來呼叫 `gl.bufferData()` 對 buffer 輸入資料

```javascript=
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    0, 0.2,
    0.2, -0.1,
    -0.2, -0.1,
  ]),
  gl.STATIC_DRAW,
);
```

第二個參數即為 buffer 的資料，也就是三角形頂點的位置，注意要傳入與 `gl.vertexAttribPointer()` `type` 符合的 [TypedArray](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)，關於這些數值：

1. 在上篇有提到：x, y, z 必須介於 `-1` 至 `+1` 才會落在畫布中
2. 在 x 軸方向，左為 `-1`, 右為 `+1`、y 軸方向，上為 `+1`，下為 `-1`

假設三角形頂點分別依序為 A, B, C，示意圖如下：

![day3-03-triangle-vertice](https://static.pastleo.me/assets/day3-03-triangle-vertice-210808001811.svg)

### 終於，『畫』這個動作

```javascript=
gl.useProgram(program);
gl.drawArrays(gl.TRIANGLES, 0, 3);
```

設定使用上篇建立好的 program，接著 `gl.drawArrays()` 就是『畫』這個動作，其[參數](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays)功能：

* 第一個參數 `mode`: 透過這個參數可以請 WebGL 畫 點、線，而面的部份就是三角形 `gl.TRIANGLES` 了
* 第二個參數 `first`: 類似上面的 offset，精確來說是『略過多少個頂點』
* 第三個參數 `count`: 有多少個頂點，我們畫一個三角形，共三個頂點

三角形畫出來了：

![result](https://i.imgur.com/XUQdOOd.png)

> 到最後一刻才呼叫 `gl.useProgram()`，整個資料設定的過程還是透過 attribute 的『位置』設定的，這表示資料在一定程度上可以與 shader 脫鉤，打個比方，同一個 3D 物件可以根據情況使用不同的 shader 來渲染達成不同的效果，但是在記憶體中這個 3D 物件只需要一份就好

三角形的顏色是寫死在 fragment shader 內，讀者們可以試著調顏色、頂點位置玩玩看，本篇的完整程式碼可以在這邊找到：[TO BE FILLED: 2fee106]()

花了這麼多力氣，就只是一個純色的三角形，而且定位還得先用畫布的 `-1 ~ 1` 來算，接下來繼續介紹更多 shader 接收資料、參數的方式來使繪製更加靈活

---

## Day 4: Uniform -- shader 之參數

### 使用『畫布中的 x/y pixel 位置』定位

在上一篇雖然把三角形畫出來了，但是在傳入 `a_position` 時要先算出頂點在 clip space 中 `-1 ~ +1` 的值，如果要畫更多 2D 三角形，可以用 pixel 為單位直接在畫布上定位會方便許多，本篇就以這個為目標進行修改

### Uniform - 設定在 program 上的參數

Uniform 類似 attribute，可以把資料傳到 shader 內，但是使用上比 attribute 簡單許多，因為 uniform 是直接設定在 program 上的，因此不會有各個頂點讀取 buffer 中哪個位置的問題，也是因為這樣，在每個頂點計算的時候 uniform 的值都一樣，所以才叫做 uniform 吧

使三角形的定位使用『畫布中的 pixel 位置』，要先算出頂點在 clip space 中 `-1 ~ +1` 的值，要做到這件事情當然可以寫一個簡單的 function 在 `gl.bufferData()` 之前對座標做一些處理，但是這邊是一個很適合使用 uniform 解決的問題；當傳入 `positionBuffer` 的頂點座標是畫布上 x/y 軸的 pixel 位置，而輸出給 `gl_Position` 的值必須介於 `-1 ~ +1`，shader 需要知道的資訊就是畫布寬高，畫布的寬高不論在哪個頂點值都相同，故適合以 uniform 來處理

在 vertex / fragment shader 中可以以這樣的方式宣告 uniform:

```c=
uniform vec2 u_resolution;
```

接著跟 attribute 一樣，先取得變數位置：

```javascript=
const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
```

在呼叫 `gl.useProgram()` 設定好使用中的 program 之後，像這樣就可以對著使用中的 program 設定 uniform:

```javascript=
gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
```

> `canvas` 是第一篇 `document.getElementById('canvas')` 取得的元素，其身上就有 [`.width`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/width), [`.height`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/height) 可用

在 Chrome 的 Console 上，輸入 `gl.uniform` 可以看到有這麼多 function:

![uniform-types](https://i.imgur.com/OJH0NGf.png)

這些 `uniformXXX` 是針對不同型別所使用的，像是筆者上面使用的 `uniform2f` 的 `2f` 表示 2 個元素的 float，也就是 `vec2`，這邊可以看到一路從 `1f` 單個 float 到 `Matrix4f` 設定整個 4x4 矩陣都有。除此之外，對於每種資料型別分別還有一個結尾多了 `v` 的版本 （以 `uniform2f` 為例：`gl.uniform2fv`），其實功能沒什麼不同，只是 function 接收參數的方式改變，從 `gl.uniform2f(index, x, y)` 變成 `gl.uniform2fv(index, [x ,y])`

當然也得來修改 vertex shader 使用 `u_resolution` 做轉換：

```c=
void main() {
  gl_Position = vec4(
    a_position / u_resolution * vec2(2, -2) + vec2(-1, 1),
    0, 1
  );
}
```

講解一下：假設寬高是 300x150，一組頂點位置 `a_position` 為 (150, 90)，除以 `u_resolution` 得到 (0.5, 0.6) `0 ~ 1` 之間的位置，最後分別對 x 座標 `* 2 - 1`、對 y 座標 `* -2 + 1` 得到 (0.0, -0.2) 給 `gl_Position` 在 clip space 中的位置。這邊我想讀者會有兩個疑問：

1. `vec2` 可以跟 `vec2` 直接做加減乘除運算？對，相當於每個元素分別做運算，以加法為例像是這樣：`vec2(x1, y1) + vec2(x2, y2) = vec2(x1+x2, y1+y2)`。筆者看到這樣的寫法第一個瞬間也是『這樣會動？』像 Javascript `[1,2] * [3,4]` 只會得到 `NaN`，畢竟一般常見的程式語言的用途比較通用 (general) 不像 GLSL 很常有這樣的運算特化出 `vec` 之間加減乘除的寫法
2. 對 x 座標 `* 2 - 1`，而對 y 座標 `* -2 + 1`? 因為在 clip space /畫布 中，上方為 `y = 1`、下方為 `y = -1`，因此 y 軸正向指著上方的，這個方向和我們在電腦中圖片、網頁的 y 軸方向是相反的，既然要做轉換，那就把這個問題一起修正

### 傳入的頂點位置 `a_position` 可以改用 pixel 座標了

筆者用上面的公式拿原本的值做反向運算可以得知在 300x150 的 pixel 座標：

```javascript=
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    150, 60,
    180, 82.5,
    120, 82.5,
  ]),
  gl.STATIC_DRAW,
);
```

不過看起來沒有任何改變就是了...

### 使畫布填滿整個畫面

如果讀者使用過 CSS，並且知道 `<canvas />` 元素類似 `<img />`，那麼應該可以想到簡單的這幾行 CSS，筆者直接寫在 HTML 上：

```htmlembedded=
<style>
  html, body {
    margin: 0;
    height: 100%;
  }
  #canvas {
    width: 100%;
    height: 100%;
  }
</style>
```

但是重整之後看到的只是放大的樣子，就像是把圖片放大的感覺：

![scaled-canvas](https://i.imgur.com/IqE3otY.png)

在 `<canvas />` 元素上有自己的寬高資訊，類似於圖片的原始大小，可以在 Console 上輸入 `gl.canvas.width` 從 WebGL instance 找回 `canvas` 元素並取得『原始大小』的寬度：

![canvas-width-height](https://i.imgur.com/YCrOPnI.png)

顯然還是原本預設的值，幸好 DOM API 有另外一組提供實際的寬高 [`.clientWidth`](https://developer.mozilla.org/en-US/docs/Web/API/Element/clientWidth), [`.clientHeight`](https://developer.mozilla.org/en-US/docs/Web/API/Element/clientHeight)，我們可以直接把 `.clientWidth` / `.clientHeight` 設定回這個 `canvas` 圖片的原始大小：

```javascript=
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

// before gl.clearColor(...)
```

![canvas-resized](https://i.imgur.com/TdCuFqv.png)

模糊的現象消失了，看起來實際大小的更動有效，但是那個三角形的位置顯然不太對...

事實上，WebGL 還有一個內部的『繪製區域』設定，因此還需要：

```javascript=
// after canvas.height = canvas.clientHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

// before gl.clearColor(...)
```

參數分別為 `x`, `y`, `width`, `height`，這個 `x`, `y` 是指左下角在畫布中的位置，這邊我們要填滿整張畫布，給 `0` 即可，並把寬高給滿。大家可能會想說，為什麼 WebGL 有內部的『繪製區域』的設定？不知道各位有沒有玩過馬力歐賽車的多人同樂模式，這種在同一個螢幕『分割畫面』的狀況，就可以用 `gl.viewport` 設定繪製區域為一個玩家繪製畫面，繪製完再呼叫 `gl.viewport` 繪製另外一位玩家的畫面，WebGL 沒有幫開發者預設使用情境，因此需要自行呼叫 `gl.viewport` 來修正

![result](https://i.imgur.com/8RFxdvQ.png)

> 若在網頁載入渲染完成後調整視窗大小，一樣會發生拉伸的狀況，這時 `canvas.width`, `canvas.height` 跟 WebGL 繪製區域都得再進行調整並重新繪製

終於正確了，三角形的頂點位置符合 `a_position` 傳入的 pixel 座標值，本篇的完整程式碼可以在這邊找到：[TO BE FILLED: e3520b8]()

畫面上只有一個三角形顯然有點孤單，待下篇來畫多個、顏色不同的三角形

---

## Day 5: Varying -- fragment shader 之資料

### 畫多個三角形

Day 3 畫出三角形時，在 `positionBuffer` 中傳入了 3 個頂點，每個頂點分別有兩個值 (x, y) 表示座標乘下來共 6 個值，並且在 `gl.drawArrays()` 的最後一個參數 `count` 參數傳入 3 表示畫三個頂點；若要畫更多三角形，我想讀者也已經想到，分別在 `positionBuffer` 傳入更多『組』三角形的每個頂點座標，接著修改 `gl.drawArrays()` 的 `count` 即可，筆者直接畫三個三角形：

```javascript=
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    150, 60,
    180, 82.5,
    120, 82.5,

    100, 60,
    80, 40,
    120, 40,

    200, 60,
    180, 40,
    220, 40,
  ]),
  gl.STATIC_DRAW,
);

// ...

gl.drawArrays(gl.TRIANGLES, 0, 9);
```

看起來像是這樣：

![multiple-triangles](https://i.imgur.com/E06C9kn.png)

> 這些只是筆者隨便想到的圖案，讀者們可以自行發揮想像力調整頂點座標

筆者當時很好奇：如果 buffer 資料長度不足，或是 `count` 不是三的倍數，那麼會怎麼樣呢？如果把最後一組頂點刪除（`220, 40` 那組），`count` 保持為 9，不僅不會有什麼陣列超出的錯誤，感覺上 vertex attribute array 還給不足的部份填上預設值 `0`：

![buffer-not-full](https://i.imgur.com/VEFQQ9n.png)

或者把 `count` 改成 8，也不會有錯誤，只是最後一組三角形沒有完整，兩個點湊不出一個面，因此最後一個三角形就消失了：

![draw-count-8](https://i.imgur.com/5y0i0zU.png)

### 顏色不同的三角形

在 [Day 2]() 我們實做的 fragment shader 只是純粹把顏色指定上去，所以現在不論畫幾個三角形，顏色都是當初寫死在 fragment shader 中的顏色：

```c=
gl_FragColor = vec4(0.4745, 0.3333, 0.2823, 1);
```

要讓不同三角形有不同的顏色，要思考的是輸入資料/參數給 fragment shader 的方式，在 fragment shader 中可以使用 uniform，但是那樣的話所有三角形的顏色依然會是一樣，得用類似 attribute / buffer 『每次 shader 呼叫不同』的東西，不過 fragment shader 中是不能使用 attribute 的功能的，回想 [Day 2]() fragment shader 的運作方式：fragment shader 是每個 pixel 執行一次，不像是 vertex shader 以頂點為單位，取用 array buffer 的方式顯然對不起來，因此需要另外一種傳輸工具 -- varying

### Varying

varying 這功能可以讓 vertex shader 輸出資料給 fragment shader 使用，但是兩者執行的回合數顯然是對不起來，假設回到一個低解析度三角形的狀況如下圖，vertex shader 執行三次得到三個頂點，灰色的方格每格執行一次 fragment shader 計算顏色：

![vertex-fragment](https://static.pastleo.me/assets/day4-vertex-fragment-210811222933.svg)

vertex #1 輸出一組資料、vertex #2 輸出一組資料、vertex #3 輸出一組資料，那麼 fragment #2, fragment #3, fragment #4 這些介於中間 pixel 執行的 fragment shader 會拿到什麼資料？答案是：WebGL 會把頂點與頂點之間輸出的 varying 做平滑化！

假設 vertex #1 輸出 `v_number = 0.2`、vertex #2 輸出 `v_number = 1.1`，那麼介於 vertex #1, #2 之間的 fragment #2 將拿到兩個點輸出的中間值，並且越接近某個頂點的 pixel 就會得到越接近該頂點輸出的 varying，筆者畫了一張簡易的示意圖舉例 varying 平滑化的樣子：

![varying](https://static.pastleo.me/assets/day4-varying-210811222717.svg)

這個特性不僅解決問題，也讓筆者覺得相當有意思，有種當初玩 flash 移動補間動畫的感覺

### 輸入顏色資訊到 varying 給 fragment shader 使用

我們從 fragment shader 開始修改，varying 宣告方式、使用上跟 attribute 差不多，只是把 `attribute` 改成 `varying`:

```c=
precision mediump float;
varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 1);
}
```

輸出顏色從原本寫死的改用一個叫做 `v_color` 的 varying `vec3`

> 這邊還多了一行 `precision mediump float;`，這是用來[設定 shader 要使用多精準的浮點數](https://stackoverflow.com/a/13780779)，如果沒有特別需求使用中等 `mediump` 就行了

那麼在 vertex shader 得負責輸出這個值，雖然在 vertex shader 這邊 varying 是要輸出，但是寫法一樣是 `varying vec3 v_color;`:

```diff=
 attribute vec2 a_position;
+attribute vec3 a_color;
  
 uniform vec2 u_resolution;
+
+varying vec3 v_color;
   
 void main() {
   gl_Position = vec4(
     a_position / u_resolution * vec2(2, -2) + vec2(-1, 1),
     0, 1
   );
+  v_color = a_color;
 }
```

可以看到筆者加了一個 `attribute vec3 a_color`，並且直接把 `v_color` 指定成 `a_color` 的值，接下來就是重複 [Day 3]() 『畫什麼』的資料輸入、vertex attribute array 等設定：


```javascript=
const colorAttributeLocation = gl.getAttribLocation(program, 'a_color');

// a_position
// ...

// a_color
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

gl.enableVertexAttribArray(colorAttributeLocation);
gl.vertexAttribPointer(
  colorAttributeLocation,
  3, // size
  gl.UNSIGNED_BYTE, // type
  true, // normalize
  0, // stride
  0, // offset
);

gl.bufferData(
  gl.ARRAY_BUFFER,
  new Uint8Array([
    121, 85, 72,
    121, 85, 72,
    121, 85, 72,

    0, 0, 0,
    255, 255, 255,
    255, 255, 255,

    0, 0, 0,
    255, 255, 255,
    255, 255, 255,
  ]),
  gl.STATIC_DRAW,
);
```

這段程式碼原理在 [Day 3]() 都有提過，比較需要注意幾點：

1. `gl.vertexAttribPointer()` 以及 `gl.bufferData()` 該行執行的當下要注意 bind 的 `ARRAY_BUFFER` 是哪個，要不然會對著錯誤的目標做事，當然最好的就是把對於一個 attribute 的操作清楚分好，日後也比較好看出該區域在操作的對象
2. `gl.vertexAttribPointer()` 的 `size: 3`，因為顏色有 3 個 channel: RGB，因此對於每個頂點 `gl.bufferData()` 要給 3 個值
3. 筆者在 `gl.vertexAttribPointer()` 使用 `gl.UNSIGNED_BYTE` 配合 `normalize: true` 來使用，在 [Day 3]() 有提到： normalize 配合整數型別時可以把資料除以該型別的最大值使 attribute 變成介於 <= 1 的浮點數，那麼在 `gl.bufferData()` 時傳入 `Uint8Array`，並且可以在資料內容寫熟悉的 rgb 值

總結來說資料流如下：

1. 每個頂點有一組 (x, y) 座標值 `a_position` 以及顏色資料 `a_color`
2. 在 vertex shader 除了計算 clip space 座標外，設定 varying `v_color` 成為 `a_color`
3. 在各個頂點之間 `v_color` 會平滑化，約接近一個頂點的 pixel `v_color` 就越接近該頂點當初設定的 `a_color`
4. fragment shader 拿到 `v_color` 並直接輸出該顏色

對於顏色資料的部份，筆者在前三個頂點給一樣的顏色，所以第一個三角形是純色，第二、第三個三角形的第一個頂點為黑色，剩下兩個頂點為白色，因為平滑化的緣故，會得到漸層的效果：

![multiple-different-color-triangles](https://i.imgur.com/YVaY90B.png)

本篇的完整程式碼可以在這邊找到：[TO BE FILLED: 9464b76]()，筆者認為 WebGL API 最基本的 building block 其實就是 Day 1 到 Day 5 的內容，接下來除了 texture, skybox 之外，幾乎可以說是用這些 building block（搭配線性代數）建構出 3D、光影等效果。下一章就來介紹 texture 並讓 shader 真的開始做一些運算

> 如果讀者好奇去修改傳入 `gl.bufferData()` 的資料玩玩的話，應該很快就會發現要自己去對 `a_position` 的第幾組資料跟 `a_color` 的第幾組資料是屬於同一個頂點的，他們在程式碼上有點距離，沒有那種 `{position: [1,2], color: '#abcdef'}` 清楚的感覺，真的要做些應用程式，很快就得自己對這部份做點抽象開始包裝，要不然程式碼一轉眼就會讓人難以摸著頭緒