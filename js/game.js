// 가능성 레이스 - 점수·순위·아이템 규칙 (순수 함수, 교사 화면만 실제로 적용)

export const RULE = {
  BASE: 100,        // 정답 기본 점수
  SPEED: 50,        // 속도 보너스 최대
  STREAK_FROM: 3,   // 3연속 정답부터
  STREAK_BONUS: 20, // 🔥 보너스
  GUST: 30,         // 돌풍으로 가져오는 점수
  MAX_ITEMS: 5,    // 최대 보유 개수
  GRACE_MS: 1500,   // 시간 종료 뒤 통신 지연 허용
  ITEM_EVERY: 3,    // 3문제마다 아이템 상자
  CONFIDENCE: 50,   // 🎯 확신 카드: 맞히면 +50
  CHEER: 30,        // 🤝 응원 깃발: 둘 다 +30
  DICE_EVEN: 40,    // 🎲 짝수
  DICE_ODD: 10      // 🎲 홀수
};

// when: 언제 쓰는지
//   between  = 문제가 뜨기 전 (정답 공개·달리기·아이템 타임)
//   itemtime = 아이템 타임에만
//   question = 문제 풀 때
//   passive  = 갖고만 있으면 자동
export const ITEMS = {
  booster:    { icon: '⚡', name: '두 배 부스터', when: 'between', desc: '다음 문제 점수 2배! (틀리면 아이템만 사라져요)' },
  gust:       { icon: '🌪️', name: '돌풍', when: 'itemtime', desc: '바로 앞 순위 친구의 점수 30점을 가져와요' },
  umbrella:   { icon: '☂️', name: '우산', when: 'passive', desc: '돌풍을 한 번 자동으로 막아요' },
  magnifier:  { icon: '🔍', name: '돋보기', when: 'question', desc: '틀린 보기 1개를 지워요' },
  timestop:   { icon: '⏱️', name: '시간 정지', when: 'question', desc: '이번 문제 속도 보너스 최대!' },
  shield:     { icon: '🛡️', name: '연속 보호막', when: 'passive', desc: '한 번 틀려도 🔥 연속 정답이 안 끊겨요' },
  confidence: { icon: '🎯', name: '확신 카드', when: 'question', desc: '이번 문제를 맞히면 +50점! (틀려도 감점 없음)' },
  cheer:      { icon: '🤝', name: '응원 깃발', when: 'between', desc: '바로 뒤 친구가 다음 문제를 맞히면 둘 다 +30점' },
  dice:       { icon: '🎲', name: '주사위 상자', when: 'itemtime', desc: '굴려서 짝수면 +40점, 홀수면 +10점' }
};
export const ITEM_KEYS = Object.keys(ITEMS);

// 정답 한 문제 점수 계산
// opts: { correct, elapsedMs, limitMs, streakBefore, booster, timestop, spurt, confidence }
export function calcGain(o) {
  const streakBefore = o.streakBefore || 0;
  if (!o.correct) return { gained: 0, base: 0, speed: 0, streakBonus: 0, mult: 1, streak: 0, conf: 0 };
  const limit = Math.max(1, o.limitMs);
  const ratio = Math.min(1, Math.max(0, (limit - Math.max(0, o.elapsedMs)) / limit));
  const speed = o.timestop ? RULE.SPEED : Math.round(RULE.SPEED * ratio);
  const streak = streakBefore + 1;
  const streakBonus = streak >= RULE.STREAK_FROM ? RULE.STREAK_BONUS : 0;
  const mult = (o.booster ? 2 : 1) * (o.spurt ? 2 : 1);
  const conf = o.confidence ? RULE.CONFIDENCE : 0;
  return { gained: (RULE.BASE + speed + streakBonus) * mult + conf, base: RULE.BASE, speed, streakBonus, mult, streak, conf };
}

// 🛡️ 연속 보호막: 틀렸는데 이어 오던 연속 정답이 있으면 보호막을 쓰고 연속을 지킴
// → { streak, items, used }
export function applyShield(streakBefore, correct, itemsIn) {
  const items = toArr(itemsIn).slice();
  if (correct || !(streakBefore > 0) || !items.includes('shield')) return { streak: correct ? streakBefore + 1 : 0, items, used: false };
  items.splice(items.indexOf('shield'), 1);
  return { streak: streakBefore, items, used: true };
}

// 🤝 응원 깃발: order = 문제 전 순위순 uid, users = 응원 깃발을 쓴 uid,
// correct = {uid: 맞았는지} → events (점수는 각 event의 amount를 둘 다에게 더함)
export function resolveCheers(order, users, correct) {
  const events = [];
  for (const uid of users) {
    const pos = order.indexOf(uid);
    const to = pos >= 0 ? order[pos + 1] : undefined;
    if (!to) { events.push({ type: 'cheer', from: uid, to: '', success: false, amount: 0, refund: true }); continue; }
    const ok = !!correct[to];
    events.push({ type: 'cheer', from: uid, to, success: ok, amount: ok ? RULE.CHEER : 0 });
  }
  return events;
}

