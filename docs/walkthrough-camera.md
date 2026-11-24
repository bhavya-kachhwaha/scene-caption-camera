# Camera and app state

The app opens one camera stream. The mode buttons decide which feature can read the stream and which layers the page shows.

[Back to the code walkthrough](./code-walkthrough.md)

## `app.mjs`

[Open `app.mjs`](../app.mjs)

### Imports and shared state

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `import { SAMPLE_HEIGHT, SAMPLE_WIDTH, detectMotion, luma } from "./motion.mjs";` | Imports the sample size, brightness conversion, and frame comparison from the motion module. |
| 2 | `import { FINISH, PoseHold, loadRecognizer, readPose, sequenceText } from "./gestures.mjs";` | Imports the hand model loader, pose reader, timer, and speech text formatter. |
| 3 | `import { ParticleArtwork, loadPersonSegmenter } from "./particle-art.mjs";` | Imports the landscape renderer and the person segmentation model loader. |
| 4 | `import { loadObjectDetector, placeLabel, projectBox, readObjects, trackObjects } from "./object-detection.mjs";` | Imports the object worker interface, track matcher, and overlay geometry helpers. |
| 6 | `const get = id => document.getElementById(id);` | Looks up an HTML element by its unique id. |
| 7 | `const studio = get("studio");` | Saves the main element that stores the active mode for CSS. |
| 8 | `const tabs = [...document.querySelectorAll('[role="tab"]')];` | Takes a snapshot of the tab elements in their document order. |
| 9 | `const video = get("video");` | Keeps the video element that displays and supplies the real camera frames. |
| 10 | `const overlay = get("overlay");` | Finds the clear canvas layered above the video. |
| 11 | `const paint = overlay.getContext("2d");` | Gets the drawing API for motion boxes and hand outlines. |
| 12 | `const sample = document.createElement("canvas");` | Creates an offscreen canvas for small motion analysis frames. |
| 13 | `sample.width = SAMPLE_WIDTH;` | Applies the width that the motion module expects. |
| 14 | `sample.height = SAMPLE_HEIGHT;` | Applies the height that the motion module expects. |
| 15 | `const sampleContext = sample.getContext("2d", { willReadFrequently: true });` | Tells the browser that motion analysis frequently reads pixels back. |
| 16 | `const frame = document.createElement("canvas");` | Creates a separate offscreen canvas for scene caption snapshots. |
| 17 | `const frameContext = frame.getContext("2d", { willReadFrequently: true });` | Gets a context optimized for reading caption snapshot pixels. |
| 18 | `const artworkCanvas = get("artwork");` | Finds the visible canvas used by Particle artwork. |
| 19 | `const animateArtwork = get("art-animate");` | Finds the checkbox that controls decorative animation. |
| 20 | `const highlightMotion = get("art-show-motion");` | Reads the control that enables gold particles for measured body motion. |
| 21 | `const objectMode = get("detect-objects");` | Stores the radio button that selects object inference instead of frame differencing. |
| 22 | `const confidence = get("confidence");` | Stores the input that supplies the minimum object confidence. |
| 23 | `const showBoxes = get("show-boxes");` | Stores the checkbox that controls the box canvas for both detection views. |
| 24 | `animateArtwork.checked = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;` | Starts with decorative animation disabled when the operating system prefers reduced motion. |
| 26 | `let mode = "motion";` | Selects Motion detector on page load. |
| 27 | `let stream = null;` | Holds the active camera stream once access succeeds. |
| 28 | `let cameraSession = 0;` | Counts start and stop attempts so late permission results can be discarded. |
| 29 | `let animation = null;` | Holds the browser frame request id. Null means no callback is queued. |
| 30 | `let lastVideoTime = -1;` | Remembers the last analyzed video timestamp so one decoded frame is processed once. |
| 31 | `let lastAnalysis = -Infinity;` | Remembers when an analysis ran. Negative infinity makes the first frame eligible. |
| 32 | `let previousFrame = null;` | Holds the preceding grayscale sample for motion comparison. |
| 33 | `let lastMotion = null;` | Stores the most recent motion result for a short time after movement ends. |
| 34 | `let lastMotionAt = -Infinity;` | Stores when the most recent region was detected. |
| 35 | `let lastObjects = [];` | Stores the last object frame so changing a display control can redraw it immediately. |
| 36 | `let objectBusy = false;` | Tracks whether a frame is in flight to the worker. |
| 37 | `let objectSession = 0;` | Identifies the active object view and camera session for asynchronous replies. |
| 39 | `const objectTask = { load: loadObjectDetector, refresh: updateObjects, model: null, status: "idle" };` | Configures the object model and its interface refresh function. |
| 40 | `const handTask = { load: loadRecognizer, refresh: updateHandStatus, model: null, status: "idle" };` | Gives the hand model the same lifecycle with its own status and interface. |
| 41 | `const personTask = { load: loadPersonSegmenter, refresh: updateArtworkStatus, model: null, status: "idle" };` | Gives the person segmentation model its own instance and status. |
| 43 | `let artwork;` | Holds the landscape renderer after the artwork tab is first opened. |
| 44 | `let demoSilhouette = false;` | Tracks whether the built-in demo supplies the silhouette. |
| 45 | `let artDirty = true;` | Marks the artwork for repaint when a setting or mask changes. |
| 46 | `let lastArtDraw = -Infinity;` | Records the last paint time to limit the artwork draw rate. |
| 47 | `let artPoints = 0;` | Stores how many foreground points the last artwork draw placed. |
| 49 | `const hold = new PoseHold();` | Creates the timer that accepts a pose after a continuous hold. |
| 50 | `const words = [];` | Accumulates the words accepted in the current sequence. |
| 52 | `let captionWorker = null;` | Holds the browser worker that runs image captioning on a separate thread. |
| 53 | `let captionJob = 0;` | Assigns a new number to each caption request and invalidates old replies. |
| 54 | `let captionBusy = false;` | Records whether the current caption request is still in progress. |
| 55 | `let nextCaptionAt = 0;` | Stores the earliest time automatic captioning can start again. |
| 56 | `let lastCaption = "";` | Caches the latest caption for display and speech. |
| 57 | `const commonObjects = [` | Defines the list of object words the app can extract from a caption. |
| 58 | `"bag", "bottle", "book", "burger", "car", "cat", "chair", "computer", "cup", "desk", "dog",` | Lists common portable objects, furniture, and animals. |
| 59 | `"glass", "hamburger", "keyboard", "laptop", "monitor", "mug", "phone", "plate", "sandwich", "table", "television", "window",` | Adds technology, food, and other objects used by the keyword matcher. |
| 60 | `];` | Ends the array opened on line 57. |
| 61 | `const commonActions = ["drinking", "eating", "holding", "reading", "sitting", "standing", "typing", "walking"];` | Lists the action words that can become caption labels. |

### Tabs and camera messages

