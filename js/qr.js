// 가능성 레이스 - QR 코드 만들기 (외부 라이브러리 없음)
// QR 코드 표준(바이트 모드, 오류 정정 M, 버전 1~10)을 그대로 구현했습니다.
// qrMatrix(text) → 0/1 2차원 배열, qrSVG(text) → SVG 문자열

// 버전 1~10, 오류 정정 M
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const FORMAT_M = 0; // L=1, M=0, Q=3, H=2

function rawModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}
const rawCodewords = (v) => Math.floor(rawModules(v) / 8);
const dataCodewords = (v) => rawCodewords(v) - ECC_PER_BLOCK[v] * NUM_BLOCKS[v];

function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function rsDivisor(degree) {
  const r = new Array(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMul(r[j], root);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data, divisor) {
  const r = divisor.map(() => 0);
  for (const b of data) {
    const f = b ^ r.shift();
    r.push(0);
    divisor.forEach((d, i) => { r[i] ^= gfMul(d, f); });
  }
  return r;
}

function utf8(text) { return Array.from(new TextEncoder().encode(text)); }

function alignPositions(ver, size) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const res = [6];
  for (let pos = size - 7; res.length < n; pos -= step) res.splice(1, 0, pos);
  return res;
}

export function qrMatrix(text, forceMask = -1) {
  const bytes = utf8(text);
  let ver = 1;
  for (; ver <= 10; ver++) {
    const need = 4 + (ver < 10 ? 8 : 16) + bytes.length * 8;
    if (need <= dataCodewords(ver) * 8) break;
  }
  if (ver > 10) throw new Error('QR에 넣기에 글자가 너무 길어요');

  // 1) 데이터 비트
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0x4, 4);
  put(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach(b => put(b, 8));
  const cap = dataCodewords(ver) * 8;
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - bits.length % 8) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));

  // 2) 블록 나누기 + 오류 정정 + 섞기
  const nb = NUM_BLOCKS[ver], ecLen = ECC_PER_BLOCK[ver], raw = rawCodewords(ver);
  const numShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
  const div = rsDivisor(ecLen);
  const blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dlen = shortLen - ecLen + (i < numShort ? 0 : 1);
    const dat = data.slice(k, k + dlen);
    k += dlen;
    blocks.push({ dat, ecc: rsRemainder(dat, div) });
  }
  const final = [];
  const maxD = Math.max(...blocks.map(b => b.dat.length));
  for (let i = 0; i < maxD; i++) blocks.forEach(b => { if (i < b.dat.length) final.push(b.dat[i]); });
  for (let i = 0; i < ecLen; i++) blocks.forEach(b => final.push(b.ecc[i]));

  // 3) 기능 패턴
  const size = ver * 4 + 17;
  const m = Array.from({ length: size }, () => new Array(size).fill(0));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setF = (x, y, d) => { m[y][x] = d ? 1 : 0; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      setF(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const al = alignPositions(ver, size);
  al.forEach((ay, i) => al.forEach((ax, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (mask) => {
    const d = (FORMAT_M << 3) | mask;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((d << 10) | rem) ^ 0x5412;
    const bit = (i) => (b >>> i) & 1;
    for (let i = 0; i <= 5; i++) setF(8, i, bit(i));
    setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
    setF(8, size - 8, 1);
  };
  drawFormat(0); // 자리 예약
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bt = (b >>> i) & 1, a = size - 11 + i % 3, c = Math.floor(i / 3);
      setF(a, c, bt); setF(c, a, bt);
    }
  }

  // 4) 데이터 배치 (오른쪽 아래부터 지그재그)
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
      if (!fn[y][x] && k < final.length * 8) { m[y][x] = (final[k >>> 3] >>> (7 - (k & 7))) & 1; k++; }
    }
  }

  // 5) 마스크 고르기
  const maskFn = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
  ];
  const applyMask = (mk) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskFn[mk](x, y)) m[y][x] ^= 1; };
  const penalty = () => {
    let p = 0;
    for (let t = 0; t < 2; t++) for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        const cur = t ? m[b][a] : m[a][b], prev = t ? m[b - 1][a] : m[a][b - 1];
        if (cur === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
      }
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
    let dark = 0; m.forEach(r => r.forEach(v => { dark += v; }));
    p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    return p;
  };
  let best = forceMask, bestP = Infinity;
  if (best < 0) {
    for (let mk = 0; mk < 8; mk++) {
      applyMask(mk); drawFormat(mk);
      const pp = penalty();
      if (pp < bestP) { bestP = pp; best = mk; }
      applyMask(mk);
    }
  }
  applyMask(best); drawFormat(best);
  return { matrix: m, version: ver, mask: best, size };
}

export function qrSVG(text, opts = {}) {
  const { matrix, size } = qrMatrix(text);
  const q = opts.quiet ?? 4, n = size + q * 2;
  let path = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (matrix[y][x]) path += `M${x + q} ${y + q}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="QR 코드">` +
    `<rect width="${n}" height="${n}" fill="#fff"/><path d="${path}" fill="${opts.color || '#000'}"/></svg>`;
}
