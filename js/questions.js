// 가능성 레이스 - 문제 생성기 (레이스·연습 공용)
// generate(rangeArray, count, seed) → 문제 배열. seed가 같으면 항상 같은 문제.
//
// 가능성은 내부적으로 "4분의 몇"(q = 0~4)으로만 다룹니다.
//   q=0 불가능하다 / q=1 ~아닐 것 같다 / q=2 반반이다 / q=3 ~일 것 같다 / q=4 확실하다
// 7차시(수로 나타내기)는 q = 0, 2, 4 (0, 1/2, 1)만 사용합니다.

export const LEVELS = ['불가능하다', '~아닐 것 같다', '반반이다', '~일 것 같다', '확실하다'];
export const NUMS = ['0', '1/2', '1']; // 7차시에서 쓰는 수는 이 세 개뿐
export const LESSON_TYPES = { 5: ['A', 'B'], 6: ['C', 'D', 'E'], 7: ['F', 'G'] };
export const TYPE_NAMES = {
  A: '주머니 보고 말로 표현', B: '생활 속 가능성', C: '셋 중 고르기', D: '높은 순서대로',
  E: '둘 중 더 높은 것', F: '가능성을 수로', G: '말과 수 짝짓기'
};

export const COLORS = {
  red:    { name: '빨간색', short: '빨강', fill: '#ff6b6b' },
  blue:   { name: '파란색', short: '파랑', fill: '#5b9cff' },
  green:  { name: '초록색', short: '초록', fill: '#3ccf7e' },
  yellow: { name: '노란색', short: '노랑', fill: '#ffd43b' },
  orange: { name: '주황색', short: '주황', fill: '#ffa94d' },
  purple: { name: '보라색', short: '보라', fill: '#b197fc' }
};
// 사탕은 맛 이름으로 표시
const FLAVORS = {
  red: { name: '딸기 맛', short: '딸기' }, purple: { name: '포도 맛', short: '포도' },
  yellow: { name: '레몬 맛', short: '레몬' }, green: { name: '사과 맛', short: '사과' },
  orange: { name: '오렌지 맛', short: '오렌지' }
};
const ITEM_KINDS = ['공', '사탕', '손수건', '구슬'];
const OBJ_LABELS = ['가', '나', '다', '라', '마'];

// ---------- 난수 ----------
export function hashSeed(s) {
  s = String(s); let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function makeRng(seed) {
  let a = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
  const f = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.int = (n) => Math.floor(f() * n);
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.shuffle = (arr) => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
  return f;
}

// ---------- 그림(SVG) ----------
// 각 색칠 요소에는 data-c="색키"를 붙여서 테스트가 그림에서 직접 개수를 셀 수 있게 함.
const TXT = 'font-family="Jua, sans-serif" text-anchor="middle" dominant-baseline="central"';

function colorLabel(c, kind) {
  if (kind === '사탕' && FLAVORS[c]) return FLAVORS[c].short;
  return COLORS[c].short;
}
function colorName(c, kind) {
  if (kind === '사탕' && FLAVORS[c]) return FLAVORS[c].name;
  return COLORS[c].name;
}

function itemShape(kind, c, x, y, r) {
  const fill = COLORS[c].fill, lab = colorLabel(c, kind);
  const fs = lab.length >= 3 ? r * 0.55 : r * 0.72;
  let shape;
  if (kind === '손수건') {
    shape = `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="6" fill="${fill}" stroke="#444" stroke-width="2"/>` +
      `<path d="M${x + r * 0.35} ${y - r} L${x + r} ${y - r * 0.35}" stroke="#444" stroke-width="2" fill="none"/>`;
  } else if (kind === '사탕') {
    shape = `<path d="M${x - r} ${y} L${x - r * 1.55} ${y - r * 0.55} L${x - r * 1.55} ${y + r * 0.55} Z M${x + r} ${y} L${x + r * 1.55} ${y - r * 0.55} L${x + r * 1.55} ${y + r * 0.55} Z" fill="${fill}" stroke="#444" stroke-width="2"/>` +
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#444" stroke-width="2"/>`;
  } else {
    shape = `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#444" stroke-width="2"/>` +
      `<circle cx="${x - r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.22}" fill="#fff" opacity=".55"/>`;
  }
  return `<g data-c="${c}">${shape}<text x="${x}" y="${y + 1}" ${TXT} font-size="${fs}" fill="#222">${lab}</text></g>`;
}

function layoutItems(n, cx, top, w, h) {
  // n = 2, 4, 8 개 배치
  const cols = n <= 2 ? 2 : (n === 4 ? 2 : 4);
  const rows = Math.ceil(n / cols);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    pts.push([cx - w / 2 + (c + 0.5) * (w / cols), top + (r + 0.5) * (h / rows)]);
  }
  return pts;
}