| Line | Source | What the line does |
| ---: | --- | --- |
| 63 | `function setText(id, value) {` | Defines a DOM text update by element id. |
| 64 | `const element = get(id);` | Finds the element to be updated. |
| 65 | `if (element.textContent !== value) element.textContent = value;` | Writes only when the text changes. This avoids repeated writes to live status elements. |
| 66 | `}` | Closes the block or callback opened on line 63. |
| 68 | `function cameraReady() {` | Defines the check for a usable camera frame. |
| 69 | `return Boolean(stream && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth);` | Requires an open stream, decoded frame data, and a nonzero source width. |
| 70 | `}` | Closes the block or callback opened on line 68. |
| 72 | `function selectMode(next) {` | Selects the next tab without opening another camera. |
| 73 | `if (mode === next) return;` | Skips resetting state if the requested mode is already active. |
| 74 | `if (mode === "scene") cancelCaption();` | Cancels a caption request that would otherwise continue after leaving the scene tab. |
| 75 | `mode = next;` | Stores the new active mode for the JavaScript frame loop. |
| 76 | `studio.dataset.mode = next;` | Exposes the new mode to CSS through the data attribute. |
| 77 | `if (next === "art") artwork ??= new ParticleArtwork(artworkCanvas);` | Builds the seeded artwork and its offscreen canvases on the first artwork visit. |
| 78 | `artworkCanvas.hidden = next !== "art";` | Displays the artwork canvas only in its own mode. |
| 79 | `get("stage").classList.toggle("is-art", next === "art");` | Lets CSS hide the video layer and viewfinder guides behind the artwork. |
| 80 | `get("placeholder").hidden = next === "art" \|\| get("stage").classList.contains("is-live");` | Hides the camera standby message when the artwork or the live camera is visible. |
| 81 | `setText("camera-title", next === "art" ? "Particle landscape" : "Live camera preview");` | Names the left pane for the visual it currently displays. |
| 82 | `for (const tab of tabs) {` | Goes through all tabs to keep their displayed and accessible states in sync. |
| 83 | `const active = tab.dataset.mode === next;` | Checks whether the current tab is the selected one. |
| 84 | `tab.setAttribute("aria-selected", String(active));` | Announces the selected tab to assistive technology. |
| 85 | `tab.tabIndex = active ? 0 : -1;` | Keeps the active tab in the normal tab order. Arrow keys handle the other tabs. |
| 86 | `get(tab.getAttribute("aria-controls")).hidden = !active;` | Shows only the panel named by the selected tab's aria-controls attribute. |
| 87 | `}` | Closes the block or callback opened on line 82. |
| 88 | `resetAnalysis();` | Clears frame data and refreshes the status of the selected feature. |
| 89 | `scheduleFrame();` | Queues the frame loop if this mode needs it. |
| 90 | `}` | Closes the block or callback opened on line 72. |
| 92 | `tabs.forEach((tab, index) => {` | Binds mouse and keyboard actions to each tab. |
| 93 | `tab.addEventListener("click", () => selectMode(tab.dataset.mode));` | Reads the clicked tab's mode and selects it. |
| 94 | `tab.addEventListener("keydown", event => {` | Adds keyboard navigation to the tab bar. |
| 95 | `const steps = { ArrowLeft: -1, ArrowRight: 1 };` | Maps the left and right arrow keys to changes in the tab index. |
| 96 | `let destination;` | Holds the destination index once a supported key is recognized. |
| 97 | `if (event.key in steps) destination = (index + steps[event.key] + tabs.length) % tabs.length;` | Wraps the arrow navigation around the first and last tab. |
| 98 | `else if (event.key === "Home") destination = 0;` | Makes Home select the first tab. |
| 99 | `else if (event.key === "End") destination = tabs.length - 1;` | Makes End select the last tab. |
| 100 | `else return;` | Leaves unrelated keys to the browser. |
| 101 | `event.preventDefault();` | Stops a handled key from also scrolling the page. |
| 102 | `tabs[destination].focus();` | Moves keyboard focus to the destination tab. |
| 103 | `selectMode(tabs[destination].dataset.mode);` | Activates the focused tab and its associated panel. |
| 104 | `});` | Closes the block or callback opened on line 94. |
| 105 | `});` | Closes the block or callback opened on line 92. |
| 107 | `function showCameraState(state, error = "") {` | Sets the visible state of the camera controls and viewfinder. |
| 108 | `const live = state === "live";` | Marks the camera as live only after the live state is passed in. |
| 109 | `const pending = state === "pending";` | Detects whether the browser is still opening the camera. |
| 110 | `const button = get("camera-toggle");` | Finds the Start camera or Stop camera button. |
| 111 | `get("camera-status").dataset.state = state;` | Exposes the state for the status dot's CSS color. |
| 112 | `get("stage").classList.toggle("is-live", live);` | Shows the video layer when the camera is live. |
| 113 | `overlay.hidden = !live;` | Keeps the transparent drawing layer hidden until the camera is live. |
| 114 | `get("placeholder").hidden = live \|\| mode === "art";` | Keeps the standby text out of the artwork and live feed. |
| 115 | `button.classList.toggle("is-live", live);` | Applies the live styling to the button while it stops the camera. |
| 116 | `button.disabled = pending;` | Blocks duplicate camera requests while permission is pending. |
| 117 | `setText("camera-toggle", live ? "Stop camera" : pending ? "Connecting…" : "Start camera");` | Sets the text for the camera action the user can take. |
| 118 | `setText("camera-state", live ? "Camera on" : pending ? "Waiting for access" : error ? "Camera unavailable" : "Camera off");` | Announces whether the camera is live, pending, unavailable, or off. |
| 119 | `setText("placeholder-title", pending ? "Waiting for camera access" : error ? "Camera unavailable" : "Camera is off");` | Sets the larger standby title according to the current state. |
| 120 | `setText("placeholder-detail", pending ? "Allow camera access in your browser." : error ? "Start the camera again after checking access." : "Start your camera to see a live preview.");` | Provides the next action for permission, a camera error, or normal startup. |
| 121 | `get("camera-error").hidden = !error;` | Displays the separate error alert only when it has a message. |
| 122 | `setText("camera-error", error);` | Writes the specific camera error into the alert. |
| 123 | `}` | Closes the block or callback opened on line 107. |
| 125 | `function cameraError(error) {` | Maps browser camera errors to steps the user can take. |
| 126 | `switch (error.name) {` | Uses the standard DOM exception name to choose an explanation. |
| 127 | `case "NotAllowedError": return "Camera access was denied. Allow camera access in your browser and system settings, then try again.";` | Explains how to recover from denied camera permission. |
| 128 | `case "NotFoundError": return "No webcam was found. Connect or enable a camera, then try again.";` | Prompts the user to connect or enable the webcam if none is available. |
| 129 | `case "NotReadableError": return "The camera could not start. Close other apps using the camera and try again.";` | Suggests releasing a webcam that the browser could not start. |
| 130 | `default: return "The camera could not start. Check your connection and camera settings, then try again.";` | Returns a general recovery message for other camera failures. |
| 131 | `}` | Closes the block or callback opened on line 126. |
| 132 | `}` | Closes the block or callback opened on line 125. |

### Start, stop, and reset

