import assert from "node:assert/strict";
import { test } from "node:test";
import { placeLabel, projectBox, readObjects, trackObjects } from "../object-detection.mjs";

test("object results preserve confidence and clip boxes to the camera frame", () => {
  const detections = [
    {
      categories: [{ categoryName: "person", score: 0.96 }],
      boundingBox: { originX: -15, originY: 25, width: 65, height: 100 },
    },
    {
      categories: [{ categoryName: "chair", score: 0.72 }],
      boundingBox: { originX: 120, originY: 20, width: 10, height: 50 },
    },
    {
      categories: [{ categoryName: "dog", score: NaN }],
      boundingBox: { originX: 15, originY: 25, width: 65, height: 50 },
    },
  ];
  const [person, ...others] = readObjects(detections, 100, 100);
  assert.deepEqual(others, []);
  const { color, ...result } = person;
  assert.match(color, /^#[0-9a-f]{6}$/);
  assert.deepEqual(
    result,
    { label: "person", score: 0.96, x: 0, y: 0.25, width: 0.5, height: 0.75 },
  );
});

test("letterboxed overlay mirrors its horizontal position and keeps its size", () => {
  const box = { x: 0.125, y: 0.25, width: 0.25, height: 0.5 };
  const view = { x: 50, y: 20, width: 400, height: 200 };
  assert.deepEqual(projectBox(box, view, false), [100, 70, 100, 100]);
  assert.deepEqual(projectBox(box, view, true), [300, 70, 100, 100]);
});

test("neighboring labels choose separate rows when their boxes are close", () => {
  const view = { x: 50, y: 20, width: 200, height: 100 };
  const first = placeLabel([130, 44], 90, 20, view, []);
  const second = placeLabel([180, 49], 90, 20, view, [first]);
  assert.deepEqual(first, { x: 130, y: 24, width: 90, height: 20 });
  assert.deepEqual(second, { x: 160, y: 49, width: 90, height: 20 });
});

test("object tracks confirm twice, smooth matching boxes, and expire after a brief gap", () => {
  const box = { label: "dog", x: 0.125, y: 0, width: 0.5, height: 0.5 };
  const first = trackObjects([], [box], 0);
  assert.equal(first[0].seen, 1);
  const next = trackObjects(first, [{ ...box, x: 0.25 }], 180);
  assert.equal(next.length, 1);
  assert.equal(next[0].seen, 2);
  assert.equal(next[0].x, 0.21875);
  assert.deepEqual(trackObjects(next, [], 360), next);
  assert.deepEqual(trackObjects(next, [], 581), []);
});
