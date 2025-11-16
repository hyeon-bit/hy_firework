// =========================
// Sand Flow — Public build with selectable GUI items (Overlay Panel)
// =========================

// ───────────────────────────────────────
// GUI 표시 항목 설정 (true=보이기 / false=숨기기)
// ───────────────────────────────────────
const PANEL = {
  Colors: {
    bgColor:      true,
    main1:        true,
    sub1:         true,
    sub2:         true,
    mainRatio:    false,
    sub1Ratio:    false,
    sub2Ratio:    false,
  },
  Particles: {
    count:        true,
    size:         true,
    speed:        true,
    fade:         true,
  },
  Flow: {
    noiseScale:   false,
    noiseStrength:false,
    zScroll:      false,
    depth:        true,
  },
  Debug: {
    showFlowField:true,   // ← 이걸 true로 켜두면 바로 보임
    fieldStep:    false,
    fieldScale:   false,
    fieldOpacity: false,
    fieldSliceZ:  false,
    fieldColor:   false,
  }
};

// ───────────────────────────────────────

// 🎨 [추가] 컬러 프리셋 정의 (버튼으로 적용)
const PRESET_SETS = {
  "White-Blue Set":  { bgColor:"#0c36ed", main1:"#eecb95", sub1:"#dcb688", sub2:"#c4a072" },
  "Blue-Black Set": { bgColor:"#000000", main1:"#1a71ff", sub1:"#1a71ff", sub2:"#1a71ff" },
  "Gold-Black Set": { bgColor:"#000000", main1:"#ffd68a", sub1:"#ffb84c", sub2:"#e8a03a" }
};

// 🎛️ [추가] 컬러 컨트롤 참조(버튼 눌렀을 때 UI 표시 갱신)
const ColorCtl = { bg:null, m1:null, s1:null, s2:null };

// [추가] 프리셋 적용 함수
function applyPreset(name){
  const p = PRESET_SETS[name];
  if (!p) return;
  STATE.bgColor = p.bgColor;
  STATE.main1  = p.main1;
  STATE.sub1   = p.sub1;
  STATE.sub2   = p.sub2;
  // 컬러 피커 화면 값 갱신
  if (ColorCtl.bg) ColorCtl.bg.updateDisplay();
  if (ColorCtl.m1) ColorCtl.m1.updateDisplay();
  if (ColorCtl.s1) ColorCtl.s1.updateDisplay();
  if (ColorCtl.s2) ColorCtl.s2.updateDisplay();
}

let particles = [];
let zOff = 0;

const STATE = {
  // Particles
  count: 17000,
  size: 1.9,
  speed: 0.8,
  fade: 10, // 잔상 지우는 양 (값↑=빨리 사라짐)

  // Flow
  noiseScale: 0.0018,
  noiseStrength: 2.0,
  zScroll: 0.001,
  depth: 400,

  // Colors
  bgColor: "#0c36ed",
  main1:  "#eecb95",
  sub1:   "#dcb688",
  sub2:   "#c4a072",
  mainRatio: 0.6,
  sub1Ratio: 0.25,
  sub2Ratio: 0.15,

  seed: Math.floor(Math.random() * 1e9),

  // 🔍 Debug overlay (필요 옵션들)
  showFlowField: false,
  fieldStep: 86,      // 그리드 간격(px)
  fieldScale: 40,     // 화살표 길이
  fieldOpacity: 170,  // 불투명도 0~255
  fieldSliceZ: 0,     // z 단면 위치
  fieldColor: "#ffffff"
};

function setup() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  createCanvas(w, h, WEBGL).parent(document.getElementById("stage"));
  pixelDensity(1);

  randomSeed(STATE.seed);
  noiseSeed(STATE.seed);

  initParticles();
  buildGUI();

  const [r,g,b] = hexToRgb(STATE.bgColor);
  background(r,g,b);
}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
}

function initParticles() {
  particles = [];
  for (let i = 0; i < STATE.count; i++) {
    particles.push({
      x: random(-width * 0.6,  width * 0.6),
      y: random(-height * 0.6, height * 0.6),
      z: random(-STATE.depth,  STATE.depth),
      colorId: pickColorId(),
    });
  }
}

function reassignColorIds() {
  for (let p of particles) p.colorId = pickColorId();
}

function pickColorId() {
  const r = random();
  const t1 = STATE.mainRatio;
  const t2 = STATE.mainRatio + STATE.sub1Ratio;
  if (r < t1) return 0;
  if (r < t2) return 1;
  return 2;
}

