import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

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

const deerPivot = new THREE.Group();
deerPivot.rotation.y = 0.52;
deerPivot.position.y = 0.18;
core.add(deerPivot);

const deerMaterial = new THREE.MeshPhysicalMaterial({
  color: dark,
  emissive: new THREE.Color("#28370d"),
  emissiveIntensity: 0.78,
  metalness: 0.42,
  roughness: 0.26,
  clearcoat: 1,
  clearcoatRoughness: 0.2,
  flatShading: true,
});

const deerEdgeMaterial = new THREE.LineBasicMaterial({
  color: acid,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
});

function cropGeometryAbove(geometry, minimumY) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.getAttribute("position");
  const normal = source.getAttribute("normal");
  const positions = [];
  const normals = [];

  for (let index = 0; index < position.count; index += 3) {
    const averageY =
      (position.getY(index) +
        position.getY(index + 1) +
        position.getY(index + 2)) /
      3;

    if (averageY < minimumY) {
      continue;
    }

    for (let vertex = index; vertex < index + 3; vertex += 1) {
      positions.push(
        position.getX(vertex),
        position.getY(vertex),
        position.getZ(vertex),
      );

      if (normal) {
        normals.push(
          normal.getX(vertex),
          normal.getY(vertex),
          normal.getZ(vertex),
        );
      }
    }
  }

  const cropped = new THREE.BufferGeometry();
  cropped.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );

  if (normals.length > 0) {
    cropped.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
  } else {
    cropped.computeVertexNormals();
  }

  return cropped;
}

new OBJLoader().load(
  "./assets/models/statue-stag.obj",
  (deer) => {
    const meshes = [];
    deer.traverse((child) => {
      if (child.isMesh) {
        meshes.push(child);
      }
    });

    for (const mesh of meshes) {
      mesh.geometry = cropGeometryAbove(mesh.geometry, 2.15);
      mesh.material = deerMaterial;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 24),
        deerEdgeMaterial,
      );
      mesh.add(edges);
    }

    const bounds = new THREE.Box3().setFromObject(deer);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 4.75 / size.y;

    deer.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    deer.scale.setScalar(scale);

    deerPivot.add(deer);
  },
  undefined,
  (error) => {
    console.error("Unable to load the deer mesh.", error);
  },
);

const frame = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.OctahedronGeometry(2.65, 0)),
  new THREE.LineBasicMaterial({
    color: acid,
    transparent: true,
    opacity: 0.085,
    depthWrite: false,
  }),
);
frame.rotation.set(0.25, 0.65, 0.12);
core.add(frame);

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
    (pointer.x * 0.22 + Math.sin(ambient * 0.22) * 0.08 - core.rotation.y) *
    0.035;
  core.rotation.x +=
    (-pointer.y * 0.18 + Math.sin(ambient * 0.3) * 0.08 - core.rotation.x) *
    0.035;
  deerPivot.position.y = 0.18 + Math.sin(ambient * 0.7) * 0.045;
  frame.rotation.y = 0.65 - ambient * 0.08;
  frame.rotation.z = 0.12 + ambient * 0.035;
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

