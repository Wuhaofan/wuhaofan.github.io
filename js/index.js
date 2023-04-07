var wrapper = document.getElementById("signature-pad");
var clearButton = wrapper.querySelector("[data-action=clear]");
var undoButton = wrapper.querySelector("[data-action=undo]");
var savePNGButton = wrapper.querySelector("[data-action=save-png]");
var drawButton = wrapper.querySelector("[data-action=draw]");
var eraseButton = wrapper.querySelector("[data-action=erase]");
var colorButton = wrapper.querySelector("[data-action=color]");
var canvas = wrapper.querySelector("canvas");
var signaturePad = new SignaturePad(canvas, {
  // It's Necessary to use an opaque color when saving image as JPEG;
  // this option can be omitted if only saving as PNG or SVG
  // backgroundColor: 'transparent'
  backgroundColor: 'rgb(255,255,255)'
});


// Adjust canvas coordinate space taking into account pixel ratio,
// to make it look crisp on mobile devices.
// This also causes canvas to be cleared.
function resizeCanvas() {
  // When zoomed out to less than 100%, for some very strange reason,
  // some browsers report devicePixelRatio as less than 1
  // and only part of the canvas is cleared then.
  var ratio =  Math.max(window.devicePixelRatio || 1, 1);

  // This part causes the canvas to be cleared
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  canvas.getContext("2d").scale(ratio, ratio);

  // This library does not listen for canvas changes, so after the canvas is automatically
  // cleared by the browser, SignaturePad#isEmpty might still return false, even though the
  // canvas looks empty, because the internal data of this library wasn't cleared. To make sure
  // that the state of this library is consistent with visual state of the canvas, you
  // have to clear it manually.
  signaturePad.clear();
}

// On mobile devices it might make more sense to listen to orientation change,
// rather than window resize events.
window.onresize = resizeCanvas;
resizeCanvas();

function download(dataURL, filename) {
  if (navigator.userAgent.indexOf("Safari") > -1 && navigator.userAgent.indexOf("Chrome") === -1) {
    window.open(dataURL);
  } else {
    var blob = dataURLToBlob(dataURL);
    var url = window.URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.style = "display: none";
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
  }
}

// One could simply use Canvas#toBlob method instead, but it's just to show
// that it can be done using result of SignaturePad#toDataURL.
function dataURLToBlob(dataURL) {
  // Code taken from https://github.com/ebidel/filer.js
  var parts = dataURL.split(';base64,');
  var contentType = parts[0].split(":")[1];
  var raw = window.atob(parts[1]);
  var rawLength = raw.length;
  var uInt8Array = new Uint8Array(rawLength);

  for (var i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

clearButton.addEventListener("click", function (event) {
  signaturePad.clear();
});

undoButton.addEventListener("click", function (event) {
  var data = signaturePad.toData();

  if (data) {
    data.pop(); // remove the last dot or line
    signaturePad.fromData(data);
  }
});

drawButton.addEventListener("click", function (event) {
    var ctx = canvas.getContext('2d');
    console.log(ctx.globalCompositeOperation);
    ctx.globalCompositeOperation = 'source-over'; // default value
});

eraseButton.addEventListener("click", function (event) {
    var ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-out';
});

colorButton.addEventListener("change", function (event) {
    var color = ""+event.target.value+"";
    signaturePad.penColor = color;
});

savePNGButton.addEventListener("click", function (event) {
  if (signaturePad.isEmpty()) {
    alert("Please provide a signature first.");
  } else {
    // signaturePad.removeBlanks();
    // var dataURL = signaturePad.toDataURL();
    // var dataURL = removeImageBlanks(canvas);
    var dataURL = translateCanvas( removeImageBlanks(canvas))
    console.log(dataURL);
    console.log(window.opener);
    // console.log(window.parent);



    // download(dataURL, "signature.png");
  }
});

$('#colorbtn').on('click',function(){
  colorButton.click();
})

$('#fontWidth').on('change',function(e) {
  var width = e.target.value;
})

$('#penWidthOk').on('click',function(e) {
  var width = $('#fontWidth').val();
  signaturePad.minWidth = parseFloat(width-0.5);
  signaturePad.maxWidth = parseFloat(width);
  $('#myModal').modal('hide')
})






function cropSignatureCanvas(canvas) {
  // First duplicate the canvas to not alter the original
  var croppedCanvas = document.createElement('canvas'),
      croppedCtx    = croppedCanvas.getContext('2d');

      croppedCanvas.width  = canvas.width;
      croppedCanvas.height = canvas.height;

      console.log(canvas);

      croppedCtx.drawImage(canvas, 0, 0);

  // Next do the actual cropping
  var w         = croppedCanvas.width,
      h         = croppedCanvas.height,
      pix       = {x:[], y:[]},
      imageData = croppedCtx.getImageData(0,0,croppedCanvas.width,croppedCanvas.height),
      x, y, index;

  for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
          index = (y * w + x) * 4;
          if (imageData.data[index+3] > 0) {
              pix.x.push(x);
              pix.y.push(y);

          }
      }
  }
  pix.x.sort(function(a,b){return a-b});
  pix.y.sort(function(a,b){return a-b});
  var n = pix.x.length-1;



  w = pix.x[n] - pix.x[0];
  h = pix.y[n] - pix.y[0];


  console.log(pix,w,h);

  var cut = croppedCtx.getImageData(pix.x[0], pix.y[0], w, h);

  croppedCanvas.width = w;
  croppedCanvas.height = h;
  croppedCtx.putImageData(cut, 0, 0);

  return croppedCanvas.toDataURL();
}


