---
tags: webgl, ironman, post
---

CH2: texture and 2D [WebGL 鐵人]
===

## Day 6: 在 WebGL 取用、顯示圖片 -- Textures

有在玩遊戲的讀著們在討論一款 3D 遊戲的時候，可能有提到遊戲內的『3D 貼圖』，遊戲 3D 物件表面常常不會是純色或是漸層單調的樣子，而是有一張圖片貼在這個物件表面的感覺，所以才叫做『3D 貼圖』吧，而且也可以用在圖案重複的『材質』顯示上，因此在英文叫做 texture。雖然現在還完全沒有進入 3D 的部份，但是 3D 貼圖/texture 追根究底得有個方法在 WebGL 裡面取用、顯示圖片，本篇抽離 3D 的部份，來介紹在 WebGL 取用、顯示圖片的方式

### `02-texture-2d.html` / `02-texture-2d.js`

本篇開始將使用新的 `.html` 作為開始，起始點完整程式碼可以在這邊找到：[TO BE FILLED: e420f15]()，筆者將 `createShader`, `createProgram` 移動到工具箱 [`lib/utils.js`]()，裡面有 `loadImage` 用來下載並回傳 [`Image`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/Image) 元素（注意，是 async function），並且 `position` 與 [Day 5]() 相同使用 pixel 座標定位，看起來像是這樣：

![02-texture-2d-start](https://i.imgur.com/t7cPxet.png)

這一個灰色的正方形是由兩個三角形組成的，讀者可以在 `02-texture-2d.js` 的 `gl.bufferData()` 中看到每個頂點後面有一個註解字母，其對應了下面這張示意圖：

![square-vertices](https://static.pastleo.me/assets/day6-square-vertices-210814004709.svg)

接下來以此為起點，讓灰色方形區域顯示圖片

### 建立 WebGL texture

建立之前，把來源圖片下載好，直接呼叫 `loadImage` 並傳入圖片網址，因為牽扯到非同步，這邊得用 `await`（也是因此得寫在 `async function main()` 內）：

```javascript=
const image = await loadImage('https://i.imgur.com/ISdY40yh.jpg');
```

這張圖片是筆者的大頭貼：

![pastleo](https://i.imgur.com/ISdY40yh.jpg)

接著建立、bind（對準）並設定 texture:

```javascript=
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texImage2D(
  gl.TEXTURE_2D,
  0, // level
  gl.RGB, // internalFormat
  gl.RGB, // format
  gl.UNSIGNED_BYTE, // type
  image, // data
);
```

可以發現 `gl.createTexture()` / `gl.bindTexture()` 這個組合與 `gl.createBuffer()` / `gl.bindBuffer()` 這個組合神似，建立並且把 `gl.TEXTURE_2D` 目標對準 texture；接下來設定 texture 資料 [`gl.texImage2D()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D):

* `level`: 對於一個 texture 其實有許多縮放等級，與接下來的 `gl.generateMipmap` 有一定的關係，不過這邊通常是填 `0` 表示輸入的是原始尺寸/最大張的圖
* `internalFormat`, `format`, `type`: 根據 [mdn 文件](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D)，`format` 在 WebGL1 必須與 `internalFormat` 相同，從文件中 internalformat 下方的表格可以看到有哪些選項可以填，顯然來源圖片有 RGB 三個 channel，想當然爾 format 選 `RGB`，而 `type` 沒有特別的需求選擇 `UNSIGNED_BYTE`

最後 `data` 直接把 `image` 元素給進去，圖片就以 RGB 的格式輸入到 GPU 內 texture 的 `level: 0` 位置上

讀者可能對 `level` 的部份很納悶，可以想像一下，在 3D 的世界中鏡頭可能距離貼圖很遙遠，顯示時為了效率沒辦法當下做完整圖片的縮放，因此會事先把各個尺寸的縮圖做好放在記憶體裡，這樣的東西叫做 [mipmap](https://en.wikipedia.org/wiki/Mipmap)，而 `level` 表示縮放的等級，`0` 表示沒有縮放的版本。所以開發者得自己把各個縮放尺寸做好分別輸入嗎？幸好 WebGL 有內建方法一行對著目前的 texture 產生所有尺寸：

```javascript=
gl.generateMipmap(gl.TEXTURE_2D);
```

### 如何在 shader 中使用 texture

回想 fragment shader 的運作方式：在每個 pixel 運算其顏色。那麼如果要顯示 texture，就會變成『在每個 pixel 運算時從 texture 圖片上的某個位置取出其顏色來輸出』。在 GLSL 中可以透過 uniform 傳輸一種叫做 `Sampler2D` 的資料型別：

```c=
uniform sampler2D u_texture;
```

把這個 uniform 變數叫做 `u_texture`，其實就是 texture。接著 GLSL 的內建 function `texture2D()` 可以進行上面所說的『從 texture 圖片上的某個位置取出其顏色』：

```c=
gl_FragColor = texture2D(u_texture, v_texcoord);
```

`v_texcoord` 即為『某個位置』，既然是 `sampler2D`，`v_texcoord` 型別必須是 `vec2` 表示在 texture 圖片上的 `(x, y)` 座標，並且 `(0.0, 0.0)` 為圖片左上角， `(1.0, 1.0)` 為圖片右下角。腦筋快的應該已經想到，`v_texcoord` 是一個 varying，因為每個頂點之間所要取用的 texture 圖片座標是連續、平滑的。最後完整的 fragment shader 長這樣：

```c=
precision mediump float;

varying vec2 v_texcoord;

uniform sampler2D u_texture;

void main() {
  gl_FragColor = texture2D(u_texture, v_texcoord);
}
```

### Varying `v_texcoord`

與 [Day 5]() 類似，既然 fragment shader 需要 varying，因此得在 vertex shader 提供 varying，vertex shader 又需要從 attribute 取得 texture 各個頂點需要取用的座標，對 vertex shader 加上這幾行：

```diff=
 attribute vec2 a_position;
+attribute vec2 a_texcoord;
  
 uniform vec2 u_resolution;
  
+varying vec2 v_texcoord;
+
 void main() {
   gl_Position = vec4(
     a_position / u_resolution * vec2(2, -2) + vec2(-1, 1),
     0, 1
   );
+  v_texcoord = a_texcoord;
 }
```

取得 `a_texcorrd` attribute 位置、並設定 buffer, vertex attribute array:

```javascript=
const texcoordAttributeLocation = gl.getAttribLocation(program, 'a_texcoord');

// ...

// a_texcoord
const texcoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

gl.enableVertexAttribArray(texcoordAttributeLocation);
gl.vertexAttribPointer(
  texcoordAttributeLocation,
  2, // size
  gl.FLOAT, // type
  false, // normalize
  0, // stride
  0, // offset
);

gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    0, 0, // A
    1, 0, // B
    1, 1, // C

    0, 0, // D
    1, 1, // E
    0, 1, // F
  ]),
  gl.STATIC_DRAW,
);
```

因為 texture (0.0, 0.0) 為圖片左上角， (1.0, 1.0) 為圖片右下角，在 `gl.bufferData()` 對於每個頂點的填入的 `texcoord` 示意圖如下：

![position-texcoord](https://static.pastleo.me/assets/day6-position-texcoord-210814004724.svg)

### 提供 texture 給 shader 使用

整張 texture 應該是個巨大的陣列資料，但是與 array buffer 不同，texture 必須提供隨機存取（random access），意思是說 fragment shader 不論在哪個 pixel 都可以取用 texture 任意位置的資料；texture 又是用 uniform 類似指標的方式提供給 shader 使用，可能 texture 在 GPU 上有特別的硬體做處理

首先一樣取得 uniform 位置：

```javascript=
const textureUniformLocation = gl.getUniformLocation(program, 'u_texture');
```

然後設定把 texture 啟用在一個『通道』，並把這個通道的編號傳入 uniform:

```javascript=
// after gl.useProgram()...

const textureUnit = 0;
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.activeTexture(gl.TEXTURE0 + textureUnit);
gl.uniform1i(textureUniformLocation, textureUnit);
```

* `textureUnit` 為通道的編號，設定為 `0` 使用第一個通道
* `gl.bindTexture` 把目標指向建立好的 `texture`，如果有其他 texture 導致目標更換時，這邊要把目標設定正確，雖然本篇只有一個 texture 就是了
* `gl.activeTexture()` 啟用通道並把目標 texture 設定到通道上，這邊還有神奇的 `gl.TEXTURE0 + textureUnit` 寫法；讀者可以嘗試在 Console 輸入 `gl.TEXTURE1 - gl.TEXTURE0` (`1`)，或是 `gl.TEXTURE5 - gl.TEXTURE2` (`3`)，就可以知道為什麼可以用 `+` 共用 `textureUnit` 指定通道了
* 在 [Day 4]() 介紹 uniform 提到對於每種資料型別都有一個傳入 function，`gl.uniform1i` 傳的是 1 個整數，把通道的編號傳入，在 fragment shader 中就會直接被反應成 `sampler2D`

一切順利的話，就可以看到圖片出現在 canvas 裡頭，fragment shader 成功地『在每個 pixel 運算時從 texture 圖片上的某個位置取出其顏色來輸出』：

![texture-result](https://i.imgur.com/xeHWDqb.png)

讀者如果有興趣，可以修改 `texcoord` 的數字感受一下 `texture2D()`，像是把 C 點 `texcoord` 改成 (0.8, 0.8) 就變成這樣：

![texture-0.8](https://i.imgur.com/owsZn0X.png)

本篇的完整程式碼可以在這邊找到：[TO BE FILLED: fe6955b]()，但是關於 texture 其實還有許多細節，待下篇再來繼續討論

## Day 7: more about Textures

### 換張圖試試看？

繼上篇顯示出繪製出圖片後，不知道有沒有讀者好奇使用自己的圖片試試？如果有，那麼有很高的機率圖片是顯示不出來的，假設換成這張好了：

![another-image](https://i.imgur.com/vryPVknh.jpg)

也就是改這行：

```diff=
-  const image = await loadImage('https://i.imgur.com/ISdY40yh.jpg');
+  const image = await loadImage('https://i.imgur.com/vryPVknh.jpg');
```

圖片就顯示不出來了，並且可以在 Console 看到 WebGL 的警告：

![non-power-of-two](https://i.imgur.com/D0mmEBvh.png)

`GL_INVALID_OPERATION: The texture is a non-power-of-two texture.` 這張貓圖的解析度是 1024x768，寬是 2 的次方，但是高不是，因此產生了錯誤，為什麼會這樣呢？事實上 WebGL1 的 texture 的取樣預設運作模式以及 `gl.generateMipmap(gl.TEXTURE_2D)` 製作縮圖功能都只支援寬高皆為 2 次方的圖，在上篇使用的圖片解析度剛好是 1024x1024 所以可以動，這樣的限制可能是效能考量吧，或是說 WebGL1 基於的 openGL 其實已經是蠻古老的了，當時的 GPU 硬體可能只能在 2 次方寬高的圖片上做運算

所以圖片就一定要事先把寬高調整成 2 的次方嗎？其實也不用，無法進行的是『預設運作模式』的 texture 取樣以及 `gl.generateMipmap(gl.TEXTURE_2D)`，先把 `gl.generateMipmap()` 這行註解起來，接著使用 [`gl.texParameteri()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter) 設定一些參數修改 texture 取樣運作模式：