// 주머니: items = ['red','red','blue',...]
export function svgBag(items, kind = '공') {
  const n = items.length;
  const r = n <= 4 ? 24 : 19;
  const pts = layoutItems(n, 120, 108, kind === '사탕' ? 150 : 168, 110);
  const body = `<path d="M70 70 Q40 90 34 150 Q30 222 120 226 Q210 222 206 150 Q200 90 170 70 Z" fill="#f3d9b1" stroke="#8a5a2b" stroke-width="4"/>` +
    `<path d="M78 72 Q120 52 162 72" fill="none" stroke="#8a5a2b" stroke-width="4"/>` +
    `<path d="M88 52 Q120 30 152 52 L162 72 Q120 58 78 72 Z" fill="#e8c48f" stroke="#8a5a2b" stroke-width="4"/>` +
    `<path d="M100 64 Q120 80 140 64" fill="none" stroke="#c0392b" stroke-width="5" stroke-linecap="round"/>`;
  const its = items.map((c, i) => itemShape(kind, c, pts[i][0], pts[i][1], r)).join('');
  return `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="주머니">${body}${its}</svg>`;
}

// 경품함
export function svgBox(items) {
  const n = items.length;
  const pts = layoutItems(n, 120, 112, n <= 2 ? 120 : 140, n <= 2 ? 80 : 104);
  const r = 24;
  const body = `<rect x="30" y="70" width="180" height="150" rx="14" fill="#ffe8f0" stroke="#d6336c" stroke-width="4"/>` +
    `<rect x="22" y="48" width="196" height="34" rx="10" fill="#f783ac" stroke="#d6336c" stroke-width="4"/>` +
    `<text x="120" y="66" ${TXT} font-size="20" fill="#fff">경품함</text>`;
  const its = items.map((c, i) => itemShape('공', c, pts[i][0], pts[i][1], r)).join('');
  return `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="경품함">${body}${its}</svg>`;
}

// 회전판: sectors = ['green','yellow',...] (2, 4, 8칸)
export function svgSpinner(sectors) {
  const n = sectors.length, cx = 120, cy = 124, R = 100;
  let out = '';
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const am = (a0 + a1) / 2, lr = n === 2 ? R * 0.55 : R * 0.66;
    const lx = cx + lr * Math.cos(am), ly = cy + lr * Math.sin(am);
    const c = sectors[i];
    out += `<g data-c="${c}"><path d="M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${COLORS[c].fill}" stroke="#444" stroke-width="2.5"/>` +
      `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" ${TXT} font-size="${n === 8 ? 15 : 20}" fill="#222">${COLORS[c].short}</text></g>`;
  }
  // 화살(가운데 고정 화살표)
  const arrow = `<g transform="rotate(35 ${cx} ${cy})"><line x1="${cx}" y1="${cy + 14}" x2="${cx}" y2="${cy - 36}" stroke="#222" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M${cx - 11} ${cy - 32} L${cx} ${cy - 52} L${cx + 11} ${cy - 32} Z" fill="#222"/></g>` +
    `<circle cx="${cx}" cy="${cy}" r="11" fill="#fff" stroke="#222" stroke-width="4"/>`;
  return `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="회전판"><circle cx="${cx}" cy="${cy}" r="${R + 4}" fill="#fff" stroke="#444" stroke-width="3"/>${out}${arrow}</svg>`;
}

