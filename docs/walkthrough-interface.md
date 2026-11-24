# Page and styles

The HTML names each control and result. The stylesheet decides where they sit and which video layer you can see.

[Back to the code walkthrough](./code-walkthrough.md)

## `index.html`

[Open `index.html`](../index.html)

### Document, header, and tabs

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `<!doctype html>` | Tells the browser to parse the page as modern HTML. |
| 2 | `<html lang="en" data-type="software">` | Opens the English document and classifies it as a software page for design checks. |
| 3 | `<head>` | Begins document metadata. Its contents do not form the visible work area. |
| 4 | `<meta charset="utf-8">` | Uses UTF-8 so punctuation and characters display correctly. |
| 5 | `<meta name="viewport" content="width=device-width, initial-scale=1">` | Matches the page viewport to the device width so the layout can adapt to phones. |
| 6 | `<meta name="color-scheme" content="dark">` | Declares a dark color scheme for built-in controls and browser rendering. |
| 7 | `<meta name="description" content="Describe a webcam frame and read its caption aloud.">` | Describes the four webcam tools in the page metadata. |
| 8 | `<meta name="page-type" content="software">` | Identifies the page as software for the frontend checker. |
| 9 | `<meta name="site-kind" content="software">` | Identifies the project as software for design checks that depend on its use. |
| 10 | `<title>Scene Caption Camera</title>` | Sets the browser tab title. |
| 11 | `<link rel="icon" href="data:,">` | Provides an empty icon URI so the browser has no separate favicon file to request. |
| 12 | `<link rel="stylesheet" href="./styles.css">` | Loads the shared stylesheet relative to this page. |
| 13 | `<script type="module" src="./app.mjs"></script>` | Starts the JavaScript module. Module execution waits for the HTML to be parsed. |
| 14 | `</head>` | Closes the `head` element opened on line 3. |
| 15 | `<body>` | Opens the visible page. |
| 16 | `<a class="skip-link" href="#studio">Skip to the studio</a>` | Provides the first keyboard stop and jumps past the header to the work area. |
| 17 | `<header class="topbar">` | Creates the header bar at the top of the page. |
| 18 | `<div class="wrap topbar-inner">` | Constrains the inner header to the same width as the main work area. |
| 19 | `<a class="brand" href="./" aria-label="Scene Caption Camera home">` | Creates a home link with a descriptive accessible name. |
| 20 | `<span class="brand-mark" aria-hidden="true"><span></span></span>` | Adds two spans that CSS turns into the camera mark. Assistive technology skips the mark. |
| 21 | `Scene Caption Camera` | Displays the product name beside the mark. |
| 22 | `</a>` | Closes the `a` element opened on line 19. |
| 23 | `<span class="privacy"><span class="privacy-dot" aria-hidden="true"></span> On-device processing</span>` | Shows the on-device processing notice. The colored dot is decorative. |
| 24 | `</div>` | Closes the `div` element opened on line 18. |
| 25 | `</header>` | Closes the `header` element opened on line 17. |
| 27 | `<main class="wrap" id="studio" data-mode="scene" tabindex="-1">` | Opens the main landmark and sets the single mode for this edition. |
| 28 | `<section class="intro" aria-labelledby="page-title" data-enter>` | Groups the introduction and marks it for a brief transition when the device allows motion. |
| 29 | `<h1 id="page-title">Scene Caption Camera</h1>` | Provides the visible main heading and the section's accessible name. |
| 30 | `<p>Describe a webcam frame and read its caption aloud.</p>` | Explains what the four main webcam tools do. |
| 31 | `</section>` | Closes the `section` element opened on line 28. |
| 33 | `<div class="modes" role="tablist" aria-label="Camera mode" hidden>` | Keeps the shared mode controls available to the app script and hidden in this edition. |
| 34 | `<button type="button" role="tab" id="tab-motion" aria-selected="true" aria-controls="panel-motion" data-mode="motion">Live detection</button>` | Selects Live detection by default and connects it to the detection panel. |
| 35 | `<button type="button" role="tab" id="tab-gesture" aria-selected="false" aria-controls="panel-gesture" data-mode="gesture" tabindex="-1">Gesture to voice</button>` | Creates the gesture tab. JavaScript moves it into the tab order when selected. |
| 36 | `<button type="button" role="tab" id="tab-scene" aria-selected="false" aria-controls="panel-scene" data-mode="scene" tabindex="-1">Scene captions</button>` | Creates the caption tab and connects it to the scene panel. |
| 37 | `<button type="button" role="tab" id="tab-art" aria-selected="false" aria-controls="panel-art" data-mode="art" tabindex="-1">Particle artwork</button>` | Creates the artwork tab and connects it to the artwork panel. |
| 38 | `</div>` | Closes the `div` element opened on line 33. |

### Shared camera preview

