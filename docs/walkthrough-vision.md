# Detectors, gestures, and captions

The two detectors report different information. Object detection predicts a class and a box from one frame. Motion looks for changes between two frames. Hand poses use a hold timer, and captions use a snapshot.

[Back to the code walkthrough](./code-walkthrough.md)

## `object-detection.mjs`

[Open `object-detection.mjs`](../object-detection.mjs)

### Worker interface, track matching, and overlay

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `const COLORS = ["#8de6f5", "#a5eecf", "#ffce76", "#ffaac3", "#ffba91", "#d2e998", "#afd0ff"];` | Defines a palette of light colors that keep dark label text readable. |
| 3 | `export async function loadObjectDetector() {` | Exposes an asynchronous loader for the object detection task. |
| 4 | `// MediaPipe uses importScripts for its WebAssembly loader, so this worker is classic.` | Explains why the object detector uses a classic browser worker. |
| 5 | `const worker = new Worker(new URL("./object-worker.js", import.meta.url));` | Starts a worker beside this module so inference can run separately from the interface. |
| 6 | `const request = (message, transfer = []) => new Promise((resolve, reject) => {` | Creates the request and response bridge for one in-flight worker message. |
| 7 | `worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data);` | Converts a returned error into a rejected request and otherwise resolves the worker's output. |
| 8 | `worker.onerror = event => reject(new Error(event.message \|\| "The object worker stopped."));` | Rejects the request if the worker itself stops unexpectedly. |
| 9 | `worker.postMessage(message, transfer);` | Sends the command and transfers any image data directly to the worker. |
| 10 | `});` | Closes the block or callback opened on line 6. |
| 11 | `try {` | Handles startup failure before handing the worker interface to the app. |
| 12 | `await request({});` | Uses an empty message to start the library and model download. |
| 13 | `} catch (error) {` | Receives an error that prevented the object model from becoming ready. |
| 14 | `worker.terminate();` | Releases the failed worker. |
| 15 | `throw error;` | Passes the error to the panel recovery code. |
| 16 | `}` | Closes the block or callback opened on line 13. |
| 17 | `return {` | Returns the worker operations expected by the app's shared model lifecycle. |
| 18 | `async detectForVideo(video, now) {` | Captures and analyzes the supplied video frame at the given timestamp. |
| 19 | `const bitmap = await createImageBitmap(video);` | Gets a transferable bitmap from the current decoded camera frame. |
| 20 | `return request({ bitmap, now }, [bitmap]);` | Sends the bitmap and transfers its ownership to the worker. |
| 21 | `},` | Closes the block or callback opened on line 18. |
| 22 | `close: () => worker.terminate(),` | Gives the app a way to stop the worker on model failure. |
| 23 | `};` | Closes the block or callback opened on line 17. |
| 24 | `}` | Closes the block or callback opened on line 3. |
| 26 | `function clampUnit(value) {` | Defines a clamp for normalized video coordinates. |
| 27 | `return Math.max(0, Math.min(1, value));` | Restricts a numeric coordinate to the interval from zero to one. |
| 28 | `}` | Closes the block or callback opened on line 26. |
| 30 | `export function readObjects(detections, width, height) {` | Converts MediaPipe's detections into stable, normalized overlay data. |
| 31 | `const objects = [];` | Starts an empty array of drawable objects. |
| 32 | `for (const { categories, boundingBox } of detections) {` | Reads the categories and bounds of each detection. |
| 33 | `const { categoryName: label, score } = categories[0] ?? {};` | Takes the top-ranked class name and its confidence if present. |
| 34 | `if (!label \|\| !(score >= 0 && score <= 1) \|\| !boundingBox) continue;` | Rejects missing names, invalid scores, and missing boxes. |
| 36 | `const { originX, originY, width: boxWidth, height: boxHeight } = boundingBox;` | Reads the pixel bounds without confusing them with the source dimensions. |
| 37 | `const x = clampUnit(originX / width);` | Normalizes the left coordinate by video width and trims it to the image. |
| 38 | `const y = clampUnit(originY / height);` | Normalizes the top coordinate by video height and trims it to the image. |
| 39 | `const right = clampUnit((originX + boxWidth) / width);` | Normalizes the right coordinate after adding the box width. |
| 40 | `const bottom = clampUnit((originY + boxHeight) / height);` | Normalizes the bottom coordinate after adding the box height. |
| 41 | `if (!(right > x && bottom > y)) continue;` | Discards boxes that have no drawable area after clipping. |
| 43 | `let color = 0;` | Starts the class color index at zero. |
| 44 | `for (const character of label) color = (color * 31 + character.charCodeAt(0)) % COLORS.length;` | Mixes the characters into a stable palette index so repeated names keep their color. |
| 45 | `objects.push({ label, score, color: COLORS[color], x, y, width: right - x, height: bottom - y });` | Saves the class, confidence, color, and clipped rectangle as fractions of the video. |
| 46 | `}` | Closes the block or callback opened on line 32. |
| 47 | `return objects;` | Returns the normalized detections. |
| 48 | `}` | Closes the block or callback opened on line 30. |
| 50 | `function overlap(a, b) {` | Calculates the intersection over union for two normalized boxes. |
| 51 | `const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));` | Measures how much their horizontal ranges overlap. |
| 52 | `const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));` | Measures how much their vertical ranges overlap. |
| 53 | `const intersection = width * height;` | Multiplies those lengths to get the shared area. |
| 54 | `return intersection / (a.width * a.height + b.width * b.height - intersection);` | Divides the shared area by the total area covered by either box. |
| 55 | `}` | Closes the block or callback opened on line 50. |
| 57 | `export function trackObjects(previous, detections, now) {` | Associates current detections with recent boxes of the same class. |
| 58 | `const unmatched = previous.filter(object => now - object.lastSeen <= 500);` | Keeps only previous tracks younger than half a second as matching candidates. |
| 59 | `const tracks = detections.map(object => {` | Builds a track for each current detection. |
| 60 | `let match = -1;` | Starts with no matching track. |
| 61 | `let best = 0.3;` | Requires more than 30 percent overlap before two boxes can match. |
| 62 | `for (const [index, old] of unmatched.entries()) {` | Scans tracks that no current detection has claimed. |
| 63 | `if (object.label !== old.label) continue;` | Considers only previous boxes with the same predicted class. |
| 64 | `const shared = overlap(object, old);` | Calculates how closely the previous box overlaps the current box. |
| 65 | `if (shared <= best) continue;` | Leaves weaker matches alone. |
| 66 | `match = index;` | Remembers the track with the strongest overlap so far. |
| 67 | `best = shared;` | Saves its overlap to compare with later candidates. |
| 68 | `}` | Closes the block or callback opened on line 62. |
| 69 | `if (match === -1) return { ...object, seen: 1, lastSeen: now };` | Starts an unconfirmed track if there was no recent match. |
| 70 | `const [old] = unmatched.splice(match, 1);` | Removes the matched track to prevent another object claiming it. |
| 71 | `return { ...object, seen: Math.min(2, old.seen + 1), lastSeen: now,` | Marks a matched track confirmed after two samples and stores the latest time. |
| 72 | `x: 0.75 * object.x + 0.25 * old.x, y: 0.75 * object.y + 0.25 * old.y,` | Uses 75 percent of the new position and 25 percent of the previous position to reduce jitter. |
| 73 | `width: 0.75 * object.width + 0.25 * old.width, height: 0.75 * object.height + 0.25 * old.height };` | Applies the same smoothing to the displayed width and height. |
| 74 | `});` | Closes the block or callback opened on line 59. |
| 75 | `return tracks.concat(unmatched.filter(object => object.seen === 2 && now - object.lastSeen <= 400));` | Keeps confirmed tracks visible through brief misses. Unconfirmed misses and stale tracks disappear. |
| 76 | `}` | Closes the block or callback opened on line 57. |
| 78 | `export function projectBox(box, view, mirrored) {` | Projects a normalized box into the letterboxed region of the display. |
| 79 | `const left = mirrored ? 1 - box.x - box.width : box.x;` | Reflects the horizontal position when mirroring is enabled. The width stays the same. |
| 80 | `return [view.x + left * view.width, view.y + box.y * view.height,` | Positions the box relative to the displayed image origin. |
| 81 | `box.width * view.width, box.height * view.height];` | Scales its width and height by the dimensions of the displayed video. |
| 82 | `}` | Closes the block or callback opened on line 78. |
| 84 | `export function placeLabel([x, y], width, height, view, used) {` | Places an object label inside the displayed image and accounts for labels already drawn. |
| 85 | `const left = Math.min(x, view.x + view.width - width);` | Clamps the label's x coordinate so the full badge fits at the right edge. |
| 86 | `const top = Math.max(view.y, y - height);` | Starts with a badge above its box or at the video's top edge. |
| 87 | `const room = [top, y, y + height].find(row => row + height <= view.y + view.height &&` | Tries that row, the box's top row, and the row below. Each candidate must fit above the video's bottom. |
| 88 | `used.every(label => left + width <= label.x \|\| left >= label.x + label.width \|\|` | Accepts a candidate if it is horizontally separate from a used badge. |
| 89 | `row + height <= label.y \|\| row >= label.y + label.height));` | Also accepts a candidate if the badges fit on separate vertical rows. |
| 90 | `return { x: left, y: room ?? Math.min(top, view.y + view.height - height), width, height };` | Returns the chosen position and size. If all candidates overlap, it keeps the badge within the video bounds. |
| 91 | `}` | Closes the block or callback opened on line 84. |