| Line | Source | What the line does |
| ---: | --- | --- |
| 134 | `async function startCamera() {` | Requests camera access asynchronously. |
| 135 | `if (!navigator.mediaDevices?.getUserMedia) {` | Detects a browser or origin where the camera API is unavailable. |
| 136 | `showCameraState("error", "Camera access needs a supported browser on localhost or HTTPS.");` | Explains the localhost or HTTPS requirement for camera access. |
| 137 | `return;` | Stops before calling a missing camera API. |
| 138 | `}` | Closes the block or callback opened on line 135. |
| 139 | `const session = ++cameraSession;` | Gives this camera attempt its own id. |
| 140 | `showCameraState("pending");` | Displays the waiting state while the browser asks for permission. |
| 141 | `try {` | Handles permission, device, and playback failures in the same startup attempt. |
| 142 | `const source = await navigator.mediaDevices.getUserMedia({` | Calls the browser camera API and waits for the returned MediaStream. |
| 143 | `video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },` | Prefers a user-facing camera and a resolution of 1280 by 720. The browser can choose other supported values. |
| 144 | `audio: false,` | Requests video without a microphone track. |
| 145 | `});` | Closes the block or callback opened on line 142. |
| 146 | `if (session !== cameraSession) {` | Checks whether a stop or a newer start happened during permission. |
| 147 | `source.getTracks().forEach(track => track.stop());` | Releases the obsolete stream immediately so its camera cannot remain active. |
| 148 | `return;` | Exits the old camera attempt. |
| 149 | `}` | Closes the block or callback opened on line 146. |
| 150 | `stream = source;` | Stores the accepted source as the app's current stream. |
| 151 | `for (const track of source.getVideoTracks()) {` | Visits each video track in the selected stream. |
| 152 | `track.addEventListener("ended", () => {` | Listens for the event the browser sends when a track ends unexpectedly. |
| 153 | `if (stream === source) stopCamera("The webcam disconnected. Reconnect it and try again.");` | Treats disconnection as an error only if the track belongs to the current stream. |
| 154 | `});` | Closes the block or callback opened on line 152. |
| 155 | `}` | Closes the block or callback opened on line 151. |
| 156 | `video.srcObject = source;` | Connects the accepted camera stream to the visible video element. |
| 157 | `await video.play();` | Waits for video playback to start before showing a live state. |
| 158 | `if (session !== cameraSession) return;` | Stops startup work if another action invalidated this attempt during playback. |
| 159 | `demoSilhouette = false;` | Switches the artwork away from the demo when the real camera starts. |
| 160 | `showCameraState("live");` | Displays the live preview and the Stop camera button. |
| 161 | `resetAnalysis();` | Clears samples and status from the previous camera session. |
| 162 | `scheduleFrame();` | Starts or reuses the frame loop. |
| 163 | `} catch (error) {` | Receives a permission, startup, or playback error. |
| 164 | `if (session === cameraSession) stopCamera(cameraError(error));` | Cleans up the current attempt and shows the user a readable error. |
| 165 | `}` | Closes the block or callback opened on line 163. |
| 166 | `}` | Closes the block or callback opened on line 134. |
| 168 | `function stopCamera(error = "") {` | Stops the camera and removes its analysis data. |
| 169 | `cameraSession++;` | Invalidates any pending camera start. |
| 170 | `if (animation !== null) cancelAnimationFrame(animation);` | Cancels an outstanding browser frame callback if one exists. |
| 171 | `animation = null;` | Clears the callback id so the schedule can restart for demo art. |
| 172 | `stream?.getTracks().forEach(track => track.stop());` | Stops every track to release the physical camera. |
| 173 | `stream = null;` | Clears the saved stream reference. |
| 174 | `video.srcObject = null;` | Detaches the source from the video element. |
| 175 | `cancelCaption();` | Cancels any unfinished caption request. |
| 176 | `clearSpeech();` | Stops current speech and clears speech alerts. |
| 177 | `showCameraState(error ? "error" : "off", error);` | Displays the error state or the normal off state. |
| 178 | `resetAnalysis();` | Clears cached motion samples, gesture progress, and the live artwork mask. |
| 179 | `scheduleFrame();` | Lets a selected artwork tab redraw its camera-free scene. |
| 180 | `}` | Closes the block or callback opened on line 168. |
| 182 | `function resetAnalysis() {` | Resets analysis state when the camera or selected mode changes. |
| 183 | `lastVideoTime = -1;` | Marks the frame timestamp as unsampled. |
| 184 | `lastAnalysis = -Infinity;` | Makes the next frame immediately eligible for processing. |
| 185 | `lastMotion = null;` | Drops the old region boxes. |
| 186 | `lastMotionAt = -Infinity;` | Clears the motion overlay timeout reference. |
| 187 | `previousFrame = null;` | Avoids comparing frames from different sessions or modes. |
| 188 | `lastObjects = [];` | Clears the last object frame when the camera or mode changes. |
| 189 | `objectSession++;` | Invalidates any result still in flight from the prior camera or mode. |
| 190 | `artwork?.reset();` | Clears current and previous silhouette samples when the renderer exists. |
| 191 | `artDirty = true;` | Marks the artwork for a fresh draw even when decorative motion is paused. |
| 192 | `artPoints = 0;` | Resets the last displayed count of silhouette particles. |
| 193 | `hold.reset();` | Clears the pose timer without removing the saved word sequence. |
| 194 | `paint.clearRect(0, 0, overlay.width, overlay.height);` | Removes every pixel from the overlay canvas. |
| 195 | `setText("motion-state", cameraReady() ? "Sampling the scene…" : "Waiting for camera");` | Shows whether motion analysis is warming up or waiting for permission. |
| 196 | `setText("motion-regions", "—");` | Blanks the region count until two frames have been compared. |
| 197 | `setText("motion-area", "—");` | Blanks the changed-area percentage until there is a comparison. |
| 198 | `get("gesture-progress").value = 0;` | Resets the hand pose progress bar. |
| 199 | `updateObjects();` | Syncs the object panel with the camera, selected view, and model state. |
| 200 | `updateHandStatus();` | Reconciles the hand model status with the new mode and camera state. |
| 201 | `updateArtworkStatus();` | Reconciles the artwork state and model download with the same change. |
| 202 | `updateCaptionControls();` | Enables caption actions only when the required inputs exist. |
| 203 | `nextCaptionAt = 0;` | Lets automatic captioning run on the first eligible frame. |
| 204 | `}` | Closes the block or callback opened on line 182. |

### Shared vision lifecycle and frame scheduling

| Line | Source | What the line does |
| ---: | --- | --- |
| 206 | `function updateHandStatus() {` | Updates gesture status and starts the model when needed. |
| 207 | `const ready = cameraReady();` | Checks whether the camera can supply an image. |
| 208 | `get("retry-gestures").hidden = !ready \|\| handTask.status !== "error";` | Offers retry for a failed hand model while a usable camera frame exists. |
| 209 | `if (mode === "gesture" && ready && handTask.status === "idle") void prepareVision(handTask);` | Starts the hand task when its tab first needs it. |
| 210 | `setText("gesture-state", !ready ? "Waiting for camera" : handTask.status === "error" ? "Hand model unavailable" :` | Shows how to start when the camera is off and identifies a failed hand model. |
| 211 | `handTask.status === "loading" ? "Loading hand model…" : "Show one hand");` | Shows a loading message or asks for a hand pose once ready. |
| 212 | `}` | Closes the block or callback opened on line 206. |
| 214 | `async function prepareVision(task) {` | Uses one loading routine for the object, hand, and person models. |
| 215 | `if (task.status === "loading") return;` | Ignores a duplicate load request while that task is already loading. |
| 216 | `task.status = "loading";` | Records the pending state before starting asynchronous work. |
| 217 | `task.refresh();` | Updates the task panel so it can show progress immediately. |
| 218 | `try {` | Wraps model creation in error handling. |
| 219 | `task.model = await task.load();` | Runs the selected task's loader and saves the returned model. |
| 220 | `} catch (error) {` | Catches a runtime or internet loading failure. |
| 221 | `failVision(task, error);` | Sends a load error through the shared vision error handler. |
| 222 | `return;` | Stops the success path after a failure. |
| 223 | `}` | Closes the block or callback opened on line 220. |
| 224 | `task.status = "ready";` | Marks the task ready after its model is available. |
| 225 | `task.refresh();` | Lets the task show that the download has finished. |
| 226 | `}` | Closes the block or callback opened on line 214. |
| 228 | `function failVision(task, error) {` | Handles a vision model error whether it occurs during setup or on a frame. |
| 229 | `console.error("Vision model failed", error);` | Reports the actual error in the developer console. |
| 230 | `task.model?.close();` | Releases runtime resources if the task already owned a model. |
| 231 | `task.model = null;` | Removes the instance so the loop cannot call the failed model. |
| 232 | `task.status = "error";` | Records an error until the user explicitly retries. |
| 233 | `task.refresh();` | Refreshes the relevant panel and retry control. |
| 234 | `}` | Closes the block or callback opened on line 228. |
| 236 | `function tick(now) {` | Handles one browser animation callback. Now is a timestamp in milliseconds. |
| 237 | `animation = null;` | Clears the queued id because this callback is currently running. |
| 238 | `if (mode === "art") {` | Chooses artwork rendering before checking camera readiness. The demo works without a stream. |
| 239 | `processArtwork(now);` | Updates the artwork and, when possible, runs person segmentation. |
| 240 | `} else if (cameraReady()) {` | Requires a decoded video frame for the other modes. |
| 241 | `if (mode === "scene") {` | Handles automatic scene caption timing separately from per-frame analysis. |
| 242 | `if (get("auto-caption").checked && !captionBusy && now >= nextCaptionAt) describeFrame();` | Takes a caption snapshot when automatic refresh is on, idle, and due. |
| 243 | `} else {` | Uses regular frame sampling for Motion detector and Gesture to voice. |
| 244 | `const interval = mode === "gesture" ? 85 : objectMode.checked ? 180 : 110;` | Sets the sampling intervals to 85 ms for hands, 180 ms for objects, and 110 ms for motion. |
| 245 | `if (now - lastAnalysis >= interval && video.currentTime !== lastVideoTime) {` | Requires both an elapsed interval and a newly decoded frame. |
| 246 | `lastAnalysis = now;` | Records the analysis timestamp for the next throttle check. |
| 247 | `lastVideoTime = video.currentTime;` | Records the video timestamp to avoid analyzing the same frame twice. |
| 248 | `if (mode === "motion" && !objectMode.checked) processMotion(now);` | Compares frames when Motion is the selected detection view. |
| 249 | `if (mode === "motion" && objectMode.checked && objectTask.model) void processObjects(now);` | Starts one asynchronous object analysis while the live object task is ready. |
| 250 | `if (mode === "gesture" && handTask.model) processGesture(now);` | Reads hand landmarks when the gesture recognizer is available. |
| 251 | `}` | Closes the block or callback opened on line 245. |
| 252 | `}` | Closes the block or callback opened on line 243. |
| 253 | `}` | Closes the block or callback opened on line 240. |
| 254 | `scheduleFrame();` | Queues the next frame when ongoing work needs it. |
| 255 | `}` | Closes the block or callback opened on line 236. |
| 257 | `function scheduleFrame() {` | Queues an animation callback only when necessary. |
| 258 | `const needsArtwork = mode === "art" && (artDirty \|\| animateArtwork.checked);` | Keeps the artwork loop active while the artwork needs a render or animation. |
| 259 | `if (animation === null && (stream \|\| needsArtwork)) animation = requestAnimationFrame(tick);` | Uses the existing request if queued. Otherwise, active video or pending artwork starts one. |
| 260 | `}` | Closes the block or callback opened on line 257. |