| Line | Source | What the line does |
| ---: | --- | --- |
| 40 | `<div class="workspace">` | Starts the layout that places the preview beside the active mode panel. |
| 41 | `<section class="camera surface" aria-labelledby="camera-title">` | Creates the shared preview region and names it using the preview heading. |
| 42 | `<header class="surface-header">` | Groups the preview title and the camera status. |
| 43 | `<h2 id="camera-title">Live camera preview</h2>` | Provides the heading. JavaScript renames it while the artwork is selected. |
| 44 | `<span class="camera-status" id="camera-status"><span class="signal-dot" aria-hidden="true"></span><span id="camera-state" role="status">Camera off</span></span>` | Puts a decorative state dot beside an announced camera status. |
| 45 | `</header>` | Closes the `header` element opened on line 42. |
| 46 | `<div class="stage" id="stage">` | Wraps the video, canvases, and standby graphics in the same drawing area. |
| 47 | `<video id="video" autoplay muted playsinline aria-label="Live webcam preview"></video>` | Adds the real video element with muted inline playback. JavaScript sets its camera stream. |
| 48 | `<canvas id="overlay" aria-hidden="true" hidden></canvas>` | Adds the overlay for labeled boxes, motion outlines, and hand landmarks. The app shows it when video starts. |
| 49 | `<canvas id="artwork" role="img" aria-label="A night landscape with a willow tree and a particle silhouette" hidden></canvas>` | Adds the artwork canvas, hidden until Particle artwork is selected. |
| 50 | `<div class="frame-guides" aria-hidden="true"><i></i><i></i><i></i><i></i></div>` | Provides four decorative elements that CSS draws into corners. |
| 51 | `<div class="placeholder" id="placeholder">` | Groups the standby graphic and text. |
| 52 | `<span class="reticle" aria-hidden="true"><i></i><i></i><i></i><i></i><span></span></span>` | Builds the small center reticle using four corner marks and a center ring. |
| 53 | `<p id="placeholder-title">Camera is off</p>` | Provides the default off-state heading. |
| 54 | `<span id="placeholder-detail">Start your camera to see a live preview.</span>` | Tells the user how to reveal the camera image. |
| 55 | `</div>` | Closes the `div` element opened on line 51. |
| 56 | `</div>` | Closes the `div` element opened on line 46. |
| 57 | `<div class="camera-toolbar">` | Groups the camera and mirror controls in the preview's lower bar. |
| 58 | `<button type="button" class="primary" id="camera-toggle">Start camera</button>` | Adds the button whose click starts or stops the same stream. |
| 59 | `<label class="check"><input type="checkbox" id="mirror"> Mirror preview</label>` | Adds the optional horizontal mirror. The default is unchecked. |
| 60 | `</div>` | Closes the `div` element opened on line 57. |
| 61 | `<p class="message" id="camera-error" role="alert" hidden></p>` | Provides a screen-reader alert for camera permission and device errors. |
| 62 | `</section>` | Closes the `section` element opened on line 41. |

### Live detection panel

| Line | Source | What the line does |
| ---: | --- | --- |
| 64 | `<section class="surface panel" id="panel-motion" role="tabpanel" aria-labelledby="tab-motion" hidden>` | Shows the panel at startup if it belongs to this edition. |
| 65 | `<header class="surface-header"><h2>Live detection</h2></header>` | Names the shared panel for Objects and Motion. |
| 66 | `<div class="panel-content">` | Starts the motion panel's spaced content column. |
| 67 | `<fieldset class="detection-modes" aria-label="Detection type">` | Groups the native detection radio buttons with an accessible label. |
| 68 | `<label><input type="radio" name="detection" id="detect-objects" checked><span>Objects</span></label>` | Selects object detection by default. |
| 69 | `<label><input type="radio" name="detection" id="detect-motion"><span>Motion</span></label>` | Adds access to the movement-only detection view. |
| 70 | `</fieldset>` | Closes the `fieldset` element opened on line 67. |
| 71 | `<div class="detection-view" id="object-view">` | Groups the results and controls for object detection. |
| 72 | `<div class="detection-heading"><h3>Objects in frame</h3><span id="object-count">—</span></div>` | Gives the results a heading and reserves a count beside it. |
| 73 | `<p class="hint" id="object-state" role="status">Start the camera to scan for objects.</p>` | Announces the object detector state before results arrive. |
| 74 | `<ul id="object-results" class="object-results" aria-label="Detected objects and confidence"></ul>` | Holds object class names and confidence scores as readable list items. |
| 75 | `<button type="button" id="retry-objects" hidden>Retry object model</button>` | Offers a retry after object model setup or inference fails. |
| 76 | `<div class="controls">` | Groups the object confidence control. |
| 77 | `<div class="range-label"><label for="confidence">Minimum confidence</label><output id="confidence-value" for="confidence">45%</output></div>` | Links the object confidence slider with its label and visible value. |
| 78 | `<input type="range" id="confidence" min="30" max="90" value="45">` | Allows confidence thresholds between 30 and 90 percent. The initial value is 45 percent. |
| 79 | `</div>` | Closes the `div` element opened on line 76. |
| 80 | `</div>` | Closes the `div` element opened on line 71. |
| 81 | `<div class="detection-view" id="motion-view" hidden>` | Adds the motion-only view and starts it hidden. |
| 82 | `<div class="detection-heading"><h3>Motion activity</h3></div>` | Identifies the original motion statistics area. |
| 83 | `<div class="readout-value" id="motion-state" role="status">Waiting for camera</div>` | Provides an announced activity status with a waiting default. |
| 84 | `<div class="metrics">` | Puts the two metrics in a shared grid. |
| 85 | `<div><span id="motion-regions">—</span><span>Active regions</span></div>` | Reserves an element for the number of accepted motion regions. |
| 86 | `<div><span id="motion-area">—</span><span>Changed pixels</span></div>` | Reserves an element for the percentage of analyzed pixels that belong to accepted regions. |
| 87 | `</div>` | Closes the `div` element opened on line 84. |
| 88 | `<div class="controls">` | Groups the motion sensitivity control. |
| 89 | `<div class="range-label"><label for="sensitivity">Motion sensitivity</label><output id="sensitivity-value" for="sensitivity">55</output></div>` | Labels the motion sensitivity and connects it to its visible output. |
| 90 | `<input type="range" id="sensitivity" min="0" max="100" value="55">` | Keeps the original motion sensitivity range of zero to 100 with an initial value of 55. |
| 91 | `</div>` | Closes the `div` element opened on line 88. |
| 92 | `</div>` | Closes the `div` element opened on line 81. |
| 93 | `<label class="check"><input id="show-boxes" type="checkbox" checked> Show boxes on preview</label>` | Shares an overlay toggle across both detection views. |
| 94 | `</div>` | Closes the `div` element opened on line 66. |
| 95 | `</section>` | Closes the `section` element opened on line 64. |