function pips(n, x, y, s, skew) {
  // 주사위 한 면의 눈 (평면 좌표 → skew 변환은 호출 측 transform)
  const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  return P[n].map(([a, b]) => `<circle cx="${x + a * s}" cy="${y + b * s}" r="${s * 0.42}" fill="${n === 1 ? '#e03131' : '#222'}"/>`).join('');
}
export function svgDie() {
  // 앞면(1), 윗면(2), 옆면(3)이 보이는 주사위 + 눈 1~6 안내
  const front = `<rect x="40" y="80" width="110" height="110" rx="14" fill="#fff" stroke="#333" stroke-width="4"/>` + pips(1, 95, 135, 26);
  const top = `<path d="M40 80 L80 40 L190 40 L150 80 Z" fill="#f1f3f5" stroke="#333" stroke-width="4" stroke-linejoin="round"/>` +
    `<circle cx="88" cy="68" r="8" fill="#222"/><circle cx="142" cy="52" r="8" fill="#222"/>`;
  const side = `<path d="M150 80 L190 40 L190 150 L150 190 Z" fill="#dee2e6" stroke="#333" stroke-width="4" stroke-linejoin="round"/>` +
    `<circle cx="160" cy="160" r="6.5" fill="#222"/><circle cx="170" cy="115" r="6.5" fill="#222"/><circle cx="180" cy="70" r="6.5" fill="#222"/>`;
  const faces = [1, 2, 3, 4, 5, 6].map((n, i) => `<g data-face="${n}"><rect x="${8 + i * 38}" y="204" width="32" height="30" rx="6" fill="#fff" stroke="#555" stroke-width="2"/><text x="${24 + i * 38}" y="220" ${TXT} font-size="18" fill="#222">${n}</text></g>`).join('');
  return `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="주사위">${top}${side}${front}${faces}</svg>`;
}
export function svgCoin() {
  const pic = `<circle cx="70" cy="80" r="58" fill="#ffd8a8" stroke="#c77d2e" stroke-width="5"/>` +
    `<circle cx="70" cy="80" r="46" fill="none" stroke="#c77d2e" stroke-width="2" stroke-dasharray="4 4"/>` +
    // 간단한 꽃 그림
    [0, 72, 144, 216, 288].map(a => `<ellipse cx="70" cy="62" rx="10" ry="18" fill="#ff8787" stroke="#c77d2e" stroke-width="2" transform="rotate(${a} 70 80)"/>`).join('') +
    `<circle cx="70" cy="80" r="9" fill="#ffe066" stroke="#c77d2e" stroke-width="2"/>`;
  const num = `<circle cx="190" cy="80" r="58" fill="#e9ecef" stroke="#868e96" stroke-width="5"/>` +
    `<circle cx="190" cy="80" r="46" fill="none" stroke="#868e96" stroke-width="2" stroke-dasharray="4 4"/>` +
    `<text x="190" y="82" ${TXT} font-size="40" fill="#495057">100</text>`;
  return `<svg viewBox="0 0 260 175" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="동전"><g data-side="pic">${pic}</g><g data-side="num">${num}</g>` +
    `<text x="70" y="160" ${TXT} font-size="20" fill="#333">그림면</text><text x="190" y="160" ${TXT} font-size="20" fill="#333">숫자 면</text></svg>`;
}

// ---------- 공통 도우미 ----------
function josaIGa(word) { // 받침 있으면 '이', 없으면 '가'
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xac00 || ch > 0xd7a3) return '이';
  return (ch - 0xac00) % 28 ? '이' : '가';
}
function josaEunNeun(word) {
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xac00 || ch > 0xd7a3) return '은';
  return (ch - 0xac00) % 28 ? '은' : '는';
}

// 대상 색 비율 q(0~4)를 가진 물건 색 배열 만들기
function makeItems(rng, total, q, target, others) {
  const t = (q * total) / 4;
  const arr = [];
  for (let i = 0; i < t; i++) arr.push(target);
  const rest = total - t;
  if (rest > 0) {
    // 다른 색이 둘이고 나머지가 짝수면 가끔 두 색으로 나눔
    if (others.length > 1 && rest % 2 === 0 && rest >= 2 && rng() < 0.4) {
      for (let i = 0; i < rest / 2; i++) arr.push(others[0]);
      for (let i = 0; i < rest / 2; i++) arr.push(others[1]);
    } else {
      for (let i = 0; i < rest; i++) arr.push(others[0]);
    }
  }
  return rng.shuffle(arr);
}

const ALL_COLOR_KEYS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];

// ---------- 5차시 A: 주머니 보고 5단계 ----------
function genA(rng) {
  const kind = rng.pick(ITEM_KINDS);
  const pool = kind === '사탕' ? Object.keys(FLAVORS) : ALL_COLOR_KEYS;
  const cols = rng.shuffle(pool);
  const target = cols[0], others = [cols[1], cols[2]];
  const q = rng.int(5);
  const total = rng.pick([4, 8]);
  const items = makeItems(rng, total, q, target, others);
  const tn = colorName(target, kind);
  const t = items.filter(c => c === target).length;
  const subject = `${tn} ${kind}`;
  const reason = [
    `${subject}${josaIGa(subject)} 하나도 없어요 → 꺼낼 수 없어요 → 불가능하다`,
    `${kind} ${total}개 중 ${t}개만 ${tn} → ${tn}${josaIGa(tn)} 더 적어요 → ~아닐 것 같다`,
    `${kind} ${total}개 중 ${t}개가 ${tn} → 딱 절반 → 반반이다`,
    `${kind} ${total}개 중 ${t}개가 ${tn} → ${tn}${josaIGa(tn)} 더 많아요 → ~일 것 같다`,
    `${kind} ${total}개 중 ${t}개가 모두 ${tn} → 꺼내면 무조건 ${tn} → 확실하다`
  ][q];
  return {
    lesson: 5, type: 'A', kind: 'level',
    prompt: `주머니에서 ${kind} 한 개를 꺼낼 때, ${subject}${josaIGa(subject)} 나올 가능성은?`,
    svg: svgBag(items, kind),
    choices: LEVELS.map((s, i) => ({ t: 'level', v: i })),
    answer: q,
    explain: reason, explainScale: q,
    meta: { objs: [{ target, items }] },
    sig: `A${kind}${items.slice().sort().join('')}${target}`
  };
}

