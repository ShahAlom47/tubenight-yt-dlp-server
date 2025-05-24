// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");
const { execFile } = require("child_process");
const util = require("util");

const app = express();
app.use(cors());

const execFileAsync = util.promisify(execFile);

// Detect OS and set yt-dlp path accordingly
const isWindows = process.platform === "win32";
const ytDlpPath = isWindows
  ? path.resolve(__dirname, "bin", "yt-dlp.exe") // Local Windows exe
  : "yt-dlp"; // Global command for Linux (deploy)

app.get("/video-info", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Video URL is required" });

  try {
    const { stdout, stderr } = await execFileAsync(ytDlpPath, [
      "--dump-single-json",
      "--no-playlist",
      "--force-ipv4",
      "--no-check-certificate",
      "--add-header", "referer:youtube.com",
      "--add-header", "user-agent:googlebot",
      url,
    ]);

    if (stderr) console.warn(stderr);

    const info = JSON.parse(stdout);

    const allFormats = info.formats.map((f) => {
      const filesize = f.filesize || (f.filesize_approx ? Math.round(f.filesize_approx) : null);

      return {
        format_id: f.format_id,
        format_note: f.format_note,
        ext: f.ext,
        url: f.url,
        acodec: f.acodec,
        vcodec: f.vcodec,
        hasAudio: f.acodec !== "none",
        isVideo: f.vcodec !== "none",
        filesize: filesize,
        _warning: !filesize ? "Size may be inaccurate" : undefined,
      };
    });

    return res.json({
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      formats: allFormats,
      url: info.webpage_url,
    });
  } catch (error) {
    console.error("yt-dlp error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`yt-dlp-server running at http://localhost:${PORT}`);
});