### Gesture panel

| Line | Source | What the line does |
| ---: | --- | --- |
| 97 | `<section class="surface panel" id="panel-gesture" role="tabpanel" aria-labelledby="tab-gesture" hidden>` | Defines the gesture panel and hides it on page load. |
| 98 | `<header class="surface-header"><h2>Gesture to voice</h2></header>` | Gives the gesture panel its heading. |
| 99 | `<div class="panel-content">` | Starts the gesture panel's controls and readouts. |
| 100 | `<p class="description">Hold a demo pose for 1.5 seconds to add a word. Lower your hand between poses.</p>` | Explains how long to hold a word pose and when to lower the hand. |
| 101 | `<div class="readout">` | Groups the hand recognition status and timer. |
| 102 | `<div class="readout-label">Hand recognition</div>` | Names the readout. |
| 103 | `<div class="readout-value" id="gesture-state" role="status">Waiting for camera</div>` | Provides the announced hand status. |
| 104 | `<progress id="gesture-progress" max="1" value="0" aria-label="Hold progress"></progress>` | Defines a progress bar with a fractional value from zero to one. |
| 105 | `</div>` | Closes the `div` element opened on line 101. |
| 106 | `<button type="button" id="retry-gestures" hidden>Retry hand model</button>` | Adds a retry action that stays hidden until hand model loading fails. |
| 107 | `<div class="transcript">` | Groups the accepted words and their actions. |
| 108 | `<h3>Word sequence</h3>` | Labels the visible transcript. |
| 109 | `<p class="hint" id="no-words">Recognized words appear here.</p>` | Provides the empty-state message for the transcript. |
| 110 | `<ol class="word-list" id="words" aria-live="polite"></ol>` | Adds the ordered word list. Polite live announcements wait for the screen reader's current announcement. |
| 111 | `<div class="actions">` | Groups the transcript buttons. |
| 112 | `<button type="button" id="speak-words" disabled>Speak sequence</button>` | Adds the Speak sequence action. It starts disabled until a word is accepted. |
| 113 | `<button type="button" id="clear-words" disabled>Clear</button>` | Adds the Clear action. It starts disabled on an empty sequence. |
| 114 | `</div>` | Closes the `div` element opened on line 111. |
| 115 | `<label class="check"><input type="checkbox" id="speak-each"> Speak each word as it’s added</label>` | Lets the user choose whether each accepted word is also spoken immediately. |
| 116 | `</div>` | Closes the `div` element opened on line 107. |
| 117 | `<p class="hint" id="gesture-speech" role="status" hidden></p>` | Reserves an announced message for unavailable gesture speech. |
| 118 | `<details>` | Adds the native expandable pose reference. |
| 119 | `<summary>Supported demo poses</summary>` | Names the expandable list. |
| 120 | `<dl>` | Begins a description list pairing pose names with actions. |
| 121 | `<div><dt>Peace sign</dt><dd>Use</dd></div>` | Pairs the peace sign with Use. |
| 122 | `<div><dt>One open palm</dt><dd>Technology</dd></div>` | Pairs the single open palm with Technology. |
| 123 | `<div><dt>Index finger up</dt><dd>For</dd></div>` | Pairs the pointed index finger with For. |
| 124 | `<div><dt>Thumbs up</dt><dd>Help</dd></div>` | Pairs thumbs-up with Help. |
| 125 | `<div><dt>Index and pinky up, thumb tucked</dt><dd>Not</dd></div>` | Pairs the two outer fingers and tucked thumb with Not. |
| 126 | `<div><dt>Closed fist</dt><dd>War</dd></div>` | Pairs the fist with War. |
| 127 | `<div><dt>Index, pinky, and thumb extended</dt><dd>I love you</dd></div>` | Pairs the recognized ASL handshape with I love you. |
| 128 | `<div><dt>Two open palms for 2 seconds</dt><dd>Speak sequence</dd></div>` | Gives the two-palm command and its longer hold time. |
| 129 | `</dl>` | Closes the `dl` element opened on line 120. |
| 130 | `</details>` | Closes the `details` element opened on line 118. |
| 131 | `</div>` | Closes the `div` element opened on line 99. |
| 132 | `</section>` | Closes the `section` element opened on line 97. |

### Caption panel

| Line | Source | What the line does |
| ---: | --- | --- |
| 134 | `<section class="surface panel" id="panel-scene" role="tabpanel" aria-labelledby="tab-scene">` | Shows the panel at startup if it belongs to this edition. |
| 135 | `<header class="surface-header"><h2>Scene captions</h2></header>` | Displays the panel heading. |
| 136 | `<div class="panel-content">` | Begins the caption panel's readouts and controls. |
| 137 | `<p class="description">Generate a short description of the current camera frame.</p>` | Describes the frame-to-sentence action. |
| 138 | `<div class="readout">` | Groups the latest caption and any extracted labels. |
| 139 | `<div class="readout-label">Latest caption</div>` | Names the caption result area. |
| 140 | `<p class="caption" id="caption" aria-live="polite">No caption yet.</p>` | Provides an announced caption with a no-result default. |
| 141 | `<p class="caption-tags" id="caption-tags" hidden></p>` | Reserves a row for object and action labels, if the caption contains any. |
| 142 | `</div>` | Closes the `div` element opened on line 138. |
| 143 | `<div class="actions">` | Groups manual caption and speech actions. |
| 144 | `<button type="button" id="caption-frame" disabled>Describe frame</button>` | Adds Describe frame. It starts disabled until the camera supplies a frame. |
| 145 | `<button type="button" id="speak-caption" disabled>Speak caption</button>` | Adds Speak caption. It starts disabled until a caption exists. |
| 146 | `</div>` | Closes the `div` element opened on line 143. |
| 147 | `<label class="check"><input type="checkbox" id="auto-caption"> Refresh captions automatically</label>` | Lets the user opt into repeated analysis. |
| 148 | `<p class="hint" id="scene-speech" role="status" hidden></p>` | Reserves an announced caption speech error. |
| 149 | `<p class="hint" id="caption-status" role="status">Start your camera to capture a frame.</p>` | Gives the caption process an announced status and guidance before the camera starts. |
| 150 | `<p class="hint">The first caption downloads about 250 MB of model weights. Captions can miss or mislabel objects.</p>` | Tells the user how large the first model download is and that the generated descriptions can be imperfect. |
| 151 | `</div>` | Closes the `div` element opened on line 136. |
| 152 | `</section>` | Closes the `section` element opened on line 134. |

