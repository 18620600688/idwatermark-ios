// 本机自测：从 index.html 里抽出真实代码，验证
//   1) EXIF 方向解析是否正确
//   2) drawUpright 对 1~8 全部方向的坐标变换是否真的把图铺满目标矩形
// 用法： node tools/test_ios_page.js Resources/index.html <sample.jpg>
var fs = require('fs');

var htmlPath = process.argv[2] || 'Resources/index.html';
var jpgPath = process.argv[3] || '';
var html = fs.readFileSync(htmlPath, 'utf8');

function slice(startMark, endMark) {
  var a = html.indexOf(startMark);
  if (a < 0) throw new Error('找不到起点标记: ' + startMark);
  var b = html.indexOf(endMark, a);
  if (b < 0) throw new Error('找不到终点标记: ' + endMark);
  return html.slice(a, b);
}

var src = slice('function exifOrientation', '// 按 EXIF 方向')
        + slice('function drawUpright', '// 解码：');
var api = new Function(src + '; return { exifOrientation: exifOrientation, drawUpright: drawUpright };')();

var fail = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log('  PASS  ' + name);
  } else {
    fail++;
    console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : ''));
  }
}

// ---------- 1. EXIF ----------
console.log('== EXIF 方向解析 ==');
var expect = process.argv[4] ? parseInt(process.argv[4], 10) : 6;
if (jpgPath) {
  var buf = fs.readFileSync(jpgPath);
  var ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  var o = api.exifOrientation(ab);
  console.log('  样例 JPEG 解析方向 =', o, '(期望 ' + expect + ')');
  check('JPEG EXIF 方向=' + expect, o === expect, '得到 ' + o);
} else {
  console.log('  跳过（未提供样例 JPEG）');
}
var png = fs.readFileSync(htmlPath); // 随意一段非 JPEG 数据
var ab2 = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength);
check('非 JPEG 返回 1', api.exifOrientation(ab2) === 1);

// ---------- 2. drawUpright 变换 ----------
console.log('== drawUpright 方向变换 ==');
function mockCtx() {
  var m = [1, 0, 0, 1, 0, 0];
  function mul(n) {
    m = [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
         m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
         m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  }
  return {
    translate: function (x, y) { mul([1, 0, 0, 1, x, y]); },
    rotate: function (t) { var c = Math.cos(t), s = Math.sin(t); mul([c, s, -s, c, 0, 0]); },
    scale: function (x, y) { mul([x, 0, 0, y, 0, 0]); },
    save: function () {}, restore: function () {},
    drawImage: function () {},
    apply: function (x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  };
}
function fmt(p) { return '(' + Math.round(p[0] * 100) / 100 + ',' + Math.round(p[1] * 100) / 100 + ')'; }
function sameSet(a, b) {
  var key = function (p) { return Math.round(p[0] * 10) + '_' + Math.round(p[1] * 10); };
  var sa = a.map(key).sort().join('|'), sb = b.map(key).sort().join('|');
  return sa === sb;
}

var sw = 4000, sh = 3000;          // 竖拍手机照片：存储为横向 4000x3000，等方向标记纠正
for (var o = 1; o <= 8; o++) {
  var swap = o >= 5;
  var dw = swap ? sh : sw, dh = swap ? sw : sh;   // 纠正后的正立尺寸
  var ctx = mockCtx();
  api.drawUpright(ctx, { o: o, sw: sw, sh: sh }, 0, 0, dw, dh);
  var corners = [ctx.apply(0, 0), ctx.apply(sw, 0), ctx.apply(0, sh), ctx.apply(sw, sh)];
  var want = [[0, 0], [dw, 0], [0, dh], [dw, dh]];
  check('方向 ' + o + ' 铺满 ' + dw + 'x' + dh, sameSet(corners, want),
        corners.map(fmt).join(' '));
}

// 带偏移的目标矩形也要正确
var ctx2 = mockCtx();
api.drawUpright(ctx2, { o: 6, sw: 4000, sh: 3000 }, 20, 30, 3000, 4000);
check('方向 6 带偏移(20,30)',
      sameSet([ctx2.apply(0, 0), ctx2.apply(4000, 0), ctx2.apply(0, 3000), ctx2.apply(4000, 3000)],
              [[20, 30], [3020, 30], [20, 4030], [3020, 4030]]));

console.log(fail === 0 ? '\n全部通过 ✅' : '\n有 ' + fail + ' 项失败 ❌');
process.exit(fail === 0 ? 0 : 1);
