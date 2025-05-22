// server.js
const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const util = require('util');
const cors = require('cors');

const app = express();
app.use(cors());

const execFileAsync = util.promisify(execFile);

app.get('/video-info', async (req, res) => {
  const url = req.query.url;
  console.log(`Received request for URL: ${url}`);
  if (!url) return res.status(400).json({ error: 'Video URL is required' });

  const exePath = path.resolve(__dirname, 'bin', 'yt-dlp.exe');

  try {
    const { stdout, stderr } = await execFileAsync(exePath, [
      '--dump-single-json',
      '--no-check-certificate',
      '--no-warnings',
      '--add-header', 'referer:youtube.com',
      '--add-header', 'user-agent:googlebot',
      url,
    ]);

    if (stderr) console.warn(stderr);

    const info = JSON.parse(stdout);

    const allFormats = info.formats.map(f => ({
      format_id: f.format_id,
      format_note: f.format_note,
      ext: f.ext,
      filesize: f.filesize,
      url: f.url,
      acodec: f.acodec,
      vcodec: f.vcodec,
      hasAudio: f.acodec !== 'none',
      isVideo: f.vcodec !== 'none',
    }));

    if (allFormats.length === 0) {
      return res.status(404).json({ error: 'No formats found' });
    }

    return res.json({
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      formats: allFormats,
      url: info.webpage_url,
    });

  } catch (error) {
    console.error('yt-dlp error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`yt-dlp-server running at http://localhost:${PORT}`);
});
