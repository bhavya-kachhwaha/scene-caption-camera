import { SAMPLE_HEIGHT, SAMPLE_WIDTH, detectMotion, luma } from "./motion.mjs";
import { FINISH, PoseHold, loadRecognizer, readPose, sequenceText } from "./gestures.mjs";
import { ParticleArtwork, loadPersonSegmenter } from "./particle-art.mjs";
import { loadObjectDetector, placeLabel, projectBox, readObjects, trackObjects } from "./object-detection.mjs";

const get = id => document.getElementById(id);
const studio = get("studio");
const tabs = [...document.querySelectorAll('[role="tab"]')];
const video = get("video");
const overlay = get("overlay");
const paint = overlay.getContext("2d");
const sample = document.createElement("canvas");
sample.width = SAMPLE_WIDTH;
sample.height = SAMPLE_HEIGHT;
const sampleContext = sample.getContext("2d", { willReadFrequently: true });
const frame = document.createElement("canvas");
const frameContext = frame.getContext("2d", { willReadFrequently: true });
const artworkCanvas = get("artwork");
const animateArtwork = get("art-animate");
const highlightMotion = get("art-show-motion");
const objectMode = get("detect-objects");
const confidence = get("confidence");
const showBoxes = get("show-boxes");
animateArtwork.checked = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let mode = "motion";
let stream = null;
let cameraSession = 0;
let animation = null;
let lastVideoTime = -1;
let lastAnalysis = -Infinity;
let previousFrame = null;
let lastMotion = null;
let lastMotionAt = -Infinity;
let lastObjects = [];
let objectBusy = false;
let objectSession = 0;

const objectTask = { load: loadObjectDetector, refresh: updateObjects, model: null, status: "idle" };
const handTask = { load: loadRecognizer, refresh: updateHandStatus, model: null, status: "idle" };
const personTask = { load: loadPersonSegmenter, refresh: updateArtworkStatus, model: null, status: "idle" };

let artwork;
let demoSilhouette = false;
let artDirty = true;
let lastArtDraw = -Infinity;
let artPoints = 0;

const hold = new PoseHold();
const words = [];

let captionWorker = null;
let captionJob = 0;
let captionBusy = false;
let nextCaptionAt = 0;
let lastCaption = "";
const commonObjects = [
  "bag", "bottle", "book", "burger", "car", "cat", "chair", "computer", "cup", "desk", "dog",
  "glass", "hamburger", "keyboard", "laptop", "monitor", "mug", "phone", "plate", "sandwich", "table", "television", "window",
];
const commonActions = ["drinking", "eating", "holding", "reading", "sitting", "standing", "typing", "walking"];

function setText(id, value) {
  const element = get(id);
  if (element.textContent !== value) element.textContent = value;
}

function cameraReady() {
  return Boolean(stream && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth);
}

function selectMode(next) {
  if (mode === next) return;
  if (mode === "scene") cancelCaption();
  mode = next;
  studio.dataset.mode = next;
  if (next === "art") artwork ??= new ParticleArtwork(artworkCanvas);
  artworkCanvas.hidden = next !== "art";
  get("stage").classList.toggle("is-art", next === "art");
  get("placeholder").hidden = next === "art" || get("stage").classList.contains("is-live");
  setText("camera-title", next === "art" ? "Particle landscape" : "Live camera preview");
  for (const tab of tabs) {
    const active = tab.dataset.mode === next;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    get(tab.getAttribute("aria-controls")).hidden = !active;
  }
  resetAnalysis();
  scheduleFrame();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectMode(tab.dataset.mode));
  tab.addEventListener("keydown", event => {
    const steps = { ArrowLeft: -1, ArrowRight: 1 };
    let destination;
    if (event.key in steps) destination = (index + steps[event.key] + tabs.length) % tabs.length;
    else if (event.key === "Home") destination = 0;
    else if (event.key === "End") destination = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[destination].focus();
    selectMode(tabs[destination].dataset.mode);
  });
});