## `object-worker.js`

[Open `object-worker.js`](../object-worker.js)

### Higher-resolution object inference

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `const MODEL = "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/1/efficientdet_lite2.tflite";` | Pins the float16 version of EfficientDet-Lite2 that the object view runs. |
| 2 | `let detector;` | Saves the task so the worker loads one model across frame requests. |
| 4 | `self.onmessage = async ({ data: { bitmap, now } }) => {` | Unpacks either the initialization message or a frame and timestamp. |
| 5 | `try {` | Wraps loading and inference in error handling. |
| 6 | `if (!detector) {` | Loads MediaPipe only when the worker first receives a request. |
| 7 | `const { loadVisionTasks } = await import("./mediapipe.mjs");` | Imports the same vision runtime loader used by other modes. |
| 8 | `const { sdk, fileset } = await loadVisionTasks();` | Resolves the JavaScript bundle and its WebAssembly files. |
| 9 | `detector = await sdk.ObjectDetector.createFromOptions(fileset, {` | Creates the detector for the pinned model. |
| 10 | `baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },` | Uses the CPU delegate for inference inside the worker. |
| 11 | `runningMode: "VIDEO",` | Requests video mode to accept a series of timestamped samples. |
| 12 | `scoreThreshold: 0.3,` | Keeps predictions at or above the interface's lowest confidence setting. |
| 13 | `maxResults: 8,` | Returns up to eight detections for each camera sample. |
| 14 | `});` | Closes the block or callback opened on line 9. |
| 15 | `}` | Closes the block or callback opened on line 6. |
| 16 | `self.postMessage(bitmap ? detector.detectForVideo(bitmap, now) : { ready: true });` | Sends the model detections for a frame or acknowledges that startup is complete. |
| 17 | `} catch (error) {` | Receives an asset download, model creation, or inference error. |
| 18 | `self.postMessage({ error: error.message \|\| String(error) });` | Sends a readable error back to the app's model recovery handler. |
| 19 | `} finally {` | Cleans up after every request, including errors. |
| 20 | `bitmap?.close();` | Releases the transferred bitmap when there was a camera frame. |
| 21 | `}` | Closes the block or callback opened on line 19. |
| 22 | `};` | Closes the block or callback opened on line 4. |

