const express = require('express');
const db = require('../database/init');
const router = express.Router();

// GET /api/notifications?userId=1
router.get('/', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  const notifications = db.prepare(`
    SELECT n.*, u.nickname as from_user_name, u.avatar as from_user_avatar
    FROM notifications n
    LEFT JOIN users u ON n.from_user_id = u.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(userId);

  res.json({ code: 0, data: notifications });
});

// GET /api/notifications/unread-count?userId=1
router.get('/unread-count', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(userId);

  res.json({ code: 0, data: { count: result.count } });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ code: 0 });
});

// PUT /api/notifications/read-all
router.put('/read-all', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ code: -1, msg: 'userId is required' });
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  res.json({ code: 0 });
});

module.exports = router;