```javascript=
// gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
```

`gl.texParameteri` 的第二個輸入值表示要設定的參數名稱，第三的輸入值表示要設定的參數值，在 mdn 文件中可以看到有這些可以設定：

* `gl.TEXTURE_MIN_FILTER`: 顯示大小比原圖小的時候，顯示的策略，可以填入的值：
  * `gl.NEAREST`: 從原圖選擇 1 個 pixel
  * `gl.LINEAR`: 從原圖選擇 4 個 pixel 平均
  * `gl.NEAREST_MIPMAP_NEAREST`: 從 mipmap 中選最接近的縮圖，再選擇 1 個 pixel
  * `gl.LINEAR_MIPMAP_NEAREST`: 從 mipmap 中選最接近的縮圖，再選擇 4 個 pixel 平均
  * `gl.NEAREST_MIPMAP_LINEAR`: 從 mipmap 中選最接近的 2 張縮圖，分別選擇 1 個 pixel 平均，**此為預設模式**
  * `gl.LINEAR_MIPMAP_LINEAR`: 從 mipmap 中選最接近的 2 張縮圖，分別選擇 4 個 pixel 平均
* `gl.TEXTURE_MAG_FILTER`: 顯示大小比原圖大的時候，顯示的策略，可以填入的值：
  * `gl.NEAREST`: 從原圖選擇 1 個 pixel
  * `gl.LINEAR`: 從原圖選擇 4 個 pixel 平均，此為**預設運作模式**
* `gl.TEXTURE_WRAP_S` / `gl.TEXTURE_WRAP_T`: 對 texture 取樣時，座標超出範圍的行為，`_S` `_T` 分別對 x, y 軸方向進行設定，可以填入的值：
  * `gl.REPEAT`: 重複 pattern，此為**預設運作模式**
  * `gl.CLAMP_TO_EDGE`: 延伸邊緣顏色
  * `gl.MIRRORED_REPEAT`: 重複並鏡像 pattern

