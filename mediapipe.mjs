const SDK_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32";

export async function loadVisionTasks() {
  const sdk = await import(SDK_URL + "/vision_bundle.mjs");
  const fileset = await sdk.FilesetResolver.forVisionTasks(SDK_URL + "/wasm");
  return { sdk, fileset };
}
