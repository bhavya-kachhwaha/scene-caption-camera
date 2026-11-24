# Scene Caption Camera

Describe a webcam frame and read its caption aloud.

This repo opens one mode of [Python Webcam Studio](https://github.com/bhavya-kachhwaha/python-webcam-studio). The studio is pinned as a Git submodule under [studio](studio), with the Python, Node.js, browser JavaScript, HTML, CSS, model setup, and tests shared by all four app repos.

[Open the public browser demo](https://bhavya.agenticsystems.workers.dev/demos/scene-caption-camera/) · [Shared walkthrough](https://github.com/bhavya-kachhwaha/python-webcam-studio/blob/main/WALKTHROUGH.md) · [App chapter](https://github.com/bhavya-kachhwaha/python-webcam-studio/blob/main/WALKTHROUGH-CAPTIONS.md)

## Run the Python-backed browser app

```bash
git clone --recurse-submodules https://github.com/bhavya-kachhwaha/scene-caption-camera.git
cd scene-caption-camera/studio
uv venv --python 3.12
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python download_models.py
cd ..
npm start
```

Open [the local app](http://127.0.0.1:8894/scene-caption-camera/), then select **Start camera**. Use **Mirror camera** to switch orientation. Node.js 22 or newer starts the same Python server from this repo. The shared README includes the pip setup and container commands.

To use the desktop preview from this repo, run `studio/.venv/bin/python run.py`. Pass `--video FILE` to replay a clip. See [the launcher walkthrough](WALKTHROUGH.md) for how the two commands connect to the shared code.

If you cloned without the shared source, run `git submodule update --init --recursive` from the app repo.