根據 [WebGL 官方 wiki](https://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences#Non-Power_of_Two_Texture_Support)，非 2 次方寬高 texture 只支援：

* `gl.TEXTURE_MIN_FILTER` 為 `gl.NEAREST` 或 `gl.LINEAR`，也因為沒有產生 mipmap，使用這兩個選項才不會用到 mipmap 功能
* `gl.TEXTURE_WRAP_S` / `gl.TEXTURE_WRAP_T` 為 `gl.CLAMP_TO_EDGE`，為什麼是這樣筆者也不清楚...

設定完成之後非 2 次方高的貓圖可以顯示了：

![cat-is-shown](https://i.imgur.com/Hf35A5Ch.png)

> 關於 texture 這邊常常提到 WebGL1 只有支援什麼什麼，稍微看了一下 mdn 文件的話可以發現有 WebGL2，而且看起來很多支援會好很多，像是這邊 2 平方寬高的限制就會直接消失，為什麼不改用 WebGL2 呢？因為[相容性不夠好](https://caniuse.com/webgl2)，WebGL2 在 2017 年正式推出，現今在 Chrome, Firefox 上都沒問題，但是在 Safari 上還是預設不支援，選用 WebGL2 就表示捨棄 iOS 裝置，因此筆者在撰寫本系列文章這個時間點還是使用 WebGL1 就好
>> 經過筆者測試，iOS 15 beta 版的 Safari 有支援 WebGL2 了，看來不久正式推出後主流瀏覽器就都支援 WebGL2 了，耶！

> 筆者當時看到 mipmap 相關資料時有個疑惑，明明在 fragement shader 內只是使用 `texture2D()` 給予取樣的位置，是怎麼知道縮放比例的？查到這篇 [stackoverflow 回答](https://stackoverflow.com/a/7391241)，看起來因為 fragment shader 是平行運算的，所以各個鄰近 pixel 運算會同時呼叫 `texture2D()` ，這樣 GPU 就可以知道縮放的比例

### `gl.TEXTURE_MIN_FILTER` 運作模式

`gl.TEXTURE_MIN_FILTER` 可以控制縮小顯示時的方式，而這些顯示方式顯然跟顯示品質、效能有關，這邊先把圖片改回來，並啟用 `gl.generateMipmap()`，比較一下 `gl.TEXTURE_MIN_FILTER` 各個模式的視覺差異：

`gl.NEAREST`:

![gl.NEAREST](https://i.imgur.com/zZYT9a5.png)

`gl.LINEAR`:

![gl.LINEAR](https://i.imgur.com/9SzXWiK.png)

`gl.NEAREST_MIPMAP_NEAREST`:

![gl.NEAREST_MIPMAP_NEAREST](https://i.imgur.com/O8obd84.png)

`gl.LINEAR_MIPMAP_NEAREST`:

![gl.LINEAR_MIPMAP_NEAREST](https://i.imgur.com/Of3p60b.png)

`gl.NEAREST_MIPMAP_LINEAR`:

![gl.NEAREST_MIPMAP_LINEAR](https://i.imgur.com/3oDzH2P.png)

`gl.LINEAR_MIPMAP_LINEAR`:

![gl.LINEAR_MIPMAP_LINEAR](https://i.imgur.com/7eUAJkg.png)

使用越多 pixel 做平均的顯示出來的成像就越平滑，但是也比較消耗效能，最後這個 `gl.LINEAR_MIPMAP_LINEAR` 從 mipmap 中選最接近的 2 張縮圖，分別選擇 4 個 pixel 平均，意思就是一次 `texture2D()` 得讀取 texture 中 2x4 = 8 個 pixel 出來平均，結果也最平滑

### 繪製賽車格紋

為了同時試玩 `gl.TEXTURE_MAG_FILTER` 以及重複 pattern 的 texture，接下來繪製看起來像這樣的賽車格紋：

![block-pattern](https://i.imgur.com/wyhnyAw.png)

可以看得出來整張圖就是重複這邊紅色框起來的區域：

![repeated-area](https://i.imgur.com/rDvVw5w.png)

也就是說，這張圖只需要 2x2 的大小，左上、右下為白色，右上、左下為黑色。事實上，輸入 texture 的 [`gl.texImage2D()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D) 支援各式各樣的輸入來源，其中一個是 `ArrayBufferView`，也就是可以傳（有型別的）陣列資料進去：

```javascript=
const whiteColor = [255, 255, 255, 255];
const blackColor = [0, 0, 0, 255];
gl.texImage2D(
  gl.TEXTURE_2D,
  0, // level
  gl.RGBA, // internalFormat
  2, // width
  2, // height
  0, // border
  gl.RGBA, // format
  gl.UNSIGNED_BYTE, // type
  new Uint8Array([
    ...whiteColor, ...blackColor,
    ...blackColor, ...whiteColor,
  ])
);
```

因為 `type` 使用 `gl.gl.UNSIGNED_BYTE`，也就是每個 pixel 的每個顏色 channel 為一個 Uint8Array 的元素，白色 RGBA 即為 `[255, 255, 255, 255]`、黑色 RGBA 即為 `[0, 0, 0, 255]`；另外直接傳陣列進去時，需要額外給的是 `width`, `height`, `border`，這張圖為 2x2 且沒有 border，給予的參數如上所示

> 為什麼要使用 `gl.RGBA`? 因為有個 `gl.UNPACK_ALIGNMENT` 的設定值，這個值預設為 4，表示每行的儲存單位為 4 bytes，如果這樣 2x2 的小 texture 要使用 RGB 就得透過 [`gl.pixelStorei()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/pixelStorei) 改成 1，我們這邊使用 `gl.RGBA` 符合預設值就好

把原本使用外部圖片的 `texImage2D()` 註解起來，存檔重整可以看到：

![2x2-block-linear](https://i.imgur.com/VPUGfcA.png)

現在顯示大小顯然比原圖來的大，所以是 `gl.TEXTURE_MAG_FILTER` 預設的 `gl.LINEAR` 導致的平滑效果，但是現在的狀況不想要平滑效果，因此加上這行：

```javascript=
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
```

![2x2-block-nearest](https://i.imgur.com/asuh2k4.png)

這張圖顯然不會用到 mipmap，可以把 `gl.generateMipmap()` 註解起來並使用 `gl.TEXTURE_MIN_FILTER => gl.LINEAR` 以停用 mipmap：

```javascript=
// gl.generateMipmap(gl.TEXTURE_2D);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
```

接下來讓圖片重複，直接修改 texcoord `gl.bufferData()` 時傳入的值：

```javascript=
// after gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    0, 0, // A
    8, 0, // B
    8, 8, // C

    0, 0, // D
    8, 8, // E
    0, 8, // F
  ]),
  gl.STATIC_DRAW,
);
```

筆者把 1 改成 8，所以 x, y 軸皆將重複 8 次，我們確實還沒改完，不過可以來看一下 `gl.CLAMP_TO_EDGE` 的結果：

![8x8-clamp-to-edge](https://i.imgur.com/aLIR3t9.png)

可以看到黑色的邊緣被延伸到最後，要得到想要的結果得把 `gl.TEXTURE_WRAP_S`, `TEXTURE_WRAP_T` 改成 `gl.REPEAT` 重複圖樣：

```javascript=
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
```

大功告成：

![block-pattern](https://i.imgur.com/wyhnyAw.png)

本篇的完整程式碼：

* 顯示貓圖：[TO BE FILLED: b7f20cd]()
* `gl.LINEAR_MIPMAP_LINEAR`: [TO BE FILLED: d48342b]()
* 賽車格紋：[TO BE FILLED: 88437c9]()

介紹 texture 功能至此，之後甚至可以讓 GPU 渲染到 texture 上，有相關需求時再接續討論。到目前為止我們使用 WebGL 網頁讀取完畢只會繪製一次，待下篇來加入控制項接收事件重新渲染畫面，並製作成動畫

---

## Day 8: 互動 & 動畫

有用到 WebGL 繪製的網頁通常都是『會動』的，有許多會根據使用者操作反應在畫面上，或者是根據時間產生變化的動畫，本篇將基於先前用 texture 渲染的畫面，加入簡易的 WebGL 互動、動畫功能

### 調整程式碼架構

在加入互動、動畫之前，我們得先調整一下程式碼架構，先前的實做都是從上到下一次執行完畢，畢竟也就只渲染這麼一次，但是接下來會開始有重畫的動作，所以要分成只有一開始要執行一次的初始化程式、更新狀態以及執行『畫』這個動作的程式

這個只執行一次的初始化程式可以叫它 `setup()`，從建立 WebGL context、編譯連結 GLSL shaders、取得 GLSL 變數位置、下載圖片並建立 texture，最後到設立 buffer 及 vertex attribute 並輸入資料，這些都是一開始初始化要做的工作，因此把這些工作從原本的 `main()` 抽出來；同時也把初始化時建立的 Javascript 物件像是 `gl`, `program`, `xxxAttributeLocation`, `xxxUniformLocation`, `texture`, `xxxBuffer` 整理起來作為 `setup()` 的 return 值

像是 `xxxAttributeLocation`, `xxxUniformLocation` 及 `xxxBuffer` 筆者習慣對這些東西分別給一個 Javascript Object 來分類放好：

```javascript=
async function setup() {
  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl');

  // createShader(); const program = createProgram()...

  const attributes = {
    position: gl.getAttribLocation(program, 'a_position'),
    texcoord: gl.getAttribLocation(program, 'a_texcoord'),
  };
  const uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    texture: gl.getUniformLocation(program, 'u_texture'),
  };
  
  // const texture = gl.createTexture(); ...
  
  const buffers = {};

  // a_position
  buffers.position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

  gl.enableVertexAttribArray(attributes.position);
  // gl.vertexAttribPointer(attributes.position, ...
  // gl.bufferData( ...


  // a_texcoord
  buffers.texcoord = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoord);

  gl.enableVertexAttribArray(attributes.texcoord);
  // gl.vertexAttribPointer(attributes.texcoord, ...
  // gl.bufferData( ...

  return {
    gl,
    program, attributes, uniforms,
    buffers, texture,
  };
}
```

另外一部份就是每次執行『畫』這個動作要做的事情，雖然『畫』這個動作就是 `gl.drawArrays()` 這行，但是總是要改變些設定，要不然每次畫出來的東西都是一樣的，而 uniform 資料量小，所以常常作為每次繪製不同結果的參數設定，這些工作抽出來叫做 `render()`，但是因為會需要 `setup()` 回傳的 WebGL 物件，筆者把 `setup()` 回傳的整包東西叫做 `app`，這邊作為參數接收：

```javascript=
function render(app) {
  const {
    gl,
    program, uniforms,
    texture,
  } = app;

  gl.canvas.width = gl.canvas.clientWidth;
  gl.canvas.height = gl.canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.useProgram(program);

  gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height);

  // texture uniform
  const textureUnit = 0;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.uniform1i(uniforms.texture, textureUnit);
  
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
```

可以注意到這邊除了設定 uniform 以及最後的 `gl.drawArrays()` 之外，還包含了調整 canvas 大小、繪製區域的程式，這樣就可以在重畫的時候解決 [Day 4]() 讀取網頁後調整視窗大小時造成的拉伸問題。最後 `main()` 就是負責把 `setup()` 以及 `render()` 串起來：

```javascript=
async function main() {
  const app = await setup();
  window.app = app;
  window.gl = app.gl;

  render(app);
}

main();
```

### 互動：選擇 texture 圖片

在上篇文章中，我們嘗試了幾種不同的 texture，但是都要修改程式碼來更換，接下來來改成可以透過一組 [radio input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio) 來控制要顯示的 texture 圖片，筆者準備了三張 1024x1024 圖片來切換：

![cat-1](https://i.imgur.com/EDLB71ih.jpg)

![cat-2](https://i.imgur.com/KT2nqZNh.jpg)

![penguin](https://i.imgur.com/diRWq5ph.jpg)

原本在 `setup()` 中只建立一個 texture，筆者透過 [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) 以及 async/await 下載並建立 3 個 textures:

```javascript=
  const textures = await Promise.all([
    'https://i.imgur.com/EDLB71ih.jpg',
    'https://i.imgur.com/KT2nqZNh.jpg',
    'https://i.imgur.com/diRWq5ph.jpg',
  ].map(async url => {
    const image = await loadImage(url);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0, // level
      gl.RGB, // internalFormat
      gl.RGB, // format
      gl.UNSIGNED_BYTE, // type
      image, // data
    );

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    return texture;
  }));
```

這樣一來 `textures` 就是一個包含 3 個 texture 的陣列，分別包含了不同的照片。而 `a_texcoord` 之前為了重複 pattern 調整了數值，要記得改回來：

```javascript=
  // a_texcoord
  // ...
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0, 0, // A
      1, 0, // B
      1, 1, // C

      0, 0, // D
      1, 1, // E
      0, 1, // F
    ]),
    gl.STATIC_DRAW,
  );
```

然後加入一個叫做 `state` 的 Javascript object，放上 `texture: 0` 表示一開始使用第一個 texture，整個 `setup()` 回傳的 `app` 也就改成這樣：

```diff=
   return {
     gl,
     program, attributes, uniforms,
-    buffers, texture,
+    buffers, textures,
+    state: {
+      texture: 0,
+    },
   };
 }
```

在 `render()` 這邊做出對應的修改，在 `gl.bindTexture()` 的地方根據 `state.texture` 選取要顯示的 texture:

```diff=
 function render(app) {
   const {
     gl,
     program, uniforms,
-    texture,
+    textures,
+    state
   } = app;

 // ...
 // texture uniform
   const textureUnit = 0;
-  gl.bindTexture(gl.TEXTURE_2D, texture);
+  gl.bindTexture(gl.TEXTURE_2D, textures[state.texture]);
   gl.activeTexture(gl.TEXTURE0 + textureUnit);
   gl.uniform1i(uniforms.texture, textureUnit);
   
   gl.drawArrays(gl.TRIANGLES, 0, 6);
```

目前還沒實做控制，只會顯示出第一張圖：

![cat-1](https://i.imgur.com/glmnEIq.png)

為了控制顯示的圖片，我們可以借助 HTML 眾多互動元件的幫助，例如 [radio input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio)（以及一點 CSS 把整個 `form#controls` 固定於網頁右上角）：

```diff=
     width: 100%;
     height: 100%;
   }
+  #controls {
+    position: fixed;
+    top: 0;
+    right: 0;
+    margin: 1rem;
+  }
 </style>
 <body>
   <canvas id="canvas"></canvas>
+  <form id="controls">
+    <div>
+      <input type="radio" id="cat1" name="texture" value="0" checked>
+      <label for="cat1">Cat 1</label>
+      <input type="radio" id="cat2" name="texture" value="1">
+      <label for="cat2">Cat 2</label>
+      <input type="radio" id="penguin" name="texture" value="2">
+      <label for="penguin">Penguin</label>
+    </div>
+  </form>
   <script type="module" src="02-texture-2d.js"></script>
 </body>
```

看起來像是這樣：

![html-radio-input](https://i.imgur.com/7uSk7Tn.png)

使用 HTML，意思就是可以使用 DOM API，在 `main()` 裡頭進行事件監聽 [`input`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/input_event) 事件：

```javascript=
  const controlsForm = document.getElementById('controls');
  controlsForm.addEventListener('input', () => {
    const formData = new FormData(controlsForm);
    app.state.texture = parseInt(formData.get('texture'));

    render(app);
  });
```

筆者使用 [`new FormData(form)`](https://developer.mozilla.org/en-US/docs/Web/API/FormData/FormData) 直接蒐集整個 form 的資料，之後要加入其他控制項會更方便，使用 `app.state.texture = ...` 改變要顯示的圖片之後，呼叫 `render(app)` 重新進行『畫』這個動作，存檔重整之後就會在選擇不同的 radio input 時重新渲染所選的圖片了：

![penguin](https://i.imgur.com/0t2v1jt.png)

### 動畫：隨著時間移動的圖片

可以接受事件重新渲染之後，下一步來讓圖片隨著時間移動，像是這個小時候 DVD 播放器的待機畫面：[碰到邊緣會反彈的 DVD logo](https://www.youtube.com/watch?v=5mGuCdlCcNM)

首先為了讓圖片位置可以透過 uniform 控制，先來修改控制頂點位置的 vertex shader:

```diff=
 uniform vec2 u_resolution;
+uniform vec2 u_offset;
  
 varying vec2 v_texcoord;
  
 void main() {
+  vec2 position = a_position + u_offset;
   gl_Position = vec4(
-    a_position / u_resolution * vec2(2, -2) + vec2(-1, 1),
+    position / u_resolution * vec2(2, -2) + vec2(-1, 1),
     0, 1
   );
```

加入 `uniform vec2 u_offset` 表示圖片的平移量後，建立 `vec2 position` 變數運算輸入的頂點位置 `a_position` 加上圖片平移量 `u_offset`，既然加上了一個 uniform，記得先取得其變數在 shader 中的位置：

```diff=
   const uniforms = {
     resolution: gl.getUniformLocation(program, 'u_resolution'),
     texture: gl.getUniformLocation(program, 'u_texture'),
+    offset: gl.getUniformLocation(program, 'u_offset'),
   };
```

接著調整輸入的頂點座標讓一開始圖片位置在最左上角

```diff=
   // a_position
   // ...
   gl.bufferData(
     gl.ARRAY_BUFFER,
     new Float32Array([
-      100, 50, // A
-      250, 50, // B
-      250, 200, // C
+      0, 0, // A
+      150, 0, // B
+      150, 150, // C
  
-      100, 50, // D
-      250, 200, // E
-      100, 200, // F
+      0, 0, // D
+      150, 150, // E
+      0, 150, // F
```

為了方便接下來更新位置，在 `setup()` 回傳的初始 `state` 中加上 `offset`, `direction` 表示圖片移動的方向，筆者在這邊先隨機產生一個角度 `directionDeg`，再運用三角函式算出角度對應的方向向量，同時寫上速度：

```diff=
+  const directionDeg = Math.random() * 2 * Math.PI;
+
   return {
     gl,
     program, attributes, uniforms,
     buffers, textures,
     state: {
       texture: 0,
+      offset: [0, 0],
+      direction: [Math.cos(directionDeg), Math.sin(directionDeg)],
+      speed: 0.08,
     },
+    time: 0,
   };
```

可以發現這邊還有多輸出一個 `time: 0`，與待會『隨著時間』移動相關。在 `render()` 內，輸入剛才的 `u_offset` unifrom:

```javascript=
gl.uniform2fv(uniforms.offset, state.offset);
```

WebGL 繪製的修改算是都準備好了，要做的事情就是請 WebGL 用一定的頻率重新渲染以產生動畫效果，這個最好的頻率就是與螢幕更新頻率同步，讓每次更新都是有意義可以反應在螢幕上，Web API 有個 function 叫做 [`window.requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)，傳入一個 callback function，在下次螢幕更新時執行，若在此 callback 內再呼叫一次 `requestAnimationFrame` 在下一次螢幕更新時再執行一次，就形成隨著時間更新、重畫的迴圈，因此加上這個 function `startLoop`:

```javascript=
function startLoop(app, now = 0) {
  const { state, gl } = app;
  const timeDiff = now - app.time;
  app.time = now;

  state.offset = state.offset.map(
    (v, i) => v + state.direction[i] * timeDiff * state.speed
  );

  if (state.offset[0] + 150 > gl.canvas.width) {
    state.direction[0] *= -1;
    state.offset[0] = gl.canvas.width - 150;
  } else if (state.offset[0] < 0) {
    state.direction[0] *= -1;
    state.offset[0] = 0;
  }

  if (state.offset[1] + 150 > gl.canvas.height) {
    state.direction[1] *= -1;
    state.offset[1] = gl.canvas.height - 150;
  } else if (state.offset[1] < 0) {
    state.direction[1] *= -1;
    state.offset[1] = 0;
  }

  render(app);
  requestAnimationFrame(now => startLoop(app, now));
}
```

> 如果想要更了解更多關於 `requestAnimationFrame` 所謂『下一次螢幕更新』的時間點、其與 Javascript event loop 的關係，筆者先前看到一個解釋很好的 talk: [Jake Archibald: In The Loop - JSConf.Asia](https://youtu.be/cCOL7MC4Pl0?t=529)，甚至在最後還有解釋 macro task 什麼時候、如何執行，推薦前端工程師把這個 talk 完整看一次

講解一下 `startLoop()`:

* 上方第 6 - 8 行用來更新 `offset`，也就是圖片的平移量
* 上方第 10 - 24 用來做碰撞測試，碰到邊緣時把 `direction` 反向進行反彈
* 上方第 26 行呼叫 `render()` 重畫畫面
* 上方第 27 行呼叫 `requestAnimationFrame` 並傳入一個匿名函式，可以注意到這個匿名函式接收一個參數叫做 `now`，表示此匿名函式執行的時間，在匿名函式內執行 `startLoop()` 進行下次更新、渲染形成迴圈
  * 上方第 3 - 4 行透過接收到的 `now` 計算這次畫面更新與上次更新之間的時間差，並運用在第 7 行平移量的長度，為什麼要這樣做呢？因為每個裝置的螢幕更新頻率不一定都是 60Hz，現在有許多手機或是螢幕支援 120Hz 甚至更快的螢幕更新速度，又或者裝置的性能不足，只有 40Hz 之類的，使用 `requestAnimationFrame` 更新的我們如果一律每回合移動一單位，那麼在不同的裝置上動畫的速度會不一樣

最後修改 `main()` 呼叫 `startLoop(app)`，因為已經會在每次螢幕更新時重新渲染，那麼就不用在接收事件時重新渲染了：

```diff=
     app.state.texture = parseInt(formData.get('texture'));
-
-    render(app);
   });
  
-  render(app);
+  startLoop(app);
 }
  
 main();
```

筆者同時也加上了速度控制，看起來像是這樣：[live 版本 (TBD)]()

![cat-2](https://i.imgur.com/taDEMnd.png)

完整程式碼可以在這邊找到：[TO BE FILLED: 542832d]()，本篇使用 `offset` 平移圖片，但在 2D, 3D 渲染的世界中，尤其是 3D，常常利用線性代數方式控制物件的位置，不僅可以平移，更可以縮放、旋轉，並且可以只透過一組矩陣來完成，待下篇來繼續討論

---

## Day 9: 2D Transform

在上篇加入了 `u_offset` 來控制物件的平移，如果我們現在想要進行縮放、旋轉，那麼就得在傳入更多 uniform，而且這些動作會有誰先作用的差別，比方說，先往右旋轉 90 度、接著往右平移 30px，與先往右平移 30px、再往右旋轉 90 度，這兩著會獲得不一樣的結果，如果只是傳平移量、縮放量、旋轉度數，在 vertex shader 內得有一個寫死的的先後作用順序，那麼在應用層面上就會受到這個先後順序的限制，因此在 vertex 運算座標的時候，通常會運用線性代數，傳入一個矩陣，這個矩陣就能包含任意先後順序的平移、縮放、旋轉動作

### 矩陣運算

為什麼一個矩陣就能夠包含任意先後順序的平移、縮放、旋轉動作？筆者覺得筆者不論怎麼用文字怎麼解釋，都不會比這部 Youtube 影片解釋得好：[作為合成的矩陣乘法 by 3Blue1Brown](https://www.youtube.com/watch?v=XkY2DOUCWMU&list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab&index=4)，如果覺得有需要，也可以從這系列影片的第一部影片開始看。總之，所有的平移、縮放、旋轉動作（現在開始應該說轉換 -- transform）都可以用一個矩陣表示，而把這些 transform 矩陣與向量相乘後，可以得到平移、縮放或旋轉後的結果，而且重點來了，我們也可以事先把多個矩陣相乘，這個相乘的結果與向量相乘與個別依序與向量相乘會得到相同的 transform；舉例來說，先旋轉 45 度、往右平移 30px、再旋轉 45 度，這三個 transform 依序作用在一個向量上，與把這三個 transform 代表的矩陣先相乘，再跟向量相乘，會得到一樣的結果，基於這個特性，我們只要傳送這個相乘出來的矩陣即可

但是上面 3Blue1Brown 的影片使用了數學界的慣例，一個二維的向量是這樣表示：

![math-vec2](https://static.pastleo.me/assets/day9-math-vec2-210819221012.svg)

然而，在程式語言（如 Javascript）中也只能這樣寫：`[x, y]`，因此在數學式與程式語言寫法之間要把行列做對調，一個像這樣的 2x2 矩陣在程式語言中的寫法如藍色文字所示：

![cs-matrix](https://static.pastleo.me/assets/day9-cs-matrix-210819220325.svg)

對向量進行 transform 的『矩陣乘以向量』右到左算的寫法，假設向量為 `[5, 6]`:

![math-matrix-product](https://static.pastleo.me/assets/day9-math-matrix-product-210819220824.svg)

在 shader 或是 Javascript 內一樣是右到左，大致會變成這樣寫：

```
v = [5, 6]
m = [
  1, 2,
  3, 4,
]
multiply(m, v) => [23, 34]
```

在模擬電腦中的矩陣運算時，如果覺得在紙筆跟程式語言表示之間每次都要做行列轉換很麻煩，那麼也可以改變一下矩陣計算的方式，下圖中每個運算式的左方小格子是由右方相乘的兩個矩陣的長條形區域相乘而成：

![matrix-product-difference](https://i.imgur.com/Lg9W946.jpg)

### 調整 vertex shader 使用矩陣運算

建立 `u_matrix` 取代 `u_offset` 以及 `u_resolution`，然後讓 `u_matrix` 與 `a_position` 相乘，相乘的結果即為任意順序的平移、縮放、旋轉做完後的座標位置。沒錯，針對螢幕寬高調整 clip space 的 `u_resolution` 也可以在矩陣中順便帶著

```diff=
 attribute vec2 a_position;
 attribute vec2 a_texcoord;
  
-uniform vec2 u_resolution;
-uniform vec2 u_offset;
+uniform mat3 u_matrix;
  
 varying vec2 v_texcoord;
  
 void main() {
-  vec2 position = a_position + u_offset;
-  gl_Position = vec4(
-    position / u_resolution * vec2(2, -2) + vec2(-1, 1),
-    0, 1
-  );
+  vec3 position = u_matrix * vec3(a_position.xy, 1);
+  gl_Position = vec4(position.xy, 0, 1);
   v_texcoord = a_texcoord;
 }
 `;
```

可以注意到 `u_matrix` 的型別為 `mat3` ，也就是 3x3 矩陣，我們還在 2D，為何要用 `mat3` 呢？因為 2x2 矩陣是無法包含『平移 (translate)』的，要做到平移，必須在運算時增加一個維度，並填上 `1`，使得向量為 `[x, y, 1]`，接著平移矩陣就是[單位矩陣](https://zh.wikipedia.org/wiki/%E5%96%AE%E4%BD%8D%E7%9F%A9%E9%99%A3)在多餘的維度中放上要平移的量，舉個例子，向量為 `[4, 5]`，要平移 `[2, 3]`:

```
multiply(
  [
    1, 0, 0,
    0, 1, 0,
    2, 3, 1,
  ],
  [4, 5, 1]
) // =>
// [
//   6, 8 ,1
// ]
```

數學上寫起來像是這樣：

![math-translate](https://static.pastleo.me/assets/day9-math-translate-210820000844.svg)

稍微觀察一下中間的計算過程，應該就能知道為什麼這樣可以形成平移，在多餘維度上的數字會與向量的 `1` 相乘加在原本的座標上

當然，uniform 位置的取得得修改一下：

```diff=
   const uniforms = {
-    resolution: gl.getUniformLocation(program, 'u_resolution'),
+    matrix: gl.getUniformLocation(program, 'u_matrix'),
     texture: gl.getUniformLocation(program, 'u_texture'),
-    offset: gl.getUniformLocation(program, 'u_offset'),
   };
```

### 平移以及投影的矩陣

shader, uniform 部份準備好後，建立 `lib/matrix.js`，用來產生特定 transform 用的矩陣，同時也實做 Javascript 端的矩陣相乘運算，才能『事先』運算、合成好矩陣給 GPU 使用。除了矩陣相乘 `matrix3.mulitply()` 之外，也把上面提到的平移矩陣 `matrix3.translate()` 實做好：

```javascript=
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
};
```

那麼就剩下針對螢幕寬高調整 clip space 的矩陣，這樣的矩陣稱為 `projection`，也就是把場景中一個寬高區域框起來，『投影』在 clip space -- 畫布上，看著原本 shader 程式碼拆解一下：

```
position / u_resolution * vec2(2, -2) + vec2(-1, 1)
```

可以發現，我們要分別對 x 座標縮放 `2 / u_resolution.x` 倍、對 y 軸縮放 `-2 / u_resolution.y` 倍，做完縮放後平移 `vec2(-1, 1)`，平移已經知道要怎麼做了，那麼縮放的矩陣要怎麼產生呢？觀察一下這個算式：

![math-scale](https://static.pastleo.me/assets/day9-math-scale-210820000900.svg)

在[單位矩陣](https://zh.wikipedia.org/wiki/%E5%96%AE%E4%BD%8D%E7%9F%A9%E9%99%A3)中對應維度的數字即為縮放倍率，在這邊把 x 座標乘以 2、y 座標乘以 3，其他欄位為零不會影響，因此縮放矩陣的產生 `matrix3.scale()` 這樣實做：

```javascript=
  scale: (sx, sy) => ([
    sx, 0,  0,
    0,  sy, 0,
    0,  0,  1,
  ]),
```

最後投影矩陣的產生 `matrix3.projection()`，為平移與縮放相乘：

```javascript=
  projection: (width, height) => (
    matrix3.multiply(
      matrix3.translate(-1, 1),
      matrix3.scale(2 / width, -2 / height),
    )
  ),
```

> 記得矩陣運算與一般運算運算不同，向量放在最右邊，向左運算，因此 `matrix3.translate(-1, 1)` 雖然放在前面，但是其 transform 是在 `matrix3.translate(-1, 1)` 之後的

這樣一來 `matrix3` 就準備好，回到主程式引入：

```javascript=
import { matrix3 } from './lib/matrix.js';
```

畫龍點睛的時候來了，在 `render()` function 設定 uniform 的地方產生、運算矩陣：

```javascript=
const viewMatrix = matrix3.projection(gl.canvas.width, gl.canvas.height);
const worldMatrix = matrix3.translate(...state.offset);

gl.uniformMatrix3fv(
  uniforms.matrix,
  false,
  matrix3.multiply(viewMatrix, worldMatrix),
);
```

筆者把投影產生的矩陣命名為 `viewMatrix`，因為這個矩陣表示了可視區域，不論繪製多少物件都會是一樣的；另外一個矩陣稱為 `worldMatrix`，表示該物件在場景中位置的 transform。最後把 `viewMatrix` 與 `worldMatrix` 相乘，得到包含所有 transform 的矩陣，並使用 [`gl.uniformMatrix3fv()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/uniformMatrix) 設定到 uniform 上，其第二個參數表示要不要做[轉置 transpose](https://zh.wikipedia.org/wiki/%E8%BD%AC%E7%BD%AE%E7%9F%A9%E9%98%B5)，我們沒有需要因此傳入 `false`

存檔重整，使用 matrix 做 transform 的版本看起來跟先前 offset 的版本一模一樣：[live 版本 (TBD)]()

![2d-transform-penguin](https://i.imgur.com/cLedkx1.png)

完整程式碼可以在這邊找到：[TO BE FILLED: bc91eb8]()

雖然看似沒有什麼新功能，但是這樣 transform 的作法更適合之後 3D 場景中複雜的物件位置到螢幕上位置的運算，待下篇再繼續延伸更多 2D transform

---

## Day 10: 2D transform Continued

上篇把原本透過 `u_offset`、`u_resolution` 來控制平移以及 clip space 投影換成只用一個矩陣來做轉換，我們實做了矩陣的相乘 (multiply)、平移 (translate) 以及縮放 (scale)，在常見的 transform 中還剩下旋轉 (rotation) 尚未實做，除此之外 `lib/matrix.js` 也缺乏一些常用的小工具，本篇將加上平移、縮放、旋轉之控制項，同時把這些矩陣工具補完

### 旋轉 transform

根據[維基百科](https://zh.wikipedia.org/wiki/%E6%97%8B%E8%BD%AC)，可以知道如果原本一個向量為 `(x, y)`，旋轉 θ 角度後將變成 `(x', y')`，那麼公式為：

![math-rotation-equation](https://static.pastleo.me/assets/day10-math-rotation-equation-210821203513.svg)

同時其 tranform 矩陣為：

![math-rotation-matrix](https://static.pastleo.me/assets/day10-math-rotation-matrix-210821203527.svg)

只不過我們需要的是 3x3 的矩陣，才能符合運算時的需要，多餘的維度跟[單位矩陣](https://zh.wikipedia.org/wiki/%E5%96%AE%E4%BD%8D%E7%9F%A9%E9%99%A3)一樣，同時記得行列轉換成電腦世界使用的慣例（假設要旋轉角度為 `rad`）：

```
[
  Math.cos(rad),  Math.sin(rad), 0,
  -Math.sin(rad), Math.cos(rad), 0,
  0,              0,             1,
]
```

最後實做在 `lib/matrix.js`:

```javascript=
  rotate: rad => {
    const c = Math.cos(rad), s = Math.sin(rad);
    return [
      c, s, 0,
      -s, c, 0,
      0, 0, 1,
    ]
  },
```

### 加入平移、縮放、旋轉控制

像是速度控制那樣，在 HTML 中分別給 X 軸平移、Y 軸平移、縮放、旋轉一個 [range input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range)：

```htmlembedded=
<!-- <form id="controls"> -->
<!-- ... -->
  <div class="py-1">
    <label for="translate-x">TranslateX</label>
    <input
      type="range" id="translate-x" name="translate-x"
      min="-150" max="150" value="0"
    >
  </div>
  <div class="py-1">
    <label for="translate-y">TranslateY</label>
    <input
      type="range" id="translate-y" name="translate-y"
      min="-150" max="150" value="0"
    >
  </div>
  <div class="py-1">
    <label for="scale">Scale</label>
    <input
      type="range" id="scale" name="scale"
      min="0" max="10" value="1" step="0.1"
    >
  </div>
  <div class="py-1">
    <label for="rotation">Rotation</label>
    <input
      type="range" id="rotation" name="rotation"
      min="0" max="360" value="0"
    >
  </div>
<!-- </form> -->
```

> `py-1` 為模仿 [tailwindCSS 的 padding](https://tailwindcss.com/docs/padding)，因為只有這一個 CSS 所以筆者直接實做在 HTML 中：`.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }`

同時也調整一下 HTML 排版，使得右上角控制 UI 看起來像是這樣：

![control-ui](https://i.imgur.com/QbxYCEx.png)

接下來在 `setup()` 中初始化的 `app.state` 中加入平移、縮放、旋轉：

```diff=
     state: {
       texture: 0,
       offset: [0, 0],
       direction: [Math.cos(directionDeg), Math.sin(directionDeg)], 
+      translate: [0, 0],
+      scale: 1,
+      rotation: 0,
       speed: 0.08,
     },
```

修改矩陣計算之前，把狀態與使用者輸入事件串好：

```diff=
   controlsForm.addEventListener('input', () => {
     const formData = new FormData(controlsForm);
     app.state.texture = parseInt(formData.get('texture'));
     app.state.speed = parseFloat(formData.get('speed'));
     const formData = new FormData(controlsForm);
     app.state.texture = parseInt(formData.get('texture'));
     app.state.speed = parseFloat(formData.get('speed'));
+    app.state.translate[0] = parseFloat(formData.get('translate-x'));                                                                 
+    app.state.translate[1] = parseFloat(formData.get('translate-y'));                                                                 
+    app.state.scale = parseFloat(formData.get('scale'));
+    app.state.rotation = parseFloat(formData.get('rotation')) * Math.PI / 180;                                                        
   });
```

### 使用旋轉矩陣

在 `render()` 內，原本 `worldMatrix` 只有平移轉換 `translate(...state.offset);`，現在開始也要由多個矩陣相乘：

```javascript=
const worldMatrix = matrix3.multiply(
  matrix3.translate(...state.offset),
  matrix3.rotate(state.rotation),
);
```

存檔試玩看看：

![rotation-origin-problem](https://i.imgur.com/g64iwYX.gif)

如果我們想要用圖片正中央來旋轉而不是左上角呢？在輸入頂點位置時，左上角的點為 `(0, 0)`:

![top-left-zero](https://static.pastleo.me/assets/day10-top-left-zero-210821234624.svg)

而 `matrix3.rotate()` 是基於原點做旋轉的，因此調整一下頂點位置，使得原點在正中間：

![center-zero](https://static.pastleo.me/assets/day10-center-zero-210821235425.svg)

```diff=
   // a_position
   // ...
   gl.bufferData(
     gl.ARRAY_BUFFER,
     new Float32Array([
-      0, 0, // A
-      150, 0, // B
-      150, 150, // C
+      -75, -75, // A
+      75, -75, // B
+      75, 75, // C
  
-      0, 0, // D
-      150, 150, // E
-      0, 150, // F
+      -75, -75, // D
+      75, 75, // E
+      -75, 75, // F
     ]),
     gl.STATIC_DRAW,
   );
```

不過就沒辦法做完美的邊緣碰撞測試了，筆者就用原點當成碰撞測試點：

```diff=
   // function startLoop(app, now = 0) {
   // ...
-  if (state.offset[0] + 150 > gl.canvas.width) {
+  if (state.offset[0] > gl.canvas.width) {
     state.direction[0] *= -1;
-    state.offset[0] = gl.canvas.width - 150;
+    state.offset[0] = gl.canvas.width;
   } else if (state.offset[0] < 0) {
     state.direction[0] *= -1;
     state.offset[0] = 0;
   }
  
-  if (state.offset[1] + 150 > gl.canvas.height) {
+  if (state.offset[1] > gl.canvas.height) {
     state.direction[1] *= -1;
-    state.offset[1] = gl.canvas.height - 150;
+    state.offset[1] = gl.canvas.height;
```

圖片就乖乖的以中心點旋轉了：

![rotation-origin-center](https://i.imgur.com/ilfLYJI.gif)

> 其實縮放也是從原點出發的，因此這個調整也可以修正待會加入縮放時變成從左上角縮放的問題。筆者學到矩陣 transform 時，似乎就可以感受到 WebGL 的世界為什麼很多東西都是以 -1 ~ +1 作為範圍...這樣使得原點在正中間，可能在硬體或是 driver 層也更方便使用矩陣做 transform 運算吧

### 所有 Tranform 我全都要

現在 `worldMatrix` 由 `matrix3.translate()` 與 `matrix3.rotate()` 相乘而成，要串上使用者控制的 `state.translate`, `state.scale`，假設 `worldMatrix` 要用下面的算式計算而成：

```
translate(...state.offset) *
  rotate(state.rotation) *
  scale(state.scale, state.scale) *
  translate(...state.translate)
```

以現成的 `matrix3.multiply()` 來看會變成這樣：

```javascript=
  const worldMatrix = matrix3.multiply(
    matrix3.multiply(
      matrix3.multiply(
        matrix3.translate(...state.offset),
        matrix3.rotate(state.rotation),
      ),
      matrix3.scale(state.scale, state.scale),
    ),
    matrix3.translate(...state.translate),
  );
```

顯然可讀性已經大幅下降，換行有波動拳的樣子，沒換行更慘，之後也會有許多超過兩個矩陣依序相乘的狀況，因此修改 `lib/matrix.js` 的 `matrix3.multiply()` 使之可以接收超過兩個矩陣，並遞迴依序做相乘：

```javascript=
  multiply: (a, b, ...rest) => {
    const multiplication = [
      a[0]*b[0] + a[3]*b[1] + a[6]*b[2], /**/ a[1]*b[0] + a[4]*b[1] + a[7]*b[2], /**/ a[2]*b[0] + a[5]*b[1] + a[8]*b[2],
      a[0]*b[3] + a[3]*b[4] + a[6]*b[5], /**/ a[1]*b[3] + a[4]*b[4] + a[7]*b[5], /**/ a[2]*b[3] + a[5]*b[4] + a[8]*b[5],
      a[0]*b[6] + a[3]*b[7] + a[6]*b[8], /**/ a[1]*b[6] + a[4]*b[7] + a[7]*b[8], /**/ a[2]*b[6] + a[5]*b[7] + a[8]*b[8],
    ];

    if (rest.length === 0) return multiplication;
    return matrix3.multiply(multiplication, ...rest);
  },
```

> `...rest` 的語法叫做 [rest parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)，傳超過 2 個參數時再呼叫自己將這回合計算的結果繼續與剩下的矩陣做計算

回到主程式，`worldMatrix` 就可以用清楚的語法寫了：

```javascript=
const worldMatrix = matrix3.multiply(
  matrix3.translate(...state.offset),
  matrix3.rotate(state.rotation),
  matrix3.scale(state.scale, state.scale),
  matrix3.translate(...state.translate),
);
```

所有的控制就完成了，讀者也可以自行調整這些矩陣相乘的順序，玩玩看所謂『轉換順序』的差別

### 『什麼都不做』轉換

在總結 2D transform 之前，給 `lib/matrix.js` 再補上一個 function:

```javascript=
  identity: () => ([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ]),
```

這是一個[單位矩陣](https://zh.wikipedia.org/wiki/%E5%96%AE%E4%BD%8D%E7%9F%A9%E9%99%A3)，如果有時候要除錯想要暫時取消一些矩陣的轉換效果，但是不想修改程式結構：

```javascript=
const worldMatrix = matrix3.multiply(
  matrix3.translate(...state.offset),
  matrix3.rotate(state.rotation), // 想要暫時取消這行
);
```

其中一個暫時取消的方式是利用單位矩陣的特性：與其相乘不會改變任何東西，像是這樣：

```javascript=
const worldMatrix = matrix3.multiply(
  matrix3.translate(...state.offset),
  matrix3.identity(),
  // matrix3.rotate(state.rotation), // 想要暫時取消這行
);
```

為了驗證，回到主程式修改 `worldMatrix` 的計算：

```javascript=
const worldMatrix = matrix3.multiply(
  matrix3.identity(),
  matrix3.translate(...state.offset),
  matrix3.rotate(state.rotation),
  matrix3.scale(state.scale, state.scale),
  matrix3.translate(...state.translate),
);
```

不論 `matrix3.identity()` 放在哪個位置，都不會改變結果；上述用途只是其中一個舉例，之後可能會因為兩個物件共用同一個 shader，但是其中一個物件不需要特定轉換，那麼也會傳入單位矩陣來『什麼都不做』

本篇進度的 live 版本：[TO BE FILLED: 7b935eb]()
完整程式碼：[TO BE FILLED: 7b935eb]()

Texture & 2D Transform 就到這邊，筆者學習到此的時候深刻感受到線性代數的威力，輸入的矩陣與理論結合扎實地反應在螢幕上，並為接下來 3D transform 打好基礎，下個章節將進入 3D，開始嘗試渲染現實世界所看到的樣子