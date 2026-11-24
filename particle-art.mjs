import { loadVisionTasks } from "./mediapipe.mjs";
import { luma, silhouetteMotion } from "./motion.mjs";

const WIDTH = 960;
const HEIGHT = 540;
const GROUND = 381;
const MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/1/selfie_segmenter_landscape.tflite";
const LEAF_COLORS = ["#415790", "#586eb5", "#7f80d6", "#aea1f4"];
const BODY_COLORS = ["#4967a4", "#589cec", "#91dfff", "#c5b2ff"];

export async function loadPersonSegmenter() {
  const { sdk, fileset } = await loadVisionTasks();
  return sdk.ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
    runningMode: "VIDEO",
    outputCategoryMask: false,
    outputConfidenceMasks: true,
  });
}

function randomSequence() {
  let state = 18;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function gradient(context, x, y, radius, color) {
  const glow = context.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, "transparent");
  return glow;
}

function makeLandscape() {
  const random = randomSequence();
  const stars = Array.from({ length: 136 }, () => [
    random() * WIDTH, random() * GROUND, 0.5 + random() * 1.9, random() * 6.28,
  ]);
  const grass = Array.from({ length: 1050 }, () => [
    random() * WIDTH, GROUND + random() * (HEIGHT - GROUND), 4 + random() * 27, random() * 6.28,
  ]);
  const branches = [];
  const leaves = [];
  const branch = (x, y, angle, length, thickness, depth) => {
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    const bendX = (x + endX) / 2 + (random() - 0.5) * length * 0.4;
    branches.push([x, y, endX, endY, bendX, thickness]);
    if (depth > 0) {
      for (const direction of [-1, 1]) {
        branch(endX, endY, angle + direction * (0.25 + random() * 0.65),
          length * (0.59 + random() * 0.16), thickness * 0.64, depth - 1);
      }
    }
    for (let i = 0; i < 75; i++) {
      const along = random();
      const drop = (random() ** 1.9) * (33 + length * 0.9);
      const leafX = endX - (endX - x) * along + (random() - 0.5) * 24;
      const leafY = endY - (endY - y) * along + drop;
      leaves.push([leafX, leafY, random() * 6.28, drop, i % LEAF_COLORS.length]);
    }
  };
  branch(722, GROUND + 10, -1.75, 130, 19, 0);
  for (const [x, y, angle, length] of [
    [712, 315, -2.7, 95], [704, 293, -2.15, 119], [700, 267, -1.53, 100],
    [700, 262, -0.91, 97], [706, 294, -0.35, 108], [713, 323, 0.02, 77],
  ]) {
    branch(x, y, angle, length, 7, 2);
  }
  return { stars, grass, branches, leaves };
}

function demoMask(context, seconds) {
  const { width, height } = context.canvas;
  const x = width * 0.49 + Math.sin(seconds * 1.2) * 9;
  const shoulder = height * 0.36;
  const hip = height * 0.6;
  const hand = shoulder + Math.sin(seconds * 2.1) * 14;
  context.clearRect(0, 0, width, height);
  context.fillStyle = context.strokeStyle = "#fff";
  context.lineCap = "round";
  context.beginPath();
  context.arc(x, height * 0.23, 10, 0, Math.PI * 2);
  context.fill();
  for (const [startX, startY, endX, endY, thickness] of [
    [x, shoulder, x, hip, 27],
    [x - 10, shoulder, x - 30, hip - 1, 9],
    [x + 10, shoulder, x + 34, hand, 9],
    [x - 6, hip - 1, x - 13, height * 0.9, 12],
    [x + 6, hip - 1, x + 14, height * 0.9, 12],
  ]) {
    context.beginPath();
    context.lineWidth = thickness;
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  }
  return context.getImageData(0, 0, width, height).data;
}

export class ParticleArtwork {
  constructor(canvas) {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    this.context = canvas.getContext("2d");
    this.landscape = makeLandscape();
    this.input = document.createElement("canvas");
    this.inputContext = this.input.getContext("2d", { willReadFrequently: true });
    const sample = document.createElement("canvas");
    sample.width = 164;
    sample.height = 132;
    this.demoContext = sample.getContext("2d", { willReadFrequently: true });
    this.reset();
  }

  reset() {
    this.mask = null;
    this.previousLuma = null;
    this.motion = null;
  }

