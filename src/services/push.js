const db = require('../database/init');

const APNS_MODE = process.env.APNS_MODE || 'sandbox';
const APNS_KEY_PATH = process.env.APNS_KEY_PATH;
const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID;

let apnProvider = null;

function getProvider() {
  if (apnProvider) return apnProvider;

  if (APNS_MODE === 'sandbox' && (!APNS_KEY_PATH || !APNS_KEY_ID || !APNS_TEAM_ID || !APNS_BUNDLE_ID)) {
    // Sandbox mode without full config: log to console (mock push)
    console.log('[Push] Running in mock mode (sandbox without APNs config). Push notifications will be logged to console only.');
    return null;
  }

  try {
    const apn = require('apn');
    const options = {
      token: {
        key: APNS_KEY_PATH,
        keyId: APNS_KEY_ID,
        teamId: APNS_TEAM_ID,
      },
      production: APNS_MODE === 'production',
    };
    apnProvider = new apn.Provider(options);
    console.log(`[Push] APNs provider initialized (mode: ${APNS_MODE}, bundle: ${APNS_BUNDLE_ID})`);
    return apnProvider;
  } catch (err) {
    console.error('[Push] Failed to initialize APNs provider:', err.message);
    return null;
  }
}

/**
 * Send a push notification to a single device token.
 * @param {string} deviceToken - The device token (hex string)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {number} [badge] - Badge number
 * @returns {Promise<boolean>} - true if sent successfully
 */
async function sendPush(deviceToken, title, body, badge) {
  const provider = getProvider();

  if (!provider) {
    // Mock mode: just log
    console.log(`[Push MOCK] To: ${deviceToken.slice(0, 8)}... | Title: ${title} | Body: ${body} | Badge: ${badge || 'N/A'}`);
    return true;
  }

  try {
    const apn = require('apn');
    const note = new apn.Notification();
    note.alert = { title, body };
    note.topic = APNS_BUNDLE_ID;
    if (badge !== undefined) {
      note.badge = badge;
    }
    note.sound = 'default';

    const result = await provider.send(note, deviceToken);
    if (result.failed && result.failed.length > 0) {
      console.error(`[Push] Failed for ${deviceToken.slice(0, 8)}...:`, result.failed[0].response?.reason || result.failed[0].error);
      return false;
    }
    console.log(`[Push] Sent to ${deviceToken.slice(0, 8)}...: ${title}`);
    return true;
  } catch (err) {
    console.error(`[Push] Error sending to ${deviceToken.slice(0, 8)}...:`, err.message);
    return false;
  }
}

/**
 * Send push notifications to all devices of a given user.
 * @param {number} userId - Target user ID
 * @param {string} type - Notification type (for logging)
 * @param {string} title - Push notification title
 * @param {string} body - Push notification body
 */
async function sendPushToUser(userId, type, title, body) {
  try {
    const tokens = db.prepare(
      'SELECT device_token FROM device_tokens WHERE user_id = ?'
    ).all(userId);

    if (tokens.length === 0) {
      console.log(`[Push] No device tokens for user ${userId}, skipping push for "${type}"`);
      return;
    }

    for (const row of tokens) {
      await sendPush(row.device_token, title, body);
    }
  } catch (err) {
    console.error(`[Push] Error sending push to user ${userId}:`, err.message);
  }
}

module.exports = { sendPush, sendPushToUser, getProvider };