### Artwork model and render timing

| Line | Source | What the line does |
| ---: | --- | --- |
| 262 | `function updateArtworkStatus() {` | Updates the art controls and decides when to load the person model. |
| 263 | `const ready = cameraReady();` | Tests whether the webcam has a decoded frame. |
| 264 | `const demo = get("art-demo");` | Finds the demo toggle. |
| 265 | `demo.disabled = ready;` | Disables the demo toggle while the camera provides the source. |
| 266 | `demo.setAttribute("aria-pressed", String(demoSilhouette));` | Exposes the demo selection to sighted users and assistive technology. |
| 267 | `get("retry-art").hidden = !ready \|\| personTask.status !== "error";` | Shows person model retry only when its task has failed and a camera frame exists. |
| 268 | `setText("art-points", artPoints.toLocaleString() + " silhouette particles");` | Formats the last rendered number according to the browser's locale. |
| 269 | `const movement = artwork?.motion;` | Reads the most recent silhouette motion measurement. |
| 270 | `setText("art-motion", !ready ? "Start the camera to measure movement." : !movement ?` | Tells the user how to start measuring when the camera is off. |
| 271 | `"Waiting for two silhouette frames." : movement.percent >= 1 ?` | Waits for two compatible samples before reporting motion. |
| 272 | `"Body motion · " + movement.percent.toFixed(1) + "%" : "No body motion");` | Reports the percentage of person pixels that changed. Values below one percent display as still. |
| 273 | `if (mode !== "art") return;` | Avoids changing the visible artwork status or loading its model while another tab is active. |
| 274 | `if (ready && personTask.status === "idle") void prepareVision(personTask);` | Sends the idle person task through the shared loader on first use. |
| 275 | `if (!ready) setText("art-state", demoSilhouette ? "Demo silhouette" : "Camera or demo");` | Names the demo source or offers camera and demo choices. |
| 276 | `else if (personTask.status === "error") setText("art-state", "Person model unavailable");` | Shows that the person model is unavailable after a failure. |
| 277 | `else if (personTask.status === "loading") setText("art-state", "Loading person model…");` | Shows setup progress while the person model is pending. |
| 278 | `else if (artPoints) setText("art-state", "Live silhouette");` | Reports a live silhouette after the model produces visible points. |
| 279 | `else setText("art-state", "Step into the camera frame");` | Prompts the user to move into view when no silhouette meets the threshold. |
| 280 | `}` | Closes the block or callback opened on line 262. |
| 282 | `function processArtwork(now) {` | Updates the landscape and the live person, each at its own rate. |
| 283 | `const ready = cameraReady();` | Determines whether this frame can use camera input. |
| 284 | `if (ready && personTask.model && now - lastAnalysis >= 140 && video.currentTime !== lastVideoTime) {` | Samples a fresh camera frame every 140 ms at most when the person task is ready. |
| 285 | `lastAnalysis = now;` | Saves the time of this segmentation run. |
| 286 | `lastVideoTime = video.currentTime;` | Saves which camera frame was used. |
| 287 | `try {` | Guards segmentation so a model error can remain local to the artwork. |
| 288 | `artwork.capture(personTask.model, video, now);` | Segments the current image into a foreground mask using the current person model. |
| 289 | `} catch (error) {` | Receives a runtime segmentation failure. |
| 290 | `artwork.reset();` | Clears the mask, cached luminance, and motion result after a segmentation error. |
| 291 | `failVision(personTask, error);` | Records a person model failure and offers retry after clearing the mask. |
| 292 | `}` | Closes the block or callback opened on line 289. |
| 293 | `artDirty = true;` | Schedules a repaint after the mask changes or is cleared. |
| 294 | `}` | Closes the block or callback opened on line 284. |
| 295 | `const animate = animateArtwork.checked;` | Reads the current decorative animation setting. |
| 296 | `if ((!animate && !artDirty) \|\| now - lastArtDraw < 1000 / 30) return;` | Limits repainting to about 30 frames per second and skips unchanged paused artwork. |
| 297 | `lastArtDraw = now;` | Saves the last draw time for the rate limit. |
| 298 | `artDirty = false;` | Clears the repaint flag because the current draw will use the latest state. |
| 299 | `artPoints = artwork.draw(animate ? now / 1000 : 0, Number(get("art-wind").value) / 100,` | Passes elapsed seconds and scales the wind slider from 0 to 100 to 0 to 1. Static artwork uses time zero. |
| 300 | `demoSilhouette && !ready, get("mirror").checked, highlightMotion.checked);` | Passes the demo preference, preview orientation, and motion highlight setting to the renderer. |
| 301 | `updateArtworkStatus();` | Updates the source label and particle count after drawing. |
| 302 | `}` | Closes the block or callback opened on line 282. |

### Overlay geometry and motion detection

