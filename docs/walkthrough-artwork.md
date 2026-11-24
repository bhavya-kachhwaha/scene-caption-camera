# Particle artwork

The person model returns a confidence for each input pixel. The renderer draws a colored point where the sampled confidence is high enough. The moon, willow, sky, and grass come from Canvas drawing commands.

[Back to the code walkthrough](./code-walkthrough.md)

## `particle-art.mjs`

[Open `particle-art.mjs`](../particle-art.mjs)

### Person model and drawing helpers

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `import { loadVisionTasks } from "./mediapipe.mjs";` | Imports the shared MediaPipe library and WebAssembly loader. |
| 2 | `import { luma, silhouetteMotion } from "./motion.mjs";` | Reuses the motion module's grayscale conversion and masked frame comparison. |
| 4 | `const WIDTH = 960;` | Sets the artwork's internal width in drawing pixels. |
| 5 | `const HEIGHT = 540;` | Sets the artwork's internal height. Together the dimensions form a 16-by-9 drawing. |
| 6 | `const GROUND = 381;` | Sets the nominal horizon used by stars, grass, and the tree. |
| 7 | `const MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/1/selfie_segmenter_landscape.tflite";` | Pins the URL of Google's landscape selfie segmentation model. |
| 8 | `const LEAF_COLORS = ["#415790", "#586eb5", "#7f80d6", "#aea1f4"];` | Lists four colors for the willow canopy particles. |
| 9 | `const BODY_COLORS = ["#4967a4", "#589cec", "#91dfff", "#c5b2ff"];` | Lists four colors for the silhouette particles. |
| 11 | `export async function loadPersonSegmenter() {` | Defines the on-demand person segmentation loader used by the app. |
| 12 | `const { sdk, fileset } = await loadVisionTasks();` | Awaits the vision library and its matching WebAssembly files. |
| 13 | `return sdk.ImageSegmenter.createFromOptions(fileset, {` | Creates a MediaPipe ImageSegmenter with the given options. |
| 14 | `baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },` | Uses the published person model and selects the CPU delegate. |
| 15 | `runningMode: "VIDEO",` | Uses video mode because subsequent samples come with frame timestamps. |
| 16 | `outputCategoryMask: false,` | Requests no winning-class image, which the renderer would not use. |
| 17 | `outputConfidenceMasks: true,` | Requests floating-point masks so particles can use foreground confidence. |
| 18 | `});` | Closes the block or callback opened on line 13. |
| 19 | `}` | Closes the block or callback opened on line 11. |
| 21 | `function randomSequence() {` | Creates a repeatable sequence of numbers that look random. |
| 22 | `let state = 18;` | Uses the same starting seed on every page load. |
| 23 | `return () => {` | Returns a function that advances the sequence each time it is called. |
| 24 | `state = (Math.imul(1664525, state) + 1013904223) >>> 0;` | Updates the seed with a linear congruential formula and wraps it to an unsigned 32-bit integer. |
| 25 | `return state / 4294967296;` | Converts the integer to a number from zero up to, but excluding, one. |
| 26 | `};` | Closes the block or callback opened on line 23. |
| 27 | `}` | Closes the block or callback opened on line 21. |
| 29 | `function gradient(context, x, y, radius, color) {` | Builds a radial gradient for the camera-free scene. |
| 30 | `const glow = context.createRadialGradient(x, y, 0, x, y, radius);` | Creates two concentric circles with radii zero and radius. |
| 31 | `glow.addColorStop(0, color);` | Gives the gradient its chosen color at the center. |
| 32 | `glow.addColorStop(1, "transparent");` | Fades the color to transparent at the outer edge. |
| 33 | `return glow;` | Returns the gradient for use as a Canvas fill style. |
| 34 | `}` | Closes the block or callback opened on line 29. |

### Seeded scene geometry