function showCameraState(state, error = "") {
  const live = state === "live";
  const pending = state === "pending";
  const button = get("camera-toggle");
  get("camera-status").dataset.state = state;
  get("stage").classList.toggle("is-live", live);
  overlay.hidden = !live;
  get("placeholder").hidden = live || mode === "art";
  button.classList.toggle("is-live", live);
  button.disabled = pending;
  setText("camera-toggle", live ? "Stop camera" : pending ? "Connecting…" : "Start camera");
  setText("camera-state", live ? "Camera on" : pending ? "Waiting for access" : error ? "Camera unavailable" : "Camera off");
  setText("placeholder-title", pending ? "Waiting for camera access" : error ? "Camera unavailable" : "Camera is off");
  setText("placeholder-detail", pending ? "Allow camera access in your browser." : error ? "Start the camera again after checking access." : "Start your camera to see a live preview.");
  get("camera-error").hidden = !error;
  setText("camera-error", error);
}

function cameraError(error) {
  switch (error.name) {
    case "NotAllowedError": return "Camera access was denied. Allow camera access in your browser and system settings, then try again.";
    case "NotFoundError": return "No webcam was found. Connect or enable a camera, then try again.";
    case "NotReadableError": return "The camera could not start. Close other apps using the camera and try again.";
    default: return "The camera could not start. Check your connection and camera settings, then try again.";
  }
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraState("error", "Camera access needs a supported browser on localhost or HTTPS.");
    return;
  }
  const session = ++cameraSession;
  showCameraState("pending");
  try {
    const source = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    if (session !== cameraSession) {
      source.getTracks().forEach(track => track.stop());
      return;
    }
    stream = source;
    for (const track of source.getVideoTracks()) {
      track.addEventListener("ended", () => {
        if (stream === source) stopCamera("The webcam disconnected. Reconnect it and try again.");
      });
    }
    video.srcObject = source;
    await video.play();
    if (session !== cameraSession) return;
    demoSilhouette = false;
    showCameraState("live");
    resetAnalysis();
    scheduleFrame();
  } catch (error) {
    if (session === cameraSession) stopCamera(cameraError(error));
  }
}

function stopCamera(error = "") {
  cameraSession++;
  if (animation !== null) cancelAnimationFrame(animation);
  animation = null;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  cancelCaption();
  clearSpeech();
  showCameraState(error ? "error" : "off", error);
  resetAnalysis();
  scheduleFrame();
}

function resetAnalysis() {
  lastVideoTime = -1;
  lastAnalysis = -Infinity;
  lastMotion = null;
  lastMotionAt = -Infinity;
  previousFrame = null;
  lastObjects = [];
  objectSession++;
  artwork?.reset();
  artDirty = true;
  artPoints = 0;
  hold.reset();
  paint.clearRect(0, 0, overlay.width, overlay.height);
  setText("motion-state", cameraReady() ? "Sampling the scene…" : "Waiting for camera");
  setText("motion-regions", "—");
  setText("motion-area", "—");
  get("gesture-progress").value = 0;
  updateObjects();
  updateHandStatus();
  updateArtworkStatus();
  updateCaptionControls();
  nextCaptionAt = 0;
}

function updateHandStatus() {
  const ready = cameraReady();
  get("retry-gestures").hidden = !ready || handTask.status !== "error";
  if (mode === "gesture" && ready && handTask.status === "idle") void prepareVision(handTask);
  setText("gesture-state", !ready ? "Waiting for camera" : handTask.status === "error" ? "Hand model unavailable" :
    handTask.status === "loading" ? "Loading hand model…" : "Show one hand");
}

async function prepareVision(task) {
  if (task.status === "loading") return;
  task.status = "loading";
  task.refresh();
  try {
    task.model = await task.load();
  } catch (error) {
    failVision(task, error);
    return;
  }
  task.status = "ready";
  task.refresh();
}