| Line | Source | What the line does |
| ---: | --- | --- |
| 304 | `function fitOverlay() {` | Aligns the overlay with the contained video inside its stage. |
| 305 | `const { clientWidth: width, clientHeight: height } = overlay;` | Reads the overlay's current CSS size, including after a resize. |
| 306 | `const density = Math.min(2, window.devicePixelRatio \|\| 1);` | Uses up to two drawing pixels per CSS pixel to sharpen labels on high-density displays. |
| 307 | `const pixelsWide = Math.round(width * density);` | Calculates the backing canvas width at the selected pixel density. |
| 308 | `const pixelsHigh = Math.round(height * density);` | Calculates the backing canvas height at the same density. |
| 309 | `if (pixelsWide !== overlay.width \|\| pixelsHigh !== overlay.height) {` | Checks whether the backing canvas needs resizing. |
| 310 | `overlay.width = pixelsWide;` | Updates the actual drawing buffer width. |
| 311 | `overlay.height = pixelsHigh;` | Updates the actual drawing buffer height. |
| 312 | `}` | Closes the block or callback opened on line 309. |
| 313 | `paint.setTransform(density, 0, 0, density, 0, 0);` | Maps CSS-pixel drawing coordinates to the denser canvas buffer. |
| 314 | `paint.clearRect(0, 0, width, height);` | Clears old drawings, including frames with no detected motion. |
| 315 | `const scale = Math.min(width / video.videoWidth, height / video.videoHeight);` | Chooses the smaller scale so the entire source frame fits the viewport. |
| 316 | `const imageWidth = video.videoWidth * scale;` | Computes the visible width of the camera image. |
| 317 | `const imageHeight = video.videoHeight * scale;` | Computes the visible height of the camera image. |
| 318 | `return { x: (width - imageWidth) / 2, y: (height - imageHeight) / 2, width: imageWidth, height: imageHeight };` | Returns centered offsets and dimensions for mapping points onto the letterboxed video. |
| 319 | `}` | Closes the block or callback opened on line 304. |
| 321 | `function processMotion(now) {` | Processes a sampled pair of camera frames and optionally draws motion outlines. |
| 322 | `sampleContext.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);` | Copies the live video into the small offscreen analysis canvas. |
| 323 | `const current = luma(sampleContext.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data);` | Reads the copied pixels and turns them into one brightness byte per pixel. |
| 324 | `if (!previousFrame) {` | Checks if this is the first sampled frame. |
| 325 | `previousFrame = current;` | Stores the first brightness sample as a baseline. |
| 326 | `return;` | Waits for another frame before reporting movement. |
| 327 | `}` | Closes the block or callback opened on line 324. |
| 328 | `const motion = detectMotion(previousFrame, current, Number(get("sensitivity").value));` | Compares the new and previous samples at the selected sensitivity. |
| 329 | `previousFrame = current;` | Keeps the current sample for the next comparison. |
| 330 | `if (motion.regions.length) {` | Checks whether the detector returned any regions. |
| 331 | `lastMotion = motion;` | Saves the latest active region set. |
| 332 | `lastMotionAt = now;` | Starts the short display hold for the most recent result. |
| 333 | `} else if (now - lastMotionAt > 420) {` | Waits 420 ms without a detection before removing that result. |
| 334 | `lastMotion = null;` | Clears the old region set. |
| 335 | `}` | Closes the block or callback opened on line 333. |
| 336 | `setText("motion-state", lastMotion ? "Motion detected" : "No motion");` | Reports whether a region is currently displayed. |
| 337 | `setText("motion-regions", String(lastMotion?.regions.length ?? 0));` | Updates the detected region count, with a fallback of zero. |
| 338 | `setText("motion-area", (lastMotion?.percent ?? 0).toFixed(1) + "%");` | Formats the changed share of the analysis pixels to one decimal place. |
| 340 | `const view = fitOverlay();` | Sizes and clears the overlay even when boxes are turned off. |
| 341 | `if (!lastMotion \|\| !showBoxes.checked) return;` | Leaves the video visible without motion outlines when boxes are disabled or no region exists. |
| 342 | `const mirrored = get("mirror").checked;` | Reads whether the video is horizontally mirrored. |
| 343 | `for (const region of lastMotion.regions) {` | Draws one outline for each region in the last motion result. |
| 344 | `strokeBox(projectBox(region, view, mirrored), "#a5eecf");` | Uses the common projection and stroke for a motion rectangle, with mint as its fixed color. |
| 345 | `}` | Closes the block or callback opened on line 343. |
| 346 | `}` | Closes the block or callback opened on line 321. |

### Object inference, results, and labels

| Line | Source | What the line does |
| ---: | --- | --- |
| 348 | `async function processObjects(now) {` | Sends a camera frame to the detection worker and integrates its later reply. |
| 349 | `if (objectBusy) return;` | Skips producing another bitmap while the previous worker request is running. |
| 350 | `objectBusy = true;` | Marks the worker request in flight before deriving its input. |
| 351 | `const session = objectSession;` | Records the session that owns this detection request. |
| 352 | `const { videoWidth, videoHeight } = video;` | Records the original camera image dimensions for the returned box coordinates. |
| 353 | `try {` | Guards model inference so a failure leaves the video and motion detector usable. |
| 354 | `const { detections } = await objectTask.model.detectForVideo(video, now);` | Waits for the worker's model output without blocking the next UI repaint. |
| 355 | `if (session !== objectSession) return;` | Discards results from an old camera or a view the user has since left. |
| 356 | `lastObjects = trackObjects(lastObjects, readObjects(detections, videoWidth, videoHeight), now);` | Normalizes the model output and updates the positions of matching objects. |
| 357 | `} catch (error) {` | Receives a runtime inference or result parsing error. |
| 358 | `lastObjects = [];` | Discards last frame's detections so they cannot be drawn after the failure. |
| 359 | `failVision(objectTask, error);` | Updates the object model state and makes its retry available. |
| 360 | `return;` | Ends the failed frame without running the normal result path. |
| 361 | `} finally {` | Runs cleanup after success, error, or a stale reply. |
| 362 | `objectBusy = false;` | Lets the next eligible camera frame begin an object request. |
| 363 | `}` | Closes the block or callback opened on line 361. |
| 364 | `updateObjects();` | Refreshes the list and overlay with the detected objects. |
| 365 | `}` | Closes the block or callback opened on line 348. |
| 367 | `function updateObjects() {` | Syncs the Objects panel and, when selected, the object overlay. |
| 368 | `const ready = cameraReady();` | Checks whether video is available. |
| 369 | `const active = mode === "motion" && objectMode.checked;` | Confirms that Live detection and its Objects view are active. |
| 370 | `if (ready && active && objectTask.status === "idle") {` | Checks whether this is the first opportunity to load the object model. |
| 371 | `void prepareVision(objectTask);` | Starts the shared asynchronous loader. |
| 372 | `return;` | Leaves the rest of the update to the loader's refresh. |
| 373 | `}` | Closes the block or callback opened on line 370. |
| 375 | `const objects = lastObjects.filter(object => object.seen === 2 && object.score >= Number(confidence.value) / 100);` | Displays boxes only after two matching samples and at the configured minimum confidence. |
| 376 | `const list = get("object-results");` | Gets the result list next to the preview. |
| 377 | `list.replaceChildren();` | Replaces the old frame's result rows. |
| 378 | `for (const { label, score, color } of objects) {` | Reads each displayed object's class, score, and assigned color. |
| 379 | `const item = document.createElement("li");` | Creates a list item for the object. |
| 380 | `item.style.setProperty("--object-color", color);` | Sets the color of the CSS marker beside this item. |
| 381 | `const name = document.createElement("span");` | Creates a text span for the model's class name. |
| 382 | `name.textContent = label;` | Writes the class as text so it cannot become markup. |
| 383 | `const value = document.createElement("span");` | Creates a separate span for the confidence score. |
| 384 | `value.textContent = score.toFixed(2);` | Formats the confidence with two decimal places. |
| 385 | `item.append(name, value);` | Puts the object name and confidence in the same row. |
| 386 | `list.append(item);` | Adds the row to the current detections. |
| 387 | `}` | Closes the block or callback opened on line 378. |
| 389 | `const failed = ready && objectTask.status === "error";` | Checks for an object model error while the camera is available. |
| 390 | `get("retry-objects").hidden = !failed;` | Shows a retry button only for that error. |
| 391 | `setText("object-count", ready && objectTask.model ? String(objects.length) : "—");` | Displays the number of filtered objects once the model is ready. |
| 392 | `const state = get("object-state");` | Gets the paragraph used for empty and error states. |
| 393 | `state.hidden = Boolean(objects.length);` | Hides the paragraph when the list already shows detections. |
| 394 | `setText("object-state", !ready ? "Start the camera to scan for objects." :` | Prompts the user to start the camera when there is no frame. |
| 395 | `failed ? "Object model unavailable." : objectTask.status === "loading" ? "Loading object model…" :` | Shows a failure or loading message for those model states. |
| 396 | `"No objects above this confidence.");` | Explains what an empty result list means once the model is running. |
| 398 | `if (!ready \|\| !active) return;` | Leaves other tabs and the off-camera canvas untouched. |
| 399 | `const view = fitOverlay();` | Clears and sizes the overlay, then gets the video display rectangle. |
| 400 | `if (!showBoxes.checked) return;` | Stops after clearing the overlay when the user turns off boxes. |
| 401 | `const mirrored = get("mirror").checked;` | Reads the displayed camera orientation. |
| 402 | `const boxes = objects.map(object => projectBox(object, view, mirrored));` | Projects the normalized boxes into the visible camera rectangle. |
| 403 | `boxes.forEach((box, index) => strokeBox(box, objects[index].color));` | Draws every outline with its class color. |
| 404 | `const labels = [];` | Keeps the positions of labels already drawn for this frame. |
| 405 | `boxes.forEach((box, index) => drawObjectLabel(objects[index], view, box, labels));` | Places badges after the outlines and gives each one the previously used positions. |
| 406 | `}` | Closes the block or callback opened on line 367. |
| 408 | `function strokeBox(box, color) {` | Draws the same transparent-interior outline for object and motion results. |
| 409 | `paint.strokeStyle = "#0d181d";` | Uses a dark stroke to separate the outline from bright areas of the footage. |
| 410 | `paint.lineWidth = 4;` | Gives the dark stroke enough width to remain visible behind the colored line. |
| 411 | `paint.strokeRect(...box);` | Draws the dark border along the rectangle edge. |
| 412 | `paint.strokeStyle = color;` | Switches to the color for the class or motion region. |
| 413 | `paint.lineWidth = 2;` | Makes the foreground stroke narrower than the dark background stroke. |
| 414 | `paint.strokeRect(...box);` | Paints the colored outline. The rectangle interior stays clear. |
| 415 | `}` | Closes the block or callback opened on line 408. |
| 417 | `function drawObjectLabel(object, view, box, labels) {` | Places and draws the label associated with one projected bounding box. |
| 418 | `const text = object.label + " " + object.score.toFixed(2);` | Combines the class and two-decimal model confidence. |
| 419 | `const labelHeight = 20;` | Reserves a 20-pixel high label. |
| 420 | `paint.font = "600 13px ui-monospace, monospace";` | Sets compact fixed-width type so confidence digits line up. |
| 421 | `paint.textBaseline = "middle";` | Centers the text vertically on the drawing coordinate. |
| 422 | `const labelWidth = Math.min(view.width, Math.ceil(paint.measureText(text).width) + 12);` | Adds text padding while keeping the label no wider than the video. |
| 423 | `const label = placeLabel(box, labelWidth, labelHeight, view, labels);` | Finds a label position in the video with room around neighboring labels. |
| 424 | `labels.push(label);` | Records the new label so later labels can avoid it. |
| 425 | `paint.fillStyle = object.color;` | Fills the label with the same color as its outline. |
| 426 | `paint.fillRect(label.x, label.y, labelWidth, labelHeight);` | Draws the opaque label background at the selected location. |
| 427 | `paint.fillStyle = "#0d181d";` | Uses dark ink on the light semantic color. |
| 428 | `paint.fillText(text, label.x + 6, label.y + labelHeight / 2, labelWidth - 12);` | Paints the name and score with six pixels of padding on either side. |
| 429 | `}` | Closes the block or callback opened on line 417. |