// ---------- 5차시 B: 생활 상황 문장 은행 ----------
export const BANK = [
  // 확실하다(4)
  { s: '3월의 다음 달이 4월일 가능성', q: 4, why: '3월 다음은 언제나 4월이에요' },
  { s: '귤만 들어 있는 상자를 열었을 때 귤이 나올 가능성', q: 4, why: '상자에 귤만 있으니 무조건 귤이 나와요' },
  { s: '월요일의 다음 날이 화요일일 가능성', q: 4, why: '월요일 다음 날은 언제나 화요일이에요' },
  { s: '주사위를 한 번 던질 때 6 이하의 눈이 나올 가능성', q: 4, why: '주사위 눈은 1~6이라 모두 6 이하예요' },
  { s: '1월의 다음 달이 2월일 가능성', q: 4, why: '1월 다음은 언제나 2월이에요' },
  { s: '빨간 구슬만 든 주머니에서 빨간 구슬을 꺼낼 가능성', q: 4, why: '빨간 구슬만 있으니 무조건 빨간 구슬이에요' },
  // 불가능하다(0)
  { s: '흰 우유만 있는 냉장고에서 딸기우유를 꺼낼 가능성', q: 0, why: '딸기우유가 하나도 없어요' },
  { s: '주사위를 한 번 던질 때 7의 눈이 나올 가능성', q: 0, why: '주사위에는 7의 눈이 없어요' },
  { s: '일주일이 8일이 될 가능성', q: 0, why: '일주일은 언제나 7일이에요' },
  { s: '2월의 다음 달이 5월일 가능성', q: 0, why: '2월 다음은 3월이에요' },
  { s: '파란 구슬만 든 주머니에서 빨간 구슬을 꺼낼 가능성', q: 0, why: '빨간 구슬이 하나도 없어요' },
  { s: '주사위를 한 번 던질 때 0의 눈이 나올 가능성', q: 0, why: '주사위에는 0의 눈이 없어요' },
  // 반반이다(2)
  { s: '동전을 한 번 던질 때 그림면이 나올 가능성', q: 2, why: '그림면과 숫자 면, 두 가지 중 하나예요' },
  { s: '크림붕어빵 2개, 팥붕어빵 2개 중 하나를 꺼낼 때 크림붕어빵이 나올 가능성', q: 2, why: '크림과 팥이 똑같이 2개씩이에요' },
  { s: '주사위를 한 번 던질 때 짝수의 눈이 나올 가능성', q: 2, why: '짝수(2, 4, 6)와 홀수(1, 3, 5)가 3개씩 똑같아요' },
  { s: '주사위를 한 번 던질 때 홀수의 눈이 나올 가능성', q: 2, why: '홀수(1, 3, 5)와 짝수(2, 4, 6)가 3개씩 똑같아요' },
  { s: '흰 바둑돌 5개, 검은 바둑돌 5개 중 하나를 꺼낼 때 흰 바둑돌이 나올 가능성', q: 2, why: '흰 돌과 검은 돌이 5개씩 똑같아요' },
  { s: '동전을 한 번 던질 때 숫자 면이 나올 가능성', q: 2, why: '숫자 면과 그림면, 두 가지 중 하나예요' },
  // ~일 것 같다(3)
  { s: '포도 맛 사탕 9개, 딸기 맛 사탕 1개가 든 주머니에서 포도 맛 사탕을 꺼낼 가능성', q: 3, why: '포도 맛이 훨씬 많지만 딸기 맛도 있어요' },
  { s: '당첨 제비 1장, 꽝 제비 9장 중 하나를 뽑을 때 꽝이 나올 가능성', q: 3, why: '꽝이 훨씬 많지만 당첨도 1장 있어요' },
  { s: '초록 구슬 8개, 노란 구슬 2개 중 하나를 꺼낼 때 초록 구슬이 나올 가능성', q: 3, why: '초록이 더 많지만 노랑도 있어요' },
  { s: '흰 공 7개, 검은 공 1개 중 하나를 꺼낼 때 흰 공이 나올 가능성', q: 3, why: '흰 공이 훨씬 많지만 검은 공도 있어요' },
  // ~아닐 것 같다(1)
  { s: '포도 맛 사탕 9개, 딸기 맛 사탕 1개가 든 주머니에서 딸기 맛 사탕을 꺼낼 가능성', q: 1, why: '딸기 맛은 1개뿐이에요' },
  { s: '당첨 제비 1장, 꽝 제비 9장 중 하나를 뽑을 때 당첨이 나올 가능성', q: 1, why: '당첨은 1장뿐이에요' },
  { s: '초록 구슬 8개, 노란 구슬 2개 중 하나를 꺼낼 때 노란 구슬이 나올 가능성', q: 1, why: '노랑이 훨씬 적어요' },
  { s: '흰 공 7개, 검은 공 1개 중 하나를 꺼낼 때 검은 공이 나올 가능성', q: 1, why: '검은 공은 1개뿐이에요' }
];
function genB(rng) {
  const i = rng.int(BANK.length), b = BANK[i];
  return {
    lesson: 5, type: 'B', kind: 'level',
    prompt: `${b.s}${josaEunNeun(b.s)}?`,
    svg: '',
    choices: LEVELS.map((s, k) => ({ t: 'level', v: k })),
    answer: b.q,
    explain: `${b.why} → ${LEVELS[b.q]}`, explainScale: b.q,
    meta: { bank: i },
    sig: `B${i}`
  };
}