### Artwork panel and footer

| Line | Source | What the line does |
| ---: | --- | --- |
| 154 | `<section class="surface panel" id="panel-art" role="tabpanel" aria-labelledby="tab-art" hidden>` | Defines the fourth tab panel and hides it on page load. |
| 155 | `<header class="surface-header"><h2>Particle artwork</h2></header>` | Displays the artwork panel heading. |
| 156 | `<div class="panel-content">` | Begins the artwork status and settings column. |
| 157 | `<p class="description">Stand in view of the camera to appear as blue and violet particles in the landscape.</p>` | Tells the user how the camera adds their figure to the picture. |
| 158 | `<div class="readout">` | Groups the silhouette source and rendered point count. |
| 159 | `<div class="readout-label">Silhouette source</div>` | Names the silhouette source readout. |
| 160 | `<div class="readout-value" id="art-state" role="status">Camera or demo</div>` | Provides an announced artwork status. |
| 161 | `<p class="hint" id="art-points">0 silhouette particles</p>` | Reserves a count for visible silhouette points. It has no live announcement on each paint. |
| 162 | `<p class="hint" id="art-motion">Start the camera to measure movement.</p>` | Reserves a status line for measuring change inside the live person's silhouette. |
| 163 | `</div>` | Closes the `div` element opened on line 158. |
| 164 | `<div class="actions">` | Groups the demo and model recovery actions. |
| 165 | `<button type="button" id="art-demo" aria-pressed="false">Demo silhouette</button>` | Adds a toggle for the camera-free figure and exposes its pressed state. |
| 166 | `<button type="button" id="retry-art" hidden>Retry person model</button>` | Adds a retry action for failed person model setup or inference. |
| 167 | `</div>` | Closes the `div` element opened on line 164. |
| 168 | `<div class="controls">` | Groups the artwork settings. |
| 169 | `<div class="range-label"><label for="art-wind">Wind strength</label><output id="art-wind-value" for="art-wind">65</output></div>` | Links the wind control with its label and numeric output. |
| 170 | `<input type="range" id="art-wind" min="0" max="100" value="65">` | Defines wind strength on a 0 to 100 scale, initially 65. |
| 171 | `<label class="check"><input type="checkbox" id="art-animate" checked> Animate landscape</label>` | Adds the decorative animation checkbox. JavaScript adapts its initial state to the device preference. |
| 172 | `<label class="check"><input type="checkbox" id="art-show-motion" checked> Highlight body motion</label>` | Enables warm-colored motion highlights by default and lets the user disable them. |
| 173 | `</div>` | Closes the `div` element opened on line 168. |
| 174 | `</div>` | Closes the `div` element opened on line 156. |
| 175 | `</section>` | Closes the `section` element opened on line 154. |
| 176 | `</div>` | Closes the `div` element opened on line 40. |
| 178 | `<footer>Camera frames stay in your browser.</footer>` | Displays the browser-only frame processing notice at the foot of the page. |
| 179 | `</main>` | Closes the `main` element opened on line 27. |
| 180 | `</body>` | Closes the `body` element opened on line 15. |
| 181 | `</html>` | Closes the `html` element opened on line 2. |

## `styles.css`

[Open `styles.css`](../styles.css)

### Colors and global defaults

| Line | Source | What the line does |
| ---: | --- | --- |
| 1 | `:root {` | Applies the following shared defaults to the document root. |
| 2 | `font-family: "Avenir Next", Avenir, system-ui, sans-serif;` | Chooses Avenir Next and falls back through installed sans-serif fonts. |
| 3 | `color: #eff4f6;` | Sets the default foreground color for text. |
| 4 | `background: #111719;` | Sets the dark page background. |
| 5 | `--surface: #192124;` | Defines the panel background token. |
| 6 | `--raised: #202b2e;` | Defines a slightly lighter token for buttons and selected controls. |
| 7 | `--line: #35464b;` | Defines the border color used across controls and panels. |
| 8 | `--muted: #afbec4;` | Defines the secondary text color. |
| 9 | `--green: #a5eecf;` | Defines the mint camera and motion color. |
| 10 | `--accent: var(--green);` | Starts with mint as the active mode's accent. |
| 11 | `}` | Ends the CSS rule opened on line 1. |
| 13 | `*, *::before, *::after { box-sizing: border-box; }` | Includes padding and borders inside declared sizes, including on pseudo-elements. |
| 14 | `[hidden] { display: none !important; }` | Forces elements with the hidden attribute out of the layout. |
| 15 | `body { margin: 0; }` | Removes the browser's default margin around the page. |
| 16 | `button, input { font: inherit; }` | Uses the page font for inputs and buttons. |
| 17 | `button, summary, input[type="checkbox"], input[type="range"] { cursor: pointer; }` | Shows the pointer cursor for common click and drag controls. |
| 18 | `a { color: inherit; }` | Uses the surrounding text color for links. |
| 19 | `:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }` | Shows a visible two-pixel focus ring with breathing room around keyboard-focused controls. |
| 20 | `.skip-link { position: absolute; left: 12px; top: 12px; z-index: 2; padding: 12px; color: #14241d; background: var(--green); }` | Positions the keyboard skip action above the main page when focused. |
| 21 | `.skip-link:not(:focus) { clip-path: inset(50%); }` | Visually hides the skip link until keyboard focus reaches it. |
| 22 | `h1, h2, h3, p, dl, dd { margin: 0; }` | Removes built-in spacing so the layout sets margins explicitly. |
| 23 | `.wrap { width: min(1240px, calc(100% - 96px)); margin-inline: auto; }` | Centers the content and caps it at 1,240 pixels while preserving desktop margins. |