| Line | Source | What the line does |
| ---: | --- | --- |
| 36 | `function makeLandscape() {` | Precomputes the static positions of the stars, grass, and willow. |
| 37 | `const random = randomSequence();` | Starts a new seeded random sequence for the scene. |
| 38 | `const stars = Array.from({ length: 136 }, () => [` | Builds 136 star records. |
| 39 | `random() * WIDTH, random() * GROUND, 0.5 + random() * 1.9, random() * 6.28,` | Gives each star a position above the horizon, a size, and a starting twinkle phase. |
| 40 | `]);` | Ends the array opened on line 38. |
| 41 | `const grass = Array.from({ length: 1050 }, () => [` | Builds 1,050 grass blade records. |
| 42 | `random() * WIDTH, GROUND + random() * (HEIGHT - GROUND), 4 + random() * 27, random() * 6.28,` | Places each blade beneath the horizon and assigns a length and phase. |
| 43 | `]);` | Ends the array opened on line 41. |
| 44 | `const branches = [];` | Starts a list for the curved tree segments. |
| 45 | `const leaves = [];` | Starts a list for canopy particles. |
| 46 | `const branch = (x, y, angle, length, thickness, depth) => {` | Defines a function that records a branch, then optionally forks it. |
| 47 | `const endX = x + Math.cos(angle) * length;` | Uses cosine to find the branch's horizontal endpoint. |
| 48 | `const endY = y + Math.sin(angle) * length;` | Uses sine to find the vertical endpoint. Negative values point up on a canvas. |
| 49 | `const bendX = (x + endX) / 2 + (random() - 0.5) * length * 0.4;` | Offsets the branch's horizontal control point to give it a curved shape. |
| 50 | `branches.push([x, y, endX, endY, bendX, thickness]);` | Stores the geometry and thickness for the drawing loop. |
| 51 | `if (depth > 0) {` | Recurses only while there are more levels of branching to make. |
| 52 | `for (const direction of [-1, 1]) {` | Creates one fork on each side of the current branch's direction. |
| 53 | `branch(endX, endY, angle + direction * (0.25 + random() * 0.65),` | Starts a child at the branch end and offsets its angle. |
| 54 | `length * (0.59 + random() * 0.16), thickness * 0.64, depth - 1);` | Shortens and thins each child, then reduces the remaining recursion depth. |
| 55 | `}` | Closes the block or callback opened on line 52. |
| 56 | `}` | Closes the block or callback opened on line 51. |
| 57 | `for (let i = 0; i < 75; i++) {` | Places 75 leaf particles near each branch. |
| 58 | `const along = random();` | Picks a position along the current branch. |
| 59 | `const drop = (random() ** 1.9) * (33 + length * 0.9);` | Offsets the particle downward. The exponent concentrates more particles near the branch. |
| 60 | `const leafX = endX - (endX - x) * along + (random() - 0.5) * 24;` | Adds horizontal irregularity so the leaves spread into a canopy. |
| 61 | `const leafY = endY - (endY - y) * along + drop;` | Adds the downward offset to the selected position's height. |
| 62 | `leaves.push([leafX, leafY, random() * 6.28, drop, i % LEAF_COLORS.length]);` | Stores position, twinkle phase, drop length, and a palette index. |
| 63 | `}` | Closes the block or callback opened on line 57. |
| 64 | `};` | Closes the block or callback opened on line 46. |
| 65 | `branch(722, GROUND + 10, -1.75, 130, 19, 0);` | Adds a thick trunk without automatic forks. The next block adds its main limbs. |
| 66 | `for (const [x, y, angle, length] of [` | Reads each initial limb's origin, angle, and length. |
| 67 | `[712, 315, -2.7, 95], [704, 293, -2.15, 119], [700, 267, -1.53, 100],` | Places the leftmost limbs and the upright limb. |
| 68 | `[700, 262, -0.91, 97], [706, 294, -0.35, 108], [713, 323, 0.02, 77],` | Places the remaining upper and right-side limbs. |
| 69 | `]) {` | Finishes the list of seed limbs and opens the loop. |
| 70 | `branch(x, y, angle, length, 7, 2);` | Grows two levels of forks from each of the initial limbs. |
| 71 | `}` | Closes the block or callback opened on line 69. |
| 72 | `return { stars, grass, branches, leaves };` | Returns the reusable positions for all four layers. |
| 73 | `}` | Closes the block or callback opened on line 36. |

