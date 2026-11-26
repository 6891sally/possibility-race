// 가능성 레이스 - 점수·순위·아이템 규칙 (순수 함수, 교사 화면만 실제로 적용)

export const RULE = {
  BASE: 100,        // 정답 기본 점수
  SPEED: 50,        // 속도 보너스 최대
  STREAK_FROM: 3,   // 3연속 정답부터
  STREAK_BONUS: 20, // 🔥 보너스
  GUST: 30,         // 돌풍으로 가져오는 점수
  MAX_ITEMS: 2,     // 최대 보유 개수
  GRACE_MS: 1500,   // 시간 종료 뒤 통신 지연 허용
  ITEM_EVERY: 3     // 3문제마다 아이템 상자
};

export const ITEMS = {
  booster:   { icon: '⚡', name: '두 배 부스터', desc: '다음 문제 점수 2배! (문제가 뜨기 전에 사용)' },
  gust:      { icon: '🌪️', name: '돌풍', desc: '바로 앞 순위 친구의 점수 30점을 가져와요' },
  umbrella:  { icon: '☂️', name: '우산', desc: '돌풍을 한 번 자동으로 막아요' },
  magnifier: { icon: '🔍', name: '돋보기', desc: '틀린 보기 1개를 지워요' },
  timestop:  { icon: '⏱️', name: '시간 정지', desc: '이번 문제 속도 보너스 최대!' }
};
export const ITEM_KEYS = Object.keys(ITEMS);

// 정답 한 문제 점수 계산
// opts: { correct, elapsedMs, limitMs, streakBefore, booster, timestop, spurt }
export function calcGain(o) {
  const streakBefore = o.streakBefore || 0;
  if (!o.correct) return { gained: 0, base: 0, speed: 0, streakBonus: 0, mult: 1, streak: 0 };
  const limit = Math.max(1, o.limitMs);
  const ratio = Math.min(1, Math.max(0, (limit - Math.max(0, o.elapsedMs)) / limit));
  const speed = o.timestop ? RULE.SPEED : Math.round(RULE.SPEED * ratio);
  const streak = streakBefore + 1;
  const streakBonus = streak >= RULE.STREAK_FROM ? RULE.STREAK_BONUS : 0;
  const mult = (o.booster ? 2 : 1) * (o.spurt ? 2 : 1);
  return { gained: (RULE.BASE + speed + streakBonus) * mult, base: RULE.BASE, speed, streakBonus, mult, streak };
}

// 결승선: 아이템 없이 전원 만점일 때 점수
export function maxScore(total) {
  let s = 0;
  for (let i = 0; i < total; i++) {
    const per = RULE.BASE + RULE.SPEED + (i + 1 >= RULE.STREAK_FROM ? RULE.STREAK_BONUS : 0);
    s += per * (i === total - 1 ? 2 : 1);
  }
  return s;
}

export function avgTime(p) {
  return p && p.answered > 0 ? p.timeSum / p.answered : Infinity;
}

// 순위: 점수 높은 순 → 동점이면 평균 응답 시간 빠른 순 → 번호 순
// list: [{uid, score, timeSum, answered, num}]
export function rankPlayers(list) {
  const arr = list.slice().sort((a, b) =>
    (b.score || 0) - (a.score || 0) || avgTime(a) - avgTime(b) || (a.num || 0) - (b.num || 0));
  arr.forEach((p, i) => { p.rank = i + 1; });
  return arr;
}

export function toArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(x => x != null);
  return Object.keys(v).sort((a, b) => a - b).map(k => v[k]).filter(x => x != null);
}

// 아이템 뽑기: 순위가 낮을수록 좋은 아이템(부스터·돌풍·시간 정지) 확률이 올라감
// rankIdx: 0 = 1등, n: 인원, enabled: {booster:true,...}
export function itemWeights(rankIdx, n, enabled, isFirst) {
  const p = n <= 1 ? 0 : rankIdx / (n - 1); // 0(1등) ~ 1(꼴등)
  const w = {
    booster: 1 + 2.5 * p,
    gust: isFirst ? 0 : 0.6 + 2.5 * p,
    timestop: 1 + 1.5 * p,
    magnifier: 1.6,
    umbrella: 2.2 - 1.2 * p
  };
  for (const k of ITEM_KEYS) if (!enabled || !enabled[k]) w[k] = 0;
  return w;
}
export function pickItem(rng, rankIdx, n, enabled, isFirst, exclude) {
  const w = itemWeights(rankIdx, n, enabled, isFirst);
  if (exclude) w[exclude] = 0;
  const total = ITEM_KEYS.reduce((s, k) => s + w[k], 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const k of ITEM_KEYS) { r -= w[k]; if (r < 0) return k; }
  return ITEM_KEYS.filter(k => w[k] > 0).pop();
}