function draw() {
  // 배경 페이드
  push();
  resetMatrix();
  translate(-width / 2, -height / 2);
  const [br,bg,bb] = hexToRgb(STATE.bgColor);
  noStroke();
  fill(br,bg,bb, STATE.fade);
  rect(0, 0, width, height);
  pop();

  rotateY(frameCount * 0.002);

  const bx = width * 0.7, by = height * 0.7, bz = STATE.depth;
  const ns = STATE.noiseScale;

  for (let p of particles) {
    const n1 = noise((p.x + bx) * ns, (p.y + by) * ns, (p.z + bz) * ns + zOff);
    const n2 = noise((p.y + by) * ns + 100, (p.z + bz) * ns + 200, (p.x + bx) * ns + zOff * 0.7);

    const a = n1 * TAU * STATE.noiseStrength;
    const b = (n2 - 0.5) * PI * STATE.noiseStrength;

    const csb = cos(b), snb = sin(b);
    const sp = STATE.speed * 1.4;

    p.x += cos(a) * csb * sp;
    p.y += sin(a) * csb * sp;
    p.z += snb * sp;

    if (p.x < -bx) p.x = bx; else if (p.x > bx) p.x = -bx;
    if (p.y < -by) p.y = by; else if (p.y > by) p.y = -by;
    if (p.z < -bz) p.z = bz; else if (p.z > bz) p.z = -bz;
  }

  noStroke();
  for (let p of particles) {
    const [r,g,b] = paletteRgb(p.colorId);
    push();
    translate(p.x, p.y, p.z);
    fill(r,g,b, 40);
    ellipse(0, 0, STATE.size, STATE.size);
    pop();
  }

  // 🔍 디버그 화살표 오버레이
  if (STATE.showFlowField) {
    drawFlowFieldOverlay();
  }

  zOff += STATE.zScroll;
}

// =========================
// 🔍 Flow Field Debug Overlay (2D 화면 좌표로 화살표 표시)
// =========================
function drawFlowFieldOverlay() {
  push();
  // 2D HUD처럼 덮어그리기
  resetMatrix();
  translate(-width / 2, -height / 2);

  const step = Math.max(20, Math.round(STATE.fieldStep));
  const scale = STATE.fieldScale;
  const [cr, cg, cb] = hexToRgb(STATE.fieldColor);
  const alpha = constrain(STATE.fieldOpacity, 0, 255);
  stroke(cr, cg, cb, alpha);
  strokeWeight(1);

  const zSlice = constrain(STATE.fieldSliceZ, -STATE.depth, STATE.depth);
  const ns = STATE.noiseScale;
  const bx = width * 0.7, by = height * 0.7, bz = STATE.depth;

  for (let y = step * 0.5; y <= height - step * 0.5; y += step) {
    for (let x = step * 0.5; x <= width - step * 0.5; x += step) {
      // 화면 중앙을 (0,0)으로 맞춘 후의 샘플 좌표
      const sx = x - width / 2;
      const sy = y - height / 2;
      const sz = zSlice;

      const n1 = noise((sx + bx) * ns, (sy + by) * ns, (sz + bz) * ns + zOff);
      const n2 = noise((sy + by) * ns + 100, (sz + bz) * ns + 200, (sx + bx) * ns + zOff * 0.7);

      const a = n1 * TAU * STATE.noiseStrength;
      const b = (n2 - 0.5) * PI * STATE.noiseStrength;

      const csb = Math.cos(b);
      const vx = Math.cos(a) * csb;
      const vy = Math.sin(a) * csb;

      // 화살표 그리기
      drawArrow2D(x, y, x + vx * scale, y + vy * scale, cr, cg, cb, alpha);
    }
  }

  pop();
}

function drawArrow2D(x1, y1, x2, y2, r, g, b, a) {
  stroke(r, g, b, a);
  line(x1, y1, x2, y2);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const head = 6;
  const p1x = x2 - head * Math.cos(ang - Math.PI / 6);
  const p1y = y2 - head * Math.sin(ang - Math.PI / 6);
  const p2x = x2 - head * Math.cos(ang + Math.PI / 6);
  const p2y = y2 - head * Math.sin(ang + Math.PI / 6);
  noStroke();
  fill(r, g, b, a);
  triangle(x2, y2, p1x, p1y, p2x, p2y);
}

