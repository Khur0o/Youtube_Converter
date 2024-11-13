import fetch from 'node-fetch';
import dotenv from 'dotenv';
import ytdl from 'ytdl-core';
import express from 'express';
import cors from 'cors';

// Load environment variables from .env file in the same folder
dotenv.config();
export async function fetchVideoDetails(videoID) {
    console.log('Loaded environment variables:', process.env); // Debugging line
    const apiKey = process.env.YOUTUBE_API_KEY;
    const port = process.env.PORT || 5000; 

    console.log(`Your API Key is: ${apiKey}`);
    console.log("Your VideoID is: ", videoID);
    console.log("Server running on port:", port);

    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoID}&part=snippet&key=${apiKey}`;
    console.log('Fetching video details from URL:', url);
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`YouTube API responded with status ${response.status}`);
        }
        const data = await response.json();
        return data.items.length > 0 ? data.items[0] : null;
    } catch (error) {
        console.error('Error fetching video details from YouTube:', error);
        throw error;
    }
}

// Function to generate a download URL
export async function getDownloadUrl(videoID, format, quality) {
    // This would be where you integrate the logic for converting and downloading
    // For simplicity, we will return a dummy download URL for now

    const baseUrl = `http://192.168.0.44:${process.env.PORT || 5000}/download`;

    // Simulate different download links based on format and quality
    const downloadUrl = `${baseUrl}?videoID=${videoID}&format=${format}&quality=${quality}`;

    // Return the download URL
    return downloadUrl;
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
export const downloadVideo = async (videoID, format, quality) => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoID}`;
    
    try {
        // Fetch video info
        const videoInfo = await ytdl.getInfo(videoUrl);
        const availableFormats = videoInfo.formats;
        
        // Check if the requested format/quality exists
        const matchingFormat = availableFormats.find(f => f.container === format && f.qualityLabel === quality);
        
        if (!matchingFormat) {
            throw new Error(`Requested format not found: ${format} ${quality}`);
        }

        // Download with the matching format
        const options = { format: matchingFormat };
        return ytdl(videoUrl, options);
    } catch (error) {
        console.error(`Error in downloadVideo: ${error.message}`);
        throw error; // This will be caught and sent back as a 500 response
    }
};


app.get('/get-video-info', async (req, res) => {
    const videoID = req.query.videoID;
    const videoUrl = `https://www.youtube.com/watch?v=${videoID}`;

    try {
        const info = await ytdl.getInfo(videoUrl);
        const availableFormats = info.formats.map(format => ({
            qualityLabel: format.qualityLabel,
            mimeType: format.mimeType,
        }));
        
        res.send({ formats: availableFormats });
    } catch (error) {
        console.error('Error fetching video info:', error);
        res.status(500).send({ error: 'Error fetching video information' });
    }
});


