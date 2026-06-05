const express = require('express');
const router = express.Router();
const { uploadImage } = require('../services/upload');
const crypto = require('crypto');

// POST /api/upload
// Body: { image: "base64 string" }
// Response: { code: 0, data: { url: "..." } }
router.post('/', async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ code: -1, msg: '缺少图片数据' });
    }

    const filename = crypto.randomUUID();
    const url = await uploadImage(image, filename);

    res.json({ code: 0, data: { url } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