function removeImageBlanks(imageObject) {
  imgWidth = imageObject.width;
  imgHeight = imageObject.height;
  var canvas = document.createElement('canvas');
  canvas.setAttribute("width", imgWidth);
  canvas.setAttribute("height", imgHeight);
  var context = canvas.getContext('2d');
  context.drawImage(imageObject, 0, 0);

  var imageData = context.getImageData(0, 0, imgWidth, imgHeight),
      data = imageData.data,
      getRBG = function(x, y) {
          var offset = imgWidth * y + x;
          return {
              red:     data[offset * 4],
              green:   data[offset * 4 + 1],
              blue:    data[offset * 4 + 2],
              opacity: data[offset * 4 + 3]
          };
      },
      isWhite = function (rgb) {
          // many images contain noise, as the white is not a pure #fff white
          // console.log(rgb);
          // return rgb.red > 200 && rgb.green > 200 && rgb.blue > 200;

          if(rgb.opacity < 255) {
            console.log(rgb);
          }
          return rgb.red > 200 && rgb.green > 200 && rgb.blue > 200;
      },
              scanY = function (fromTop) {
      var offset = fromTop ? 1 : -1;

      // loop through each row
      for(var y = fromTop ? 0 : imgHeight - 1; fromTop ? (y < imgHeight) : (y > -1); y += offset) {

          // loop through each column
          for(var x = 0; x < imgWidth; x++) {
              var rgb = getRBG(x, y);
              if (!isWhite(rgb)) {
                  if (fromTop) {
                      return y;
                  } else {
                      return Math.min(y + 1, imgHeight);
                  }
              }
          }
      }
      return null; // all image is white
  },
  scanX = function (fromLeft) {
      var offset = fromLeft? 1 : -1;

      // loop through each column
      for(var x = fromLeft ? 0 : imgWidth - 1; fromLeft ? (x < imgWidth) : (x > -1); x += offset) {

          // loop through each row
          for(var y = 0; y < imgHeight; y++) {
              var rgb = getRBG(x, y);
              if (!isWhite(rgb)) {
                  if (fromLeft) {
                      return x;
                  } else {
                      return Math.min(x + 1, imgWidth);
                  }
              }
          }
      }
      return null; // all image is white
  };

  var cropTop = scanY(true),
      cropBottom = scanY(false),
      cropLeft = scanX(true),
      cropRight = scanX(false),


      cropWidth = cropRight - cropLeft,
      cropHeight = cropBottom - cropTop;
      console.log(cropRight,cropLeft,cropRight - cropLeft,cropBottom,cropTop,cropBottom - cropTop);
  canvas.setAttribute("width", cropWidth);
  canvas.setAttribute("height", cropHeight);
  // finally crop the guy
  canvas.getContext("2d").drawImage(imageObject,
      cropLeft, cropTop, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight);
console.log(888,canvas);

  return canvas;
}


function translateCanvas(img) {
  let width = img.width
    , height = img.height
    , canvas = document.createElement('canvas');
  canvas.setAttribute("width", width);
  canvas.setAttribute("height", height);
  var ctx = canvas.getContext('2d');
  // 将源图片复制到画布上
  // canvas 所有的操作都是在 context 上，所以要先将图片放到画布上才能操作
  ctx.drawImage(img, 0, 0, width, height)
  let imageData = ctx.getImageData(0, 0, width, height)
  // 获取画布的像素信息
  // 是一个一维数组，包含以 RGBA 顺序的数据，数据使用  0 至 255（包含）的整数表示
  // 如：图片由两个像素构成，一个像素是白色，一个像素是黑色，那么 data 为
  // [255,255,255,255,0,0,0,255]
  // 这个一维数组可以看成是两个像素中RBGA通道的数组的集合即:
  // [R,G,B,A].concat([R,G,B,A])
    , data = imageData.data

 // 对像素集合中的单个像素进行循环，每个像素是由4个通道组成，所以 i=i+4
  for(let i = 0; i < data.length; i+=4) {
      // 得到 RGBA 通道的值
    let r = data[i]
      , g = data[i+1]
      , b = data[i+2]

    // 我们从最下面那张颜色生成器中可以看到在图片的右上角区域，有一小块在
    // 肉眼的观察下基本都是白色的，所以我在这里把 RGB 值都在 245 以上的
    // 的定义为白色
    // 大家也可以自己定义的更精确，或者更宽泛一些
    if([r,g,b].every(v => v < 256 && v > 245)) data[i+3] = 0
  }

  // 将修改后的代码复制回画布中
  ctx.putImageData(imageData, 0, 0);
  console.log(123,ctx);

  return canvas.toDataURL();
}
