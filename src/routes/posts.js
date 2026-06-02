const express = require('express');
const db = require('../database/init');
const router = express.Router();

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * limit;
  
  const posts = db.prepare(`SELECT p.*, u.nickname as user_name, u.avatar as user_avatar FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM posts').get().c;
  
  const fmt = (p) => ({...p, images: JSON.parse(p.images), tags: JSON.parse(p.tags), user: { id: p.user_id, name: p.user_name, avatar: p.user_avatar }});
  res.json({ code: 0, data: { list: posts.map(fmt), pagination: { page, pageSize: limit, total, hasMore: offset + limit < total } } });
});

// GET single post by ID
router.get('/:id', (req, res) => {
  const post = db.prepare(`SELECT p.*, u.nickname as user_name, u.avatar as user_avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`).get(req.params.id);
  if (!post) return res.status(404).json({ code: -1, msg: '帖子不存在' });
  const fmt = (p) => ({...p, images: JSON.parse(p.images), tags: JSON.parse(p.tags), user: { id: p.user_id, name: p.user_name, avatar: p.user_avatar }});
  res.json({ code: 0, data: fmt(post) });
});

module.exports = router;