## `motion.mjs`

[Open `motion.mjs`](../motion.mjs)

### Sample geometry and grayscale

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `export const SAMPLE_WIDTH = 160;` | Exports the width of the analysis sample for the app to use. |
| 2 | `export const SAMPLE_HEIGHT = 96;` | Exports the height of the analysis sample. |
| 4 | `const TILE = 8;` | Sets a tile to eight pixels on each side. |
| 5 | `const COLS = SAMPLE_WIDTH / TILE;` | Divides the sample width by the tile size to get 20 columns. |
| 6 | `const ROWS = SAMPLE_HEIGHT / TILE;` | Divides the sample height by the tile size to get 12 rows. |
| 7 | `const PIXELS = SAMPLE_WIDTH * SAMPLE_HEIGHT;` | Calculates the number of individual samples, 15,360. |
| 9 | `export function luma(rgba) {` | Defines a conversion from RGBA pixels to one grayscale byte per pixel. |
| 10 | `const gray = new Uint8Array(rgba.length / 4);` | Allocates one brightness byte per four-channel pixel for samples of any size. |
| 11 | `for (let i = 0; i < gray.length; i++) {` | Walks over however many pixels the caller supplied. |
| 12 | `const offset = i * 4;` | Skips four bytes per prior pixel to locate the current red channel. |
| 13 | `gray[i] = (77 * rgba[offset] + 150 * rgba[offset + 1] + 29 * rgba[offset + 2]) >> 8;` | Weights green most, red next, and blue least. The shift divides the integer sum by 256. |
| 14 | `}` | Closes the block or callback opened on line 11. |
| 15 | `return gray;` | Returns the grayscale array that the detector compares. |
| 16 | `}` | Closes the block or callback opened on line 9. |

### Exposure compensation

| Line | Source | What the line does |
| ---: | --- | --- |
| 18 | `function exposureOffset(before, after) {` | Estimates a common exposure shift across the frame. |
| 19 | `let sum = 0;` | Accumulates the net brightness change over the scene. |
| 20 | `let brighter = 0;` | Counts pixels that became noticeably brighter. |
| 21 | `let darker = 0;` | Counts pixels that became noticeably darker. |
| 22 | `for (let i = 0; i < after.length; i++) {` | Compares as many brightness samples as the image contains. |
| 23 | `const delta = after[i] - before[i];` | Subtracts the old luminance from the new luminance for this pixel. |
| 24 | `sum += delta;` | Adds the signed change to the running total. |
| 25 | `if (delta > 8) brighter++;` | Counts brightness increases of more than eight levels. |
| 26 | `if (delta < -8) darker++;` | Counts brightness decreases of more than eight levels. |
| 27 | `}` | Closes the block or callback opened on line 22. |
| 29 | `// Compensate when most of the image changes brightness in the same direction.` | Introduces the compensation for a camera-wide brightness adjustment. |
| 30 | `return Math.max(brighter, darker) > after.length * 0.75 ? sum / after.length : 0;` | Returns the mean brightness change when most pixels shift in the same direction. |
| 31 | `}` | Closes the block or callback opened on line 18. |

### Body motion inside a silhouette

| Line | Source | What the line does |
| ---: | --- | --- |
| 33 | `export function silhouetteMotion(previous, current, before, after) {` | Measures motion inside the AI model's current foreground mask. |
| 34 | `if (previous?.length !== current.length \|\| before?.length !== after.length \|\| current.length !== after.length) return null;` | Requires two equally sized masks and two equally sized luminance frames. |
| 35 | `const shift = exposureOffset(before, after);` | Removes a camera-wide exposure change before measuring local intensity differences. |
| 36 | `const pixels = new Uint8Array(current.length);` | Allocates one binary flag per mask pixel for the artwork. |
| 37 | `let foreground = 0;` | Counts the pixels that currently belong to the person. |
| 38 | `let changed = 0;` | Counts the current person pixels affected by motion. |
| 39 | `for (let i = 0; i < current.length; i++) {` | Scans through the mask and luminance arrays in their common order. |
| 40 | `if (current[i] < 0.62) continue;` | Ignores any pixel that the current model classifies as background. |
| 41 | `foreground++;` | Includes a confident foreground pixel in the denominator of the percentage. |
| 42 | `if (previous[i] < 0.52 \|\| Math.abs(after[i] - before[i] - shift) >= 24) {` | Marks pixels the person newly occupies and pixels with a sizable local brightness change. |
| 43 | `pixels[i] = 1;` | Stores a flag for the particle renderer at the same position. |
| 44 | `changed++;` | Adds the flagged pixel to the movement count. |
| 45 | `}` | Closes the block or callback opened on line 42. |
| 46 | `}` | Closes the block or callback opened on line 39. |
| 47 | `return { pixels, percent: foreground ? changed * 100 / foreground : 0 };` | Returns the flags and the percentage of person pixels that changed, or zero for an empty mask. |
| 48 | `}` | Closes the block or callback opened on line 33. |

### Frame-wide pixel changes