// =========================
// GUI (선택적 표시)
// =========================
let gui;
function buildGUI() {
  const GUIClass =
    (window.lil && window.lil.GUI) ||
    (window.lilGui && window.lilGui.GUI) ||
    window.GUI;

  if (!GUIClass) {
    console.warn("⚠️ lil-gui를 찾을 수 없습니다.");
    return;
  }

  if (gui) gui.destroy();
  gui = new GUIClass({ container: document.getElementById("gui") || undefined });

  // Colors
  if (anyTrue(PANEL.Colors)) {
    const f = gui.addFolder("Colors");

    // [추가] 프리셋 버튼들 (정의된 세트만큼 자동 생성)
    const actions = {};
    Object.keys(PRESET_SETS).forEach((label)=>{
      actions[label] = () => applyPreset(label);
      f.add(actions, label).name(label); // 예: "Blue Set", "Black Set"
    });

    if (PANEL.Colors.bgColor)   ColorCtl.bg = f.addColor(STATE, "bgColor").name("Background");
    if (PANEL.Colors.main1)     ColorCtl.m1 = f.addColor(STATE, "main1").name("Main 1");
    if (PANEL.Colors.sub1)      ColorCtl.s1 = f.addColor(STATE, "sub1").name("Sub 1");
    if (PANEL.Colors.sub2)      ColorCtl.s2 = f.addColor(STATE, "sub2").name("Sub 2");
    if (PANEL.Colors.mainRatio) f.add(STATE, "mainRatio", 0, 1, 0.01).name("Main Ratio").onChange(()=>{ normalizeRatios(); reassignColorIds(); });
    if (PANEL.Colors.sub1Ratio) f.add(STATE, "sub1Ratio", 0, 1, 0.01).name("Sub1 Ratio").onChange(()=>{ normalizeRatios(); reassignColorIds(); });
    if (PANEL.Colors.sub2Ratio) f.add(STATE, "sub2Ratio", 0, 1, 0.01).name("Sub2 Ratio").onChange(()=>{ normalizeRatios(); reassignColorIds(); });
  }

  // Particles
  if (anyTrue(PANEL.Particles)) {
    const f = gui.addFolder("Particles");
    if (PANEL.Particles.count) f.add(STATE, "count", 2000, 80000, 1000).name("Count").onFinishChange(initParticles);
    if (PANEL.Particles.size)  f.add(STATE, "size", 0.5, 4, 0.1).name("Size");
    if (PANEL.Particles.speed) f.add(STATE, "speed", 0.1, 3, 0.05).name("Speed");
    if (PANEL.Particles.fade)  f.add(STATE, "fade", 0, 120, 1).name("Fade");
  }

  // Flow
  if (anyTrue(PANEL.Flow)) {
    const f = gui.addFolder("Flow");
    if (PANEL.Flow.noiseScale)    f.add(STATE, "noiseScale", 0.0005, 0.01, 0.0001).name("Flow Scale");
    if (PANEL.Flow.noiseStrength) f.add(STATE, "noiseStrength", 0.5, 6, 0.1).name("Flow Strength");
    if (PANEL.Flow.zScroll)       f.add(STATE, "zScroll", 0, 0.02, 0.0005).name("Z Scroll");
    if (PANEL.Flow.depth)         f.add(STATE, "depth", 50, 1600, 10).name("Depth").onFinishChange(initParticles);
  }

  // Debug
  if (anyTrue(PANEL.Debug)) {
    const f = gui.addFolder("Flow Debug");
    if (PANEL.Debug.showFlowField) f.add(STATE, "showFlowField").name("Show Field");
    if (PANEL.Debug.fieldStep)     f.add(STATE, "fieldStep", 20, 120, 2).name("Grid Step");
    if (PANEL.Debug.fieldScale)    f.add(STATE, "fieldScale", 8, 60, 1).name("Arrow Length");
    if (PANEL.Debug.fieldOpacity)  f.add(STATE, "fieldOpacity", 20, 255, 1).name("Opacity");
    if (PANEL.Debug.fieldSliceZ)   f.add(STATE, "fieldSliceZ", -STATE.depth, STATE.depth, 1).name("Slice Z");
    if (PANEL.Debug.fieldColor)    f.addColor(STATE, "fieldColor").name("Arrow Color");
  }

  gui.close();
}

function anyTrue(group) {
  return Object.values(group).some(Boolean);
}

// =========================
// Helpers
// =========================
function hexToRgb(hex) {
  let s = hex.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (s.length === 3) s = s.split("").map(c => c + c).join("");
  const num = parseInt(s, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
function paletteRgb(id) {
  if (id === 0) return hexToRgb(STATE.main1);
  if (id === 1) return hexToRgb(STATE.sub1);
  return hexToRgb(STATE.sub2);
}
function normalizeRatios() {
  let t = STATE.mainRatio + STATE.sub1Ratio + STATE.sub2Ratio;
  if (t <= 0) { STATE.mainRatio = 1; STATE.sub1Ratio = 0; STATE.sub2Ratio = 0; t = 1; }
  STATE.mainRatio /= t;
  STATE.sub1Ratio /= t;
  STATE.sub2Ratio /= t;
}