// 아이템 상자: players = {uid: {items:[], ...}}, ranking = 순위순 uid 배열
// → {uid: 받은 아이템 키 또는 null(가방 꽉 참)}
export function grantItems(players, ranking, rng, enabled) {
  const gifts = {};
  ranking.forEach((uid, idx) => {
    const p = players[uid]; if (!p) return;
    const items = toArr(p.items);
    if (items.length >= RULE.MAX_ITEMS) { gifts[uid] = null; return; }
    const it = pickItem(rng, idx, ranking.length, enabled, idx === 0);
    if (it) { items.push(it); p.items = items; }
    gifts[uid] = it;
  });
  return gifts;
}

// 문제 채점 때 사용 의사(intents)를 보고 실제로 가진 아이템만 소모
// → { items: 남은 아이템, booster, timestop, magnifier }
export function consumeItems(itemsIn, intent) {
  const items = toArr(itemsIn).slice();
  const it = intent || {};
  const use = (k) => { if (it[k] && items.includes(k)) { items.splice(items.indexOf(k), 1); return true; } return false; };
  const booster = use('booster'), timestop = use('timestop'), magnifier = use('magnifier');
  return { items, booster, timestop, magnifier };
}

function removeOne(arr, key) {
  const i = arr.indexOf(key);
  if (i >= 0) arr.splice(i, 1);
  return i >= 0;
}

// 돌풍 처리. players = {uid:{score, items:[]}}, ranking = 처리 시작 시점의 순위순 uid 배열,
// users = 돌풍을 쓴 uid 배열(사용 순서). 결과: events 배열 (players는 직접 바뀜)
export function applyGusts(players, ranking, users, rng, enabled) {
  const events = [];
  for (const uid of users) {
    const me = players[uid]; if (!me) continue;
    const myItems = toArr(me.items);
    if (!myItems.includes('gust')) continue;
    const pos = ranking.indexOf(uid);
    if (pos <= 0) {
      // 1등은 돌풍 사용 불가 → 다른 아이템으로 교체
      removeOne(myItems, 'gust');
      const swap = pickItem(rng, 0, ranking.length, enabled, true, 'gust');
      if (swap) myItems.push(swap);
      me.items = myItems;
      events.push({ type: 'swap', from: uid, item: swap });
      continue;
    }
    const tid = ranking[pos - 1], tg = players[tid];
    removeOne(myItems, 'gust');
    me.items = myItems;
    const tItems = toArr(tg.items);
    if (removeOne(tItems, 'umbrella')) {
      tg.items = tItems;
      events.push({ type: 'gust', from: uid, to: tid, blocked: true, amount: 0 });
    } else {
      const amount = Math.min(RULE.GUST, tg.score || 0);
      tg.score = (tg.score || 0) - amount;
      me.score = (me.score || 0) + amount;
      events.push({ type: 'gust', from: uid, to: tid, blocked: false, amount });
    }
  }
  return events;
}

// 돋보기: 5단계(보기 5개)·3지선다(보기 3개) 선택 문제에서만
export function magnifierOK(q) {
  return q && q.kind !== 'order' && (q.choices.length === 5 || q.choices.length === 3);
}
// 돋보기로 지울 틀린 보기 하나 (같은 문제면 항상 같은 보기)
export function magnifierRemove(q, rng) {
  const wrong = q.choices.map((_, i) => i).filter(i => i !== q.answer);
  return wrong[Math.floor(rng() * wrong.length)];
}

// 시상: stats = [{uid, num, name, score, correct, correctTime, maxStreak, worstRank, rank}]
export function awards(stats) {
  const res = {};
  const byFast = stats.filter(s => s.correct > 0).sort((a, b) => a.correctTime / a.correct - b.correctTime / b.correct || a.rank - b.rank);
  if (byFast.length) res.fastest = { uid: byFast[0].uid, value: byFast[0].correctTime / byFast[0].correct };
  const byStreak = stats.filter(s => s.maxStreak > 0).sort((a, b) => b.maxStreak - a.maxStreak || a.rank - b.rank);
  if (byStreak.length) res.streak = { uid: byStreak[0].uid, value: byStreak[0].maxStreak };
  const byUp = stats.map(s => ({ s, up: (s.worstRank || s.rank) - s.rank })).filter(x => x.up > 0).sort((a, b) => b.up - a.up || a.s.rank - b.s.rank);
  if (byUp.length) res.comeback = { uid: byUp[0].s.uid, value: byUp[0].up };
  return res;
}
