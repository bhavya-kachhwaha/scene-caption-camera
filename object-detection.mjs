const COLORS = ["#8de6f5", "#a5eecf", "#ffce76", "#ffaac3", "#ffba91", "#d2e998", "#afd0ff"];

export async function loadObjectDetector() {
  // MediaPipe uses importScripts for its WebAssembly loader, so this worker is classic.
  const worker = new Worker(new URL("./object-worker.js", import.meta.url));
  const request = (message, transfer = []) => new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data);
    worker.onerror = event => reject(new Error(event.message || "The object worker stopped."));
    worker.postMessage(message, transfer);
  });
  try {
    await request({});
  } catch (error) {
    worker.terminate();
    throw error;
  }
  return {
    async detectForVideo(video, now) {
      const bitmap = await createImageBitmap(video);
      return request({ bitmap, now }, [bitmap]);
    },
    close: () => worker.terminate(),
  };
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, value));
}

export function readObjects(detections, width, height) {
  const objects = [];
  for (const { categories, boundingBox } of detections) {
    const { categoryName: label, score } = categories[0] ?? {};
    if (!label || !(score >= 0 && score <= 1) || !boundingBox) continue;

    const { originX, originY, width: boxWidth, height: boxHeight } = boundingBox;
    const x = clampUnit(originX / width);
    const y = clampUnit(originY / height);
    const right = clampUnit((originX + boxWidth) / width);
    const bottom = clampUnit((originY + boxHeight) / height);
    if (!(right > x && bottom > y)) continue;

    let color = 0;
    for (const character of label) color = (color * 31 + character.charCodeAt(0)) % COLORS.length;
    objects.push({ label, score, color: COLORS[color], x, y, width: right - x, height: bottom - y });
  }
  return objects;
}

function overlap(a, b) {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const intersection = width * height;
  return intersection / (a.width * a.height + b.width * b.height - intersection);
}

export function trackObjects(previous, detections, now) {
  const unmatched = previous.filter(object => now - object.lastSeen <= 500);
  const tracks = detections.map(object => {
    let match = -1;
    let best = 0.3;
    for (const [index, old] of unmatched.entries()) {
      if (object.label !== old.label) continue;
      const shared = overlap(object, old);
      if (shared <= best) continue;
      match = index;
      best = shared;
    }
    if (match === -1) return { ...object, seen: 1, lastSeen: now };
    const [old] = unmatched.splice(match, 1);
    return { ...object, seen: Math.min(2, old.seen + 1), lastSeen: now,
      x: 0.75 * object.x + 0.25 * old.x, y: 0.75 * object.y + 0.25 * old.y,
      width: 0.75 * object.width + 0.25 * old.width, height: 0.75 * object.height + 0.25 * old.height };
  });
  return tracks.concat(unmatched.filter(object => object.seen === 2 && now - object.lastSeen <= 400));
}

export function projectBox(box, view, mirrored) {
  const left = mirrored ? 1 - box.x - box.width : box.x;
  return [view.x + left * view.width, view.y + box.y * view.height,
    box.width * view.width, box.height * view.height];
}

export function placeLabel([x, y], width, height, view, used) {
  const left = Math.min(x, view.x + view.width - width);
  const top = Math.max(view.y, y - height);
  const room = [top, y, y + height].find(row => row + height <= view.y + view.height &&
    used.every(label => left + width <= label.x || left >= label.x + label.width ||
      row + height <= label.y || row >= label.y + label.height));
  return { x: left, y: room ?? Math.min(top, view.y + view.height - height), width, height };
}