// ---------- 6차시: 비교 문제용 물건 만들기 ----------
function makeObj(rng, form, q, target, other, kind) {
  if (form === 'spinner') {
    let n;
    if (q % 2 === 1) n = rng.pick([4, 8]); else n = rng.pick([2, 4, 8]);
    // 회전판은 칸을 섞지 않고 같은 색끼리 이어 칠함(교과서와 같은 모양)
    const t = (q * n) / 4;
    const sectors = [];
    for (let i = 0; i < n; i++) sectors.push(i < t ? target : other);
    const rot = rng.int(n); // 시작 위치만 돌림
    const rs = sectors.map((_, i) => sectors[(i + rot) % n]);
    return { form, q, target, items: rs, svg: svgSpinner(rs) };
  }
  const total = rng.pick([4, 8]);
  const items = makeItems(rng, total, q, target, [other]);
  return { form, q, target, items, svg: svgBag(items, kind) };
}
function objDesc(o, kind) {
  const n = o.items.length, t = o.items.filter(c => c === o.target).length;
  const tn = COLORS[o.target].name;
  if (o.form === 'spinner') return `${n}칸 중 ${t}칸이 ${tn}`;
  return `${kind} ${n}개 중 ${t}개가 ${tn}`;
}
function distinctQs(rng, k, must) {
  const pool = rng.shuffle([0, 1, 2, 3, 4].filter(x => x !== must));
  const qs = must == null ? pool.slice(0, k) : [must, ...pool.slice(0, k - 1)];
  return rng.shuffle(qs);
}
function compareSetup(rng) {
  const form = rng() < 0.5 ? 'bag' : 'spinner';
  const kind = form === 'bag' ? rng.pick(['손수건', '공', '구슬']) : '';
  const pair = rng.pick([['red', 'green'], ['green', 'yellow'], ['blue', 'yellow'], ['red', 'blue'], ['orange', 'purple']]);
  const [target, other] = rng() < 0.5 ? pair : [pair[1], pair[0]];
  return { form, kind, target, other };
}
function eventText(s) {
  const tn = COLORS[s.target].name;
  if (s.form === 'spinner') return { thing: '회전판', ev: `화살이 ${tn}에 멈출 가능성` };
  const subject = `${tn} ${s.kind}`;
  return { thing: '주머니', ev: `${subject}${josaIGa(subject)} 나올 가능성` };
}

