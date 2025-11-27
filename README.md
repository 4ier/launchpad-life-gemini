<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Launchpad Studio

16×16 Life-driven sequencer with multiple instruments, synced transport, and compact share links.

- Live: https://4ier.github.io/launchpad-life-gemini/
- Sharing: click **Share** to copy a URL with `?s=` code (≤10 chars for up to 4 pads; grows linearly for up to 8).
- State encoded: global BPM + instrument types + deterministic seeds per pad. Playback stays paused until you hit play.

## Run Locally

Prereqs: Node.js (>=18 recommended)

```bash
npm install
npm run dev   # start on http://localhost:3000
# npm run build  # production build
```

## Deploy (GitHub Pages)

Push to `main`; the GitHub Actions workflow builds and publishes to Pages using Vite’s `base` set for `/launchpad-life-gemini/`.