| Line | Source | What the line does |
| ---: | --- | --- |
| 50 | `export function detectMotion(before, after, sensitivity) {` | Compares two small rectangular samples for the general Motion view. |
| 51 | `const threshold = 52 - sensitivity * 0.37;` | Lowers the amount of brightness change required as sensitivity increases. |
| 52 | `const exposureShift = exposureOffset(before, after);` | Applies the same frame-wide exposure correction used by the silhouette. |
| 53 | `const counts = new Uint8Array(COLS * ROWS);` | Allocates a byte for the number of changed pixels in each tile. A tile has at most 64. |
| 54 | `for (let y = 0; y < SAMPLE_HEIGHT; y++) {` | Walks through the image rows during the second pass. |
| 55 | `for (let x = 0; x < SAMPLE_WIDTH; x++) {` | Walks through the columns in the current row. |
| 56 | `const pixel = y * SAMPLE_WIDTH + x;` | Converts the row and column into an index in both grayscale arrays. |
| 57 | `if (Math.abs(after[pixel] - before[pixel] - exposureShift) >= threshold) {` | Compares the absolute change after subtracting the exposure offset. |
| 58 | `counts[Math.floor(y / TILE) * COLS + Math.floor(x / TILE)]++;` | Adds this pixel to the count for its tile when it exceeds the threshold. |
| 59 | `}` | Closes the block or callback opened on line 57. |
| 60 | `}` | Closes the block or callback opened on line 55. |
| 61 | `}` | Closes the block or callback opened on line 54. |

### Connected regions and area

| Line | Source | What the line does |
| ---: | --- | --- |
| 63 | `let changed = 0;` | Starts the count of changed pixels in accepted regions. |
| 64 | `const regions = [];` | Prepares the list of accepted region boxes. |
| 65 | `const visited = new Uint8Array(counts.length);` | Allocates one flag per tile so flood fill never visits a tile twice. |
| 66 | `const minChanged = Math.round(17 - sensitivity * 0.1);` | Requires fewer changed pixels per tile at higher sensitivity. |
| 68 | `for (let i = 0; i < counts.length; i++) {` | Checks each tile as a possible start of a connected component. |
| 69 | `if (visited[i] \|\| counts[i] < minChanged) continue;` | Skips tiles already grouped or without enough changed pixels. |
| 70 | `const stack = [i];` | Starts a stack of tiles that belong to the new component. |
| 71 | `visited[i] = 1;` | Marks the first tile visited when it enters the stack. |
| 72 | `let left = i % COLS;` | Calculates the left boundary of the component from the first tile's column. |
| 73 | `let right = left;` | Initializes the right boundary to the same column. |
| 74 | `let top = Math.floor(i / COLS);` | Calculates the top boundary of the component from the first tile's row. |
| 75 | `let bottom = top;` | Initializes the bottom boundary to the same row. |
| 76 | `let count = 0;` | Counts changed pixels in this component as the flood fill progresses. |
| 77 | `while (stack.length) {` | Keeps expanding until there are no queued tiles. |
| 78 | `const cell = stack.pop();` | Takes the next tile off the stack. |
| 79 | `const x = cell % COLS;` | Recovers the tile's horizontal grid coordinate. |
| 80 | `const y = Math.floor(cell / COLS);` | Recovers the tile's vertical grid coordinate. |
| 81 | `left = Math.min(left, x);` | Expands the left edge when a tile sits farther left. |
| 82 | `right = Math.max(right, x);` | Expands the right edge when a tile sits farther right. |
| 83 | `top = Math.min(top, y);` | Expands the top edge when a tile sits higher. |
| 84 | `bottom = Math.max(bottom, y);` | Expands the bottom edge when a tile sits lower. |
| 85 | `count += counts[cell];` | Adds the tile's changed pixels to the region total. |
| 87 | `for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {` | Looks at the four edge-adjacent neighbors around this tile. |
| 88 | `if (nx < 0 \|\| nx >= COLS \|\| ny < 0 \|\| ny >= ROWS) continue;` | Skips neighbor coordinates that would fall outside the grid. |
| 89 | `const next = ny * COLS + nx;` | Converts a valid neighbor's coordinates into its tile index. |
| 90 | `if (visited[next] \|\| counts[next] < minChanged) continue;` | Skips already claimed neighbors and neighbors below the tile threshold. |
| 91 | `visited[next] = 1;` | Claims the neighbor when it is first queued to prevent duplicate work. |
| 92 | `stack.push(next);` | Adds the neighbor to the stack so its edges can also be checked. |
| 93 | `}` | Closes the block or callback opened on line 87. |
| 94 | `}` | Closes the block or callback opened on line 77. |
| 96 | `if (count < 35) continue;` | Drops components with fewer than 35 changed pixels to reduce noise. |
| 97 | `changed += count;` | Adds the accepted component's changed pixels to the page-wide count. |
| 98 | `regions.push({` | Creates a normalized rectangle for the completed component. |
| 99 | `x: left / COLS,` | Expresses its left edge as a fraction of the camera image width. |
| 100 | `y: top / ROWS,` | Expresses its top edge as a fraction of the camera image height. |
| 101 | `width: (right - left + 1) / COLS,` | Converts the inclusive horizontal tile range to a fraction of the width. |
| 102 | `height: (bottom - top + 1) / ROWS,` | Converts the inclusive vertical tile range to a fraction of the height. |
| 103 | `});` | Closes the block or callback opened on line 98. |
| 104 | `}` | Closes the block or callback opened on line 68. |
| 106 | `return { regions, percent: 100 * changed / PIXELS };` | Returns the rectangles and the share of all analyzed pixels that counted toward accepted regions. |
| 107 | `}` | Closes the block or callback opened on line 50. |

## `gestures.mjs`

[Open `gestures.mjs`](../gestures.mjs)