// ---------- 6차시 C: 셋 중 고르기 ----------
function genC(rng) {
  const s = compareSetup(rng);
  const ask = rng.pick(['highest', 'lowest', 'half', 'certain', 'impossible']);
  const must = { half: 2, certain: 4, impossible: 0 }[ask];
  const qs = distinctQs(rng, 3, must);
  const objs = qs.map(q => makeObj(rng, s.form, q, s.target, s.other, s.kind));
  let answer;
  if (ask === 'highest') answer = qs.indexOf(Math.max(...qs));
  else if (ask === 'lowest') answer = qs.indexOf(Math.min(...qs));
  else answer = qs.indexOf(must);
  const { thing, ev } = eventText(s);
  const askWord = { highest: '가장 높은', lowest: '가장 낮은', half: '반반인', certain: '확실한', impossible: '불가능한' }[ask];
  const lines = objs.map((o, i) => `${OBJ_LABELS[i]}: ${objDesc(o, s.kind)} (${LEVELS[o.q]})`).join(' / ');
  return {
    lesson: 6, type: 'C', kind: 'obj',
    prompt: `${ev}${josaIGa(ev)} ${askWord} ${thing}${josaEunNeun(thing)}?`,
    svg: '',
    choices: objs.map((o, i) => ({ t: 'obj', label: OBJ_LABELS[i], svg: o.svg })),
    answer,
    explain: `${lines} → ${askWord} 것은 ${OBJ_LABELS[answer]}`,
    explainScale: null,
    meta: { ask, objs: objs.map(o => ({ target: o.target, items: o.items, form: o.form })) },
    sig: `C${ask}${s.form}${qs.join('')}`
  };
}

// ---------- 6차시 D: 높은 순서대로 3개 ----------
function genD(rng) {
  const s = compareSetup(rng);
  const qs = distinctQs(rng, 3, null);
  const objs = qs.map(q => makeObj(rng, s.form, q, s.target, s.other, s.kind));
  const order = [0, 1, 2].sort((a, b) => qs[b] - qs[a]);
  const { thing, ev } = eventText(s);
  const lines = objs.map((o, i) => `${OBJ_LABELS[i]}: ${objDesc(o, s.kind)}`).join(' / ');
  return {
    lesson: 6, type: 'D', kind: 'order',
    prompt: `${ev}${josaIGa(ev)} 높은 ${thing}부터 차례대로 눌러요.`,
    svg: '',
    choices: objs.map((o, i) => ({ t: 'obj', label: OBJ_LABELS[i], svg: o.svg })),
    answer: order,
    explain: `${lines} → ${order.map(i => OBJ_LABELS[i]).join(', ')} 순서`,
    explainScale: null,
    meta: { objs: objs.map(o => ({ target: o.target, items: o.items, form: o.form })) },
    sig: `D${s.form}${qs.join('')}`
  };
}

// ---------- 6차시 E: 둘 중 더 높은 것 ----------
function genE(rng) {
  const s = compareSetup(rng);
  const qs = distinctQs(rng, 2, null);
  const objs = qs.map(q => makeObj(rng, s.form, q, s.target, s.other, s.kind));
  const answer = qs[0] > qs[1] ? 0 : 1;
  const { thing, ev } = eventText(s);
  const lines = objs.map((o, i) => `${OBJ_LABELS[i]}: ${objDesc(o, s.kind)}`).join(' / ');
  return {
    lesson: 6, type: 'E', kind: 'obj',
    prompt: `${thing} 가와 나 중 ${ev}${josaIGa(ev)} 더 높은 것은?`,
    svg: '',
    choices: objs.map((o, i) => ({ t: 'obj', label: OBJ_LABELS[i], svg: o.svg })),
    answer,
    explain: `${lines} → 더 높은 것은 ${OBJ_LABELS[answer]}`,
    explainScale: null,
    meta: { objs: objs.map(o => ({ target: o.target, items: o.items, form: o.form })) },
    sig: `E${s.form}${qs.join('')}`
  };
}

// ---------- 7차시 F: 보고 0 / 1/2 / 1 ----------
export const DIE_EVENTS = [
  { k: 'even', text: '짝수의 눈이 나올 가능성' },
  { k: 'odd', text: '홀수의 눈이 나올 가능성' },
  { k: 'eq7', text: '7의 눈이 나올 가능성' },
  { k: 'le6', text: '6 이하의 눈이 나올 가능성' },
  { k: 'le3', text: '3 이하의 눈이 나올 가능성' },
  { k: 'ge4', text: '4 이상의 눈이 나올 가능성' },
  { k: 'ge1', text: '1 이상의 눈이 나올 가능성' },
  { k: 'eq0', text: '0의 눈이 나올 가능성' }
];
export function dieFavorable(k) { // 테스트에서 독립적으로 쓰기 위한 판정
  const f = { even: n => n % 2 === 0, odd: n => n % 2 === 1, eq7: n => n === 7, le6: n => n <= 6, le3: n => n <= 3, ge4: n => n >= 4, ge1: n => n >= 1, eq0: n => n === 0 }[k];
  return [1, 2, 3, 4, 5, 6].filter(f);
}
const NUM_CHOICES = NUMS.map(v => ({ t: 'num', v }));
function qToNumIdx(q) { return { 0: 0, 2: 1, 4: 2 }[q]; }
function numExplain(q) { return `${LEVELS[q]} → ${NUMS[qToNumIdx(q)]}`; }