### Demo silhouette mask

| Line | Source | What the line does |
| ---: | --- | --- |
| 75 | `function demoMask(context, seconds) {` | Generates pixels for the camera-free demo figure. |
| 76 | `const { width, height } = context.canvas;` | Reads the resolution of the offscreen demo canvas. |
| 77 | `const x = width * 0.49 + Math.sin(seconds * 1.2) * 9;` | Moves the figure left and right around the horizontal center. |
| 78 | `const shoulder = height * 0.36;` | Places the shoulder a little above the first half of the image. |
| 79 | `const hip = height * 0.6;` | Places the hip at 60 percent of the demo canvas height. |
| 80 | `const hand = shoulder + Math.sin(seconds * 2.1) * 14;` | Moves the raised hand up and down with time. |
| 81 | `context.clearRect(0, 0, width, height);` | Clears the old figure and restores transparent background pixels. |
| 82 | `context.fillStyle = context.strokeStyle = "#fff";` | Draws a white silhouette whose coverage is stored in the alpha channel. |
| 83 | `context.lineCap = "round";` | Rounds the ends of the body segments so the joints join smoothly. |
| 84 | `context.beginPath();` | Starts a path for the head. |
| 85 | `context.arc(x, height * 0.23, 10, 0, Math.PI * 2);` | Draws a head circle around the current horizontal position. |
| 86 | `context.fill();` | Fills the circle to make an opaque head. |
| 87 | `for (const [startX, startY, endX, endY, thickness] of [` | Reads each body segment's start, end, and thickness. |
| 88 | `[x, shoulder, x, hip, 27],` | Defines the torso from shoulder to hip. |
| 89 | `[x - 10, shoulder, x - 30, hip - 1, 9],` | Defines the lower arm on the left side of the figure. |
| 90 | `[x + 10, shoulder, x + 34, hand, 9],` | Defines the moving arm on the right side of the figure. |
| 91 | `[x - 6, hip - 1, x - 13, height * 0.9, 12],` | Draws the left leg toward the bottom of the mask. |
| 92 | `[x + 6, hip - 1, x + 14, height * 0.9, 12],` | Draws the right leg toward the bottom of the mask. |
| 93 | `]) {` | Finishes the body parts list and opens the drawing loop. |
| 94 | `context.beginPath();` | Starts a fresh path for the current limb or torso. |
| 95 | `context.lineWidth = thickness;` | Sets the stroke width to the thickness of that body part. |
| 96 | `context.moveTo(startX, startY);` | Moves the drawing pen to the segment's start point. |
| 97 | `context.lineTo(endX, endY);` | Adds a line to the segment's end point. |
| 98 | `context.stroke();` | Paints the body segment into the mask. |
| 99 | `}` | Closes the block or callback opened on line 93. |
| 100 | `return context.getImageData(0, 0, width, height).data;` | Returns the demo image's red, green, blue, and alpha bytes. |
| 101 | `}` | Closes the block or callback opened on line 75. |

### Renderer and webcam input

