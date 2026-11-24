const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/";
const MODEL = "Xenova/vit-gpt2-image-captioning";

let captioner;
let RawImage;

self.onmessage = async ({ data: { id, width, height, buffer } }) => {
  try {
    if (!captioner) {
      self.postMessage({ id, status: "loading" });
      const library = await import(TRANSFORMERS + "transformers.min.js");
      RawImage = library.RawImage;
      library.env.allowLocalModels = false;
      library.env.backends.onnx.wasm.numThreads = 1;
      // Keep the WASM runtime and JavaScript glue on the same distribution.
      library.env.backends.onnx.wasm.wasmPaths = TRANSFORMERS;
      captioner = await library.pipeline("image-to-text", MODEL, { device: "wasm", dtype: "q8" });
    }

    self.postMessage({ id, status: "working" });
    const image = new RawImage(new Uint8ClampedArray(buffer), width, height, 4);
    const [result] = await captioner(image, { max_new_tokens: 30 });
    const caption = result.generated_text.trim();
    if (!caption) throw new Error("The model returned an empty caption.");
    self.postMessage({ id, caption });
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) });
  }
};
