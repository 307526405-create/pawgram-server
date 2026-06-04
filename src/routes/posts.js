const express = require('express');
const db = require('../database/init');
const router = express.Router();

const fmt = (p) => {
  const rawImg = p.images || '[]';
  const rawTag = p.tags || '[]';
  const clean = (s) => s.replace(/\\\"/g, '"');
  return {...p, images: JSON.parse(clean(rawImg)), media: JSON.parse(clean(rawImg)), tags: JSON.parse(clean(rawTag)), user: { id: p.user_id, name: p.user_name, avatar: p.user_avatar, pet_name: p.pet_name, pet_breed: p.pet_breed, pet_age: p.pet_age, pet_gender: p.pet_gender, pet_personality: p.pet_personality }};
};

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * limit;
  
  const posts = db.prepare(`SELECT p.*, u.nickname as user_name, u.avatar as user_avatar, u.pet_name, u.pet_breed, u.pet_age, u.pet_gender, u.pet_personality FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM posts').get().c;
  
  res.json({ code: 0, data: { list: posts.map(fmt), pagination: { page, pageSize: limit, total, hasMore: offset + limit < total } } });
});

// GET user profile
router.get('/user/:id', (req, res) => {
  const user = db.prepare('SELECT id, username, nickname, avatar, bio, lat, lon, follow_count, follower_count, like_count, pet_name, pet_breed, pet_age, pet_gender, pet_personality FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ code: -1, msg: '用户不存在' });
  const posts = db.prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ code: 0, data: { user, posts: posts.map(fmt) } });
});

// POST create post
router.post('/', (req, res) => {
  const { content, images, tags, breed, location } = req.body;
  if (!content && (!images || images.length === 0)) return res.status(400).json({ code: -1, msg: '内容不能为空' });
  
  const userId = 1; // current user
  const imageJson = JSON.stringify(images || []);
  const tagJson = JSON.stringify(tags || []);
  
  const info = db.prepare('INSERT INTO posts (user_id, content, images, tags, breed, location, like_count, comment_count) VALUES (?, ?, ?, ?, ?, ?, 0, 0)').run(userId, content || '', imageJson, tagJson, breed || '', location || '');
  res.json({ code: 0, data: { id: info.lastInsertRowid } });
});

// GET single post by ID
router.get('/:id', (req, res) => {
  const post = db.prepare(`SELECT p.*, u.nickname as user_name, u.avatar as user_avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`).get(req.params.id);
  if (!post) return res.status(404).json({ code: -1, msg: '帖子不存在' });
  res.json({ code: 0, data: fmt(post) });
});

// DELETE post
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ code: 0 });
});

// GET comments for a post (nested structure)
router.get('/:id/comments', (req, res) => {
  const postId = req.params.id;
  const lang = req.query.lang || 'zh';
  const rows = db.prepare(`
    SELECT c.*, u.nickname as user_name, u.avatar as user_avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(postId);

  // Build nested tree (max 2 levels)
  const map = {};
  const roots = [];

  const getContent = (r) => (lang === 'en' && r.content_en) ? r.content_en : r.content;

  rows.forEach((r) => {
    const node = {
      id: r.id,
      user: { id: r.user_id, name: r.user_name, avatar: r.user_avatar },
      content: getContent(r),
      parent_id: r.parent_id,
      created_at: r.created_at,
      replies: [],
    };
    map[r.id] = node;
  });

  rows.forEach((r) => {
    const node = map[r.id];
    if (r.parent_id && map[r.parent_id]) {
      // Only nest up to 2 levels: if parent is already a reply, treat as top-level
      const parent = map[r.parent_id];
      if (parent.parent_id) {
        // Parent is itself a reply -> treat this as top-level to limit depth
        roots.push(node);
      } else {
        parent.replies.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  res.json({ code: 0, data: roots });
});

// POST comment (optionally as a reply)
router.post('/:id/comments', (req, res) => {
  const postId = req.params.id;
  const { content, parent_id } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ code: -1, msg: '评论内容不能为空' });

  const userId = 1; // current user
  const info = db.prepare(
    'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)'
  ).run(postId, userId, content.trim(), parent_id || null);

  res.json({ code: 0, data: { id: info.lastInsertRowid } });
});

module.exports = router;
