const axios = require('axios');

class YouTubeRepository {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3/videos';
    }

    async getVideoDetails(videoID) {
        try {
            const response = await axios.get(`${this.baseUrl}`, {
                params: {
                    part: 'snippet',
                    id: videoID,
                    key: this.apiKey,
                },
            });

            const { items } = response.data;
            if (items.length > 0) {
                const { title, description, thumbnails } = items[0].snippet;
                return { title, description, thumbnails };
            } else {
                throw new Error('Video not found');
            }
        } catch (error) {
            console.error('Error fetching video details:', error);
            throw error;
        }
    }
}

module.exports = YouTubeRepository;
