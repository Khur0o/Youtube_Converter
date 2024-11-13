document.addEventListener('DOMContentLoaded', function () {
    const fileFormat = document.getElementById('file-format');
    const videoQuality = document.getElementById('video-quality');
    const audioQuality = document.getElementById('audio-quality');
    const convertButton = document.getElementById('convert');
    const createButton = document.getElementById('create');
    const formContainer = document.getElementById('form-container');
    const urlInput = document.getElementById('url-input');
    const thumbnailImage1 = document.getElementById('thumbnail-image1');
    const videoTitleElement = document.getElementById('youtube-title');
    const loadingOverlay = document.getElementById('loading-overlay');

    //window.history.pushState({}, '', '/Converter');
    fileFormat.addEventListener('change', updateQualityOptions);
    updateQualityOptions();

    function updateQualityOptions() {
        const format = fileFormat.value;
        videoQuality.style.display = format === 'mp4' ? 'block' : 'none';
        audioQuality.style.display = format === 'mp3' ? 'block' : 'none';

        const qualityOptions = format === 'mp4' ? ['1080p MP4', '720p MP4', '480p MP4'] : ['high-quality MP3'];
        const qualityDropdown = format === 'mp4' ? videoQuality : audioQuality;

        qualityDropdown.innerHTML = '';
        qualityOptions.forEach(q => {
            const option = document.createElement('option');
            option.value = q;
            option.textContent = q;
            qualityDropdown.appendChild(option);
        });
    }

    async function fetchYouTubeVideoDetails(videoID) {
        try {
            const response = await fetch(`http://localhost:5000/api/youtube/${videoID}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching video details:', error);
            return null;
        }
    }

    async function handleDownload(videoID, format, quality) {
        try {
            const response = await fetch('http://localhost:5000/api/youtube/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoID, format, quality })
            });
            if (!response.ok) 
                throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            return data.downloadLink;
        } catch (error) {
            console.error('Error during download:', error);
            return null;
        }
    }

    function getYouTubeVideoID(url) {
        const regex = /(?:youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    function handleYouTubeConversion() {
        const videoID = getYouTubeVideoID(urlInput.value);
        if (!videoID) {
            videoTitleElement.textContent = 'Invalid URL';
            alert('Invalid URL.');
            return;
        }

        fetchYouTubeVideoDetails(videoID)
            .then(details => {
                if (details) {
                    const thumbnailURL = `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`;
                    thumbnailImage1.src = thumbnailURL;
                    videoTitleElement.textContent = details.title;
                    window.videoID = videoID;
                    formContainer.style.display = 'flex';
                } else {
                    videoTitleElement.textContent = 'No title available';
                }
            })
            .catch(error => {
                videoTitleElement.textContent = 'Error fetching video details';
                console.error(error);
            });
    }

    convertButton.addEventListener('click', function () {
        if (urlInput.value.trim()) {
            handleYouTubeConversion();
        } else {
            alert('Please enter a URL.');
        }
    });

    createButton.addEventListener('click', async function (event) {
        event.preventDefault();
        loadingOverlay.style.display = 'flex';
        const videoID = window.videoID;
        const format = fileFormat.value;
        const quality = format === 'mp4' ? videoQuality.value : audioQuality.value;
    
        sessionStorage.setItem('videoTitle', videoTitleElement.textContent);
        sessionStorage.setItem('thumbnailUrl', thumbnailImage1.src);
    
        const downloadLink = await handleDownload(videoID, format, quality);
        if (downloadLink) {
            window.open(downloadLink, '_blank');
            loadingOverlay.style.display = 'none';
        } else {
            //alert('Failed to get the download link.');
            loadingOverlay.style.display = 'none';
        }
    });
});
