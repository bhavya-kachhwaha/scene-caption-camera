# Scene Caption Camera

Describe a webcam frame and read its caption aloud.

[Open the browser demo](https://bhavya.agenticsystems.workers.dev/demos/scene-caption-camera/)

## Run locally

Run `python3 -m http.server 8876 --bind 127.0.0.1` from this folder, then open the app at [localhost](http://127.0.0.1:8876/).

Start the camera and select Describe frame. The first caption downloads about 250 MB of model weights.

This standalone edition opens directly in its own mode and shares the Webcam Studio source. Frames stay in your browser. The model files download on first use.

[Line-by-line code walkthrough](./docs/code-walkthrough.md)

## References

- [Tuba's sign-to-voice demo](https://github.com/tubakhxn/sign-language-to-voice-system)
- [See and Tell](https://github.com/tubakhxn/see-and-tell)
- [Living Particle Artwork](https://github.com/tubakhxn/Living-Particle-Artwork)

Run `node --test test/*.test.mjs` to verify object and motion calculations.