### Header, typography, and mode buttons

| Line | Source | What the line does |
| ---: | --- | --- |
| 25 | `.topbar { background: #151c1f; border-bottom: 1px solid var(--line); }` | Gives the header bar a dark fill and a bottom border. |
| 26 | `.topbar-inner { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 65px; }` | Distributes the brand and privacy notice to opposite ends of the header. |
| 27 | `.brand { display: inline-flex; align-items: center; gap: 11px; font-size: .95rem; font-weight: 700; text-decoration: none; }` | Aligns the icon and brand text in an inline row and removes the default underline. |
| 28 | `.brand-mark { width: 25px; height: 25px; display: grid; place-items: center; border: 1px solid #689487; border-radius: 7px; }` | Creates the rounded square around the camera mark. |
| 29 | `.brand-mark span { width: 8px; height: 8px; border: 1px solid var(--green); border-radius: 50%; }` | Draws the small circle inside the camera mark. |
| 30 | `.privacy { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: .8rem; }` | Aligns the privacy dot and caption in a compact horizontal row. |
| 31 | `.privacy-dot, .signal-dot { display: inline-block; width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: var(--green); }` | Makes privacy and camera dots the same seven-pixel size and prevents them shrinking. |
| 33 | `main { padding-block: 40px 26px; }` | Adds vertical space above and below the main work area. |
| 34 | `main[data-mode="gesture"] { --accent: #f0ca8b; }` | Changes the accent to amber while Gesture to voice is selected. |
| 35 | `main[data-mode="scene"] { --accent: #c5c4ff; }` | Changes the accent to lavender while Scene captions is selected. |
| 36 | `main[data-mode="art"] { --accent: #b0d0ff; }` | Changes the accent to cool blue while Particle artwork is selected. |
| 37 | `.intro { margin-bottom: 26px; }` | Separates the introduction from the modes. |
| 38 | `h1 { font-size: clamp(2rem, 5vw, 3.35rem); font-weight: 680; line-height: 1.05; letter-spacing: -.06em; }` | Scales the main heading with the viewport within fixed minimum and maximum sizes. |
| 39 | `.intro p { color: var(--muted); margin-top: 12px; line-height: 1.5; font-size: 1rem; }` | Gives the introductory sentence space below the heading and softer text color. |
| 41 | `.modes { display: flex; gap: 8px; margin-bottom: 16px; }` | Places the desktop mode buttons side by side. |
| 42 | `button {` | Begins the shared button styles. |
| 43 | `min-height: 44px;` | Makes each general button at least 44 pixels tall. |
| 44 | `padding: 9px 14px;` | Adds vertical and horizontal spacing inside buttons. |
| 45 | `background: var(--raised);` | Uses the raised background token for regular buttons. |
| 46 | `color: inherit;` | Inherits the surrounding text color. |
| 47 | `border: 1px solid var(--line);` | Draws a thin border using the shared line token. |
| 48 | `border-radius: 8px;` | Rounds the button corners. |
| 49 | `font-size: .875rem;` | Uses a compact button font size. |
| 50 | `font-weight: 680;` | Uses a semibold button label. |
| 51 | `}` | Ends the CSS rule opened on line 42. |
| 52 | `button:hover:not(:disabled) { border-color: var(--accent); }` | Applies the mode color to the hover border of an enabled button. |
| 53 | `button:disabled { color: #aab9bd; opacity: .62; cursor: default; }` | Dims unavailable buttons and gives them a normal cursor. |
| 54 | `.modes button { background: transparent; color: var(--muted); }` | Applies the quiet background and text treatment to unselected tabs. |
| 55 | `.modes button[aria-selected="true"] {` | Targets the tab with the selected accessible state. |
| 56 | `color: var(--accent);` | Tints the selected tab label with the current mode accent. |
| 57 | `background: var(--raised);` | Gives the selected tab a raised fill. |
| 58 | `border-color: var(--accent);` | Outlines the selected tab with its accent. |
| 59 | `}` | Ends the CSS rule opened on line 55. |
| 60 | `button[aria-pressed="true"] { color: var(--accent); border-color: var(--accent); }` | Highlights the pressed demo toggle using its accessible state. |
| 61 | `.primary { background: var(--green); color: #14241d; border-color: var(--green); min-width: 124px; }` | Makes Start camera a mint action with dark text and a stable minimum width. |
| 62 | `.primary:hover:not(:disabled) { background: #c2f8e1; }` | Brightens the primary background on hover. |
| 63 | `.primary.is-live { background: transparent; color: #eff4f6; border-color: var(--line); }` | Applies a dark outlined treatment to the same button while the camera is running. |
| 64 | `.primary.is-live:hover:not(:disabled) { background: var(--raised); border-color: var(--green); }` | Gives Stop camera a dark hover background so its light label stays readable. |

