// 가능성 레이스 - 공통 도우미 (캐릭터, 효과음, 화면 그리기)
import { LEVELS } from './questions.js';

export const CHARS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧'];
export const CHAR_NAMES = ['강아지', '고양이', '토끼', '여우', '곰', '판다', '코알라', '호랑이', '사자', '개구리', '원숭이', '펭귄'];

// 받침에 따라 을/를
export function eulReul(word) {
  const ch = word.charCodeAt(word.length - 1);
  return ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 ? '을' : '를';
}
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// 글 속의 1/2를 세로 분수로
export function fracHTML(v) {
  if (v === '1/2') return '<span class="frac"><span>1</span><span>2</span></span>';
  return `<span class="numv">${esc(v)}</span>`;
}
export function fmt(s) {
  return esc(s).replace(/(^|[^\d/])1\/2(?![\d/])/g, (m, p) => p + fracHTML('1/2'));
}

export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* 무시 */ } }
};

// 문제 화면에서는 알림이 문제를 가리지 않도록 잠시 모아 두었다가 다음 화면에서 보여 줌
const QUIET_SCREENS = new Set(['s-q']);
let curScreen = '', heldToasts = [];
export function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  curScreen = id;
  if (!QUIET_SCREENS.has(id) && heldToasts.length) {
    const list = heldToasts; heldToasts = [];
    list.forEach((a, k) => setTimeout(() => toast(...a), k * 400));
  }
}

