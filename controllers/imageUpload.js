require('dotenv').config();
const express = require('express');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const s3Router = express.Router();

const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION
});

// Configure multer with memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});

s3Router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'An image file (jpeg, png, webp or gif) is required' });
        }
        const uploadParams = {
            Bucket: 'emapathy-therapists',
            // Key: Date.now().toString() + req.file.originalname,
            Key: `empathy-therapists/${Date.now().toString()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        const parallelUploads3 = new Upload({
            client: s3,
            params: uploadParams,
        });

        parallelUploads3.on('httpUploadProgress', (progress) => {
            console.log(progress);
        });

        await parallelUploads3.done();

        const imageUrl = `https://${uploadParams.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
        res.json({ imageUrl });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Error uploading image' });
    }
});

module.exports = s3Router;
