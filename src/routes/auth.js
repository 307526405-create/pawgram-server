const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../database/init');
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

// POST /api/auth/register-device
router.post('/register-device', (req, res) => {
  const { deviceToken, platform } = req.body;

  if (!deviceToken) {
    return res.json({ code: -1, msg: 'deviceToken is required' });
  }

  // Extract userId from JWT if available; fallback to userId in body for dev
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      // Token invalid, try body userId
    }
  }
  if (!userId) {
    userId = req.body.userId || 1;
  }

  try {
    db.prepare(
      'INSERT OR REPLACE INTO device_tokens (device_token, user_id, platform, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(deviceToken, userId, platform || 'ios');
    console.log(`[Push] Device token registered for user ${userId}: ${deviceToken.slice(0, 8)}... (${platform || 'ios'})`);
    res.json({ code: 0, msg: 'ok' });
  } catch (err) {
    console.error('[Push] Failed to register device token:', err.message);
    res.json({ code: -1, msg: 'Failed to register device token' });
  }
});

// POST /api/auth/wechat-login
router.post('/wechat-login', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.json({ code: -1, msg: '缺少微信授权码' });
    }

    const wechatMode = process.env.WECHAT_MODE || 'mock';
    let openid, nickname, avatar;

    if (wechatMode === 'mock') {
      // Mock mode: use fake WeChat user info
      console.log('[WeChat] Mock mode - using test openid for code:', code);
      openid = 'mock_openid_' + code.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      nickname = '微信用户' + code.slice(-4);
      avatar = '';
    } else {
      // Production mode: call real WeChat API
      const appId = process.env.WECHAT_APP_ID;
      const appSecret = process.env.WECHAT_APP_SECRET;

      if (!appId || !appSecret) {
        return res.json({ code: -1, msg: '微信AppID或AppSecret未配置' });
      }

      // Step 1: Exchange code for access_token and openid
      const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;
      console.log('[WeChat] Requesting access_token...');

      let tokenRes;
      try {
        tokenRes = await fetch(tokenUrl);
      } catch (fetchErr) {
        console.error('[WeChat] Fetch token error:', fetchErr.message);
        return res.json({ code: -1, msg: '微信服务器连接失败，请稍后重试' });
      }

      const tokenData = await tokenRes.json();
      console.log('[WeChat] Token response:', JSON.stringify(tokenData).slice(0, 200));

      if (tokenData.errcode) {
        console.error('[WeChat] Token error:', tokenData);
        return res.json({ code: -1, msg: `微信授权失败: ${tokenData.errmsg || '未知错误'}` });
      }

      openid = tokenData.openid;
      const accessToken = tokenData.access_token;

      // Step 2: Get user info
      const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;
      console.log('[WeChat] Requesting userinfo...');

      try {
        const userInfoRes = await fetch(userInfoUrl);
        const userInfoData = await userInfoRes.json();
        console.log('[WeChat] UserInfo response:', JSON.stringify(userInfoData).slice(0, 200));

        if (userInfoData.errcode) {
          console.error('[WeChat] UserInfo error:', userInfoData);
          return res.json({ code: -1, msg: `获取用户信息失败: ${userInfoData.errmsg || '未知错误'}` });
        }

        nickname = userInfoData.nickname || '微信用户';
        avatar = userInfoData.headimgurl || '';
      } catch (userInfoErr) {
        console.error('[WeChat] Fetch userinfo error:', userInfoErr.message);
        return res.json({ code: -1, msg: '获取用户信息失败，请稍后重试' });
      }
    }

    // Find or create user by openid
    let user = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid);

    if (!user) {
      // Create new user
      const result = db.prepare(
        'INSERT INTO users (username, nickname, phone, avatar, openid, city, behavior_tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(
        'wx_' + openid.slice(0, 12),
        nickname,
        '',
        avatar,
        openid,
        '广州',
        '["友好"]'
      );
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      console.log('[WeChat] Created new user:', user.id, user.nickname);
    } else {
      // Update nickname and avatar if changed
      if (nickname && (user.nickname !== nickname || user.avatar !== avatar)) {
        db.prepare('UPDATE users SET nickname = ?, avatar = ? WHERE id = ?').run(nickname, avatar, user.id);
        user.nickname = nickname;
        user.avatar = avatar;
      }
      console.log('[WeChat] Existing user logged in:', user.id, user.nickname);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, openid: openid },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      code: 0,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone || '',
          nickname: user.nickname || nickname,
          avatar: user.avatar || avatar,
          openid: openid,
        },
      },
    });
  } catch (err) {
    console.error('[WeChat] Unexpected error:', err);
    res.json({ code: -1, msg: '微信登录异常，请稍后重试' });
  }
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