### Gesture results and hand outlines

| Line | Source | What the line does |
| ---: | --- | --- |
| 431 | `const handPaths = [` | Defines the hand landmark index groups the app can draw. |
| 432 | `[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12],` | Connects the wrist, the thumb, the index finger, and the middle finger. |
| 433 | `[9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [17, 0],` | Connects the ring finger, the pinky, and the heel of the hand back to the wrist. |
| 434 | `];` | Ends the array opened on line 431. |
| 436 | `function processGesture(now) {` | Runs hand inference, updates the transcript, and draws hand outlines. |
| 437 | `let result;` | Holds the result safely outside the guarded inference call. |
| 438 | `try {` | Guards the vision runtime call against inference failures. |
| 439 | `result = handTask.model.recognizeForVideo(video, now);` | Runs the current hand task against a timestamped camera frame. |
| 440 | `} catch (error) {` | Receives a runtime hand model failure. |
| 441 | `hold.reset();` | Clears any partly completed pose hold. |
| 442 | `get("gesture-progress").value = 0;` | Resets the visible hold progress. |
| 443 | `paint.clearRect(0, 0, overlay.width, overlay.height);` | Clears hand lines drawn in the previous frame. |
| 444 | `failVision(handTask, error);` | Marks hand inference failed and refreshes the available retry. |
| 445 | `return;` | Skips the rest of the failed frame. |
| 446 | `}` | Closes the block or callback opened on line 440. |
| 447 | `const pose = readPose(result);` | Maps MediaPipe categories and landmark geometry to a demo word or a finish action. |
| 448 | `if (pose.candidate === FINISH && !words.length) pose.candidate = null;` | Ignores two open palms until there are words to speak. |
| 449 | `const { progress, accepted, locked } = hold.update(pose, now);` | Calculates the hold progress and reads whether a pose was accepted or still locked. |
| 450 | `get("gesture-progress").value = progress;` | Moves the hold progress bar. |
| 451 | `if (accepted === FINISH) {` | Handles the case where the two-palm finish pose just completed. |
| 452 | `speak(sequenceText(words), "gesture");` | Formats and speaks the collected words. |
| 453 | `setText("gesture-state", "Sequence ready");` | Confirms that the sequence is ready. |
| 454 | `} else if (accepted) {` | Handles the case where a single word pose was accepted. |
| 455 | `words.push(accepted);` | Adds the accepted word to the stored sequence. |
| 456 | `updateWords();` | Adds the new word to the visible transcript. |
| 457 | `if (get("speak-each").checked) speak(accepted, "gesture");` | Optionally speaks every accepted word immediately. |
| 458 | `setText("gesture-state", accepted + " added");` | Confirms which word was added. |
| 459 | `} else if (locked) {` | Handles the period when an accepted pose is still held. |
| 460 | `setText("gesture-state", pose.candidate === FINISH ? "Sequence ready" : "Lower your hand for the next pose");` | Prompts the user to release the pose or shows the completed sequence state. |
| 461 | `} else if (pose.candidate) {` | Handles a recognized pose whose hold has not completed. |
| 462 | `setText("gesture-state", "Hold · " + pose.candidate);` | Shows the predicted word so the user can keep or change the pose. |
| 463 | `} else {` | Handles a frame without a usable candidate. |
| 464 | `setText("gesture-state", pose.hands ? "Try a supported pose" : "Show one hand");` | Offers a supported pose when a hand is visible, or asks the user to show a hand. |
| 465 | `}` | Closes the block or callback opened on line 463. |
| 467 | `const view = fitOverlay();` | Clears the overlay and finds the display area for drawing the hand. |
| 468 | `const mirrored = get("mirror").checked;` | Reads the same mirror setting used by the camera image. |
| 469 | `paint.strokeStyle = "#f0ca8b";` | Selects the amber gesture overlay color. |
| 470 | `paint.lineWidth = 2;` | Draws the landmark lines two pixels wide. |
| 471 | `paint.lineJoin = "round";` | Rounds the joints between line segments. |
| 472 | `for (const hand of result.landmarks) {` | Draws the geometry for each reported hand. |
| 473 | `for (const path of handPaths) {` | Draws each landmark chain from the connection table. |
| 474 | `paint.beginPath();` | Starts a new path so the next chain stays separate. |
| 475 | `for (const index of path) {` | Walks through the landmark indices for one chain. |
| 476 | `const { x, y } = hand[index];` | Reads the normalized position of the current hand landmark. |
| 477 | `paint.lineTo(view.x + (mirrored ? 1 - x : x) * view.width, view.y + y * view.height);` | Reflects the landmark if mirrored and places it within the displayed video area. |
| 478 | `}` | Closes the block or callback opened on line 475. |
| 479 | `paint.stroke();` | Strokes the completed finger or palm path. |
| 480 | `}` | Closes the block or callback opened on line 473. |
| 481 | `}` | Closes the block or callback opened on line 472. |
| 482 | `}` | Closes the block or callback opened on line 436. |

### Transcript and browser speech