function failVision(task, error) {
  console.error("Vision model failed", error);
  task.model?.close();
  task.model = null;
  task.status = "error";
  task.refresh();
}

function tick(now) {
  animation = null;
  if (mode === "art") {
    processArtwork(now);
  } else if (cameraReady()) {
    if (mode === "scene") {
      if (get("auto-caption").checked && !captionBusy && now >= nextCaptionAt) describeFrame();
    } else {
      const interval = mode === "gesture" ? 85 : objectMode.checked ? 180 : 110;
      if (now - lastAnalysis >= interval && video.currentTime !== lastVideoTime) {
        lastAnalysis = now;
        lastVideoTime = video.currentTime;
        if (mode === "motion" && !objectMode.checked) processMotion(now);
        if (mode === "motion" && objectMode.checked && objectTask.model) void processObjects(now);
        if (mode === "gesture" && handTask.model) processGesture(now);
      }
    }
  }
  scheduleFrame();
}

function scheduleFrame() {
  const needsArtwork = mode === "art" && (artDirty || animateArtwork.checked);
  if (animation === null && (stream || needsArtwork)) animation = requestAnimationFrame(tick);
}

function updateArtworkStatus() {
  const ready = cameraReady();
  const demo = get("art-demo");
  demo.disabled = ready;
  demo.setAttribute("aria-pressed", String(demoSilhouette));
  get("retry-art").hidden = !ready || personTask.status !== "error";
  setText("art-points", artPoints.toLocaleString() + " silhouette particles");
  const movement = artwork?.motion;
  setText("art-motion", !ready ? "Start the camera to measure movement." : !movement ?
    "Waiting for two silhouette frames." : movement.percent >= 1 ?
    "Body motion · " + movement.percent.toFixed(1) + "%" : "No body motion");
  if (mode !== "art") return;
  if (ready && personTask.status === "idle") void prepareVision(personTask);
  if (!ready) setText("art-state", demoSilhouette ? "Demo silhouette" : "Camera or demo");
  else if (personTask.status === "error") setText("art-state", "Person model unavailable");
  else if (personTask.status === "loading") setText("art-state", "Loading person model…");
  else if (artPoints) setText("art-state", "Live silhouette");
  else setText("art-state", "Step into the camera frame");
}

function processArtwork(now) {
  const ready = cameraReady();
  if (ready && personTask.model && now - lastAnalysis >= 140 && video.currentTime !== lastVideoTime) {
    lastAnalysis = now;
    lastVideoTime = video.currentTime;
    try {
      artwork.capture(personTask.model, video, now);
    } catch (error) {
      artwork.reset();
      failVision(personTask, error);
    }
    artDirty = true;
  }
  const animate = animateArtwork.checked;
  if ((!animate && !artDirty) || now - lastArtDraw < 1000 / 30) return;
  lastArtDraw = now;
  artDirty = false;
  artPoints = artwork.draw(animate ? now / 1000 : 0, Number(get("art-wind").value) / 100,
    demoSilhouette && !ready, get("mirror").checked, highlightMotion.checked);
  updateArtworkStatus();
}

function fitOverlay() {
  const { clientWidth: width, clientHeight: height } = overlay;
  const density = Math.min(2, window.devicePixelRatio || 1);
  const pixelsWide = Math.round(width * density);
  const pixelsHigh = Math.round(height * density);
  if (pixelsWide !== overlay.width || pixelsHigh !== overlay.height) {
    overlay.width = pixelsWide;
    overlay.height = pixelsHigh;
  }
  paint.setTransform(density, 0, 0, density, 0, 0);
  paint.clearRect(0, 0, width, height);
  const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
  const imageWidth = video.videoWidth * scale;
  const imageHeight = video.videoHeight * scale;
  return { x: (width - imageWidth) / 2, y: (height - imageHeight) / 2, width: imageWidth, height: imageHeight };
}