### Panel layout and preview layers

| Line | Source | What the line does |
| ---: | --- | --- |
| 66 | `.workspace {` | Starts the grid for the preview and mode readout. |
| 67 | `display: grid;` | Switches the work area to CSS Grid. |
| 68 | `grid-template-columns: minmax(0, 1fr) minmax(310px, 365px);` | Allocates a fluid preview column and a readout column between 310 and 365 pixels. |
| 69 | `align-items: start;` | Keeps both panels aligned at the top rather than stretching their heights. |
| 70 | `gap: 16px;` | Separates the two panels by 16 pixels. |
| 71 | `}` | Ends the CSS rule opened on line 66. |
| 72 | `.surface { min-width: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: clip; }` | Sets the shared panel border, rounded corners, and clipped contents. Zero minimum width prevents content widening the grid. |
| 73 | `.surface-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 17px; min-height: 55px; border-bottom: 1px solid var(--line); }` | Aligns titles and indicators in a bordered panel header. |
| 74 | `.surface-header h2 { font-size: .95rem; font-weight: 700; }` | Sets the panel title size and weight. |
| 75 | `.camera-status { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: .8rem; }` | Aligns the camera state dot and text and makes them secondary to the title. |
| 76 | `.signal-dot { background: #84959c; }` | Shows a neutral dot by default. |
| 77 | `.camera-status[data-state="live"] .signal-dot { background: var(--green); }` | Shows a mint dot when the camera is live. |
| 78 | `.camera-status[data-state="pending"] .signal-dot { background: #f0ca8b; }` | Shows an amber dot while access is pending. |
| 79 | `.camera-status[data-state="error"] .signal-dot { background: #f7a8a8; }` | Shows a pink dot for camera errors. |
| 81 | `.stage {` | Starts the rule for the drawing and video stage. |
| 82 | `position: relative;` | Makes the stage the origin for absolutely positioned layers. |
| 83 | `isolation: isolate;` | Keeps the stage's layers in an independent stacking context. |
| 84 | `overflow: hidden;` | Clips any layer that extends beyond the stage. |
| 85 | `display: grid;` | Makes the stage a grid container for the standby content. |
| 86 | `place-items: center;` | Centers the standby content within the stage. |
| 87 | `aspect-ratio: 16 / 9;` | Reserves a wide 16-by-9 display area. |
| 88 | `background: #0d1518;` | Uses a dark background behind any letterboxed display. |
| 89 | `}` | Ends the CSS rule opened on line 81. |
| 90 | `.stage:not(.is-live) { background: #10191d; }` | Gives the idle camera a solid background before video is available. |
| 91 | `.stage video, .stage canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }` | Stacks the camera and canvases within the stage and gives each its full displayed size. |
| 92 | `.stage video { object-fit: contain; visibility: hidden; }` | Fits the entire video frame without cropping and hides it until live. |
| 93 | `.stage.is-live video { visibility: visible; }` | Shows the actual video when the app sets the camera's live class. |
| 94 | `.stage video.mirrored { transform: scaleX(-1); }` | Flips the live image horizontally when mirror is enabled. |
| 95 | `.stage canvas { pointer-events: none; }` | Lets mouse and touch events pass through drawing canvases. |
| 96 | `.stage.is-art { background: #070c21; }` | Uses the artwork sky color behind any space outside the artwork canvas. |
| 97 | `.stage.is-art video, .stage.is-art #overlay, .stage.is-art .frame-guides { visibility: hidden; }` | Hides the normal video, outlines, and guides while the artwork canvas occupies the stage. |
| 98 | `#artwork { object-fit: contain; }` | Preserves the artwork's aspect ratio inside its display area. |
| 99 | `.frame-guides { position: absolute; inset: 22px; pointer-events: none; color: #607a81; }` | Insets the decorative guides inside the standby frame. |
| 100 | `.is-live .frame-guides { display: none; }` | Removes the decorative guides when the live video is visible. |
| 101 | `.frame-guides i, .reticle i { position: absolute; width: 16px; height: 16px; border: 1px solid currentColor; }` | Styles all four small corner elements as bordered squares. |
| 102 | `.frame-guides i:nth-child(1), .reticle i:nth-child(1) { top: 0; left: 0; border-right: 0; border-bottom: 0; }` | Positions the top-left mark and leaves only its top and left edges. |
| 103 | `.frame-guides i:nth-child(2), .reticle i:nth-child(2) { top: 0; right: 0; border-left: 0; border-bottom: 0; }` | Positions the top-right mark and leaves only its top and right edges. |
| 104 | `.frame-guides i:nth-child(3), .reticle i:nth-child(3) { bottom: 0; left: 0; border-right: 0; border-top: 0; }` | Positions the bottom-left mark and leaves only its bottom and left edges. |
| 105 | `.frame-guides i:nth-child(4), .reticle i:nth-child(4) { bottom: 0; right: 0; border-left: 0; border-top: 0; }` | Positions the bottom-right mark and leaves only its bottom and right edges. |
| 106 | `.placeholder { z-index: 1; display: grid; justify-items: center; gap: 7px; padding: 16px; text-align: center; }` | Centers the standby copy and places it above the canvas layers. |
| 107 | `.reticle { position: relative; display: grid; width: 48px; height: 48px; place-items: center; color: var(--accent); margin-bottom: 6px; }` | Defines the 48-pixel center reticle and gives it the current accent. |
| 108 | `.reticle i { width: 11px; height: 11px; }` | Makes the inner reticle's corner marks smaller than the full-frame guides. |
| 109 | `.reticle span { width: 13px; height: 13px; border: 1px solid currentColor; border-radius: 50%; }` | Draws the circular center of the reticle. |
| 110 | `.placeholder p { font-weight: 680; font-size: 1.05rem; }` | Emphasizes the standby title. |
| 111 | `.placeholder > span:last-child, .hint { color: var(--muted); font-size: .83rem; line-height: 1.5; }` | Gives guidance text a smaller size, muted color, and readable line spacing. |