| Line | Source | What the line does |
| ---: | --- | --- |
| 484 | `function updateWords() {` | Updates the transcript after a word is added or the list is cleared. |
| 485 | `const list = get("words");` | Finds the ordered word list. |
| 486 | `const item = document.createElement("li");` | Creates a list item for the newest accepted word. |
| 487 | `if (!words.length) {` | Checks whether the stored sequence is empty. |
| 488 | `list.replaceChildren();` | Removes the visible words as a group after Clear. |
| 489 | `} else {` | Handles a transcript with at least one accepted word. |
| 490 | `item.textContent = words.at(-1);` | Copies the last stored word into the new list item. |
| 491 | `list.append(item);` | Appends the item without rebuilding the existing transcript. |
| 492 | `}` | Closes the block or callback opened on line 489. |
| 493 | `get("no-words").hidden = Boolean(words.length);` | Hides the empty-state hint when the transcript has a word. |
| 494 | `get("speak-words").disabled = !words.length;` | Enables Speak sequence only when it has text. |
| 495 | `get("clear-words").disabled = !words.length;` | Enables Clear only when there are words to remove. |
| 496 | `}` | Closes the block or callback opened on line 484. |
| 498 | `function clearSpeech() {` | Stops the current utterance and dismisses speech errors. |
| 499 | `window.speechSynthesis?.cancel();` | Cancels queued or current speech when the browser speech API exists. |
| 500 | `get("gesture-speech").hidden = true;` | Hides the gesture tab's speech alert. |
| 501 | `get("scene-speech").hidden = true;` | Hides the caption tab's speech alert. |
| 502 | `}` | Closes the block or callback opened on line 498. |
| 504 | `function speak(text, source) {` | Sends text to the browser speech API. |
| 505 | `if (!text) return;` | Skips empty speech requests. |
| 506 | `clearSpeech();` | Cancels prior playback so the new text can be heard separately. |
| 507 | `const message = get(source + "-speech");` | Finds the speech error message in the panel that requested playback. |
| 508 | `const showError = () => {` | Defines a shared error handler for this speech request. |
| 509 | `message.textContent = "Speech is unavailable. Check your browser’s voice settings and try the speak button.";` | Gives the user a recovery step when the voice is unavailable. |
| 510 | `message.hidden = false;` | Makes the relevant error message visible. |
| 511 | `};` | Closes the block or callback opened on line 508. |
| 512 | `if (!window.speechSynthesis \|\| !window.SpeechSynthesisUtterance) {` | Detects a browser without the needed speech interfaces. |
| 513 | `showError();` | Calls the speech error handler. |
| 514 | `return;` | Leaves before creating an utterance in an unsupported browser. |
| 515 | `}` | Closes the block or callback opened on line 512. |
| 516 | `try {` | Guards the browser voice API calls. |
| 517 | `const utterance = new SpeechSynthesisUtterance(text);` | Creates an utterance with the supplied text. |
| 518 | `const voice = window.speechSynthesis.getVoices().find(item => item.localService && item.lang.startsWith("en"));` | Prefers an installed local English voice when the browser lists one. |
| 519 | `utterance.lang = voice?.lang ?? "en-US";` | Uses that voice's language or falls back to U.S. English. |
| 520 | `if (voice) utterance.voice = voice;` | Assigns the selected voice when one exists. |
| 521 | `utterance.onerror = ({ error }) => {` | Listens for errors reported after the speech request starts. |
| 522 | `if (error !== "canceled" && error !== "interrupted") showError();` | Ignores normal stop or replacement events. Shows a message for actual speech errors. |
| 523 | `};` | Closes the block or callback opened on line 521. |
| 524 | `window.speechSynthesis.speak(utterance);` | Queues the utterance for playback. |
| 525 | `} catch {` | Receives an exception thrown by the speech API. |
| 526 | `showError();` | Shows the same user-facing error as an async speech failure. |
| 527 | `}` | Closes the block or callback opened on line 525. |
| 528 | `}` | Closes the block or callback opened on line 504. |

### Caption worker and snapshots

| Line | Source | What the line does |
| ---: | --- | --- |
| 530 | `function updateCaptionControls() {` | Syncs the caption panel's controls with the camera and request state. |
| 531 | `get("caption-frame").disabled = !cameraReady() \|\| captionBusy;` | Requires a ready frame and no running job before the user can request another caption. |
| 532 | `get("speak-caption").disabled = !lastCaption;` | Enables reading the last caption aloud whenever one has been saved. |
| 533 | `if (!captionBusy) {` | Avoids replacing the progress message while a caption job is active. |
| 534 | `setText("caption-status", cameraReady() ? "Ready to capture a frame." : "Start your camera to capture a frame.");` | Tells the user whether they can take a snapshot or need to start the camera. |
| 535 | `}` | Closes the block or callback opened on line 533. |
| 536 | `}` | Closes the block or callback opened on line 530. |
| 538 | `function cancelCaption() {` | Stops an active caption job and keeps an idle, loaded worker for reuse. |
| 539 | `if (captionBusy) {` | Checks whether the current worker is processing a request. |
| 540 | `captionWorker?.terminate();` | Terminates the busy worker if one was created. |
| 541 | `captionWorker = null;` | Drops the terminated worker so later requests can create a fresh one. |
| 542 | `captionJob++;` | Invalidates replies from the old caption job. |
| 543 | `}` | Closes the block or callback opened on line 539. |
| 544 | `captionBusy = false;` | Clears the busy flag even if there was no worker. |
| 545 | `}` | Closes the block or callback opened on line 538. |
| 547 | `function captionFailed(detail) {` | Handles a failed caption request and restores manual retry. |
| 548 | `console.error("Caption generation failed", detail);` | Logs the internal failure detail. |
| 549 | `captionWorker?.terminate();` | Stops the current worker to clear failed state from memory. |
| 550 | `captionWorker = null;` | Removes the worker reference so retry starts a new worker. |
| 551 | `captionBusy = false;` | Frees the caption slot for another request. |
| 552 | `captionJob++;` | Invalidates replies associated with the failed job. |
| 553 | `get("auto-caption").checked = false;` | Stops automatic submissions after an error. |
| 554 | `updateCaptionControls();` | Re-enables manual caption capture when a camera frame is available. |
| 555 | `setText("caption-status", "Caption unavailable. Check your connection and try Describe frame again.");` | Displays a recovery message without disturbing the shared camera. |
| 556 | `}` | Closes the block or callback opened on line 547. |
| 558 | `function describeFrame() {` | Captures one camera frame and starts a caption request. |
| 559 | `if (!cameraReady() \|\| captionBusy \|\| mode !== "scene") return;` | Checks camera readiness, request availability, and the selected tab. |
| 560 | `captionBusy = true;` | Reserves the slot so a second request cannot overlap. |
| 561 | `updateCaptionControls();` | Disables the capture button while the worker is busy. |
| 562 | `setText("caption-status", "Preparing the caption model…");` | Shows feedback immediately, before any network load begins. |
| 563 | `const id = ++captionJob;` | Assigns the request a unique id. |
| 564 | `try {` | Guards worker setup and frame capture against errors. |
| 565 | `if (!captionWorker) {` | Creates the caption worker only if there is none to reuse. |
| 566 | `captionWorker = new Worker(new URL("./caption-worker.mjs", import.meta.url), { type: "module" });` | Resolves the worker script beside this module and starts it as an ES module. |
| 567 | `captionWorker.onmessage = ({ data }) => {` | Handles worker messages for progress, failure, and success. |
| 568 | `if (data.id !== captionJob) return;` | Ignores a reply if its id belongs to a previous job. |
| 569 | `if (data.error) {` | Checks whether the worker sent an error. |
| 570 | `captionFailed(data.error);` | Routes a worker inference or download error to the recovery handler. |
| 571 | `} else if (data.status) {` | Checks for a progress-only message. |
| 572 | `setText("caption-status", data.status === "loading" ? "Downloading the caption model…" : "Describing the frame…");` | Distinguishes model setup from image inference in the panel. |
| 573 | `} else {` | Handles a reply containing a completed caption. |
| 574 | `captionBusy = false;` | Marks the inference slot available again. |
| 575 | `nextCaptionAt = performance.now() + 4000;` | Waits four seconds after completion before the next automatic request. |
| 576 | `lastCaption = data.caption;` | Saves the generated string for both display and speech. |
| 577 | `setText("caption", lastCaption);` | Updates the visible latest caption. |
| 578 | `const tokens = new Set(lastCaption.toLowerCase().match(/[a-z]+/g));` | Lowercases the caption and extracts English-letter runs into a set for exact word matching. |
| 579 | `const objects = commonObjects.filter(word => tokens.has(word) \|\| tokens.has(word + "s") \|\| tokens.has(word + "es"));` | Looks for known nouns and their simple s or es plurals. |
| 580 | `const actions = commonActions.filter(word => tokens.has(word));` | Looks for known action words in the caption. |
| 581 | `get("caption-tags").hidden = !objects.length && !actions.length;` | Hides the labels row when neither list has matches. |
| 582 | `const tags = [objects.length ? "Objects · " + objects.join(", ") : "",` | Creates the object summary only when object words were found. |
| 583 | `actions.length ? "Actions · " + actions.join(", ") : ""].filter(Boolean);` | Creates the action summary and discards empty label strings. |
| 584 | `setText("caption-tags", tags.join(" / "));` | Renders the two keyword summaries together when both are present. |
| 585 | `updateCaptionControls();` | Restores controls now that the caption is complete. |
| 586 | `setText("caption-status", "Caption updated.");` | Confirms that the panel shows the newest result. |
| 587 | `}` | Closes the block or callback opened on line 573. |
| 588 | `};` | Closes the block or callback opened on line 567. |
| 589 | `captionWorker.onerror = event => {` | Handles a worker failure that did not arrive in a normal message. |
| 590 | `event.preventDefault();` | Suppresses the browser's default handling because the app shows its own error. |
| 591 | `captionFailed(event.message);` | Restores retry using the worker event's message. |
| 592 | `};` | Closes the block or callback opened on line 589. |
| 593 | `}` | Closes the block or callback opened on line 565. |
| 595 | `const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));` | Chooses a downscale factor so the image's long side is at most 480 pixels. |
| 596 | `frame.width = Math.max(1, Math.round(video.videoWidth * scale));` | Resizes the caption snapshot canvas to the scaled video width. |
| 597 | `frame.height = Math.max(1, Math.round(video.videoHeight * scale));` | Resizes the canvas to the scaled video height and preserves the source aspect ratio. |
| 598 | `frameContext.drawImage(video, 0, 0, frame.width, frame.height);` | Copies the camera frame into the private snapshot canvas. |
| 599 | `const { buffer } = frameContext.getImageData(0, 0, frame.width, frame.height).data;` | Reads an RGBA image and extracts its underlying pixel buffer. |
| 600 | `captionWorker.postMessage({ id, width: frame.width, height: frame.height, buffer,` | Sends the caption worker this request, its dimensions, and its pixel buffer. |
| 601 | `modelHost: studio.dataset.captionModelHost }, [buffer]);` | Passes an optional same-origin model host, then transfers the image buffer without copying. |
| 602 | `} catch (error) {` | Receives an exception from worker creation or snapshot capture. |
| 603 | `captionFailed(error);` | Runs the same recovery logic as a worker-reported error. |
| 604 | `}` | Closes the block or callback opened on line 602. |
| 605 | `}` | Closes the block or callback opened on line 558. |