### Model and pose dictionary

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `import { loadVisionTasks } from "./mediapipe.mjs";` | Imports the same MediaPipe loader used by the artwork. |
| 3 | `const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";` | Pins the published task file that contains gesture recognition weights. |
| 5 | `const WORDS = new Map([` | Creates the dictionary from the classifier's labels to the app's demo words. |
| 6 | `["Victory", "Use"],` | Maps the peace sign to Use. |
| 7 | `["Open_Palm", "Technology"],` | Maps a single open palm to Technology. |
| 8 | `["Pointing_Up", "For"],` | Maps a raised index finger to For. |
| 9 | `["Thumb_Up", "Help"],` | Maps thumbs-up to Help. |
| 10 | `["Horns", "Not"],` | Maps the index-and-pinky pose to Not. A geometry helper detects it. |
| 11 | `["Closed_Fist", "War"],` | Maps a closed fist to War. |
| 12 | `["ILoveYou", "I love you"],` | Maps the recognized ASL handshape to I love you. |
| 13 | `]);` | Ends the array opened on line 5. |
| 15 | `export const FINISH = "Speak sequence";` | Exports the action token that speaks the sequence. |
| 17 | `export async function loadRecognizer() {` | Defines the lazy hand recognizer loader. |
| 18 | `const { sdk, fileset } = await loadVisionTasks();` | Waits for the vision SDK and matching WebAssembly files. |
| 19 | `return sdk.GestureRecognizer.createFromOptions(fileset, {` | Creates a MediaPipe GestureRecognizer and returns its async result. |
| 20 | `baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },` | Runs the chosen recognizer model with the CPU delegate. |
| 21 | `runningMode: "VIDEO",` | Uses timestamped video input. |
| 22 | `numHands: 2,` | Allows up to two hands so a two-palm command can be recognized. |
| 23 | `});` | Closes the block or callback opened on line 19. |
| 24 | `}` | Closes the block or callback opened on line 17. |

### Finger geometry and pose classification

| Line | Source | What the line does |
| ---: | --- | --- |
| 26 | `function distance(first, second) {` | Finds the distance between two 3D landmarks. |
| 27 | `return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);` | Applies the Euclidean distance formula to the differences along the three axes. |
| 28 | `}` | Closes the block or callback opened on line 26. |
| 30 | `function fingerExtension(hand, base, middle, tip) {` | Estimates how far a finger is extended. |
| 31 | `const direct = distance(hand[base], hand[tip]);` | Measures the direct length from the base joint to the tip. |
| 32 | `const path = distance(hand[base], hand[middle]) + distance(hand[middle], hand[tip]);` | Measures the path that passes through the intermediate joint. |
| 33 | `return direct / path;` | Returns a ratio near one for a straight finger and smaller for a bent finger. |
| 34 | `}` | Closes the block or callback opened on line 30. |
| 36 | `function isHorns(hand) {` | Checks the custom pose with two raised outer fingers. |
| 37 | `if (!hand \|\| hand.length !== 21) return false;` | Requires all 21 landmarks before reading them by index. |
| 38 | `const thumbTucked = distance(hand[4], hand[17]) < distance(hand[5], hand[17]) * 1.05;` | Uses the thumb tip's proximity to the far side of the palm to check for a tucked thumb. |
| 39 | `return thumbTucked &&` | Requires the thumb to be tucked. |
| 40 | `fingerExtension(hand, 5, 6, 8) > 0.9 &&` | Requires the index finger to be nearly straight. |
| 41 | `fingerExtension(hand, 17, 18, 20) > 0.9 &&` | Requires the pinky to be nearly straight. |
| 42 | `fingerExtension(hand, 9, 10, 12) < 0.88 &&` | Requires the middle finger to be bent. |
| 43 | `fingerExtension(hand, 13, 14, 16) < 0.88;` | Requires the ring finger to be bent. |
| 44 | `}` | Closes the block or callback opened on line 36. |
| 46 | `export function readPose(result) {` | Converts recognizer output to a hand count and one candidate action. |
| 47 | `const hands = result.landmarks.length;` | Counts hands using the landmark arrays, including hands with unknown gestures. |
| 48 | `const poses = result.landmarks.map((_, index) => {` | Chooses a pose classification for each hand in the result. |
| 49 | `const top = result.gestures[index]?.[0];` | Reads the highest-ranked classification when one exists. |
| 50 | `if (top?.categoryName === "ILoveYou" && top.score >= 0.6) return "ILoveYou";` | Prioritizes the recognized I love you shape with confidence of at least 0.6. |
| 51 | `if (isHorns(result.worldLandmarks?.[index])) return "Horns";` | Checks the custom pose against metric-space hand landmarks. |
| 52 | `return top?.score >= 0.6 ? top.categoryName : null;` | Uses the classifier's top category only when its confidence reaches 0.6. |
| 53 | `});` | Closes the block or callback opened on line 48. |
| 54 | `if (hands === 2 && poses.every(pose => pose === "Open_Palm")) {` | Requires two hands and an open-palm pose on both. |
| 55 | `return { hands, candidate: FINISH };` | Returns the finish action for both open palms. |
| 56 | `}` | Closes the block or callback opened on line 54. |
| 57 | `return { hands, candidate: hands === 1 ? WORDS.get(poses[0]) ?? null : null };` | Looks up a demo word for exactly one hand. Other combinations yield no candidate. |
| 58 | `}` | Closes the block or callback opened on line 46. |

### Continuous holds and repeats