function processMotion(now) {
  sampleContext.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  const current = luma(sampleContext.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data);
  if (!previousFrame) {
    previousFrame = current;
    return;
  }
  const motion = detectMotion(previousFrame, current, Number(get("sensitivity").value));
  previousFrame = current;
  if (motion.regions.length) {
    lastMotion = motion;
    lastMotionAt = now;
  } else if (now - lastMotionAt > 420) {
    lastMotion = null;
  }
  setText("motion-state", lastMotion ? "Motion detected" : "No motion");
  setText("motion-regions", String(lastMotion?.regions.length ?? 0));
  setText("motion-area", (lastMotion?.percent ?? 0).toFixed(1) + "%");

  const view = fitOverlay();
  if (!lastMotion || !showBoxes.checked) return;
  const mirrored = get("mirror").checked;
  for (const region of lastMotion.regions) {
    strokeBox(projectBox(region, view, mirrored), "#a5eecf");
  }
}

async function processObjects(now) {
  if (objectBusy) return;
  objectBusy = true;
  const session = objectSession;
  const { videoWidth, videoHeight } = video;
  try {
    const { detections } = await objectTask.model.detectForVideo(video, now);
    if (session !== objectSession) return;
    lastObjects = trackObjects(lastObjects, readObjects(detections, videoWidth, videoHeight), now);
  } catch (error) {
    lastObjects = [];
    failVision(objectTask, error);
    return;
  } finally {
    objectBusy = false;
  }
  updateObjects();
}

function updateObjects() {
  const ready = cameraReady();
  const active = mode === "motion" && objectMode.checked;
  if (ready && active && objectTask.status === "idle") {
    void prepareVision(objectTask);
    return;
  }

  const objects = lastObjects.filter(object => object.seen === 2 && object.score >= Number(confidence.value) / 100);
  const list = get("object-results");
  list.replaceChildren();
  for (const { label, score, color } of objects) {
    const item = document.createElement("li");
    item.style.setProperty("--object-color", color);
    const name = document.createElement("span");
    name.textContent = label;
    const value = document.createElement("span");
    value.textContent = score.toFixed(2);
    item.append(name, value);
    list.append(item);
  }

  const failed = ready && objectTask.status === "error";
  get("retry-objects").hidden = !failed;
  setText("object-count", ready && objectTask.model ? String(objects.length) : "—");
  const state = get("object-state");
  state.hidden = Boolean(objects.length);
  setText("object-state", !ready ? "Start the camera to scan for objects." :
    failed ? "Object model unavailable." : objectTask.status === "loading" ? "Loading object model…" :
    "No objects above this confidence.");

  if (!ready || !active) return;
  const view = fitOverlay();
  if (!showBoxes.checked) return;
  const mirrored = get("mirror").checked;
  const boxes = objects.map(object => projectBox(object, view, mirrored));
  boxes.forEach((box, index) => strokeBox(box, objects[index].color));
  const labels = [];
  boxes.forEach((box, index) => drawObjectLabel(objects[index], view, box, labels));
}

function strokeBox(box, color) {
  paint.strokeStyle = "#0d181d";
  paint.lineWidth = 4;
  paint.strokeRect(...box);
  paint.strokeStyle = color;
  paint.lineWidth = 2;
  paint.strokeRect(...box);
}

function drawObjectLabel(object, view, box, labels) {
  const text = object.label + " " + object.score.toFixed(2);
  const labelHeight = 20;
  paint.font = "600 13px ui-monospace, monospace";
  paint.textBaseline = "middle";
  const labelWidth = Math.min(view.width, Math.ceil(paint.measureText(text).width) + 12);
  const label = placeLabel(box, labelWidth, labelHeight, view, labels);
  labels.push(label);
  paint.fillStyle = object.color;
  paint.fillRect(label.x, label.y, labelWidth, labelHeight);
  paint.fillStyle = "#0d181d";
  paint.fillText(text, label.x + 6, label.y + labelHeight / 2, labelWidth - 12);
}

