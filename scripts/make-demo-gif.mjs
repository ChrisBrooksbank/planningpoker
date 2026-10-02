// Converts e2e/demo/demo.webm into an optimised GIF and an MP4. Needs ffmpeg.
import { execFileSync } from "node:child_process";

const input = "e2e/demo/demo.webm";
const palette = "e2e/demo/palette.png";
const width = 800;
const fps = 10;
const scale = `fps=${fps},scale=${width}:-1:flags=lanczos`;

const ffmpeg = (...args) =>
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: "inherit",
  });

// Two-pass palette gives far cleaner colours and smaller files than the default.
ffmpeg(
  "-i",
  input,
  "-vf",
  `${scale},palettegen=max_colors=128:stats_mode=diff`,
  palette
);
ffmpeg(
  "-i",
  input,
  "-i",
  palette,
  "-lavfi",
  `${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
  "-loop",
  "0",
  "e2e/demo/demo.gif"
);

// LinkedIn handles MP4 far better than GIF.
ffmpeg(
  "-i",
  input,
  "-vf",
  "scale=1100:-2,format=yuv420p",
  "-c:v",
  "libx264",
  "-crf",
  "20",
  "-movflags",
  "+faststart",
  "e2e/demo/demo.mp4"
);

console.log("Wrote e2e/demo/demo.gif and e2e/demo/demo.mp4");