| Line | Source | What the line does |
| ---: | --- | --- |
| 60 | `export class PoseHold {` | Defines the state machine that measures continuous holds and prevents repeats. |
| 61 | `reset() {` | Restores the state machine to its initial state. |
| 62 | `this.candidate = null;` | Clears the pose currently being considered. |
| 63 | `this.startedAt = 0;` | Initializes the hold timer's start timestamp. |
| 64 | `this.lastSample = null;` | Clears the timestamp of the last recognition. |
| 65 | `this.wordLocked = false;` | Allows a word to be accepted immediately after a new hold. |
| 66 | `this.finishLocked = false;` | Allows the two-palm action to be accepted after its hold. |
| 67 | `this.releasedAt = null;` | Starts without a timestamp for the hand leaving view. |
| 68 | `}` | Closes the block or callback opened on line 61. |
| 70 | `constructor() {` | Creates the state machine instance. |
| 71 | `this.reset();` | Uses the same reset logic for construction and later camera changes. |
| 72 | `}` | Closes the block or callback opened on line 70. |
| 74 | `update({ hands, candidate }, now) {` | Updates the hold timer with the current candidate, hand count, and timestamp. |
| 75 | `if (this.lastSample !== null && now - this.lastSample > 400) {` | Checks for a gap longer than 400 ms between recognition samples. |
| 76 | `this.candidate = null;` | Discards a pending hold when the sampling gap is too long to prove continuity. |
| 77 | `this.releasedAt = null;` | Clears release timing for that gap too. |
| 78 | `}` | Closes the block or callback opened on line 75. |
| 79 | `this.lastSample = now;` | Saves this sample time for the next continuity check. |
| 81 | `if (hands === 0) {` | Detects when no hands are visible. |
| 82 | `this.releasedAt ??= now;` | Starts timing the release only on the first hand-free frame. |
| 83 | `if (now - this.releasedAt >= 350) this.wordLocked = false;` | Allows a new word after hands have been gone for at least 350 ms. |
| 84 | `} else {` | Handles frames with at least one visible hand. |
| 85 | `this.releasedAt = null;` | Clears the release timer while a hand is visible. |
| 86 | `}` | Closes the block or callback opened on line 84. |
| 87 | `if (candidate !== FINISH) this.finishLocked = false;` | Rearms the finish action once both palms are no longer the candidate. |
| 89 | `const locked = candidate === FINISH ? this.finishLocked : this.wordLocked;` | Chooses the independent lock for a word or for the finish pose. |
| 90 | `if (locked \|\| !candidate) {` | Checks whether the candidate is locked or missing. |
| 91 | `this.candidate = null;` | Removes the pending candidate when there is nothing new to time. |
| 92 | `return { progress: 0, accepted: null, locked };` | Reports zero hold progress and preserves the lock's state for UI feedback. |
| 93 | `}` | Closes the block or callback opened on line 90. |
| 94 | `if (candidate !== this.candidate) {` | Detects a valid pose that differs from the previously timed pose. |
| 95 | `this.candidate = candidate;` | Stores the new pose as the active candidate. |
| 96 | `this.startedAt = now;` | Restarts the hold clock at the current timestamp. |
| 97 | `}` | Closes the block or callback opened on line 94. |
| 99 | `const progress = Math.min(1, (now - this.startedAt) / (candidate === FINISH ? 2000 : 1500));` | Computes the progress fraction. Words take 1.5 seconds and the finish pose takes two seconds. |
| 100 | `if (progress < 1) return { progress, accepted: null, locked: false };` | Reports partial progress while waiting for the hold to complete. |
| 101 | `if (candidate === FINISH) this.finishLocked = true;` | Locks the finish pose until the user changes it. |
| 102 | `else this.wordLocked = true;` | Locks ordinary words until hands are released. |
| 103 | `return { progress: 1, accepted: candidate, locked: false };` | Emits the accepted pose as a one-time result for this frame. |
| 104 | `}` | Closes the block or callback opened on line 74. |
| 105 | `}` | Closes the block or callback opened on line 60. |

### Speech text

| Line | Source | What the line does |
| ---: | --- | --- |
| 107 | `export function sequenceText(words) {` | Formats the transcript for speech. |
| 108 | `const sentence = words.join(" ").toLowerCase();` | Joins all words with spaces and normalizes the text to lowercase. |
| 109 | `if (!sentence) return "";` | Returns an empty string for an empty transcript. |
| 110 | `if (sentence === "use technology for help not war") return "Use technology to help people, not for war.";` | Speaks the reference demo's six-word sequence as a natural English sentence. |
| 111 | `const withPronouns = sentence.replace(/\bi\b/g, "I");` | Restores capitalization to standalone instances of the pronoun I. |
| 112 | `return withPronouns[0].toUpperCase() + withPronouns.slice(1) + ".";` | Capitalizes the opening letter and adds a period. |
| 113 | `}` | Closes the block or callback opened on line 107. |

## `mediapipe.mjs`

[Open `mediapipe.mjs`](../mediapipe.mjs)

### Shared vision runtime

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `const SDK_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32";` | Keeps the versioned MediaPipe package URL in one place for both vision modes. |
| 3 | `export async function loadVisionTasks() {` | Exports a promise-based loader that either vision mode can call on demand. |
| 4 | `const sdk = await import(SDK_URL + "/vision_bundle.mjs");` | Imports the JavaScript bundle when a MediaPipe model is first needed. |
| 5 | `const fileset = await sdk.FilesetResolver.forVisionTasks(SDK_URL + "/wasm");` | Resolves the matching WebAssembly runtime files for the browser. |
| 6 | `return { sdk, fileset };` | Returns the loaded library and runtime file set to the caller. |
| 7 | `}` | Closes the block or callback opened on line 3. |

## `caption-worker.mjs`

[Open `caption-worker.mjs`](../caption-worker.mjs)