### Control and page events

| Line | Source | What the line does |
| ---: | --- | --- |
| 607 | `get("camera-toggle").addEventListener("click", () => stream ? stopCamera() : void startCamera());` | Starts or stops the shared camera when the main button is clicked. |
| 608 | `get("mirror").addEventListener("change", event => {` | Listens for a change to the mirror option. |
| 609 | `video.classList.toggle("mirrored", event.target.checked);` | Applies the checkbox value as a horizontal transform on the live video. |
| 610 | `if (mode === "motion" && objectMode.checked) updateObjects();` | Reprojects current object boxes when the user mirrors the live video. |
| 611 | `redrawArtwork();` | Marks the particle foreground for repaint so it can follow the mirror setting. |
| 612 | `});` | Closes the block or callback opened on line 608. |
| 613 | `video.classList.toggle("mirrored", get("mirror").checked);` | Syncs the initial video transform with the current checkbox value. |
| 614 | `get("sensitivity").addEventListener("input", event => setText("sensitivity-value", event.target.value));` | Updates the displayed sensitivity number as the slider is moved. |
| 615 | `for (const choice of document.querySelectorAll('input[name="detection"]')) {` | Visits the two native controls that select the detection type. |
| 616 | `choice.addEventListener("change", () => {` | Responds when either detection option becomes selected. |
| 617 | `get("object-view").hidden = !objectMode.checked;` | Hides the object tools while the Motion option is active. |
| 618 | `get("motion-view").hidden = objectMode.checked;` | Shows the motion tools only while Motion is selected. |
| 619 | `resetAnalysis();` | Clears prior frame results and starts the selected analysis with fresh state. |
| 620 | `});` | Closes the block or callback opened on line 616. |
| 621 | `}` | Closes the block or callback opened on line 615. |
| 622 | `confidence.addEventListener("input", () => {` | Responds immediately as the confidence slider moves. |
| 623 | `setText("confidence-value", confidence.value + "%");` | Shows the selected threshold as a percentage. |
| 624 | `updateObjects();` | Applies the new threshold to the most recent object results. |
| 625 | `});` | Closes the block or callback opened on line 622. |
| 626 | `showBoxes.addEventListener("change", () => {` | Responds when the user changes overlay visibility. |
| 627 | `if (objectMode.checked) updateObjects();` | Clears or repaints the object boxes immediately in the Objects view. |
| 628 | `});` | Closes the block or callback opened on line 626. |
| 629 | `get("retry-objects").addEventListener("click", () => void prepareVision(objectTask));` | Connects the retry button to the shared loader for the object task. |
| 630 | `get("retry-gestures").addEventListener("click", () => void prepareVision(handTask));` | Connects the hand retry button to that same loader. |
| 631 | `get("speak-words").addEventListener("click", () => speak(sequenceText(words), "gesture"));` | Formats the existing word sequence and sends it to speech. |
| 632 | `get("clear-words").addEventListener("click", () => {` | Binds the action that clears the accepted words. |
| 633 | `words.length = 0;` | Empties the word array without replacing the array object. |
| 634 | `updateWords();` | Removes the visible transcript and disables its empty-state actions. |
| 635 | `clearSpeech();` | Stops speech that belonged to the old sequence. |
| 636 | `});` | Closes the block or callback opened on line 632. |
| 637 | `get("caption-frame").addEventListener("click", describeFrame);` | Connects Describe frame to the snapshot and caption routine. |
| 638 | `get("speak-caption").addEventListener("click", () => speak(lastCaption, "scene"));` | Reads the cached caption aloud when the user chooses Speak caption. |
| 639 | `get("auto-caption").addEventListener("change", () => { nextCaptionAt = 0; });` | Makes automatic capture immediately eligible when the checkbox changes. |
| 640 | `function redrawArtwork() {` | Flags artwork changes made by controls. |
| 641 | `artDirty = true;` | Marks the cached art draw as stale. |
| 642 | `scheduleFrame();` | Queues a new frame even if the paused artwork had stopped rendering. |
| 643 | `}` | Closes the block or callback opened on line 640. |
| 644 | `get("art-demo").addEventListener("click", () => {` | Binds the camera-free silhouette toggle. |
| 645 | `demoSilhouette = !demoSilhouette;` | Flips whether the synthetic silhouette is enabled. |
| 646 | `updateArtworkStatus();` | Updates the demo button and source status to match the new value. |
| 647 | `redrawArtwork();` | Queues a repaint to show or remove the demo figure. |
| 648 | `});` | Closes the block or callback opened on line 644. |
| 649 | `get("retry-art").addEventListener("click", () => void prepareVision(personTask));` | Connects the person model retry to the shared vision loader. |
| 650 | `get("art-wind").addEventListener("input", event => {` | Handles live changes to the Wind strength slider. |
| 651 | `setText("art-wind-value", event.target.value);` | Displays the current wind setting beside the slider. |
| 652 | `redrawArtwork();` | Marks the art for a redraw with the changed wind strength. |
| 653 | `});` | Closes the block or callback opened on line 650. |
| 654 | `animateArtwork.addEventListener("change", redrawArtwork);` | Repaints when decorative animation is enabled or paused. |
| 655 | `highlightMotion.addEventListener("change", redrawArtwork);` | Repaints the artwork with its current motion highlighting preference. |
| 656 | `window.addEventListener("pagehide", () => stopCamera());` | Releases the video tracks and active inference when the user leaves the page. |
| 657 | `if (studio.dataset.mode !== mode) selectMode(studio.dataset.mode);` | Opens the mode specified by the HTML when a standalone project starts directly in its own mode. |
