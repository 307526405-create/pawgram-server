const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COS_MODE = process.env.COS_MODE || 'mock';

// Ensure upload directory exists (for mock mode)
const uploadDir = path.join(__dirname, '..', '..', 'public', 'upload');
if (COS_MODE === 'mock') {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Upload a base64 image and return the URL.
 * In mock mode, saves to local public/upload/.
 * In production mode, uploads to Tencent Cloud COS.
 *
 * @param {string} base64Data - The base64 image string (with or without data URI prefix)
 * @param {string} filename - Optional filename (without extension)
 * @returns {Promise<string>} The public URL of the uploaded image
 */
async function uploadImage(base64Data, filename) {
  // Strip data URI prefix if present
  let mime = 'image/jpeg';
  let raw = base64Data;
  const match = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) {
    mime = match[1];
    raw = match[2];
  }

  // Determine extension
  const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
  const ext = extMap[mime] || 'jpg';
  const baseName = filename || crypto.randomUUID();
  const fullName = `${baseName}.${ext}`;

  // Decode base64 to buffer
  const buffer = Buffer.from(raw, 'base64');

  if (COS_MODE === 'mock') {
    const filePath = path.join(uploadDir, fullName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fullName}`;
  }

  // Production: upload to Tencent COS
  const COS = require('cos-nodejs-sdk-v5');
  const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
  });

  const Bucket = process.env.COS_BUCKET;
  const Region = process.env.COS_REGION || 'ap-guangzhou';
  const Key = `pawgram/${fullName}`;

  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket,
      Region,
      Key,
      Body: buffer,
      ContentType: mime,
    }, (err, data) => {
      if (err) {
        console.error('[COS Upload Error]', err);
        return reject(err);
      }
      const url = `https://${Bucket}.cos.${Region}.myqcloud.com/${Key}`;
      resolve(url);
    });
  });
}

module.exports = { uploadImage };