### Model download, inference, and reply

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/";` | Pins the exact browser build of Transformers.js. |
| 2 | `const MODEL = "Xenova/vit-gpt2-image-captioning";` | Selects the quantized ONNX image captioning model. |
| 4 | `let captioner;` | Holds the initialized image-to-text pipeline across worker requests. |
| 5 | `let RawImage;` | Holds the library's image wrapper class after the first import. |
| 7 | `self.onmessage = async ({ data: { id, width, height, buffer } }) => {` | Receives a request and unpacks its id, dimensions, and transferred pixel buffer. |
| 8 | `try {` | Wraps startup and caption inference in one error handler. |
| 9 | `if (!captioner) {` | Loads the library and model on the first request handled by this worker. |
| 10 | `self.postMessage({ id, status: "loading" });` | Sends a loading message that the main UI can display. |
| 11 | `const library = await import(TRANSFORMERS + "transformers.min.js");` | Imports the browser library over a public model-asset connection. |
| 12 | `RawImage = library.RawImage;` | Stores the constructor used to wrap raw RGBA pixels. |
| 13 | `library.env.allowLocalModels = false;` | Directs the library to fetch the public model rather than looking for a local model directory. |
| 14 | `library.env.backends.onnx.wasm.numThreads = 1;` | Uses one WebAssembly thread so the app can run on a plain local static server. |
| 15 | `// Keep the WASM runtime and JavaScript glue on the same distribution.` | Explains why the next line pins runtime files together with the library build. |
| 16 | `library.env.backends.onnx.wasm.wasmPaths = TRANSFORMERS;` | Points ONNX Runtime to the matching JavaScript and WebAssembly distribution. |
| 17 | `captioner = await library.pipeline("image-to-text", MODEL, { device: "wasm", dtype: "q8" });` | Downloads and prepares the quantized pipeline using the WebAssembly backend. |
| 18 | `}` | Closes the block or callback opened on line 9. |
| 20 | `self.postMessage({ id, status: "working" });` | Reports that the model is ready and the caption inference is starting. |
| 21 | `const image = new RawImage(new Uint8ClampedArray(buffer), width, height, 4);` | Rebuilds an RGBA image wrapper around the transferred pixel bytes. Four channels are supplied. |
| 22 | `const [result] = await captioner(image, { max_new_tokens: 30 });` | Runs caption generation with a limit of 30 new tokens and reads the first result. |
| 23 | `const caption = result.generated_text.trim();` | Trims whitespace from the model's generated text. |
| 24 | `if (!caption) throw new Error("The model returned an empty caption.");` | Treats a blank caption as a recoverable failure. |
| 25 | `self.postMessage({ id, caption });` | Sends the generated caption and its request id to the page. |
| 26 | `} catch (error) {` | Catches download, initialization, or inference errors. |
| 27 | `self.postMessage({ id, error: error.message \|\| String(error) });` | Sends the error detail back to the main thread so the UI can show a retry. |
| 28 | `}` | Closes the block or callback opened on line 26. |
| 29 | `};` | Closes the block or callback opened on line 7. |

## `test/object-detection.test.mjs`

[Open `test/object-detection.test.mjs`](../test/object-detection.test.mjs)

