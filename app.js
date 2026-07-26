import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const canvas = document.querySelector("#workflow-core");
const visual = document.querySelector(".hero-visual");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0, 9.4);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const core = new THREE.Group();
scene.add(core);

const acid = new THREE.Color("#d9ff56");
const paper = new THREE.Color("#f0eee6");
const dark = new THREE.Color("#151812");

const solid = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.42, 2),
  new THREE.MeshPhysicalMaterial({
    color: dark,
    emissive: new THREE.Color("#24300d"),
    emissiveIntensity: 0.72,
    metalness: 0.35,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    transparent: true,
    opacity: 0.92,
  }),
);
core.add(solid);

const wire = new THREE.LineSegments(
  new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.48, 2)),
  new THREE.LineBasicMaterial({
    color: acid,
    transparent: true,
    opacity: 0.52,
  }),
);
core.add(wire);

const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.78, 1),
  new THREE.MeshBasicMaterial({
    color: acid,
    wireframe: true,
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
  }),
);
core.add(shell);

const nodeMaterial = new THREE.MeshBasicMaterial({ color: paper });
const hotNodeMaterial = new THREE.MeshBasicMaterial({ color: acid });
const nodeGeometry = new THREE.SphereGeometry(0.055, 12, 12);

const nodePositions = [
  [-2.5, 0.9, 0.3],
  [-2.25, -1.2, -0.2],
  [-0.7, 2.3, 0.2],
  [1.6, 1.9, -0.4],
  [2.55, 0.25, 0.3],
  [1.8, -1.9, 0.1],
  [-0.35, -2.5, -0.3],
  [0.3, 0.35, 2.1],
];

for (const [index, position] of nodePositions.entries()) {
  const node = new THREE.Mesh(
    nodeGeometry,
    index === 2 || index === 4 ? hotNodeMaterial : nodeMaterial,
  );
  node.position.set(...position);
  core.add(node);
}

const connectionMaterial = new THREE.LineBasicMaterial({
  color: acid,
  transparent: true,
  opacity: 0.26,
});

const connections = [
  [0, 2, 3],
  [0, 1, 6],
  [2, 7, 4],
  [6, 5, 4],
  [1, 7, 3],
];

for (const indices of connections) {
  const points = indices.map(
    (index) => new THREE.Vector3(...nodePositions[index]),
  );
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.BufferGeometry().setFromPoints(
    curve.getPoints(48),
  );
  core.add(new THREE.Line(geometry, connectionMaterial));
}

const ringMaterial = new THREE.MeshBasicMaterial({
  color: paper,
  transparent: true,
  opacity: 0.16,
  side: THREE.DoubleSide,
});

for (const [radius, rotation] of [
  [2.25, [1.05, 0.2, 0.1]],
  [2.72, [0.4, 1.1, 0.7]],
  [3.05, [1.6, 0.7, -0.45]],
]) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.008, 6, 160),
    ringMaterial,
  );
  ring.rotation.set(...rotation);
  core.add(ring);
}

const glow = new THREE.PointLight(acid, 16, 11, 1.6);
glow.position.set(2.5, 2.3, 4);
scene.add(glow);

const rim = new THREE.PointLight(new THREE.Color("#9fcfff"), 10, 12, 1.8);
rim.position.set(-3.5, -1.2, 3);
scene.add(rim);
scene.add(new THREE.AmbientLight(new THREE.Color("#e9ffbc"), 0.8));

const pointer = { x: 0, y: 0 };
let frameId = 0;
let startTime = performance.now();
let manualTime = null;

function resize() {
  const { width, height } = visual.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}

function renderScene(time) {
  const seconds = time / 1000;
  const ambient = reducedMotion.matches ? 0 : seconds;
  core.rotation.y +=
    (pointer.x * 0.28 + ambient * 0.12 - core.rotation.y) * 0.035;
  core.rotation.x +=
    (-pointer.y * 0.18 + Math.sin(ambient * 0.3) * 0.08 - core.rotation.x) *
    0.035;
  shell.rotation.y = -ambient * 0.1;
  shell.rotation.z = ambient * 0.06;
  solid.rotation.z = ambient * 0.035;
  renderer.render(scene, camera);
}

function animate(now) {
  renderScene(manualTime ?? now - startTime);
  frameId = requestAnimationFrame(animate);
}

function updatePointer(event) {
  const bounds = visual.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
}

visual.addEventListener("pointermove", updatePointer, { passive: true });
visual.addEventListener("pointerleave", () => {
  pointer.x = 0;
  pointer.y = 0;
});

new ResizeObserver(resize).observe(visual);
resize();
animate(performance.now());

window.__maTimeline = {
  seek(time) {
    manualTime = Math.max(0, time);
    cancelAnimationFrame(frameId);
    renderScene(manualTime);
  },
  play() {
    manualTime = null;
    startTime = performance.now();
    cancelAnimationFrame(frameId);
    animate(performance.now());
  },
};

