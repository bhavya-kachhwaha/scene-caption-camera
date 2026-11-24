import { loadVisionTasks } from "./mediapipe.mjs";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

const WORDS = new Map([
  ["Victory", "Use"],
  ["Open_Palm", "Technology"],
  ["Pointing_Up", "For"],
  ["Thumb_Up", "Help"],
  ["Horns", "Not"],
  ["Closed_Fist", "War"],
  ["ILoveYou", "I love you"],
]);

export const FINISH = "Speak sequence";

export async function loadRecognizer() {
  const { sdk, fileset } = await loadVisionTasks();
  return sdk.GestureRecognizer.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
    runningMode: "VIDEO",
    numHands: 2,
  });
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
}

function fingerExtension(hand, base, middle, tip) {
  const direct = distance(hand[base], hand[tip]);
  const path = distance(hand[base], hand[middle]) + distance(hand[middle], hand[tip]);
  return direct / path;
}

function isHorns(hand) {
  if (!hand || hand.length !== 21) return false;
  const thumbTucked = distance(hand[4], hand[17]) < distance(hand[5], hand[17]) * 1.05;
  return thumbTucked &&
    fingerExtension(hand, 5, 6, 8) > 0.9 &&
    fingerExtension(hand, 17, 18, 20) > 0.9 &&
    fingerExtension(hand, 9, 10, 12) < 0.88 &&
    fingerExtension(hand, 13, 14, 16) < 0.88;
}

export function readPose(result) {
  const hands = result.landmarks.length;
  const poses = result.landmarks.map((_, index) => {
    const top = result.gestures[index]?.[0];
    if (top?.categoryName === "ILoveYou" && top.score >= 0.6) return "ILoveYou";
    if (isHorns(result.worldLandmarks?.[index])) return "Horns";
    return top?.score >= 0.6 ? top.categoryName : null;
  });
  if (hands === 2 && poses.every(pose => pose === "Open_Palm")) {
    return { hands, candidate: FINISH };
  }
  return { hands, candidate: hands === 1 ? WORDS.get(poses[0]) ?? null : null };
}

export class PoseHold {
  reset() {
    this.candidate = null;
    this.startedAt = 0;
    this.lastSample = null;
    this.wordLocked = false;
    this.finishLocked = false;
    this.releasedAt = null;
  }

  constructor() {
    this.reset();
  }

  update({ hands, candidate }, now) {
    if (this.lastSample !== null && now - this.lastSample > 400) {
      this.candidate = null;
      this.releasedAt = null;
    }
    this.lastSample = now;

    if (hands === 0) {
      this.releasedAt ??= now;
      if (now - this.releasedAt >= 350) this.wordLocked = false;
    } else {
      this.releasedAt = null;
    }
    if (candidate !== FINISH) this.finishLocked = false;

    const locked = candidate === FINISH ? this.finishLocked : this.wordLocked;
    if (locked || !candidate) {
      this.candidate = null;
      return { progress: 0, accepted: null, locked };
    }
    if (candidate !== this.candidate) {
      this.candidate = candidate;
      this.startedAt = now;
    }

    const progress = Math.min(1, (now - this.startedAt) / (candidate === FINISH ? 2000 : 1500));
    if (progress < 1) return { progress, accepted: null, locked: false };
    if (candidate === FINISH) this.finishLocked = true;
    else this.wordLocked = true;
    return { progress: 1, accepted: candidate, locked: false };
  }
}

export function sequenceText(words) {
  const sentence = words.join(" ").toLowerCase();
  if (!sentence) return "";
  if (sentence === "use technology for help not war") return "Use technology to help people, not for war.";
  const withPronouns = sentence.replace(/\bi\b/g, "I");
  return withPronouns[0].toUpperCase() + withPronouns.slice(1) + ".";
}
