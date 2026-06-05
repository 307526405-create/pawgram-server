const express = require('express');
const db = require('../database/init');
const router = express.Router();

// PUT /api/users/:id — update user profile (pet fields)
router.put('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { pet_name, pet_breed, pet_age, pet_gender, pet_personality } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ code: -1, msg: '用户不存在' });

  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries({ pet_name, pet_breed, pet_age, pet_gender, pet_personality })) {
    if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
  }
  if (fields.length === 0) return res.json({ code: 0, data: { updated: false } });

  values.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare(
    'SELECT id, username, nickname, avatar, bio, pet_name, pet_breed, pet_age, pet_gender, pet_personality FROM users WHERE id = ?'
  ).get(userId);
  res.json({ code: 0, data: { user: updated } });
});

// GET /api/users/:id — get user profile
router.get('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = db.prepare(
    'SELECT id, username, nickname, avatar, bio, pet_name, pet_breed, pet_age, pet_gender, pet_personality FROM users WHERE id = ?'
  ).get(userId);
  if (!user) return res.status(404).json({ code: -1, msg: '用户不存在' });
  res.json({ code: 0, data: { user } });
});

// POST /api/users/:id/follow
router.post('/:id/follow', (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const userId = req.body.userId || 1;

  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND followed_id = ?').get(userId, targetUserId);
  if (existing) return res.json({ code: 0, data: { followed: true } });

  db.prepare('INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)').run(userId, targetUserId);
  db.prepare('UPDATE users SET follow_count = follow_count + 1 WHERE id = ?').run(userId);
  db.prepare('UPDATE users SET follower_count = follower_count + 1 WHERE id = ?').run(targetUserId);

  // Notification
  const follower = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);
  db.prepare('INSERT INTO notifications (user_id, type, from_user_id, content) VALUES (?, ?, ?, ?)').run(
    targetUserId, 'follows', userId, follower ? `${follower.nickname} 关注了你` : '有人关注了你'
  );

  res.json({ code: 0, data: { followed: true } });
});

// POST /api/users/:id/unfollow
router.post('/:id/unfollow', (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const userId = req.body.userId || 1;

  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND followed_id = ?').get(userId, targetUserId);
  if (!existing) return res.json({ code: 0, data: { followed: false } });

  db.prepare('DELETE FROM follows WHERE follower_id = ? AND followed_id = ?').run(userId, targetUserId);
  db.prepare('UPDATE users SET follow_count = MAX(0, follow_count - 1) WHERE id = ?').run(userId);
  db.prepare('UPDATE users SET follower_count = MAX(0, follower_count - 1) WHERE id = ?').run(targetUserId);

  res.json({ code: 0, data: { followed: false } });
});

module.exports = router;