| Line | Source | What the line does |
| ---: | --- | --- |
| 103 | `export class ParticleArtwork {` | Exports the renderer that owns the artwork and its current person mask. |
| 104 | `constructor(canvas) {` | Builds an artwork renderer around the visible canvas supplied by the app. |
| 105 | `canvas.width = WIDTH;` | Gives the visible canvas its internal pixel width. |
| 106 | `canvas.height = HEIGHT;` | Gives the visible canvas its internal pixel height. |
| 107 | `this.context = canvas.getContext("2d");` | Gets the drawing API used by every painted layer. |
| 108 | `this.landscape = makeLandscape();` | Generates and saves the seeded star, willow, and grass positions once. |
| 109 | `this.input = document.createElement("canvas");` | Creates an offscreen canvas for smaller camera input frames. |
| 110 | `this.inputContext = this.input.getContext("2d", { willReadFrequently: true });` | Optimizes the offscreen canvas for reading frame pixels after drawing. |
| 111 | `const sample = document.createElement("canvas");` | Creates a second offscreen canvas for the demo silhouette. |
| 112 | `sample.width = 164;` | Sets the demo canvas width. |
| 113 | `sample.height = 132;` | Sets the demo canvas height. |
| 114 | `this.demoContext = sample.getContext("2d", { willReadFrequently: true });` | Requests a context optimized for reading demo pixels back. |
| 115 | `this.reset();` | Starts the renderer with a clean set of camera-dependent samples. |
| 116 | `}` | Closes the block or callback opened on line 104. |
| 118 | `reset() {` | Clears the data used by the next silhouette frame comparison. |
| 119 | `this.mask = null;` | Starts without a live mask until camera segmentation succeeds. |
| 120 | `this.previousLuma = null;` | Drops the preceding brightness frame. |
| 121 | `this.motion = null;` | Clears the most recent body-motion measurement and pixel flags. |
| 122 | `}` | Closes the block or callback opened on line 118. |
| 124 | `capture(segmenter, video, now) {` | Samples one webcam frame and stores the person's foreground confidence. |
| 125 | `const scale = Math.min(1, 320 / Math.max(video.videoWidth, video.videoHeight));` | Chooses a scale so the camera frame's long side is at most 320 pixels. |
| 126 | `const width = Math.max(1, Math.round(video.videoWidth * scale));` | Rounds the scaled input width and keeps it at least one pixel wide. |
| 127 | `const height = Math.max(1, Math.round(video.videoHeight * scale));` | Rounds the scaled input height and keeps it at least one pixel tall. |
| 128 | `if (width !== this.input.width \|\| height !== this.input.height) {` | Checks whether the input canvas needs resizing. |
| 129 | `this.input.width = width;` | Resizes the input width. This clears existing input canvas contents. |
| 130 | `this.input.height = height;` | Resizes the input height to match the current source ratio. |
| 131 | `}` | Closes the block or callback opened on line 128. |
| 132 | `this.inputContext.drawImage(video, 0, 0, width, height);` | Copies the current unmirrored color camera frame to the small input canvas. |
| 133 | `const gray = luma(this.inputContext.getImageData(0, 0, width, height).data);` | Reads a grayscale copy of the resized camera frame. |
| 134 | `const label = segmenter.getLabels().findIndex(name => /^(person\|foreground)$/i.test(name));` | Looks for a foreground or person class name in the model metadata. |
| 135 | `segmenter.segmentForVideo(this.input, now, result => {` | Runs MediaPipe synchronously on the resized frame and provides its video timestamp. |
| 136 | `const masks = result.confidenceMasks;` | Gets the returned list of confidence maps. |
| 137 | `const mask = masks.length === 1 ? masks[0] : masks[label < 0 ? 1 : label];` | Accepts the single-map selfie model. For two classes, uses the matching label or the expected foreground index of one. |
| 138 | `if (!mask) throw new Error("The person model did not return a foreground mask.");` | Raises an error if the model returned no usable person mask. |
| 139 | `const values = mask.getAsFloat32Array().slice();` | Copies the confidence pixels while the segmentation callback owns the original buffer. |
| 140 | `const sameSize = this.mask?.width === mask.width && this.mask.height === mask.height &&` | Checks that a previous mask exists with the same dimensions. |
| 141 | `mask.width === width && mask.height === height;` | Confirms the new mask uses the same coordinate grid as the grayscale frame. |
| 142 | `this.motion = sameSize ? silhouetteMotion(this.mask.values, values, this.previousLuma, gray) : null;` | Measures change inside the silhouette when the previous frame is compatible. |
| 143 | `this.mask = { width: mask.width, height: mask.height, values };` | Stores the new person mask and its dimensions for drawing. |
| 144 | `this.previousLuma = gray;` | Keeps the grayscale frame for the next comparison. |
| 145 | `});` | Closes the block or callback opened on line 135. |
| 146 | `}` | Closes the block or callback opened on line 124. |