### Controls, results, and footer

| Line | Source | What the line does |
| ---: | --- | --- |
| 113 | `.camera-toolbar { padding: 12px 17px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid var(--line); }` | Aligns the camera button and mirror checkbox in the footer of the preview card. |
| 114 | `.check { display: flex; align-items: center; gap: 8px; min-height: 36px; font-size: .84rem; color: var(--muted); cursor: pointer; }` | Aligns a checkbox with its label and gives the label a larger visible hit area. |
| 115 | `input[type="checkbox"] { width: 16px; height: 16px; margin: 0; flex: 0 0 auto; accent-color: var(--accent); }` | Sets the checkbox dimensions and colors the native check using the active mode. |
| 116 | `.message { color: #ffc3c3; padding: 0 17px 15px; font-size: .85rem; line-height: 1.45; }` | Gives camera errors a readable tinted color and horizontal padding. |
| 118 | `.panel-content { padding: 16px 17px 19px; display: grid; gap: 16px; }` | Lays out a panel's contents in an evenly spaced column. |
| 119 | `.description { color: var(--muted); font-size: .925rem; line-height: 1.5; }` | Styles the short instructions below each mode heading. |
| 120 | `.readout { min-width: 0; padding: 14px; border: 1px solid var(--line); border-radius: 9px; background: #131c1f; }` | Gives the current result a darker background and its own border. |
| 121 | `.readout-label { color: var(--muted); font-size: .76rem; margin-bottom: 7px; }` | Styles the small label above a result. |
| 122 | `.readout-value { color: var(--accent); font-size: 1rem; font-weight: 720; overflow-wrap: anywhere; }` | Uses the mode accent for the result value and allows long words to wrap. |
| 123 | `.metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-top: 1px solid var(--line); margin-top: 12px; padding-top: 11px; }` | Lays the two motion metrics in equal columns below a divider. |
| 124 | `.metrics div { display: grid; gap: 2px; }` | Stacks a metric's value above its label. |
| 125 | `.metrics div + div { border-left: 1px solid var(--line); padding-left: 12px; }` | Adds a divider and padding before each metric after the first. |
| 126 | `.metrics span:first-child { font: 620 1.1rem ui-monospace, monospace; font-variant-numeric: tabular-nums; }` | Uses fixed-width digits to prevent number widths changing as values update. |
| 127 | `.metrics span:last-child { color: var(--muted); font-size: .75rem; }` | Uses smaller, muted text for the metric names. |
| 128 | `.controls { display: grid; gap: 5px; }` | Stacks the related settings controls. |
| 129 | `.range-label { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: .86rem; font-weight: 650; }` | Aligns a range label with its numeric readout. |
| 130 | `.range-label output { color: var(--accent); font: 600 .83rem ui-monospace, monospace; }` | Colors the number with the mode accent and uses a fixed-width font. |
| 131 | `input[type="range"] { width: 100%; height: 26px; margin: 0; accent-color: var(--accent); }` | Expands the native range slider to the width of its parent. |
| 132 | `progress { display: block; margin-top: 11px; width: 100%; height: 7px; accent-color: var(--accent); }` | Displays the gesture progress bar across the available width. |
| 133 | `.transcript { display: grid; gap: 8px; }` | Spaces the transcript label, words, and actions vertically. |
| 134 | `.transcript h3, summary { font-size: .875rem; font-weight: 680; }` | Uses the same type size and weight for the transcript heading and pose summary. |
| 135 | `.word-list { display: flex; flex-wrap: wrap; gap: 6px; padding: 0; margin: 0; list-style: none; }` | Lays out accepted words in a wrapping horizontal list without browser list markers. |
| 136 | `.word-list:empty { display: none; }` | Removes the empty word list's space until it has a word. |
| 137 | `.word-list li { padding: 4px 8px; background: var(--raised); border: 1px solid var(--line); border-radius: 5px; color: var(--accent); font-size: .8rem; }` | Gives each accepted word a small bordered chip. |
| 138 | `.actions { display: flex; gap: 8px; flex-wrap: wrap; }` | Lays buttons in a row that wraps on narrow screens. |
| 139 | `summary { min-height: 40px; padding: 10px 0; border-top: 1px solid var(--line); }` | Adds a divider and a comfortable height to the expandable pose summary. |
| 140 | `dl { display: grid; gap: 7px; font-size: .81rem; }` | Spaces the pose description rows. |
| 141 | `dl div { display: grid; grid-template-columns: 1.45fr 1fr; gap: 8px; padding-bottom: 5px; border-bottom: 1px solid var(--line); }` | Gives each pose name more room than its mapped word or action. |
| 142 | `dt { color: var(--muted); }` | Uses muted text for the pose term. |
| 143 | `.caption { line-height: 1.45; overflow-wrap: anywhere; color: var(--accent); }` | Colors scene captions and wraps long text inside the result panel. |
| 144 | `.caption-tags { color: var(--muted); margin-top: 8px; font-size: .8rem; line-height: 1.4; overflow-wrap: anywhere; }` | Gives extracted labels secondary styling below the caption. |

### Live detection controls and results

