// SMS Service - supports MOCK and TENCENT_SMS modes
const crypto = require('crypto');

// In-memory store for verification codes
// Structure: { phone: { code, expiresAt } }
const codeStore = new Map();

// Rate limiting: phone -> last send timestamp
const phoneRateLimit = new Map();
// Rate limiting: ip -> [{ timestamp }]
const ipRateLimit = new Map();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of codeStore) {
    if (data.expiresAt < now) codeStore.delete(phone);
  }
  // Clean IP rate limit entries older than 1 minute
  for (const [ip, timestamps] of ipRateLimit) {
    const valid = timestamps.filter(t => t > now - 60000);
    if (valid.length === 0) ipRateLimit.delete(ip);
    else ipRateLimit.set(ip, valid);
  }
}, 60000);

function generateCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function getClientIP(req) {
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

// Check phone rate limit: 60 seconds between sends for same phone
function checkPhoneRateLimit(phone) {
  const lastSent = phoneRateLimit.get(phone);
  if (lastSent && Date.now() - lastSent < 60000) {
    const remaining = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
    return { allowed: false, remaining };
  }
  return { allowed: true };
}

// Check IP rate limit: max 5 requests per minute
function checkIPRateLimit(req) {
  const ip = getClientIP(req);
  const now = Date.now();
  const timestamps = ipRateLimit.get(ip) || [];
  const recent = timestamps.filter(t => t > now - 60000);
  if (recent.length >= 5) {
    return { allowed: false, ip };
  }
  ipRateLimit.set(ip, [...recent, now]);
  return { allowed: true, ip };
}

const SMS_MODE = process.env.SMS_MODE || 'mock';

async function sendCodeViaTencent(phone, code) {
  const tencentcloud = require('tencentcloud-sdk-nodejs-sms');
  const SmsClient = tencentcloud.sms.v20210111.Client;

  const client = new SmsClient({
    credential: {
      secretId: process.env.TENCENT_SECRET_ID || process.env.SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY || process.env.SECRET_KEY,
    },
    region: process.env.SMS_REGION || 'ap-guangzhou',
    profile: {
      signMethod: 'TC3-HMAC-SHA256',
      httpProfile: {
        reqMethod: 'POST',
        reqTimeout: 30,
      },
    },
  });

  const params = {
    SmsSdkAppId: process.env.TENCENT_SMS_APP_ID || process.env.SMS_APP_ID,
    SignName: process.env.TENCENT_SMS_SIGN || process.env.SMS_SIGN,
    TemplateId: process.env.TENCENT_SMS_TEMPLATE_ID || process.env.SMS_TEMPLATE_ID,
    TemplateParamSet: [code],
    PhoneNumberSet: [`+86${phone}`],
  };

  const result = await client.SendSms(params);
  return result;
}

/**
 * Send verification code to phone
 * @param {string} phone - Phone number
 * @param {object} req - Express request object (for IP rate limiting)
 * @returns {object} { success: boolean, msg: string }
 */
async function sendCode(phone, req) {
  // Validate phone number (Chinese mobile: 11 digits starting with 1)
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, msg: '手机号格式不正确' };
  }

  // Check phone rate limit
  const phoneCheck = checkPhoneRateLimit(phone);
  if (!phoneCheck.allowed) {
    return { success: false, msg: `请${phoneCheck.remaining}秒后再试` };
  }

  // Check IP rate limit
  const ipCheck = checkIPRateLimit(req);
  if (!ipCheck.allowed) {
    return { success: false, msg: '操作太频繁，请稍后再试' };
  }

  const code = generateCode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Store code in memory
  codeStore.set(phone, { code, expiresAt });

  // Update phone rate limit
  phoneRateLimit.set(phone, Date.now());

  if (SMS_MODE === 'tencent') {
    try {
      await sendCodeViaTencent(phone, code);
      console.log(`[SMS] Sent code to ${phone} via Tencent`);
    } catch (err) {
      console.error(`[SMS] Tencent send failed for ${phone}:`, err.message);
      // In production you might want to fail here, but for dev we fall through
      return { success: false, msg: '短信发送失败，请稍后再试' };
    }
  } else {
    // MOCK mode - use fixed code 123456
    codeStore.set(phone, { code: '123456', expiresAt });
    console.log(`[SMS Mock] Code for ${phone}: 123456`);
  }

  return { success: true, msg: '验证码已发送' };
}

/**
 * Verify a code for a phone number
 * @param {string} phone - Phone number
 * @param {string} code - Code to verify
 * @returns {object} { success: boolean, msg: string }
 */
function verifyCode(phone, code) {
  const stored = codeStore.get(phone);
  if (!stored) {
    return { success: false, msg: '请先获取验证码' };
  }
  if (Date.now() > stored.expiresAt) {
    codeStore.delete(phone);
    return { success: false, msg: '验证码已过期，请重新获取' };
  }
  if (stored.code !== code) {
    return { success: false, msg: '验证码错误' };
  }
  // Code verified, remove it
  codeStore.delete(phone);
  return { success: true };
}

module.exports = { sendCode, verifyCode };