const handPaths = [
  [0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12],
  [9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [17, 0],
];

function processGesture(now) {
  let result;
  try {
    result = handTask.model.recognizeForVideo(video, now);
  } catch (error) {
    hold.reset();
    get("gesture-progress").value = 0;
    paint.clearRect(0, 0, overlay.width, overlay.height);
    failVision(handTask, error);
    return;
  }
  const pose = readPose(result);
  if (pose.candidate === FINISH && !words.length) pose.candidate = null;
  const { progress, accepted, locked } = hold.update(pose, now);
  get("gesture-progress").value = progress;
  if (accepted === FINISH) {
    speak(sequenceText(words), "gesture");
    setText("gesture-state", "Sequence ready");
  } else if (accepted) {
    words.push(accepted);
    updateWords();
    if (get("speak-each").checked) speak(accepted, "gesture");
    setText("gesture-state", accepted + " added");
  } else if (locked) {
    setText("gesture-state", pose.candidate === FINISH ? "Sequence ready" : "Lower your hand for the next pose");
  } else if (pose.candidate) {
    setText("gesture-state", "Hold · " + pose.candidate);
  } else {
    setText("gesture-state", pose.hands ? "Try a supported pose" : "Show one hand");
  }

  const view = fitOverlay();
  const mirrored = get("mirror").checked;
  paint.strokeStyle = "#f0ca8b";
  paint.lineWidth = 2;
  paint.lineJoin = "round";
  for (const hand of result.landmarks) {
    for (const path of handPaths) {
      paint.beginPath();
      for (const index of path) {
        const { x, y } = hand[index];
        paint.lineTo(view.x + (mirrored ? 1 - x : x) * view.width, view.y + y * view.height);
      }
      paint.stroke();
    }
  }
}

function updateWords() {
  const list = get("words");
  const item = document.createElement("li");
  if (!words.length) {
    list.replaceChildren();
  } else {
    item.textContent = words.at(-1);
    list.append(item);
  }
  get("no-words").hidden = Boolean(words.length);
  get("speak-words").disabled = !words.length;
  get("clear-words").disabled = !words.length;
}

function clearSpeech() {
  window.speechSynthesis?.cancel();
  get("gesture-speech").hidden = true;
  get("scene-speech").hidden = true;
}

function speak(text, source) {
  if (!text) return;
  clearSpeech();
  const message = get(source + "-speech");
  const showError = () => {
    message.textContent = "Speech is unavailable. Check your browser’s voice settings and try the speak button.";
    message.hidden = false;
  };
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    showError();
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = window.speechSynthesis.getVoices().find(item => item.localService && item.lang.startsWith("en"));
    utterance.lang = voice?.lang ?? "en-US";
    if (voice) utterance.voice = voice;
    utterance.onerror = ({ error }) => {
      if (error !== "canceled" && error !== "interrupted") showError();
    };
    window.speechSynthesis.speak(utterance);
  } catch {
    showError();
  }
}

function updateCaptionControls() {
  get("caption-frame").disabled = !cameraReady() || captionBusy;
  get("speak-caption").disabled = !lastCaption;
  if (!captionBusy) {
    setText("caption-status", cameraReady() ? "Ready to capture a frame." : "Start your camera to capture a frame.");
  }
}

function cancelCaption() {
  if (captionBusy) {
    captionWorker?.terminate();
    captionWorker = null;
    captionJob++;
  }
  captionBusy = false;
}

function captionFailed(detail) {
  console.error("Caption generation failed", detail);
  captionWorker?.terminate();
  captionWorker = null;
  captionBusy = false;
  captionJob++;
  get("auto-caption").checked = false;
  updateCaptionControls();
  setText("caption-status", "Caption unavailable. Check your connection and try Describe frame again.");
}