  capture(segmenter, video, now) {
    const scale = Math.min(1, 320 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    if (width !== this.input.width || height !== this.input.height) {
      this.input.width = width;
      this.input.height = height;
    }
    this.inputContext.drawImage(video, 0, 0, width, height);
    const gray = luma(this.inputContext.getImageData(0, 0, width, height).data);
    const label = segmenter.getLabels().findIndex(name => /^(person|foreground)$/i.test(name));
    segmenter.segmentForVideo(this.input, now, result => {
      const masks = result.confidenceMasks;
      const mask = masks.length === 1 ? masks[0] : masks[label < 0 ? 1 : label];
      if (!mask) throw new Error("The person model did not return a foreground mask.");
      const values = mask.getAsFloat32Array().slice();
      const sameSize = this.mask?.width === mask.width && this.mask.height === mask.height &&
        mask.width === width && mask.height === height;
      this.motion = sameSize ? silhouetteMotion(this.mask.values, values, this.previousLuma, gray) : null;
      this.mask = { width: mask.width, height: mask.height, values };
      this.previousLuma = gray;
    });
  }

  draw(seconds, wind, useDemo, mirror, showMotion) {
    const { context, landscape } = this;
    const { stars, grass, branches, leaves } = landscape;
    const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#070c21");
    sky.addColorStop(0.69, "#192a52");
    sky.addColorStop(1, "#070d20");
    context.fillStyle = sky;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = gradient(context, 195, 128, 170, "#394382a0");
    context.fillRect(0, 0, WIDTH, HEIGHT);
    for (const [x, y, radius, phase] of stars) {
      context.globalAlpha = 0.35 + 0.26 * Math.sin(seconds * 1.35 + phase);
      context.fillStyle = "#c1d7ff";
      context.fillRect(x, y, radius, radius);
    }
    context.globalAlpha = 1;

    context.fillStyle = gradient(context, 195, 128, 68, "#b6a5ff4c");
    context.fillRect(125, 58, 140, 140);
    context.fillStyle = "#d3c9ff";
    context.beginPath();
    context.arc(195, 128, 26, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#1b2246";
    context.beginPath();
    context.arc(207, 117, 23, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#0a122b";
    context.beginPath();
    context.moveTo(0, GROUND + 7);
    context.bezierCurveTo(260, GROUND - 21, 555, GROUND + 27, WIDTH, GROUND - 19);
    context.lineTo(WIDTH, HEIGHT);
    context.lineTo(0, HEIGHT);
    context.fill();

    context.lineCap = "round";
    for (const [x, y, endX, endY, bendX, thickness] of branches) {
      const sway = wind * Math.sin(seconds * 1.2 + x * 0.018) * (GROUND - endY) * 0.05;
      context.strokeStyle = thickness > 10 ? "#35477d" : "#5a639e";
      context.lineWidth = thickness;
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(bendX + sway / 2, (y + endY) / 2, endX + sway, endY);
      context.stroke();
    }
    for (const [x, y, phase, drop, color] of leaves) {
      const sway = wind * Math.sin(seconds * 1.5 + x * 0.016) * (6 + drop * 0.19);
      context.globalAlpha = 0.48 + 0.23 * Math.sin(phase + seconds * 2);
      context.fillStyle = LEAF_COLORS[color];
      context.fillRect(x + sway, y, color === 3 ? 2.5 : 1.8, 2.2);
    }
    context.globalAlpha = 1;

    context.lineWidth = 1;
    for (const [x, y, length, phase] of grass) {
      const sway = Math.sin(seconds * 2 + x * 0.025) * length * 0.52 * wind;
      context.strokeStyle = phase > 4.6 ? "#465c93" : "#263862";
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x + sway / 3, y - length * 0.6, x + sway + 3, y - length);
      context.stroke();
    }
    return this.drawSilhouette(seconds, useDemo, mirror, showMotion);
  }

  drawSilhouette(seconds, useDemo, mirror, showMotion) {
    const { context, mask, demoContext } = this;
    if (!useDemo && !mask) return 0;
    const width = useDemo ? demoContext.canvas.width : mask.width;
    const height = useDemo ? demoContext.canvas.height : mask.height;
    const alpha = useDemo ? demoMask(demoContext, seconds) : mask.values;
    const scale = Math.min(560 / width, 397 / height);
    const drawnWidth = width * scale;
    const left = 345 - drawnWidth / 2;
    const top = 415 - height * scale;
    let points = 0;
    for (let y = 0; y < height * scale; y += 4) {
      const row = Math.floor(y / scale) * width;
      for (let x = 0; x < drawnWidth; x += 4) {
        const column = Math.floor(x / scale);
        const index = row + (mirror && !useDemo ? width - 1 - column : column);
        const confidence = useDemo ? alpha[index * 4 + 3] / 255 : alpha[index];
        if (confidence < 0.62) continue;
        const shimmer = Math.sin(x * 0.29 + y * 0.17 + seconds * 3.7);
        const color = Math.floor((shimmer + 1) * 1.95);
        const moving = showMotion && !useDemo && this.motion?.pixels[index];
        const size = moving ? 3.2 : color > 1 ? 2.6 : 1.7;
        context.fillStyle = moving ? "#ffd58a" : BODY_COLORS[color];
        context.globalAlpha = moving ? confidence : confidence * (0.74 + shimmer * 0.2);
        context.fillRect(left + x + shimmer, top + y + shimmer * 0.6, size, size);
        points++;
      }
    }
    context.globalAlpha = 1;
    return points;
  }
}