const translations = {
  en: {
    title: "deer-workflow — Let code drive the flow. Agents handle judgment.",
    description:
      "deer-workflow combines program stability with Agent initiative. Let code drive the flow; Agents handle judgment.",
    navWhy: "Why",
    navBuild: "How it works",
    navDocs: "Docs",
    docsHref: "https://github.com/deerwork-ai/deer-workflow#readme",
    guideHref:
      "https://github.com/deerwork-ai/deer-workflow/blob/main/docs/api.md#workflow-module-contract",
    eyebrow: "Program stability × Agent initiative",
    heroTitle: "Let code drive the flow.<span>Agents handle judgment.</span>",
    heroIntro:
      "Dynamic Workflow puts orchestration in TypeScript. Order, concurrency, and stopping rules become explicit; a complete Agent Loop runs only where the task needs understanding and judgment.",
    startBuilding: "See how it works",
    copy: "Copy",
    copied: "Copied",
    select: "Select",
    runtimeTypes: "01 / CODE HOLDS THE PLAN",
    runtimeCodex: "02 / AGENTS HANDLE JUDGMENT",
    runtimeNeutral: "03 / HUMANS RETAIN RESPONSIBILITY",
    visualPlan: "PLAN",
    visualAgent: "AGENT",
    visualResult: "RESULT",
    tickerOne: "CODE HOLDS THE PLAN",
    tickerTwo: "AGENTS HANDLE JUDGMENT",
    tickerThree: "SKILLS CARRY KNOWLEDGE · WORKFLOWS MAKE STEPS EXPLICIT",
    explore: "Explore the system",
    whyLabel: "WHY DYNAMIC WORKFLOW",
    whyTitle: "Not every step<br><em>needs a model.</em>",
    whyIntro:
      "Skills carry knowledge and strategy. When mechanical steps also live in natural language, the Agent often has to interpret the plan again as it advances. Dynamic Workflow moves that control flow into code.",
    featureOneTitle: "Code holds the plan",
    featureOneBody:
      "Phases, branches, Barriers, retry limits, and stopping rules live in code, where they can be reviewed and tested.",
    featureTwoTitle: "Agents handle judgment",
    featureTwoBody:
      "agent() starts a complete ReAct Loop with tools and its own Context—not a one-shot Prompt completion.",
    featureThreeTitle: "Schema gives code a stable shape",
    featureThreeBody:
      "When code consumes an Agent result, JSON Schema validates its shape before the next step runs.",
    exampleLabel: "RUN A REAL WORKFLOW",
    exampleTitle: "Run the<br><em>deep-research</em> example.",
    exampleIntro:
      "From the repository root, give the Workflow a question. It plans the research, runs independent angles in parallel, and synthesizes the result.",
    openExample: "Open the example",
    exampleHref:
      "https://github.com/deerwork-ai/deer-workflow/tree/main/examples/deep-research",
    buildLabel: "THE WORKFLOW IS CODE",
    buildTitle: "Ordinary TypeScript.<br>Only agent() starts an Agent Loop.",
    buildIntro:
      "Use arrays, branches, loops, and concurrency for the mechanical work. Call agent() when a step needs understanding, exploration, or judgment.",
    readGuide: "Read the Workflow API contract",
    footerTagline: "Code handles mechanics. Agents handle judgment.",
  },
  "zh-CN": {
    title: "deer-workflow — 代码负责流程，Agent 负责判断。",
    description:
      "deer-workflow 结合程序的稳定性和 Agent 的主观能动性：代码负责流程，Agent 负责判断。",
    navWhy: "为什么",
    navBuild: "如何工作",
    navDocs: "文档",
    docsHref:
      "https://github.com/deerwork-ai/deer-workflow/blob/main/README.zh-CN.md",
    guideHref:
      "https://github.com/deerwork-ai/deer-workflow/blob/main/docs/api.zh-CN.md#workflow-模块契约",
    eyebrow: "程序的稳定性 × Agent 的主观能动性",
    heroTitle: "代码负责流程。<span>Agent 负责判断。</span>",
    heroIntro:
      "Dynamic Workflow 把编排写进 TypeScript：顺序、并发与停止规则变得显式；只有需要理解和判断时，才运行完整的 Agent Loop。",
    startBuilding: "查看工作方式",
    copy: "复制",
    copied: "已复制",
    select: "请手动复制",
    runtimeTypes: "01 / 代码负责计划",
    runtimeCodex: "02 / Agent 负责判断",
    runtimeNeutral: "03 / 人类保留责任",
    visualPlan: "计划",
    visualAgent: "Agent",
    visualResult: "结果",
    tickerOne: "代码负责计划",
    tickerTwo: "Agent 负责判断",
    tickerThree: "Skill 承载知识 · Workflow 让步骤变得显式",
    explore: "探索运行机制",
    whyLabel: "为什么需要 DYNAMIC WORKFLOW",
    whyTitle: "并不是所有事情<br><em>都值得再问模型一遍。</em>",
    whyIntro:
      "Skill 很适合承载知识与策略。但当机械步骤也写在自然语言里，Agent 每推进一步，往往还要重新读取上下文、判断下一步。Dynamic Workflow 把这部分控制流移进代码。",
    featureOneTitle: "代码负责计划",
    featureOneBody:
      "Phase、分支、Barrier、重试上限与停止规则都写进代码，因此可以 Review，也可以测试。",
    featureTwoTitle: "Agent 负责判断",
    featureTwoBody:
      "agent() 启动带 Tool 与独立 Context 的完整 ReAct Loop，而不是一次 Prompt Completion。",
    featureThreeTitle: "Schema 让结构可校验",
    featureThreeBody:
      "当结果还要交给代码消费，JSON Schema 会先校验输出结构，再让下一步继续。",
    exampleLabel: "运行一个真实的 WORKFLOW",
    exampleTitle: "跑一下<br><em>Deep Research</em> 示例。",
    exampleIntro:
      "在仓库根目录给 Workflow 一个问题。它会先制定研究计划，再并行探索不同角度，最后汇编结果。",
    openExample: "查看示例源码",
    exampleHref:
      "https://github.com/deerwork-ai/deer-workflow/tree/main/examples/deep-research",
    buildLabel: "Workflow 就是一段代码",
    buildTitle: "普通 TypeScript。<br>只有 agent() 启动 Agent Loop。",
    buildIntro:
      "数组、分支、循环和并发负责机械工作；需要理解、探索与判断时，再调用 agent()。",
    readGuide: "阅读 Workflow API 契约",
    footerTagline: "机械步骤交给代码，判断留给 Agent。",
  },
};

let activeLanguage = "en";

for (const link of document.querySelectorAll("a")) {
  link.target = "_blank";
  link.rel = "noreferrer";
}

function setLanguage(language, persist = false) {
  activeLanguage = translations[language] ? language : "en";
  const copy = translations[activeLanguage];
  document.documentElement.lang = activeLanguage;
  document.title = copy.title;
  document.querySelector('meta[name="description"]').content = copy.description;
  document.querySelector('meta[property="og:title"]').content = copy.title;
  document.querySelector('meta[property="og:description"]').content =
    copy.description;
  document.querySelector("#docs-link").href = copy.docsHref;
  document.querySelector("#guide-link").href = copy.guideHref;
  document.querySelector("#example-link").href = copy.exampleHref;

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

for (const copyButton of document.querySelectorAll(".copy-command")) {
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
}

window.addEventListener("pagehide", () => {
  cancelAnimationFrame(frameId);
  renderer.dispose();
});
