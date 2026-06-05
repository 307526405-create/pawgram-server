const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { sendCode, verifyCode } = require('../services/sms');

// Use JWT secret from env or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'pawgram-secret-key-dev-only';

// In-memory user store (in production, use database)
const users = new Map();

// Helper: find or create user by phone
function findOrCreateUser(phone) {
  if (users.has(phone)) {
    return users.get(phone);
  }
  const user = {
    id: Date.now(),
    phone,
    nickname: `用户${phone.slice(-4)}`,
    avatar: '',
    createdAt: new Date().toISOString(),
  };
  users.set(phone, user);
  return user;
}

// POST /api/auth/send-code
router.post('/send-code', async (req, res) => {
  const { phone } = req.body;
  const result = await sendCode(phone, req);
  if (result.success) {
    res.json({ code: 0, msg: result.msg });
  } else {
    res.json({ code: -1, msg: result.msg });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.json({ code: -1, msg: '手机号和验证码不能为空' });
  }

  const result = verifyCode(phone, code);
  if (!result.success) {
    return res.json({ code: -1, msg: result.msg });
  }

  const user = findOrCreateUser(phone);
  const token = jwt.sign(
    { id: user.id, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    code: 0,
    data: {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    },
  });
});

// Middleware to verify JWT token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: -1, msg: '未登录' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: -1, msg: '登录已过期，请重新登录' });
  }
}

module.exports = router;
module.exports.authMiddleware = authMiddleware;
