import express from 'express';
import cors from 'cors';
import youtubeController from './controllers/youtubeController.mjs';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/', youtubeController);

app.listen(PORT, '192.168.0.44', () => {
    console.log(`Server is running on http://192.168.0.44:${PORT}`);
});
