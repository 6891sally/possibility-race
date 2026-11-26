// 가능성 레이스 - 저장소 연결 (Firebase Realtime Database 또는 체험 모드)
// 두 방식 모두 같은 함수 모양을 씁니다.
//   init() → {uid, mode}
//   TS              : 서버 시각 표시값 (ServerValue.TIMESTAMP)
//   get(path) / set(path, v) / update(path, obj) / remove(path)
//   on(path, cb) → 구독 해제 함수
//   now()           : 서버 기준 현재 시각 추정
//   oldRooms(cutoff): createdAt이 cutoff보다 오래된 방 코드 목록
import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
export const isDemo = !firebaseConfig.apiKey;

let impl = null;

export async function init() {
  if (impl) return impl.info;
  impl = isDemo ? makeLocal() : await makeFirebase();
  impl.info = await impl.start();
  return impl.info;
}
export const TS = { '.sv': 'timestamp' };
export const get = (p) => impl.get(p);
export const set = (p, v) => impl.set(p, v);
export const update = (p, o) => impl.update(p, o);
export const remove = (p) => impl.remove(p);
export const on = (p, cb) => impl.on(p, cb);
export const now = () => impl.now();
export const oldRooms = (cutoff) => impl.oldRooms(cutoff);
export const onConnection = (cb) => impl.onConnection(cb);

// ---------------- Firebase ----------------
async function makeFirebase() {
  const [{ initializeApp }, A, D] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-database.js')
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const fdb = D.getDatabase(app);
  let offset = 0;
  const r = (p) => D.ref(fdb, p);
  const fix = (v) => replaceTS(v, () => D.serverTimestamp());
  return {
    async start() {
      const user = await new Promise((res, rej) => {
        const un = A.onAuthStateChanged(auth, (u) => {
          if (u) { un(); res(u); }
        }, rej);
        A.signInAnonymously(auth).catch(rej);
      });
      D.onValue(r('.info/serverTimeOffset'), (s) => { offset = s.val() || 0; });
      return { uid: user.uid, mode: 'firebase' };
    },
    async get(p) { const s = await D.get(r(p)); return s.val(); },
    set(p, v) { return D.set(r(p), fix(v)); },
    update(p, o) { const x = {}; for (const k in o) x[k] = fix(o[k]); return D.update(r(p), x); },
    remove(p) { return D.remove(r(p)); },
    on(p, cb) { return D.onValue(r(p), (s) => cb(s.val())); },
    now() { return Date.now() + offset; },
    async oldRooms(cutoff) {
      const q = D.query(r('rooms'), D.orderByChild('meta/createdAt'), D.endAt(cutoff));
      const s = await D.get(q);
      return Object.keys(s.val() || {});
    },
    onConnection(cb) { return D.onValue(r('.info/connected'), (s) => cb(!!s.val())); }
  };
}

function replaceTS(v, mk) {
  if (v && typeof v === 'object') {
    if (v['.sv'] === 'timestamp') return mk();
    if (Array.isArray(v)) return v.map(x => replaceTS(x, mk));
    const o = {};
    for (const k in v) o[k] = replaceTS(v[k], mk);
    return o;
  }
  return v;
}

// ---------------- 체험 모드 (같은 브라우저 탭끼리 localStorage로 연결) ----------------
// 값은 잎(leaf) 경로마다 따로 저장해서 여러 탭이 동시에 써도 서로 덮어쓰지 않게 함.
function makeLocal() {
  const PFX = 'prdb|';
  const listeners = new Set();
  let scheduled = false;
  const norm = (p) => String(p).split('/').filter(Boolean).join('/');

  function flatten(path, v, out) {
    if (v === null || v === undefined) return;
    if (typeof v === 'object') {
      const keys = Object.keys(v);
      for (const k of keys) flatten(path ? path + '/' + k : k, v[k], out);
    } else out[path] = v;
  }
  function keysUnder(path) {
    const res = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PFX)) continue;
      const lp = k.slice(PFX.length);
      if (!path || lp === path || lp.startsWith(path + '/')) res.push(lp);
    }
    return res;
  }
  function read(path) {
    path = norm(path);
    const ks = keysUnder(path);
    if (!ks.length) return null;
    let root = {};
    for (const lp of ks) {
      const val = JSON.parse(localStorage.getItem(PFX + lp));
      if (lp === path) return val;
      const rel = path ? lp.slice(path.length + 1) : lp;
      const parts = rel.split('/');
      let o = root;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) o[parts[i]] = {};
        o = o[parts[i]];
      }
      o[parts[parts.length - 1]] = val;
    }
    return root;
  }
  function delUnder(path) { for (const lp of keysUnder(path)) localStorage.removeItem(PFX + lp); }
  function write(path, v) {
    path = norm(path);
    delUnder(path);
    const out = {};
    flatten(path, replaceTS(v, () => Date.now()), out);
    for (const k in out) localStorage.setItem(PFX + k, JSON.stringify(out[k]));
  }
  function notify() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      for (const l of listeners) {
        const v = read(l.path), j = JSON.stringify(v);
        if (j !== l.last) { l.last = j; try { l.cb(v); } catch (e) { console.error(e); } }
      }
    }, 0);
  }
  window.addEventListener('storage', (e) => { if (!e.key || e.key.startsWith(PFX)) notify(); });

  return {
    async start() {
      // 탭마다 다른 사용자(새로고침해도 유지) → 한 브라우저에서 여러 학생 흉내 가능
      let uid = sessionStorage.getItem('pr_demo_uid');
      if (!uid) { uid = 'demo_' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('pr_demo_uid', uid); }
      return { uid, mode: 'demo' };
    },
    async get(p) { return read(p); },
    async set(p, v) { write(p, v); notify(); },
    async update(p, o) {
      // 다른 탭이 중간 상태를 읽지 않도록 status는 맨 마지막에 씀
      const keys = Object.keys(o).sort((a, b) => (a.endsWith('status') ? 1 : 0) - (b.endsWith('status') ? 1 : 0));
      for (const k of keys) write(norm(p) + '/' + k, o[k]);
      notify();
    },
    async remove(p) { delUnder(norm(p)); notify(); },
    on(p, cb) {
      const l = { path: norm(p), cb, last: undefined };
      listeners.add(l);
      setTimeout(() => { const v = read(l.path); l.last = JSON.stringify(v); cb(v); }, 0);
      return () => listeners.delete(l);
    },
    now() { return Date.now(); },
    async oldRooms(cutoff) {
      const rooms = read('rooms') || {};
      return Object.keys(rooms).filter(c => (rooms[c].meta && rooms[c].meta.createdAt || 0) <= cutoff);
    },
    onConnection(cb) { setTimeout(() => cb(true), 0); return () => {}; }
  };
}
