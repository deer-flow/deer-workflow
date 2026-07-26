import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

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
deerPivot.position.y = 0.48;
core.add(deerPivot);

const deerGhostMaterial = new THREE.MeshPhysicalMaterial({
  color: dark,
  emissive: new THREE.Color("#28370d"),
  emissiveIntensity: 0.48,
  metalness: 0.18,
  roughness: 0.48,
  clearcoat: 1,
  clearcoatRoughness: 0.36,
  flatShading: true,
  transparent: true,
  opacity: 0.075,
  depthWrite: false,
});

const deerEdgeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    varying float vFlow;

    void main() {
      vFlow = position.x * 0.28 + position.y * 0.22 + position.z * 0.16;
      gl_Position =
        projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying float vFlow;
    uniform float uTime;

    vec3 hueToRgb(float hue) {
      vec3 rgb = clamp(
        abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
        0.0,
        1.0
      );
      return rgb * rgb * (3.0 - 2.0 * rgb);
    }

    void main() {
      float hue = fract(vFlow + uTime * 0.025);
      vec3 rainbow = hueToRgb(hue);
      vec3 color = mix(rainbow, vec3(0.93, 1.0, 0.78), 0.18);
      gl_FragColor = vec4(color, 0.48);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const deerParticleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    attribute float aPhase;
    attribute float aSize;
    attribute float aMix;
    attribute float aSpeed;
    attribute vec3 aTarget;
    varying float vMix;
    varying float vAlpha;
    varying float vStreak;
    varying float vAccent;

    uniform float uTime;

    void main() {
      vec2 flowDirection = normalize(vec2(0.78, 1.0));
      float life = fract(
        aPhase / 6.2831853 + uTime * (0.065 + aSpeed * 0.065)
      );
      float envelope = sin(life * 3.1415926);
      float progress = life * life * (3.0 - 2.0 * life);
      vec3 displaced = mix(position, aTarget, progress);
      float diagonal = dot(displaced.xy, flowDirection);
      float stream = pow(
        0.5 + 0.5 * sin(
          diagonal * 7.0 - uTime * 0.55 + aMix * 0.8
        ),
        5.0
      );
      float surfacePulse =
        sin(uTime * 0.72 + displaced.y * 3.8 + aPhase) * 0.012;
      displaced += normal * surfacePulse;

      vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
      gl_Position = projectionMatrix * viewPosition;
      gl_PointSize = clamp(
        aSize * (210.0 / -viewPosition.z) * (0.8 + stream * 2.6),
        1.0,
        10.0
      );

      vMix = fract(aMix * 0.78 + life * 0.34);
      vAlpha = envelope * (0.34 + stream * 0.66);
      vStreak = stream;
      vAccent = step(0.94, aMix) * (0.35 + stream * 0.65);
    }
  `,
  fragmentShader: `
    varying float vMix;
    varying float vAlpha;
    varying float vStreak;
    varying float vAccent;

    void main() {
      vec2 point = gl_PointCoord - vec2(0.5);
      float along = (point.x + point.y) * 0.7071067;
      float across = (point.y - point.x) * 0.7071067;
      float dotShape = 1.0 - smoothstep(0.08, 0.5, length(point));
      float streakShape =
        (1.0 - smoothstep(0.04, 0.17, abs(across))) *
        (1.0 - smoothstep(0.28, 0.52, abs(along)));
      float particle = mix(dotShape, streakShape, vStreak);
      vec3 paper = vec3(0.941, 0.933, 0.902);
      vec3 acid = vec3(0.851, 1.0, 0.337);
      vec3 ice = vec3(0.365, 0.82, 1.0);
      vec3 coral = vec3(1.0, 0.42, 0.62);
      vec3 color =
        vMix < 0.5
          ? mix(ice, acid, vMix * 2.0)
          : mix(acid, paper, (vMix - 0.5) * 2.0);
      color = mix(color, coral, vAccent);

      gl_FragColor = vec4(color, particle * vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const deerFillMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    attribute float aPhase;
    attribute float aSize;
    attribute float aMix;
    varying float vMix;
    varying float vAlpha;

    uniform float uTime;

    void main() {
      vec3 displaced =
        position + normal * sin(uTime * 0.38 + aPhase) * 0.006;
      vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
      gl_Position = projectionMatrix * viewPosition;
      gl_PointSize = clamp(
        aSize * (185.0 / -viewPosition.z) * 1.35,
        1.25,
        5.5
      );

      vMix = aMix;
      vAlpha = 0.42 + 0.18 * sin(uTime * 0.45 + aPhase);
    }
  `,
  fragmentShader: `
    varying float vMix;
    varying float vAlpha;

    void main() {
      float distanceToCenter = length(gl_PointCoord - vec2(0.5));
      float particle = 1.0 - smoothstep(0.12, 0.5, distanceToCenter);
      vec3 inkBlue = vec3(0.18, 0.46, 0.52);
      vec3 ice = vec3(0.365, 0.82, 1.0);
      vec3 acid = vec3(0.851, 1.0, 0.337);
      vec3 paper = vec3(0.941, 0.933, 0.902);
      vec3 color =
        vMix < 0.4
          ? mix(inkBlue, ice, vMix / 0.4)
          : mix(acid, paper, (vMix - 0.4) / 0.6);

      gl_FragColor = vec4(color, particle * vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
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
      mesh.material = deerGhostMaterial;

      const particleCount = window.innerWidth < 720 ? 12000 : 24000;
      const positions = new Float32Array(particleCount * 3);
      const targets = new Float32Array(particleCount * 3);
      const normals = new Float32Array(particleCount * 3);
      const phases = new Float32Array(particleCount);
      const sizes = new Float32Array(particleCount);
      const mixes = new Float32Array(particleCount);
      const speeds = new Float32Array(particleCount);
      const sampler = new MeshSurfaceSampler(mesh).build();
      const sampledPosition = new THREE.Vector3();
      const sampledNormal = new THREE.Vector3();
      const targetPosition = new THREE.Vector3();
      const candidatePosition = new THREE.Vector3();
      const candidateNormal = new THREE.Vector3();
      const flowX = 0.615;
      const flowY = 0.788;

      for (let index = 0; index < particleCount; index += 1) {
        sampler.sample(sampledPosition, sampledNormal);
        const offset = index * 3;
        targetPosition.copy(sampledPosition);
        let bestAdvance = 0;

        for (let attempt = 0; attempt < 12; attempt += 1) {
          sampler.sample(candidatePosition, candidateNormal);
          const deltaX = candidatePosition.x - sampledPosition.x;
          const deltaY = candidatePosition.y - sampledPosition.y;
          const advance = deltaX * flowX + deltaY * flowY;
          const distance = candidatePosition.distanceTo(sampledPosition);

          if (advance > bestAdvance && distance < 1.15) {
            bestAdvance = advance;
            targetPosition.copy(candidatePosition);
          }

          if (advance > 0.16 && distance < 0.72) {
            targetPosition.copy(candidatePosition);
            break;
          }
        }

        positions[offset] = sampledPosition.x;
        positions[offset + 1] = sampledPosition.y;
        positions[offset + 2] = sampledPosition.z;
        targets[offset] = targetPosition.x;
        targets[offset + 1] = targetPosition.y;
        targets[offset + 2] = targetPosition.z;
        normals[offset] = sampledNormal.x;
        normals[offset + 1] = sampledNormal.y;
        normals[offset + 2] = sampledNormal.z;
        phases[index] = Math.random() * Math.PI * 2;
        sizes[index] = 0.055 + Math.random() * 0.11;
        mixes[index] = Math.random();
        speeds[index] = Math.random();
      }

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      particleGeometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(normals, 3),
      );
      particleGeometry.setAttribute(
        "aTarget",
        new THREE.BufferAttribute(targets, 3),
      );
      particleGeometry.setAttribute(
        "aPhase",
        new THREE.BufferAttribute(phases, 1),
      );
      particleGeometry.setAttribute(
        "aSize",
        new THREE.BufferAttribute(sizes, 1),
      );
      particleGeometry.setAttribute(
        "aMix",
        new THREE.BufferAttribute(mixes, 1),
      );
      particleGeometry.setAttribute(
        "aSpeed",
        new THREE.BufferAttribute(speeds, 1),
      );

      const particles = new THREE.Points(
        particleGeometry,
        deerParticleMaterial,
      );
      particles.renderOrder = 2;
      mesh.add(particles);

      const fillParticles = new THREE.Points(
        particleGeometry,
        deerFillMaterial,
      );
      fillParticles.renderOrder = 1;
      mesh.add(fillParticles);

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
const cameraPointer = { x: 0, y: 0 };
const orbitControl = {
  dragging: false,
  lastX: 0,
  lastY: 0,
  yaw: 0,
  pitch: 0,
  zoom: 0,
  targetYaw: 0,
  targetPitch: 0,
  targetZoom: 0,
};
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
  deerParticleMaterial.uniforms.uTime.value = ambient;
  deerFillMaterial.uniforms.uTime.value = ambient;
  deerEdgeMaterial.uniforms.uTime.value = ambient;

  cameraPointer.x += (pointer.x - cameraPointer.x) * 0.045;
  cameraPointer.y += (pointer.y - cameraPointer.y) * 0.045;
  orbitControl.yaw += (orbitControl.targetYaw - orbitControl.yaw) * 0.075;
  orbitControl.pitch += (orbitControl.targetPitch - orbitControl.pitch) * 0.075;
  orbitControl.zoom += (orbitControl.targetZoom - orbitControl.zoom) * 0.065;

  const orbitAngle =
    Math.sin(ambient * 0.09) * 0.16 + orbitControl.yaw + cameraPointer.x * 0.1;
  const orbitRadius =
    9.15 +
    Math.sin(ambient * 0.075) * 0.82 +
    orbitControl.zoom +
    cameraPointer.y * 0.12;
  camera.position.set(
    Math.sin(orbitAngle) * orbitRadius,
    0.12 +
      Math.cos(ambient * 0.06) * 0.34 +
      Math.sin(orbitControl.pitch) * orbitRadius * 0.72 -
      cameraPointer.y * 0.5,
    Math.cos(orbitAngle) * orbitRadius,
  );
  camera.lookAt(0, 0.12 + cameraPointer.y * 0.08, 0);

  core.rotation.y +=
    (pointer.x * 0.15 + Math.sin(ambient * 0.05) * 0.04 - core.rotation.y) *
    0.035;
  core.rotation.x +=
    (-pointer.y * 0.24 + Math.sin(ambient * 0.3) * 0.08 - core.rotation.x) *
    0.035;
  deerPivot.position.y = 0.48 + Math.sin(ambient * 0.7) * 0.045;
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

  if (!orbitControl.dragging) return;

  const deltaX = event.clientX - orbitControl.lastX;
  const deltaY = event.clientY - orbitControl.lastY;
  orbitControl.targetYaw = THREE.MathUtils.clamp(
    orbitControl.targetYaw + deltaX * 0.0045,
    -0.52,
    0.52,
  );
  orbitControl.targetPitch = THREE.MathUtils.clamp(
    orbitControl.targetPitch - deltaY * 0.0045,
    -0.4,
    0.4,
  );
  orbitControl.lastX = event.clientX;
  orbitControl.lastY = event.clientY;
}

visual.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch" || event.button !== 0) return;
  orbitControl.dragging = true;
  orbitControl.lastX = event.clientX;
  orbitControl.lastY = event.clientY;
  visual.setPointerCapture(event.pointerId);
  visual.classList.add("is-orbiting");
});
visual.addEventListener("pointermove", updatePointer, { passive: true });

function endOrbit(event) {
  if (!orbitControl.dragging) return;
  orbitControl.dragging = false;
  if (visual.hasPointerCapture(event.pointerId)) {
    visual.releasePointerCapture(event.pointerId);
  }
  visual.classList.remove("is-orbiting");
}

visual.addEventListener("pointerup", endOrbit);
visual.addEventListener("pointercancel", endOrbit);
visual.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    orbitControl.targetZoom = THREE.MathUtils.clamp(
      orbitControl.targetZoom + event.deltaY * 0.003,
      -2.15,
      2.8,
    );
  },
  { passive: false },
);
visual.addEventListener("pointerleave", () => {
  if (orbitControl.dragging) return;
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
    exampleLabel: "CREATE & RUN",
    exampleTitle: "Create one.<br><em>Run deep-research.</em>",
    exampleIntro:
      "Generate a Workflow from one sentence, or run the bundled Deep Research example from the repository root.",
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
    eyebrow: "程序稳定性 × Agent 主动性",
    heroTitle: "让代码驱动<br>流程。<span>Agent 负责<br>判断。</span>",
    heroIntro:
      "Dynamic Workflow 用 TypeScript 写清顺序、并发与停止规则；只有需要理解与判断时，才启动完整的 Agent Loop。",
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
    whyTitle: "机械步骤，<br><em>不必反复问模型。</em>",
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
    exampleLabel: "创建并运行 WORKFLOW",
    exampleTitle: "一句话创建。<br><em>一条命令运行。</em>",
    exampleIntro:
      "用一句话生成 Workflow，或者直接在仓库根目录运行内置的 Deep Research 示例。",
    openExample: "查看示例源码",
    exampleHref:
      "https://github.com/deerwork-ai/deer-workflow/tree/main/examples/deep-research",
    buildLabel: "Workflow 就是一段代码",
    buildTitle: "编排就是代码。<br>判断才交给 agent()。",
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