// 🎲 주사위 상자
export function rollDice(rng) {
  const n = 1 + Math.floor(rng() * 6);
  return { n, amount: n % 2 === 0 ? RULE.DICE_EVEN : RULE.DICE_ODD };
}

// ---------- 모둠 ----------
export const TEAMS = [
  { name: '1모둠', icon: '🔴', color: '#ff6b6b' }, { name: '2모둠', icon: '🔵', color: '#4dabf7' },
  { name: '3모둠', icon: '🟢', color: '#38d9a9' }, { name: '4모둠', icon: '🟡', color: '#fcc419' },
  { name: '5모둠', icon: '🟣', color: '#9775fa' }, { name: '6모둠', icon: '🟠', color: '#ff922b' },
  { name: '7모둠', icon: '🟤', color: '#a0785a' }, { name: '8모둠', icon: '⚫', color: '#495057' }
];
// 랜덤 모둠: 섞은 뒤 차례로 나눠 줌 → 인원 차이 최대 1명
export function assignTeams(uids, count, rng) {
  const order = uids.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const start = Math.floor(rng() * count);
  const map = {};
  order.forEach((u, i) => { map[u] = (start + i) % count; });
  return map;
}
// 늦게 들어온 학생: 인원이 가장 적은 모둠으로
export function smallestTeam(map, count) {
  const n = new Array(count).fill(0);
  Object.values(map).forEach(t => { if (t >= 0 && t < count) n[t]++; });
  return n.indexOf(Math.min(...n));
}
// 모둠 순위: 모둠원 점수의 평균이 높은 순 → 같으면 평균 응답 시간 빠른 순
// list: [{uid, team, score, timeSum, answered}]
export function teamStandings(list, count) {
  const res = [];
  for (let t = 0; t < count; t++) {
    const mem = list.filter(p => p.team === t);
    if (!mem.length) continue;
    const avg = mem.reduce((s, p) => s + (p.score || 0), 0) / mem.length;
    const ans = mem.reduce((s, p) => s + (p.answered || 0), 0);
    const time = ans ? mem.reduce((s, p) => s + (p.timeSum || 0), 0) / ans : Infinity;
    res.push({ team: t, members: mem.map(p => p.uid), size: mem.length, avg, time });
  }
  res.sort((a, b) => b.avg - a.avg || a.time - b.time || a.team - b.team);
  res.forEach((r, i) => { r.rank = i + 1; });
  return res;
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
  const isLast = n > 1 && rankIdx === n - 1;
  const w = {
    booster: 1 + 2.5 * p,
    gust: isFirst ? 0 : 0.6 + 2.5 * p,
    timestop: 1 + 1.5 * p,
    magnifier: 1.6,
    umbrella: 2.2 - 1.2 * p,
    shield: 1.4,
    confidence: 0.8 + 1.4 * p,
    cheer: isLast ? 0 : 1.2,      // 꼴등은 뒤에 친구가 없으니 안 줌
    dice: 1.4
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
// → { items: 남은 아이템, booster, timestop, magnifier, confidence, cheer }
export function consumeItems(itemsIn, intent) {
  const items = toArr(itemsIn).slice();
  const it = intent || {};
  const use = (k) => { if (it[k] && items.includes(k)) { items.splice(items.indexOf(k), 1); return true; } return false; };
  const booster = use('booster'), timestop = use('timestop'), magnifier = use('magnifier');
  const confidence = use('confidence'), cheer = use('cheer');
  return { items, booster, timestop, magnifier, confidence, cheer };
}

function removeOne(arr, key) {
  const i = arr.indexOf(key);
  if (i >= 0) arr.splice(i, 1);
  return i >= 0;
}

// 돌풍 처리. players = {uid:{score, items:[]}}, ranking = 처리 시작 시점의 순위순 uid 배열,
// users = 돌풍을 쓴 uid 배열(사용 순서). 결과: events 배열 (players는 직접 바뀜)
// teamOf(선택): {uid: 모둠} → 모둠 대항전이면 같은 모둠 친구는 건너뛰고 바로 앞의 다른 모둠 친구에게
export function applyGusts(players, ranking, users, rng, enabled, teamOf) {
  const events = [];
  for (const uid of users) {
    const me = players[uid]; if (!me) continue;
    const myItems = toArr(me.items);
    if (!myItems.includes('gust')) continue;
    const pos = ranking.indexOf(uid);
    let tpos = pos - 1;
    if (teamOf) while (tpos >= 0 && teamOf[ranking[tpos]] === teamOf[uid]) tpos--;
    if (pos <= 0 || tpos < 0) {
      // 1등(또는 앞에 다른 모둠 친구가 없음)은 돌풍 사용 불가 → 다른 아이템으로 교체
      removeOne(myItems, 'gust');
      const swap = pickItem(rng, 0, ranking.length, enabled, true, 'gust');
      if (swap) myItems.push(swap);
      me.items = myItems;
      events.push({ type: 'swap', from: uid, item: swap });
      continue;
    }
    const tid = ranking[tpos], tg = players[tid];
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