function genF(rng) {
  const form = rng.pick(['coin', 'die', 'spinner', 'box']);
  if (form === 'coin') {
    const ev = rng.pick([{ k: 'pic', text: '그림면이 나올 가능성', q: 2 }, { k: 'num', text: '숫자 면이 나올 가능성', q: 2 }, { k: 'any', text: '그림면이나 숫자 면이 나올 가능성', q: 4 }]);
    return {
      lesson: 7, type: 'F', kind: 'num', prompt: `동전을 한 번 던질 때 ${ev.text}을 수로 나타내면?`,
      svg: svgCoin(), choices: NUM_CHOICES, answer: qToNumIdx(ev.q),
      explain: ev.q === 2 ? `그림면, 숫자 면 2가지 중 하나 → ${numExplain(2)}` : `동전은 그림면이나 숫자 면 중 하나가 꼭 나와요 → ${numExplain(4)}`,
      explainScale: ev.q, meta: { form, event: ev.k }, sig: `Fcoin${ev.k}`
    };
  }
  if (form === 'die') {
    const ev = rng.pick(DIE_EVENTS);
    const fav = dieFavorable(ev.k).length;
    const q = fav === 0 ? 0 : fav === 3 ? 2 : 4;
    const why = { 0: '그런 눈은 주사위에 없어요', 2: '6가지 눈 중 딱 절반(3가지)이에요', 4: '어떤 눈이 나와도 맞아요' }[q];
    return {
      lesson: 7, type: 'F', kind: 'num', prompt: `주사위를 한 번 던질 때 ${ev.text}을 수로 나타내면?`,
      svg: svgDie(), choices: NUM_CHOICES, answer: qToNumIdx(q),
      explain: `${why} → ${numExplain(q)}`, explainScale: q, meta: { form, event: ev.k }, sig: `Fdie${ev.k}`
    };
  }
  const q = rng.pick([0, 2, 4]);
  if (form === 'spinner') {
    const pair = rng.pick([['red', 'blue'], ['green', 'yellow'], ['red', 'yellow'], ['blue', 'green']]);
    const [target, other] = rng() < 0.5 ? pair : [pair[1], pair[0]];
    const o = makeObj(rng, 'spinner', q, target, other, '');
    const tn = COLORS[target].name, n = o.items.length, t = (q * n) / 4;
    return {
      lesson: 7, type: 'F', kind: 'num', prompt: `회전판을 돌릴 때 화살이 ${tn}에 멈출 가능성을 수로 나타내면?`,
      svg: o.svg, choices: NUM_CHOICES, answer: qToNumIdx(q),
      explain: `${n}칸 중 ${t}칸이 ${tn} → ${numExplain(q)}`, explainScale: q,
      meta: { form, objs: [{ target, items: o.items }] }, sig: `Fsp${n}${q}${target}`
    };
  }
  // 경품함: 주황색 공·파란색 공
  const total = rng.pick([2, 4]);
  const target = rng() < 0.7 ? 'orange' : 'blue', other = target === 'orange' ? 'blue' : 'orange';
  const items = makeItems(rng, total, q, target, [other]);
  const tn = COLORS[target].name, t = items.filter(c => c === target).length;
  return {
    lesson: 7, type: 'F', kind: 'num', prompt: `경품함에서 공 한 개를 꺼낼 때 ${tn} 공이 나올 가능성을 수로 나타내면?`,
    svg: svgBox(items), choices: NUM_CHOICES, answer: qToNumIdx(q),
    explain: `공 ${total}개 중 ${t}개가 ${tn} → ${numExplain(q)}`, explainScale: q,
    meta: { form, objs: [{ target, items }] }, sig: `Fbox${total}${q}${target}`
  };
}