### Sky, moon, tree, and grass

| Line | Source | What the line does |
| ---: | --- | --- |
| 148 | `draw(seconds, wind, useDemo, mirror, showMotion) {` | Draws the landscape and chooses whether movement changes the silhouette colors. |
| 149 | `const { context, landscape } = this;` | Retrieves the drawing context and the precomputed scene. |
| 150 | `const { stars, grass, branches, leaves } = landscape;` | Reads each set of saved scene points and curves. |
| 151 | `const sky = context.createLinearGradient(0, 0, 0, HEIGHT);` | Creates a vertical gradient from the top to the bottom of the canvas. |
| 152 | `sky.addColorStop(0, "#070c21");` | Uses deep navy at the top of the sky. |
| 153 | `sky.addColorStop(0.69, "#192a52");` | Places lighter blue above the horizon. |
| 154 | `sky.addColorStop(1, "#070d20");` | Darkens the bottom area under the grass. |
| 155 | `context.fillStyle = sky;` | Sets the gradient as the current fill. |
| 156 | `context.fillRect(0, 0, WIDTH, HEIGHT);` | Fills the entire canvas and paints over the previous frame. |
| 157 | `context.fillStyle = gradient(context, 195, 128, 170, "#394382a0");` | Creates a wide violet haze around the moon's position. |
| 158 | `context.fillRect(0, 0, WIDTH, HEIGHT);` | Blends the haze across the sky. |
| 159 | `for (const [x, y, radius, phase] of stars) {` | Reads a star's position, size, and phase. |
| 160 | `context.globalAlpha = 0.35 + 0.26 * Math.sin(seconds * 1.35 + phase);` | Uses a sine wave to vary the star's opacity over time. |
| 161 | `context.fillStyle = "#c1d7ff";` | Chooses a light blue star color. |
| 162 | `context.fillRect(x, y, radius, radius);` | Draws a small square at the star's saved location. |
| 163 | `}` | Closes the block or callback opened on line 159. |
| 164 | `context.globalAlpha = 1;` | Restores full opacity so later layers do not inherit the last star's alpha. |
| 166 | `context.fillStyle = gradient(context, 195, 128, 68, "#b6a5ff4c");` | Creates a tighter violet halo at the moon. |
| 167 | `context.fillRect(125, 58, 140, 140);` | Limits that halo draw to a square around the moon. |
| 168 | `context.fillStyle = "#d3c9ff";` | Sets the color of the visible moon disc. |
| 169 | `context.beginPath();` | Starts the moon disc path. |
| 170 | `context.arc(195, 128, 26, 0, Math.PI * 2);` | Traces the main moon circle. |
| 171 | `context.fill();` | Fills the first moon circle. |
| 172 | `context.fillStyle = "#1b2246";` | Chooses a dark color close to the nearby sky. |
| 173 | `context.beginPath();` | Starts the circle that cuts the crescent shape. |
| 174 | `context.arc(207, 117, 23, 0, Math.PI * 2);` | Offsets a smaller circle up and to the right. |
| 175 | `context.fill();` | Fills the second circle over the first to leave a visible crescent. |
| 177 | `context.fillStyle = "#0a122b";` | Sets the ground's dark foreground color. |
| 178 | `context.beginPath();` | Starts a new ground shape. |
| 179 | `context.moveTo(0, GROUND + 7);` | Begins the horizon at the left edge. |
| 180 | `context.bezierCurveTo(260, GROUND - 21, 555, GROUND + 27, WIDTH, GROUND - 19);` | Makes the horizon slope gently using a cubic Bézier curve. |
| 181 | `context.lineTo(WIDTH, HEIGHT);` | Extends the ground to the bottom right. |
| 182 | `context.lineTo(0, HEIGHT);` | Extends the ground to the bottom left. |
| 183 | `context.fill();` | Fills the resulting shape from the horizon down. |
| 185 | `context.lineCap = "round";` | Rounds the ends of the tree strokes. |
| 186 | `for (const [x, y, endX, endY, bendX, thickness] of branches) {` | Reads the trunk or branch curve parameters. |
| 187 | `const sway = wind * Math.sin(seconds * 1.2 + x * 0.018) * (GROUND - endY) * 0.05;` | Computes horizontal wind sway. Higher branches move farther. |
| 188 | `context.strokeStyle = thickness > 10 ? "#35477d" : "#5a639e";` | Uses the darker color for the thick trunk and a lighter color for branches. |
| 189 | `context.lineWidth = thickness;` | Sets each branch stroke to its stored thickness. |
| 190 | `context.beginPath();` | Starts a new branch path. |
| 191 | `context.moveTo(x, y);` | Sets the start point of the branch curve. |
| 192 | `context.quadraticCurveTo(bendX + sway / 2, (y + endY) / 2, endX + sway, endY);` | Bends the curve across its control point and moves its tip by the wind offset. |
| 193 | `context.stroke();` | Strokes the branch into the scene. |
| 194 | `}` | Closes the block or callback opened on line 186. |
| 195 | `for (const [x, y, phase, drop, color] of leaves) {` | Reads each leaf's base position, phase, drop length, and color. |
| 196 | `const sway = wind * Math.sin(seconds * 1.5 + x * 0.016) * (6 + drop * 0.19);` | Moves hanging leaves sideways. Longer drops have more wind movement. |
| 197 | `context.globalAlpha = 0.48 + 0.23 * Math.sin(phase + seconds * 2);` | Varies leaf opacity by its individual phase and elapsed time. |
| 198 | `context.fillStyle = LEAF_COLORS[color];` | Picks a color from the willow palette. |
| 199 | `context.fillRect(x + sway, y, color === 3 ? 2.5 : 1.8, 2.2);` | Draws a small leaf point. The lightest ones occupy a few more pixels. |
| 200 | `}` | Closes the block or callback opened on line 195. |
| 201 | `context.globalAlpha = 1;` | Resets opacity before drawing the grass and person. |
| 203 | `context.lineWidth = 1;` | Makes grass strokes one pixel wide. |
| 204 | `for (const [x, y, length, phase] of grass) {` | Reads a grass blade's anchor point, length, and phase. |
| 205 | `const sway = Math.sin(seconds * 2 + x * 0.025) * length * 0.52 * wind;` | Uses a time wave that varies across the ground to bend each blade. |
| 206 | `context.strokeStyle = phase > 4.6 ? "#465c93" : "#263862";` | Assigns a lighter color to part of the grass for texture. |
| 207 | `context.beginPath();` | Starts the current grass path. |
| 208 | `context.moveTo(x, y);` | Anchors the blade at its base position. |
| 209 | `context.quadraticCurveTo(x + sway / 3, y - length * 0.6, x + sway + 3, y - length);` | Draws a curved blade. The tip bends farther than its midpoint. |
| 210 | `context.stroke();` | Strokes the blade in front of the grass field. |
| 211 | `}` | Closes the block or callback opened on line 204. |
| 212 | `return this.drawSilhouette(seconds, useDemo, mirror, showMotion);` | Adds the silhouette as the top layer with the current motion-highlight setting. |
| 213 | `}` | Closes the block or callback opened on line 148. |