### Object bounds and mirror regression tests

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `import assert from "node:assert/strict";` | Loads strict equality and pattern assertions from Node.js. |
| 2 | `import { test } from "node:test";` | Loads the test function from the built-in Node.js test runner. |
| 3 | `import { placeLabel, projectBox, readObjects, trackObjects } from "../object-detection.mjs";` | Imports the object worker result helpers, track matcher, and overlay geometry. |
| 5 | `test("object results preserve confidence and clip boxes to the camera frame", () => {` | Defines a test for normalized object bounds and confidence. |
| 6 | `const detections = [` | Builds a fake MediaPipe result array with three cases. |
| 7 | `{` | Starts the object that partly crosses the camera's left and bottom edges. |
| 8 | `categories: [{ categoryName: "person", score: 0.96 }],` | Assigns a valid person class and confidence. |
| 9 | `boundingBox: { originX: -15, originY: 25, width: 65, height: 100 },` | Places part of the person box outside the 100-by-100 frame. |
| 10 | `},` | Closes the block or callback opened on line 7. |
| 11 | `{` | Starts an object that is fully outside the frame. |
| 12 | `categories: [{ categoryName: "chair", score: 0.72 }],` | Assigns the chair a valid model class and confidence. |
| 13 | `boundingBox: { originX: 120, originY: 20, width: 10, height: 50 },` | Places the chair's left edge beyond the frame's right edge. |
| 14 | `},` | Closes the block or callback opened on line 11. |
| 15 | `{` | Starts an object with a valid box and an invalid confidence. |
| 16 | `categories: [{ categoryName: "dog", score: NaN }],` | Supplies a nonnumeric confidence to exercise the validator. |
| 17 | `boundingBox: { originX: 15, originY: 25, width: 65, height: 50 },` | Gives the invalid detection a box that would otherwise be accepted. |
| 18 | `},` | Closes the block or callback opened on line 15. |
| 19 | `];` | Ends the array opened on line 6. |
| 20 | `const [person, ...others] = readObjects(detections, 100, 100);` | Converts the fake model output and separates the first result. |
| 21 | `assert.deepEqual(others, []);` | Asserts that only the clipped person survived filtering. |
| 22 | `const { color, ...result } = person;` | Separates the palette color from the testable box and class data. |
| 23 | `assert.match(color, /^#[0-9a-f]{6}$/);` | Checks that the class color is a valid six-digit hexadecimal color. |
| 24 | `assert.deepEqual(` | Starts comparing the normalized result to expected data. |
| 25 | `result,` | Supplies the actual result. |
| 26 | `{ label: "person", score: 0.96, x: 0, y: 0.25, width: 0.5, height: 0.75 },` | Expects the original label and confidence, a clipped left edge, and a bottom edge aligned with the frame. |
| 27 | `);` | Closes the block or callback opened on line 24. |
| 28 | `});` | Closes the block or callback opened on line 5. |
| 30 | `test("letterboxed overlay mirrors its horizontal position and keeps its size", () => {` | Defines a test for mirrored coordinates inside a letterboxed preview. |
| 31 | `const box = { x: 0.125, y: 0.25, width: 0.25, height: 0.5 };` | Supplies a normalized example rectangle. |
| 32 | `const view = { x: 50, y: 20, width: 400, height: 200 };` | Supplies a video display offset and its dimensions in CSS pixels. |
| 33 | `assert.deepEqual(projectBox(box, view, false), [100, 70, 100, 100]);` | Checks the rectangle's location with mirroring disabled. |
| 34 | `assert.deepEqual(projectBox(box, view, true), [300, 70, 100, 100]);` | Checks that mirroring changes only the rectangle's horizontal location. |
| 35 | `});` | Closes the block or callback opened on line 30. |
| 37 | `test("neighboring labels choose separate rows when their boxes are close", () => {` | Defines a regression test for nearby labels on a compact preview. |
| 38 | `const view = { x: 50, y: 20, width: 200, height: 100 };` | Makes a video area with known edges and enough height for multiple labels. |
| 39 | `const first = placeLabel([130, 44], 90, 20, view, []);` | Places the first badge without any conflict. |
| 40 | `const second = placeLabel([180, 49], 90, 20, view, [first]);` | Places a second badge near the first and close to the video's right edge. |
| 41 | `assert.deepEqual(first, { x: 130, y: 24, width: 90, height: 20 });` | Expects the first badge above its box. |
| 42 | `assert.deepEqual(second, { x: 160, y: 49, width: 90, height: 20 });` | Expects the second badge shifted left and moved to a different row. |
| 43 | `});` | Closes the block or callback opened on line 37. |
| 45 | `test("object tracks confirm twice, smooth matching boxes, and expire after a brief gap", () => {` | Tests that a moving box is confirmed, smoothed, and removed on time. |
| 46 | `const box = { label: "dog", x: 0.125, y: 0, width: 0.5, height: 0.5 };` | Defines a dog box with normalized dimensions. |
| 47 | `const first = trackObjects([], [box], 0);` | Sends a single detection into an empty tracker. |
| 48 | `assert.equal(first[0].seen, 1);` | Checks that the track starts unconfirmed. |
| 49 | `const next = trackObjects(first, [{ ...box, x: 0.25 }], 180);` | Sends the same class with a slightly changed position 180 ms later. |
| 50 | `assert.equal(next.length, 1);` | Verifies the tracker considers both samples one object. |
| 51 | `assert.equal(next[0].seen, 2);` | Checks that the second match confirms the track. |
| 52 | `assert.equal(next[0].x, 0.21875);` | Confirms smoothing blends the first and second positions. |
| 53 | `assert.deepEqual(trackObjects(next, [], 360), next);` | Simulates a brief missed detection and verifies that a confirmed track remains visible. |
| 54 | `assert.deepEqual(trackObjects(next, [], 581), []);` | Checks that the track disappears after its hold expires. |
| 55 | `});` | Closes the block or callback opened on line 45. |

## `test/silhouette-motion.test.mjs`

[Open `test/silhouette-motion.test.mjs`](../test/silhouette-motion.test.mjs)

### Foreground motion and exposure regression tests

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `import assert from "node:assert/strict";` | Imports strict equality checks from Node.js. |
| 2 | `import { test } from "node:test";` | Imports the built-in test runner. |
| 3 | `import { silhouetteMotion } from "../motion.mjs";` | Imports the masked motion calculation used by the artwork. |
| 5 | `test("silhouette motion counts only changed foreground pixels", () => {` | Tests scene movement against the boundary of the person mask. |
| 6 | `const previous = [0.9, 0.9, 0.1, 0.1];` | Marks the first two samples as foreground in the previous mask. |
| 7 | `const current = [0.9, 0.9, 0.9, 0.1];` | Includes one new foreground pixel in the current mask. |
| 8 | `const before = [30, 30, 30, 30];` | Gives the previous frame uniform brightness. |
| 9 | `const after = [70, 30, 30, 100];` | Changes a person pixel and a background pixel while preserving another person pixel. |
| 10 | `const result = silhouetteMotion(previous, current, before, after);` | Measures the foreground changes. |
| 11 | `assert.deepEqual([...result.pixels], [1, 0, 1, 0]);` | Checks for exactly two flagged pixels including the one newly occupied by the person. |
| 12 | `assert.equal(result.percent, 200 / 3);` | Checks that two of the three current foreground pixels yields the expected percentage. |
| 13 | `});` | Closes the block or callback opened on line 5. |
| 15 | `test("silhouette ignores the first frame and a uniform exposure shift", () => {` | Tests initial state and camera exposure changes. |
| 16 | `const mask = [0.9, 0.9, 0.1, 0.1];` | Defines a mask covering half the sample pixels. |
| 17 | `const dark = [20, 20, 20, 20];` | Defines a first uniform brightness sample. |
| 18 | `const light = [60, 60, 60, 60];` | Makes every pixel in the next sample brighter by the same amount. |
| 19 | `assert.equal(silhouetteMotion(null, mask, dark, light), null);` | Confirms the first available frame alone has no motion measurement. |
| 20 | `assert.equal(silhouetteMotion(mask, mask, dark, light).percent, 0);` | Confirms that a uniform exposure shift contributes no foreground movement. |
| 21 | `});` | Closes the block or callback opened on line 15. |