function describeFrame() {
  if (!cameraReady() || captionBusy || mode !== "scene") return;
  captionBusy = true;
  updateCaptionControls();
  setText("caption-status", "Preparing the caption model…");
  const id = ++captionJob;
  try {
    if (!captionWorker) {
      captionWorker = new Worker(new URL("./caption-worker.mjs", import.meta.url), { type: "module" });
      captionWorker.onmessage = ({ data }) => {
        if (data.id !== captionJob) return;
        if (data.error) {
          captionFailed(data.error);
        } else if (data.status) {
          setText("caption-status", data.status === "loading" ? "Downloading the caption model…" : "Describing the frame…");
        } else {
          captionBusy = false;
          nextCaptionAt = performance.now() + 4000;
          lastCaption = data.caption;
          setText("caption", lastCaption);
          const tokens = new Set(lastCaption.toLowerCase().match(/[a-z]+/g));
          const objects = commonObjects.filter(word => tokens.has(word) || tokens.has(word + "s") || tokens.has(word + "es"));
          const actions = commonActions.filter(word => tokens.has(word));
          get("caption-tags").hidden = !objects.length && !actions.length;
          const tags = [objects.length ? "Objects · " + objects.join(", ") : "",
            actions.length ? "Actions · " + actions.join(", ") : ""].filter(Boolean);
          setText("caption-tags", tags.join(" / "));
          updateCaptionControls();
          setText("caption-status", "Caption updated.");
        }
      };
      captionWorker.onerror = event => {
        event.preventDefault();
        captionFailed(event.message);
      };
    }

    const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
    frame.width = Math.max(1, Math.round(video.videoWidth * scale));
    frame.height = Math.max(1, Math.round(video.videoHeight * scale));
    frameContext.drawImage(video, 0, 0, frame.width, frame.height);
    const { buffer } = frameContext.getImageData(0, 0, frame.width, frame.height).data;
    captionWorker.postMessage({ id, width: frame.width, height: frame.height, buffer }, [buffer]);
  } catch (error) {
    captionFailed(error);
  }
}

get("camera-toggle").addEventListener("click", () => stream ? stopCamera() : void startCamera());
get("mirror").addEventListener("change", event => {
  video.classList.toggle("mirrored", event.target.checked);
  if (mode === "motion" && objectMode.checked) updateObjects();
  redrawArtwork();
});
video.classList.toggle("mirrored", get("mirror").checked);
get("sensitivity").addEventListener("input", event => setText("sensitivity-value", event.target.value));
for (const choice of document.querySelectorAll('input[name="detection"]')) {
  choice.addEventListener("change", () => {
    get("object-view").hidden = !objectMode.checked;
    get("motion-view").hidden = objectMode.checked;
    resetAnalysis();
  });
}
confidence.addEventListener("input", () => {
  setText("confidence-value", confidence.value + "%");
  updateObjects();
});
showBoxes.addEventListener("change", () => {
  if (objectMode.checked) updateObjects();
});
get("retry-objects").addEventListener("click", () => void prepareVision(objectTask));
get("retry-gestures").addEventListener("click", () => void prepareVision(handTask));
get("speak-words").addEventListener("click", () => speak(sequenceText(words), "gesture"));
get("clear-words").addEventListener("click", () => {
  words.length = 0;
  updateWords();
  clearSpeech();
});
get("caption-frame").addEventListener("click", describeFrame);
get("speak-caption").addEventListener("click", () => speak(lastCaption, "scene"));
get("auto-caption").addEventListener("change", () => { nextCaptionAt = 0; });
function redrawArtwork() {
  artDirty = true;
  scheduleFrame();
}
get("art-demo").addEventListener("click", () => {
  demoSilhouette = !demoSilhouette;
  updateArtworkStatus();
  redrawArtwork();
});
get("retry-art").addEventListener("click", () => void prepareVision(personTask));
get("art-wind").addEventListener("input", event => {
  setText("art-wind-value", event.target.value);
  redrawArtwork();
});
animateArtwork.addEventListener("change", redrawArtwork);
highlightMotion.addEventListener("change", redrawArtwork);
window.addEventListener("pagehide", () => stopCamera());
if (studio.dataset.mode !== mode) selectMode(studio.dataset.mode);