// ---------- 7차시 G: 말↔수 짝짓기 ----------
const WORD3 = [0, 2, 4]; // 불가능하다, 반반이다, 확실하다
function genG(rng) {
  const v = rng.pick(['w2n', 'n2w', 'pair']);
  const q = rng.pick(WORD3);
  if (v === 'w2n') {
    return {
      lesson: 7, type: 'G', kind: 'num', prompt: `가능성 '${LEVELS[q]}'를 수로 나타내면?`,
      svg: '', choices: NUM_CHOICES, answer: qToNumIdx(q),
      explain: `불가능하다 → 0, 반반이다 → 1/2, 확실하다 → 1`, explainScale: q, meta: { v, q }, sig: `Gw${q}`
    };
  }
  if (v === 'n2w') {
    return {
      lesson: 7, type: 'G', kind: 'word', prompt: `가능성을 나타내는 수 [${NUMS[qToNumIdx(q)]}]을 말로 나타내면?`,
      svg: '', choices: WORD3.map(w => ({ t: 'level', v: w })), answer: WORD3.indexOf(q),
      explain: `0 → 불가능하다, 1/2 → 반반이다, 1 → 확실하다`, explainScale: q, meta: { v, q }, sig: `Gn${q}`
    };
  }
  // 바르게 짝지은 것 고르기: 정답 1개 + 틀린 짝 2개
  const wrongPairs = [];
  for (const w of WORD3) for (const n of NUMS) if (NUMS[qToNumIdx(w)] !== n) wrongPairs.push({ w, n });
  const correct = { w: q, n: NUMS[qToNumIdx(q)] };
  const wr = rng.shuffle(wrongPairs).filter(p => p.w !== q).slice(0, 2);
  const opts = rng.shuffle([correct, ...wr]);
  return {
    lesson: 7, type: 'G', kind: 'pair', prompt: `말과 수를 바르게 짝지은 것은?`,
    svg: '', choices: opts.map(p => ({ t: 'pair', w: p.w, v: p.n })), answer: opts.indexOf(correct),
    explain: `${LEVELS[q]} → ${correct.n} (불가능하다 0, 반반이다 1/2, 확실하다 1)`, explainScale: q,
    meta: { v, q }, sig: `Gp${opts.map(p => p.w + p.n).join('')}`
  };
}

const GEN = { A: genA, B: genB, C: genC, D: genD, E: genE, F: genF, G: genG };

export function parseRange(str) {
  const arr = String(str || '').split(/[,\s]+/).map(Number).filter(n => n === 5 || n === 6 || n === 7);
  const uniq = [...new Set(arr)].sort();
  return uniq.length ? uniq : [5, 6];
}
export function rangeLabel(arr) {
  const a = [...arr].sort();
  if (a.length === 1) return `${a[0]}차시`;
  const contiguous = a.every((v, i) => i === 0 || v === a[i - 1] + 1);
  return contiguous ? `${a[0]}~${a[a.length - 1]}차시` : a.map(x => `${x}`).join('·') + '차시';
}

// 메인: 문제 만들기
export function generate(rangeArray, count = 10, seed = Date.now()) {
  const rng = makeRng(seed);
  let lessons = [...new Set((rangeArray || []).map(Number))].filter(n => LESSON_TYPES[n]).sort();
  if (!lessons.length) lessons = [5, 6];
  const typeUse = {};
  const seen = new Set();
  const out = [];
  let cycle = [];
  for (let i = 0; i < count; i++) {
    if (!cycle.length) cycle = rng.shuffle(lessons);
    const lesson = cycle.pop();
    const types = LESSON_TYPES[lesson];
    const minUse = Math.min(...types.map(t => typeUse[t] || 0));
    const cand = types.filter(t => (typeUse[t] || 0) === minUse);
    const type = rng.pick(cand);
    typeUse[type] = (typeUse[type] || 0) + 1;
    let q;
    for (let tries = 0; tries < 30; tries++) {
      q = GEN[type](rng);
      if (!seen.has(q.sig)) break;
    }
    seen.add(q.sig);
    q.id = `${seed}-${i}-${type}`;
    out.push(q);
  }
  return out;
}

// 정답 판정 (choice: 보기 번호, 순서 문제는 "2,0,1" 같은 문자열 또는 배열)
export function isCorrect(q, choice) {
  if (choice == null || choice === '') return false;
  if (q.kind === 'order') {
    const arr = Array.isArray(choice) ? choice.map(Number) : String(choice).split(',').map(Number);
    return arr.length === q.answer.length && arr.every((v, i) => v === q.answer[i]);
  }
  return Number(choice) === q.answer;
}
export function answerText(q) {
  if (q.kind === 'order') return q.answer.map(i => q.choices[i].label).join(' → ');
  return choiceText(q.choices[q.answer]);
}
export function choiceText(c) {
  if (!c) return '';
  if (c.t === 'level') return LEVELS[c.v];
  if (c.t === 'num') return c.v;
  if (c.t === 'pair') return `${LEVELS[c.w]} — ${c.v}`;
  if (c.t === 'obj') return c.label;
  return c.s || '';
}
