export const SAMPLE_WIDTH = 160;
export const SAMPLE_HEIGHT = 96;

const TILE = 8;
const COLS = SAMPLE_WIDTH / TILE;
const ROWS = SAMPLE_HEIGHT / TILE;
const PIXELS = SAMPLE_WIDTH * SAMPLE_HEIGHT;

export function luma(rgba) {
  const gray = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < gray.length; i++) {
    const offset = i * 4;
    gray[i] = (77 * rgba[offset] + 150 * rgba[offset + 1] + 29 * rgba[offset + 2]) >> 8;
  }
  return gray;
}

function exposureOffset(before, after) {
  let sum = 0;
  let brighter = 0;
  let darker = 0;
  for (let i = 0; i < after.length; i++) {
    const delta = after[i] - before[i];
    sum += delta;
    if (delta > 8) brighter++;
    if (delta < -8) darker++;
  }

  // Compensate when most of the image changes brightness in the same direction.
  return Math.max(brighter, darker) > after.length * 0.75 ? sum / after.length : 0;
}

export function silhouetteMotion(previous, current, before, after) {
  if (previous?.length !== current.length || before?.length !== after.length || current.length !== after.length) return null;
  const shift = exposureOffset(before, after);
  const pixels = new Uint8Array(current.length);
  let foreground = 0;
  let changed = 0;
  for (let i = 0; i < current.length; i++) {
    if (current[i] < 0.62) continue;
    foreground++;
    if (previous[i] < 0.52 || Math.abs(after[i] - before[i] - shift) >= 24) {
      pixels[i] = 1;
      changed++;
    }
  }
  return { pixels, percent: foreground ? changed * 100 / foreground : 0 };
}

export function detectMotion(before, after, sensitivity) {
  const threshold = 52 - sensitivity * 0.37;
  const exposureShift = exposureOffset(before, after);
  const counts = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < SAMPLE_HEIGHT; y++) {
    for (let x = 0; x < SAMPLE_WIDTH; x++) {
      const pixel = y * SAMPLE_WIDTH + x;
      if (Math.abs(after[pixel] - before[pixel] - exposureShift) >= threshold) {
        counts[Math.floor(y / TILE) * COLS + Math.floor(x / TILE)]++;
      }
    }
  }

  let changed = 0;
  const regions = [];
  const visited = new Uint8Array(counts.length);
  const minChanged = Math.round(17 - sensitivity * 0.1);

  for (let i = 0; i < counts.length; i++) {
    if (visited[i] || counts[i] < minChanged) continue;
    const stack = [i];
    visited[i] = 1;
    let left = i % COLS;
    let right = left;
    let top = Math.floor(i / COLS);
    let bottom = top;
    let count = 0;
    while (stack.length) {
      const cell = stack.pop();
      const x = cell % COLS;
      const y = Math.floor(cell / COLS);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      count += counts[cell];

      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const next = ny * COLS + nx;
        if (visited[next] || counts[next] < minChanged) continue;
        visited[next] = 1;
        stack.push(next);
      }
    }

    if (count < 35) continue;
    changed += count;
    regions.push({
      x: left / COLS,
      y: top / ROWS,
      width: (right - left + 1) / COLS,
      height: (bottom - top + 1) / ROWS,
    });
  }

  return { regions, percent: 100 * changed / PIXELS };
}
