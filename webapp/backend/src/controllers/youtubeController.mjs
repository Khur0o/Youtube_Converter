import express from 'express';
import { fetchVideoDetails } from '../services/youtubeService.mjs';
import youtubedl from 'youtube-dl-exec';
import util from 'util';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execPromise = util.promisify(exec);
const router = express.Router();

const downloadsDir = path.join(__dirname, '../downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

router.get('/api/youtube/:videoID', async (req, res) => {
    const { videoID } = req.params;
    try {
        const videoDetails = await fetchVideoDetails(videoID);
        if (videoDetails) {
            res.json({
                title: videoDetails.snippet.title,
                description: videoDetails.snippet.description,
                thumbnail: videoDetails.snippet.thumbnails.default.url
            });
        } else {
            res.status(404).json({ error: 'Video not found' });
        }
    } catch (error) {
        console.error('Error fetching video details:', error);
        res.status(500).json({ error: 'Failed to fetch video details' });
    }
});

router.post('/api/youtube/download', async (req, res) => {
    const { videoID, format, quality } = req.body;
    const videoUrl = `https://www.youtube.com/watch?v=${videoID}`;
    const timestamp = Date.now().toString();
    const tempFolder = path.join(downloadsDir, timestamp);

    try {
        if (!fs.existsSync(tempFolder)) {
            fs.mkdirSync(tempFolder, { recursive: true });
        }

        let options;
        let extension;

        if (format === 'mp3') {
            options = {
                format: 'bestaudio',
                audioFormat: 'mp3',
                audioQuality: '320k', 
                postprocessorArgs: ['-b:a', '320k'],
                o: path.join(tempFolder, `${timestamp}.mp3`)
            };
            extension = 'mp3';
        }
         else {
            let formatCode;
            switch (quality) {
                case '1080p MP4':
                    formatCode = 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]';
                    break;
                case '720p MP4':
                    formatCode = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]';
                    break;
                case '480p MP4':
                    formatCode = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]';
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid video quality selected' });
            }
            options = {
                format: formatCode,
                o: path.join(tempFolder, `%(title)s.%(ext)s`)
            };
            extension = 'mp4';
        }

        await youtubedl(videoUrl, options);

        let filePath;

        if (format === 'mp3') {
            const videoInfo = await youtubedl(videoUrl, { dumpSingleJson: true });
            const thumbnailUrl = videoInfo.thumbnail;
            const videoTitle = videoInfo.title;
            const sanitizedTitle = videoTitle.replace(/[<>:"/\\|?*]+/g, '');
            const audioFile = path.join(tempFolder, `${timestamp}.mp3`);
            const audioWithMetadata = path.join(tempFolder, `${sanitizedTitle}.mp3`);
            const thumbnailFile = path.join(tempFolder, `thumbnail_${timestamp}.jpg`);

            const response = await axios({
                url: thumbnailUrl,
                responseType: 'stream'
            });
            const thumbnailStream = fs.createWriteStream(thumbnailFile);
            response.data.pipe(thumbnailStream);
            await new Promise((resolve, reject) => {
                thumbnailStream.on('finish', resolve);
                thumbnailStream.on('error', reject);
            });

            const ffmpegCommand = `ffmpeg -i "${audioFile}" -i "${thumbnailFile}" -map 0:a -map 1 -c:a libmp3lame -q:a 2 -c:v mjpeg -metadata title="${videoTitle}" -metadata artist="${videoInfo.uploader}" "${audioWithMetadata}"`;
            await execPromise(ffmpegCommand);

            fs.unlinkSync(audioFile);
            fs.unlinkSync(thumbnailFile);

            filePath = audioWithMetadata;
        } else {
            const files = fs.readdirSync(tempFolder);
            const videoFile = files.find(file => file.endsWith('.mp4'));
            filePath = path.join(tempFolder, videoFile);
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found after download' });
        }

        const downloadLink = `http://${req.hostname}:5000/downloads/${timestamp}/${path.basename(filePath)}`;
        res.json({ message: 'Download completed', downloadLink });
        console.log("Download Link : " + downloadLink + "\nDone");


    } catch (error) {
        console.error('Error downloading video:', error);
        res.status(500).json({ error: 'Error during download process.' });
    }
});

router.get('/downloads/:timestamp/:filename', (req, res) => {
    const { timestamp, filename } = req.params;
    const filePath = path.join(downloadsDir, timestamp, filename);

    if (!fs.existsSync(filePath)) {
        console.error("File not found:", filePath);
        return res.status(404).send('File not found');
    }

    const encodedFilename = encodeURIComponent(filename);
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.download(filePath, (err) => {
        if (err) {
            console.error("File failed to download:", err.message);
            if (!res.headersSent) {
                return res.status(500).send(`Error downloading the file: ${err.message}`);
            }
        }
    });
});

export default router;
