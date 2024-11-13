import express from 'express';
import cors from 'cors';
import youtubeController from './controllers/youtubeController.mjs';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/', youtubeController);

app.listen(PORT, 'localhost', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
