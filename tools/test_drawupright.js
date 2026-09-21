// 用矩阵模拟 canvas 变换，验证 drawUpright 的 8 种 EXIF 方向在「缩小画布」下
// 四角都能落进目标矩形（即不溢出、不裁切），且整图等比铺满。
var assert = require('assert');

// 模拟 2D 仿射变换 [a,b,c,d,e,f]：x' = a*x + c*y + e; y' = b*x + d*y + f
function mul(m, n) { // 先应用 n，再应用 m
  return [
    m[0]*n[0] + m[2]*n[1],
    m[1]*n[0] + m[3]*n[1],
    m[0]*n[2] + m[2]*n[3],
    m[1]*n[2] + m[3]*n[3],
    m[0]*n[4] + m[2]*n[5] + m[4],
    m[1]*n[4] + m[3]*n[5] + m[5],
  ];
}
function apply(m, x, y) { return [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]]; }
function T(dx, dy) { return [1,0,0,1,dx,dy]; }
function R(t) { var c=Math.cos(t), s=Math.sin(t); return [c,s,-s,c,0,0]; }
function S(sx, sy) { return [sx,0,0,sy,0,0]; }

// 与页面 drawUpright 相同的逻辑
function transform(o, dx, dy, dw, dh, sw, sh) {
  var k = (o >= 5 ? dh : dw) / sw;
  var m = T(dx, dy);
  switch (o) {
    case 2: m = mul(T(dx+dw, dy), S(-1,1)); break;
    case 3: m = mul(T(dx+dw, dy+dh), R(Math.PI)); break;
    case 4: m = mul(T(dx, dy+dh), S(1,-1)); break;
    case 5: m = mul(mul(T(dx, dy), R(-Math.PI/2)), S(-1,1)); break;
    case 6: m = mul(T(dx+dw, dy), R(Math.PI/2)); break;
    case 7: m = mul(mul(T(dx+dw, dy+dh), R(Math.PI/2)), S(-1,1)); break;
    case 8: m = mul(T(dx, dy+dh), R(-Math.PI/2)); break;
    default: break;
  }
  return mul(m, S(k, k));
}

var pass = 0, fail = 0;
// 目标矩形：模拟预览画布 330x247（源 4000x3000，k≈0.0825）
var cases = [
  // [o, sw, sh, dw, dh]  —— o>=5 时 dw/dh 与 sw/sh 互换
  [1, 4000, 3000, 330, 247], [6, 4000, 3000, 247, 330],
  [8, 4000, 3000, 247, 330], [3, 4000, 3000, 330, 247],
  [5, 4000, 3000, 247, 330], [7, 4000, 3000, 247, 330],
  [2, 4000, 3000, 330, 247], [4, 4000, 3000, 330, 247],
  // 竖拍照片
  [1, 3000, 4000, 247, 330], [6, 3000, 4000, 330, 247],
];
cases.forEach(function (c) {
  var o = c[0], sw = c[1], sh = c[2], dw = c[3], dh = c[4];
  var m = transform(o, 0, 0, dw, dh, sw, sh);
  // 源图四角
  var corners = [[0,0],[sw,0],[0,sh],[sw,sh]].map(function (p) { return apply(m, p[0], p[1]); });
  var ok = corners.every(function (p) {
    return p[0] >= -1.5 && p[0] <= dw + 1.5 && p[1] >= -1.5 && p[1] <= dh + 1.5;
  });
  // 覆盖检查：源图中心应落在目标中心附近（等比铺满）
  var ctr = apply(m, sw/2, sh/2);
  var centered = Math.abs(ctr[0] - dw/2) < 1 && Math.abs(ctr[1] - dh/2) < 1;
  // 等比检查：横向/纵向缩放因子一致
  var p1 = apply(m, sw, 0), p0 = apply(m, 0, 0);
  var p2 = apply(m, 0, sh);
  var lx = Math.hypot(p1[0]-p0[0], p1[1]-p0[1]);
  var ly = Math.hypot(p2[0]-p0[0], p2[1]-p0[1]);
  var uniform = Math.abs(lx/ly - sw/sh) < 0.01;
  var tag = 'o=' + o + ' ' + sw + 'x' + sh + ' -> ' + dw + 'x' + dh;
  if (ok && centered && uniform) { pass++; console.log('  PASS', tag); }
  else { fail++; console.log('  FAIL', tag, 'corners-in=' + ok, 'centered=' + centered, 'uniform=' + uniform, JSON.stringify(corners)); }
});
console.log(pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
