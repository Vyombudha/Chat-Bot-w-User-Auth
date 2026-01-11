import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import userRoute from './routes/userRoute.js';
import chatRoute from './routes/chatRoute.js';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 5001;



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Middle ware 
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: `*`,
    credentials: true
}))


// serve Landing Page for first '/' page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});


// Serve Static Files for the time Being
app.use(express.static('public'));

// Routing Logic
app.use('/user', userRoute);
app.use('/chats', chatRoute);





app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Running at  http://localhost:${PORT}`);
    console.log(`And local Network on  http://192.168.1.67:${PORT}`);
})