| Line | Source | What the line does |
| ---: | --- | --- |
| 145 | `.detection-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 0; padding: 4px; min-width: 0; border: 1px solid var(--line); border-radius: 8px; background: #131c1f; }` | Gives the two detection choices equal widths in a dark control with a thin shared border. |
| 146 | `.detection-modes label { position: relative; cursor: pointer; }` | Lets each label position its native control and shows that it can be clicked. |
| 147 | `.detection-modes input { appearance: none; position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; border: 0; border-radius: 4px; cursor: pointer; }` | Styles the native radio as the entire rectangular selector and retains its native interaction. |
| 148 | `.detection-modes span { position: relative; pointer-events: none; display: grid; place-items: center; min-height: 44px; color: var(--muted); font-size: .875rem; font-weight: 680; }` | Centers the text, keeps the control 44 pixels tall, and passes clicks to the radio behind it. |
| 149 | `.detection-modes input:hover { background: var(--raised); }` | Changes the option's fill on hover. |
| 150 | `.detection-modes input:checked + span { border-radius: 4px; background: var(--green); color: #14241d; }` | Draws dark text and the selected mint fill on the same option face for contrast. |
| 151 | `.detection-modes input:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }` | Draws a visible focus ring directly on the full radio control. |
| 152 | `.detection-view { display: grid; gap: 12px; }` | Spreads each detection view's settings and results into a vertical stack. |
| 153 | `.detection-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }` | Aligns the result heading with its numerical count. |
| 154 | `.detection-heading h3 { font-size: .875rem; font-weight: 700; }` | Gives the detection subhead a compact semibold appearance. |
| 155 | `.detection-heading > span { color: var(--muted); font: .875rem ui-monospace, monospace; }` | Styles the count as secondary text with fixed-width digits. |
| 156 | `.detection-view .controls { margin-top: 3px; }` | Separates the slider controls from the last result row. |
| 157 | `.detection-view .metrics { margin-top: 0; }` | Removes excess vertical space above the motion metrics in this flatter layout. |
| 158 | `.object-results { list-style: none; margin: 0; padding: 0; max-height: 226px; overflow: auto; }` | Makes the detection result list compact and allows additional rows to scroll. |
| 159 | `.object-results:empty { display: none; }` | Removes the empty list from the layout until there are results. |
| 160 | `.object-results li { display: grid; grid-template-columns: 8px 1fr auto; align-items: baseline; gap: 9px; padding: 9px 1px; border-bottom: 1px solid var(--line); font-size: .88rem; }` | Aligns the class marker, name, and confidence in a grid with faint separating lines. |
| 161 | `.object-results li::before { content: ""; width: 8px; height: 8px; border-radius: 2px; background: var(--object-color); }` | Draws a small square beside each name using the same color as its camera box. |
| 162 | `.object-results li > span:last-child { color: var(--muted); font: .81rem ui-monospace, monospace; }` | Gives confidence scores muted color and even digit widths. |
| 163 | `footer { color: var(--muted); margin-top: 16px; font-size: .78rem; }` | Places the privacy footer below the work area. |

### Reduced motion and responsive layout

| Line | Source | What the line does |
| ---: | --- | --- |
| 165 | `@media (prefers-reduced-motion: no-preference) {` | Restricts the changes below to users who allow decorative motion. |
| 166 | `[data-enter] { animation: studio-enter 180ms ease-out; }` | Adds a brief entrance to the workspace heading. |
| 167 | `button { transition: border-color 150ms ease-out, background-color 150ms ease-out, transform 100ms ease-out; }` | Transitions button backgrounds and borders, plus their small pressed movement. |
| 168 | `button:active:not(:disabled) { transform: translateY(1px); }` | Moves a pressed, enabled button down one pixel. |
| 169 | `}` | Ends the CSS rule opened on line 165. |
| 171 | `@keyframes studio-enter {` | Defines the entrance animation used above. |
| 172 | `from { transform: translateY(3px); }` | Starts the introduction three pixels lower, then lets it settle into its normal position. |
| 173 | `}` | Ends the CSS rule opened on line 171. |
| 175 | `@media (max-width: 860px) {` | Starts rules for screens no wider than 860 pixels. |
| 176 | `.wrap { width: calc(100% - 36px); }` | Reduces the horizontal gutters to 18 pixels per side. |
| 177 | `.workspace { grid-template-columns: 1fr; }` | Stacks the preview and active panel in one column. |
| 178 | `}` | Ends the CSS rule opened on line 175. |
| 180 | `@media (max-width: 480px) {` | Starts the phone-specific rules at 480 pixels and below. |
| 181 | `.wrap { width: calc(100% - 24px); }` | Reduces the phone gutters to 12 pixels per side. |
| 182 | `.topbar-inner { min-height: 56px; }` | Shrinks the top bar's minimum height on a phone. |
| 183 | `main { padding-top: 26px; }` | Reduces the gap above the title. |
| 184 | `.intro { margin-bottom: 19px; }` | Reduces the gap below the introduction. |
| 185 | `.intro p { font-size: .9rem; }` | Shrinks the intro sentence slightly. |
| 186 | `.modes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; }` | Places the four mode tabs in a two-by-two grid. |
| 187 | `.modes button { padding-inline: 6px; font-size: .8rem; line-height: 1.2; }` | Keeps phone tab labels and padding compact. |
| 188 | `.surface-header, .camera-toolbar, .panel-content { padding-inline: 12px; }` | Reduces horizontal padding inside the panels. |
| 189 | `.stage { min-height: 192px; }` | Keeps the camera stage tall enough for its empty-state controls. |
| 190 | `.frame-guides { inset: 13px; }` | Increases the available space inside the standby frame by moving its guides toward the edge. |
| 191 | `.privacy { font-size: .72rem; }` | Shrinks the privacy notice text to fit beside the brand. |
| 192 | `}` | Ends the CSS rule opened on line 180. |