const copyButton = document.querySelector(".copy-command");
const translations = {
  en: {
    title: "deer-workflow — Make agents move with intent.",
    description:
      "deer-workflow — deterministic TypeScript orchestration for replaceable AI agents.",
    navWhy: "Why",
    navBuild: "Build",
    navDocs: "Docs",
    docsHref: "https://github.com/deerwork-ai/deer-workflow#readme",
    guideHref: "https://github.com/deerwork-ai/deer-workflow#how-to-use",
    eyebrow: "Open-source agent orchestration",
    heroTitle: "Make agents<span>move with intent.</span>",
    heroIntro:
      "Deterministic TypeScript orchestration for the work that must stay predictable. Replaceable Agent runtimes for everything that shouldn’t.",
    startBuilding: "Start building",
    copy: "Copy",
    copied: "Copied",
    select: "Select",
    runtimeTypes: "01 / STRICT TYPESCRIPT",
    runtimeCodex: "02 / CODEX READY",
    runtimeNeutral: "03 / VENDOR NEUTRAL",
    explore: "Explore the system",
    whyLabel: "WHY DEER WORKFLOW",
    whyTitle: "Keep the path.<br><em>Change the mind.</em>",
    whyIntro:
      "The workflow stays legible and testable. The agent layer stays open, swappable, and ready for the next runtime.",
    featureOneTitle: "Deterministic by design",
    featureOneBody:
      "Phases, pipelines, parallel work, and nested workflows stay explicit in code.",
    featureTwoTitle: "Agents stay replaceable",
    featureTwoBody:
      "Bind one stable contract to Codex today—or another complete agent loop tomorrow.",
    featureThreeTitle: "Observable at the edge",
    featureThreeBody:
      "JSON Lines events make every run traceable across process boundaries.",
    buildLabel: "BUILD THE FLOW",
    buildTitle: "Readable on purpose.<br>Powerful in motion.",
    buildIntro:
      "Compose semantic agent work inside deterministic control flow. No hidden globals. No orchestration magic.",
    readGuide: "Read the getting started guide",
    footerTagline: "Open source. Built in the open.",
  },
  "zh-CN": {
    title: "deer-workflow — 让 Agent 有序行动。",
    description:
      "deer-workflow — 面向可替换 AI Agent 的确定性 TypeScript 编排运行时。",
    navWhy: "为何选择",
    navBuild: "开始构建",
    navDocs: "文档",
    docsHref:
      "https://github.com/deerwork-ai/deer-workflow/blob/main/README.zh-CN.md",
    guideHref:
      "https://github.com/deerwork-ai/deer-workflow/blob/main/README.zh-CN.md#如何使用",
    eyebrow: "开源 Agent 编排运行时",
    heroTitle: "让 Agent<span>有序行动。</span>",
    heroIntro:
      "让必须可预测的工作交给确定性的 TypeScript 编排，让需要智能的部分交给随时可替换的 Agent 运行时。",
    startBuilding: "开始构建",
    copy: "复制",
    copied: "已复制",
    select: "请手动复制",
    runtimeTypes: "01 / 严格 TYPESCRIPT",
    runtimeCodex: "02 / CODEX 就绪",
    runtimeNeutral: "03 / 厂商无关",
    explore: "探索运行机制",
    whyLabel: "为何选择 DEER WORKFLOW",
    whyTitle: "路径保持清晰。<br><em>智能自由替换。</em>",
    whyIntro:
      "工作流始终清晰、可测试；Agent 层始终开放、可替换，为下一代运行时做好准备。",
    featureOneTitle: "确定性源于设计",
    featureOneBody: "阶段、管道、并行任务与嵌套工作流，都在代码中显式表达。",
    featureTwoTitle: "Agent 随时可换",
    featureTwoBody:
      "今天接入 Codex，明天换成另一套完整 Agent Loop，稳定契约始终不变。",
    featureThreeTitle: "边界全程可观测",
    featureThreeBody: "JSON Lines 事件让每次运行跨越进程边界后仍然清晰可追踪。",
    buildLabel: "构建工作流",
    buildTitle: "刻意保持可读。<br>运行依然强大。",
    buildIntro:
      "在确定性控制流中组合 Agent 的语义工作。没有隐藏全局，也没有编排魔法。",
    readGuide: "阅读快速入门指南",
    footerTagline: "开放源码，公开构建。",
  },
};

let activeLanguage = "en";

function setLanguage(language, persist = false) {
  activeLanguage = translations[language] ? language : "en";
  const copy = translations[activeLanguage];
  document.documentElement.lang = activeLanguage;
  document.title = copy.title;
  document.querySelector('meta[name="description"]').content = copy.description;
  document.querySelector("#docs-link").href = copy.docsHref;
  document.querySelector("#guide-link").href = copy.guideHref;

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = copy[element.dataset.i18n];
  }

  for (const element of document.querySelectorAll("[data-i18n-html]")) {
    element.innerHTML = copy[element.dataset.i18nHtml];
  }

  for (const button of document.querySelectorAll("[data-lang]")) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.lang === activeLanguage),
    );
  }

  if (persist) {
    localStorage.setItem("deer-workflow-language-v2", activeLanguage);
  }
}

for (const button of document.querySelectorAll("[data-lang]")) {
  button.addEventListener("click", () =>
    setLanguage(button.dataset.lang, true),
  );
}

const savedLanguage = localStorage.getItem("deer-workflow-language-v2");
setLanguage(savedLanguage || "en");

copyButton.addEventListener("click", async () => {
  const label = copyButton.querySelector(".copy-label");
  try {
    await navigator.clipboard.writeText(copyButton.dataset.copy);
    label.textContent = translations[activeLanguage].copied;
  } catch {
    label.textContent = translations[activeLanguage].select;
  }
  window.setTimeout(() => {
    label.textContent = translations[activeLanguage].copy;
  }, 1600);
});

window.addEventListener("pagehide", () => {
  cancelAnimationFrame(frameId);
  renderer.dispose();
});
