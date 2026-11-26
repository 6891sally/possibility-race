// ============================================================
//  Firebase 설정값 넣는 곳  (README.md 1단계 참고)
// ------------------------------------------------------------
//  1) Firebase 콘솔 → 프로젝트 설정(톱니바퀴) → 일반 → "내 앱" → 웹 앱(</>)
//  2) 화면에 보이는 firebaseConfig 안의 값들을 아래 따옴표 안에 그대로 붙여 넣으세요.
//  3) databaseURL 이 꼭 있어야 해요. (Realtime Database를 만든 뒤 보이는 주소)
//     예: https://my-race-default-rtdb.asia-southeast1.firebasedatabase.app
//
//  ※ apiKey가 비어 있으면 "체험 모드"로 동작해요.
//     체험 모드는 인터넷 없이 같은 브라우저의 여러 탭끼리만 연결돼요(수업 전 연습용).
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCYVi9_SKLkb6ySAyrzO2NqT3HBAXl4Zgo",
  authDomain: "possibility-race.firebaseapp.com",
  databaseURL: "https://possibility-race-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "possibility-race",
  storageBucket: "possibility-race.firebasestorage.app",
  messagingSenderId: "135425841776",
  appId: "1:135425841776:web:e6094c7d8872970c21f2b5"
};
