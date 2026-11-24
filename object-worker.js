const MODEL = "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/1/efficientdet_lite2.tflite";
let detector;

self.onmessage = async ({ data: { bitmap, now } }) => {
  try {
    if (!detector) {
      const { loadVisionTasks } = await import("./mediapipe.mjs");
      const { sdk, fileset } = await loadVisionTasks();
      detector = await sdk.ObjectDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
        runningMode: "VIDEO",
        scoreThreshold: 0.3,
        maxResults: 8,
      });
    }
    self.postMessage(bitmap ? detector.detectForVideo(bitmap, now) : { ready: true });
  } catch (error) {
    self.postMessage({ error: error.message || String(error) });
  } finally {
    bitmap?.close();
  }
};