// ---------- 효과음 (Web Audio) ----------
let actx = null;
let muted = store.get('pr_muted', false);
export function isMuted() { return muted; }
export function setMuted(m) { muted = m; store.set('pr_muted', m); }
function ctx() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, type = 'sine', when = 0, vol = 0.18) {
  const c = ctx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  const t = c.currentTime + when;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
export const sfx = {
  tap() { if (!muted) tone(660, 0.07, 'triangle'); },
  correct() { if (!muted) { tone(784, 0.12, 'triangle'); tone(1047, 0.2, 'triangle', 0.1); } },
  wrong() { if (!muted) { tone(330, 0.15, 'sawtooth', 0, 0.08); tone(247, 0.25, 'sawtooth', 0.12, 0.08); } },
  tick() { if (!muted) tone(1200, 0.04, 'square', 0, 0.05); },
  start() { if (!muted) [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', i * 0.1)); },
  item() { if (!muted) [880, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'sine', i * 0.07)); },
  gust() { if (!muted) { for (let i = 0; i < 6; i++) tone(300 + i * 90, 0.08, 'sawtooth', i * 0.04, 0.05); } },
  fanfare() { if (!muted) [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', i * 0.14)); }
};
export function muteButton(el) {
  const paint = () => { el.textContent = muted ? '🔇' : '🔊'; el.title = muted ? '소리 켜기' : '소리 끄기'; };
  paint();
  el.addEventListener('click', () => { setMuted(!muted); paint(); if (!muted) sfx.tap(); });
}

// ---------- 토스트 ----------
export function toast(msg, ms = 2600, cls = '') {
  if (QUIET_SCREENS.has(curScreen)) { if (heldToasts.length < 6) heldToasts.push([msg, ms, cls]); return; }
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + cls; t.innerHTML = msg;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

// ---------- 문제 그리기 ----------
export function choiceHTML(c) {
  if (c.t === 'level') return `<span class="lv-txt">${esc(LEVELS[c.v])}</span>`;
  if (c.t === 'num') return fracHTML(c.v);
  if (c.t === 'pair') return `<span class="pair"><span>${esc(LEVELS[c.w])}</span><span class="pair-line">—</span>${fracHTML(c.v)}</span>`;
  if (c.t === 'obj') return `<span class="obj-label">${esc(c.label)}</span><span class="obj-svg">${c.svg}</span>`;
  return esc(c.s || '');
}

// 5단계 눈금 막대 (해설용). mark = 0~4
export function scaleHTML(mark, small = false, nums = false) {
  const N = { 0: '0', 2: '1/2', 4: '1' };
  return `<div class="scale ${small ? 'small' : ''}">` + LEVELS.map((s, i) =>
    `<div class="tick ${i === mark ? 'on' : ''}"><i></i><span>${esc(s)}</span>${nums && N[i] ? `<em class="tnum">${fracHTML(N[i])}</em>` : ''}</div>`).join('') +
    `</div>`;
}

// 문제 본문 영역(그림 + 보기) HTML. opts: { interactive, removed: 보기 번호, big }
export function questionBodyHTML(q, opts = {}) {
  const dis = opts.interactive ? '' : 'disabled';
  if (q.kind === 'obj' || q.kind === 'order') {
    return `<div class="objs n${q.choices.length}">` + q.choices.map((c, i) =>
      `<button class="choice obj ${opts.removed === i ? 'removed' : ''}" data-i="${i}" ${dis}><span class="badge"></span>${choiceHTML(c)}</button>`).join('') +
      `</div>`;
  }
  const pic = q.svg ? `<div class="pic">${q.svg}</div>` : '';
  const isLevel = q.kind === 'level';
  const list = `<div class="choices ${isLevel ? 'levels' : 'c' + q.choices.length} ${q.svg ? '' : 'wide'}">` + q.choices.map((c, i) =>
    `<button class="choice ${c.t} ${isLevel ? 'lv' + c.v : ''} ${opts.removed === i ? 'removed' : ''}" data-i="${i}" ${dis}>${choiceHTML(c)}</button>`).join('') +
    (isLevel ? '<div class="lv-arrow"><span>가능성이 낮아요</span><span>가능성이 높아요</span></div>' : '') +
    `</div>`;
  return `<div class="qbody ${q.svg ? 'has-pic' : 'no-pic'}">${pic}${list}</div>`;
}

// 보기를 누를 수 있게 붙이기. 순서 문제는 번호 배지 + 되돌리기 + 제출.
// onSubmit(choiceString) 은 한 번만 불림.
export function mountChoices(root, q, onSubmit, opts = {}) {
  root.innerHTML = questionBodyHTML(q, { interactive: true, removed: opts.removed }) +
    (q.kind === 'order' ? `<div class="orderbar"><button class="btn white sm" data-act="undo">↩ 되돌리기</button><button class="btn green sm" data-act="submit" disabled>제출하기</button></div>` : '');
  let done = false;
  const seq = [];
  const btns = $$('.choice', root);
  const paintOrder = () => {
    btns.forEach((b, i) => {
      const k = seq.indexOf(i);
      b.classList.toggle('ordered', k >= 0);
      $('.badge', b).textContent = k >= 0 ? k + 1 : '';
    });
    const sb = $('[data-act=submit]', root);
    if (sb) sb.disabled = seq.length !== q.choices.length;
  };
  btns.forEach((b, i) => b.addEventListener('click', () => {
    if (done) return;
    sfx.tap();
    if (q.kind === 'order') {
      if (!seq.includes(i)) seq.push(i);
      paintOrder();
      return;
    }
    done = true;
    b.classList.add('picked');
    btns.forEach(x => { x.disabled = true; });
    onSubmit(String(i));
  }));
  if (q.kind === 'order') {
    $('[data-act=undo]', root).addEventListener('click', () => { if (!done) { seq.pop(); paintOrder(); sfx.tap(); } });
    $('[data-act=submit]', root).addEventListener('click', () => {
      if (done || seq.length !== q.choices.length) return;
      done = true;
      btns.forEach(x => { x.disabled = true; });
      $$('.orderbar button', root).forEach(x => { x.disabled = true; });
      onSubmit(seq.join(','));
    });
  }
  return {
    lock() { done = true; btns.forEach(x => { x.disabled = true; }); $$('.orderbar button', root).forEach(x => { x.disabled = true; }); },
    remove(i) { if (btns[i]) btns[i].classList.add('removed'); }
  };
}

// 정답/오답 표시
export function markChoices(root, q, choice) {
  const btns = $$('.choice', root);
  if (q.kind === 'order') {
    btns.forEach((b, i) => { const k = q.answer.indexOf(i); b.classList.add('ordered'); $('.badge', b).textContent = k + 1; b.classList.add('right'); });
    return;
  }
  btns.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) b.classList.add('right');
    else if (choice != null && String(i) === String(choice)) b.classList.add('wrongpick');
    else b.classList.add('dim');
  });
}

// 해설: (그림) + 눈금 막대 + 한두 문장. pics=false면 그림 없이(교사 화면은 위에 그림이 이미 있음)
export function explainHTML(q, opts = {}) {
  const scale = q.explainScale != null ? scaleHTML(q.explainScale, true, q.lesson === 7) : '';
  let pic = '';
  if (opts.pics) {
    if (q.svg) pic = `<div class="ex-pic">${q.svg}</div>`;
    else if (q.kind === 'obj' || q.kind === 'order') {
      pic = `<div class="ex-objs">` + q.choices.map((c, i) => {
        const k = q.kind === 'order' ? q.answer.indexOf(i) + 1 : (i === q.answer ? '✔' : '');
        return `<div class="ex-obj ${(q.kind === 'order' || i === q.answer) ? 'on' : ''}"><b>${esc(c.label)}${k ? ' · ' + k + (q.kind === 'order' ? '번째' : '') : ''}</b>${c.svg}</div>`;
      }).join('') + `</div>`;
    }
  }
  const body = `<div class="ex-txt">${scale}<p>${fmt(q.explain)}</p></div>`;
  return `<div class="explain ${pic && q.svg ? 'ex-row' : ''}">${pic}${body}</div>`;
}

export function qs(param, d = null) {
  const u = new URLSearchParams(location.search);
  return u.has(param) ? u.get(param) : d;
}

export function downloadCSV(name, rows) {
  const csv = '﻿' + rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// 모든 화면 크기를 기준 크기에 맞춰 확대/축소 (학생 1200×750, 교사 1920×1080)
export function fitStage(stage, w, h) {
  const fit = () => {
    const s = Math.min(window.innerWidth / w, window.innerHeight / h);
    stage.style.width = w + 'px'; stage.style.height = h + 'px';
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  };
  window.addEventListener('resize', fit);
  fit();
}