### Mask to colored particles

| Line | Source | What the line does |
| ---: | --- | --- |
| 215 | `drawSilhouette(seconds, useDemo, mirror, showMotion) {` | Converts the selected mask to particles and can highlight measured motion. |
| 216 | `const { context, mask, demoContext } = this;` | Loads the two possible mask sources and the shared drawing context. |
| 217 | `if (!useDemo && !mask) return 0;` | Leaves the art empty when no demo or live person mask is available. |
| 218 | `const width = useDemo ? demoContext.canvas.width : mask.width;` | Reads the width of the selected mask. |
| 219 | `const height = useDemo ? demoContext.canvas.height : mask.height;` | Reads the height of the selected mask. |
| 220 | `const alpha = useDemo ? demoMask(demoContext, seconds) : mask.values;` | Reads fresh demo RGBA data or the most recent MediaPipe confidence array. |
| 221 | `const scale = Math.min(560 / width, 397 / height);` | Scales the mask to fit within a 560-by-397 drawing area. |
| 222 | `const drawnWidth = width * scale;` | Computes the masked area width in art pixels. |
| 223 | `const left = 345 - drawnWidth / 2;` | Centers the mask at x equals 345, left of the tree. |
| 224 | `const top = 415 - height * scale;` | Anchors the bottom of the mask near the horizon at y equals 415. |
| 225 | `let points = 0;` | Starts a count of the visible person points. |
| 226 | `for (let y = 0; y < height * scale; y += 4) {` | Samples a row every four art pixels. |
| 227 | `const row = Math.floor(y / scale) * width;` | Maps the drawing row back to the first index of a source mask row. |
| 228 | `for (let x = 0; x < drawnWidth; x += 4) {` | Samples a column every four art pixels. |
| 229 | `const column = Math.floor(x / scale);` | Maps the drawing column back into the mask's source resolution. |
| 230 | `const index = row + (mirror && !useDemo ? width - 1 - column : column);` | Flips the live foreground horizontally when Mirror preview is enabled. |
| 231 | `const confidence = useDemo ? alpha[index * 4 + 3] / 255 : alpha[index];` | Reads demo opacity on a zero-to-one scale or uses the model confidence as supplied. |
| 232 | `if (confidence < 0.62) continue;` | Draws no particle for weak foreground evidence below 0.62. |
| 233 | `const shimmer = Math.sin(x * 0.29 + y * 0.17 + seconds * 3.7);` | Uses position and time to calculate a stable spatial shimmer pattern. |
| 234 | `const color = Math.floor((shimmer + 1) * 1.95);` | Quantizes the shimmer value to one of the four body palette entries. |
| 235 | `const moving = showMotion && !useDemo && this.motion?.pixels[index];` | Tests whether this live foreground pixel was marked as moving and highlights are enabled. |
| 236 | `const size = moving ? 3.2 : color > 1 ? 2.6 : 1.7;` | Makes movement particles slightly larger so they are visible among the static points. |
| 237 | `context.fillStyle = moving ? "#ffd58a" : BODY_COLORS[color];` | Uses warm gold for measured motion and the usual blue palette for the rest. |
| 238 | `context.globalAlpha = moving ? confidence : confidence * (0.74 + shimmer * 0.2);` | Keeps moving particles bright while normal particles can shimmer. |
| 239 | `context.fillRect(left + x + shimmer, top + y + shimmer * 0.6, size, size);` | Draws the particle with a small shimmer offset at the projected position. |
| 240 | `points++;` | Adds one to the count that the artwork status panel displays. |
| 241 | `}` | Closes the block or callback opened on line 228. |
| 242 | `}` | Closes the block or callback opened on line 226. |
| 243 | `context.globalAlpha = 1;` | Restores full opacity before later drawing calls. |
| 244 | `return points;` | Returns the number of body points placed on this frame. |
| 245 | `}` | Closes the block or callback opened on line 215. |
| 246 | `}` | Closes the block or callback opened on line 103. |
