import express, {Request, Response} from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {spawn} from 'child_process';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());



app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});