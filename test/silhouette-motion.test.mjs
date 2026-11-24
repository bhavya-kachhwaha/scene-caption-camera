import assert from "node:assert/strict";
import { test } from "node:test";
import { silhouetteMotion } from "../motion.mjs";

test("silhouette motion counts only changed foreground pixels", () => {
  const previous = [0.9, 0.9, 0.1, 0.1];
  const current = [0.9, 0.9, 0.9, 0.1];
  const before = [30, 30, 30, 30];
  const after = [70, 30, 30, 100];
  const result = silhouetteMotion(previous, current, before, after);
  assert.deepEqual([...result.pixels], [1, 0, 1, 0]);
  assert.equal(result.percent, 200 / 3);
});

test("silhouette ignores the first frame and a uniform exposure shift", () => {
  const mask = [0.9, 0.9, 0.1, 0.1];
  const dark = [20, 20, 20, 20];
  const light = [60, 60, 60, 60];
  assert.equal(silhouetteMotion(null, mask, dark, light), null);
  assert.equal(silhouetteMotion(mask, mask, dark, light).percent, 0);
});
