const express = require('express');
const db = require('../database/init');
const router = express.Router();

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
