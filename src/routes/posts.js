const express = require('express');
const db = require('../database/init');
const router = express.Router();

const fmt = (p) => {
  const rawImg = p.images || '[]';
  const rawTag = p.tags || '[]';
  const clean = (s) => s.replace(/\\\"/g, '"');
  return {...p, images: JSON.parse(clean(rawImg)), media: JSON.parse(clean(rawImg)), tags: JSON.parse(clean(rawTag)), user: { id: p.user_id, name: p.user_name, avatar: p.user_avatar, pet_name: p.pet_name, pet_breed: p.pet_breed, pet_age: p.pet_age, pet_gender: p.pet_gender, pet_personality: p.pet_personality, city: p.city, behavior_tags: p.behavior_tags }};
};

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * limit;
  const userId = parseInt(req.query.userId) || 1;

  // Featured filter
  if (req.query.featured === '1') {
    const posts = db.prepare(`SELECT p.*, u.nickname as user_name, u.avatar as user_avatar, u.pet_name, u.pet_breed, u.pet_age, u.pet_gender, u.pet_personality, u.city, u.behavior_tags FROM posts p JOIN users u ON p.user_id = u.id WHERE p.featured = 1 AND p.user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?) AND p.user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?) ORDER BY p.created_at DESC LIMIT 5`).all(userId, userId);
    return res.json({ code: 0, data: { list: posts.map(fmt) } });
  }

  // Favorites filter
  if (req.query.favorites === '1') {
    const favRows = db.prepare(`SELECT p.*, u.nickname as user_name, u.avatar as user_avatar, u.pet_name, u.pet_breed, u.pet_age, u.pet_gender, u.pet_personality, u.city, u.behavior_tags FROM favorites f JOIN posts p ON f.post_id = p.id JOIN users u ON p.user_id = u.id WHERE f.user_id = ? AND p.user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?) AND p.user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?) ORDER BY f.created_at DESC LIMIT ? OFFSET ?`).all(userId, userId, userId, limit, offset);
    const totalFav = db.prepare('SELECT COUNT(*) as c FROM favorites f JOIN posts p ON f.post_id = p.id WHERE f.user_id = ? AND p.user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?) AND p.user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)').get(userId, userId, userId).c;
    return res.json({ code: 0, data: { list: favRows.map(fmt), pagination: { page, pageSize: limit, total: totalFav, hasMore: offset + limit < totalFav } } });
  }

  const posts = db.prepare(`SELECT p.*, u.nickname as user_name, u.avatar as user_avatar, u.pet_name, u.pet_breed, u.pet_age, u.pet_gender, u.pet_personality, u.city, u.behavior_tags FROM posts p JOIN users u ON p.user_id = u.id WHERE p.user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?) AND p.user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?) ORDER BY p.created_at DESC LIMIT ? OFFSET ?`).all(userId, userId, limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?) AND user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)').get(userId, userId).c;

  res.json({ code: 0, data: { list: posts.map(fmt), pagination: { page, pageSize: limit, total, hasMore: offset + limit < total } } });
});

// GET user profile
router.get('/user/:id', (req, res) => {
  const user = db.prepare('SELECT id, username, nickname, avatar, bio, lat, lon, follow_count, follower_count, like_count, level, post_count, pet_name, pet_breed, pet_age, pet_gender, pet_personality, city, behavior_tags FROM users WHERE id = ?').get(req.params.id);
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

// GET search posts and users by keyword
router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ code: 0, data: { posts: [], users: [] } });

  const keyword = `%${q}%`;

  const posts = db.prepare(`
    SELECT p.*, u.nickname as user_name, u.avatar as user_avatar,
           u.pet_name, u.pet_breed, u.pet_age, u.pet_gender,
           u.pet_personality, u.city, u.behavior_tags
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.content LIKE ? OR p.breed LIKE ? OR p.tags LIKE ? OR p.location LIKE ?
    ORDER BY p.like_count DESC
    LIMIT 20
  `).all(keyword, keyword, keyword, keyword);

  const users = db.prepare(`
    SELECT id, username, nickname, avatar, bio, pet_name, pet_breed,
           follow_count, follower_count, like_count
    FROM users
    WHERE nickname LIKE ? OR pet_name LIKE ? OR pet_breed LIKE ? OR bio LIKE ?
    ORDER BY follower_count DESC
    LIMIT 20
  `).all(keyword, keyword, keyword, keyword);

  res.json({
    code: 0,
    data: {
      posts: posts.map(p => ({...fmt(p), description: p.content})),
      users
    }
  });
});

// POST paw shake
router.post('/:id/pawshake', (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.body.userId || 1;

  const existing = db.prepare('SELECT id, count FROM paw_shakes WHERE post_id = ? AND user_id = ?').get(postId, userId);
  if (existing) {
    db.prepare('UPDATE paw_shakes SET count = count + 1 WHERE id = ?').run(existing.id);
    db.prepare('UPDATE posts SET paw_shake_count = paw_shake_count + 1 WHERE id = ?').run(postId);
  } else {
    db.prepare('INSERT INTO paw_shakes (post_id, user_id, count) VALUES (?, ?, 1)').run(postId, userId);
    db.prepare('UPDATE posts SET paw_shake_count = paw_shake_count + 1 WHERE id = ?').run(postId);
  }

  const post = db.prepare('SELECT paw_shake_count FROM posts WHERE id = ?').get(postId);
  res.json({ code: 0, data: { count: post ? post.paw_shake_count : 0 } });
});

// Toggle favorite
router.post('/:id/favorite', (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.body.userId || 1;

  const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND post_id = ?').get(userId, postId);
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND post_id = ?').run(userId, postId);
    return res.json({ code: 0, data: { favorited: false } });
  }
  db.prepare('INSERT INTO favorites (user_id, post_id) VALUES (?, ?)').run(userId, postId);
  res.json({ code: 0, data: { favorited: true } });
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

// POST like a post
router.post('/:id/like', (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.body.userId || 1;

  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(userId, postId);
  if (existing) return res.json({ code: 0, data: { liked: true } });

  db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(userId, postId);
  db.prepare('UPDATE posts SET like_count = like_count + 1 WHERE id = ?').run(postId);

  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId);
  if (post && post.user_id !== userId) {
    const liker = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);
    db.prepare('INSERT INTO notifications (user_id, type, from_user_id, post_id, content) VALUES (?, ?, ?, ?, ?)').run(
      post.user_id, 'likes', userId, postId, liker ? `${liker.nickname} 赞了你的帖子` : '有人赞了你的帖子'
    );
  }

  const postLikeCount = db.prepare('SELECT like_count FROM posts WHERE id = ?').get(postId);
  res.json({ code: 0, data: { liked: true, likes: postLikeCount ? postLikeCount.like_count : 0 } });
});

// POST unlike a post
router.post('/:id/unlike', (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.body.userId || 1;

  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(userId, postId);
  if (!existing) return res.json({ code: 0, data: { liked: false } });

  db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(userId, postId);
  db.prepare('UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(postId);

  const postLikeCount = db.prepare('SELECT like_count FROM posts WHERE id = ?').get(postId);
  res.json({ code: 0, data: { liked: false, likes: postLikeCount ? postLikeCount.like_count : 0 } });
});

// GET comments for a post (nested structure, with pagination)
router.get('/:id/comments', (req, res) => {
  const postId = req.params.id;
  const lang = req.query.lang || 'zh';
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  // Count total root comments
  const totalRoot = db.prepare(
    'SELECT COUNT(*) as c FROM comments WHERE post_id = ? AND parent_id IS NULL'
  ).get(postId).c;

  // Fetch root comments with pagination
  const roots = db.prepare(`
    SELECT c.*, u.nickname as user_name, u.avatar as user_avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? AND c.parent_id IS NULL
    ORDER BY c.created_at ASC
    LIMIT ? OFFSET ?
  `).all(postId, pageSize, offset);

  // Collect root IDs to fetch their replies
  const rootIds = roots.map(r => r.id);

  // Fetch all replies for these roots
  let replyRows = [];
  if (rootIds.length > 0) {
    const placeholders = rootIds.map(() => '?').join(',');
    replyRows = db.prepare(`
      SELECT c.*, u.nickname as user_name, u.avatar as user_avatar
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.parent_id IN (${placeholders})
      ORDER BY c.created_at ASC
    `).all(...rootIds);
  }

  const getContent = (r) => (lang === 'en' && r.content_en) ? r.content_en : r.content;

  // Build map for all loaded comments
  const map = {};
  const allRows = [...roots, ...replyRows];
  allRows.forEach((r) => {
    map[r.id] = {
      id: r.id,
      user: { id: r.user_id, name: r.user_name, avatar: r.user_avatar },
      content: getContent(r),
      parent_id: r.parent_id,
      created_at: r.created_at,
      likes_count: r.likes_count || 0,
      replies: [],
    };
  });

  // Attach replies to roots
  replyRows.forEach((r) => {
    const node = map[r.id];
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].replies.push(node);
    }
  });

  const rootNodes = roots.map(r => map[r.id]);

  const hasMore = offset + pageSize < totalRoot;

  res.json({
    code: 0,
    data: {
      list: rootNodes,
      pagination: { page, pageSize, total: totalRoot, hasMore }
    }
  });
});

// POST comment (optionally as a reply)
router.post('/:id/comments', (req, res) => {
  const postId = req.params.id;
  const { content, parent_id } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ code: -1, msg: '评论内容不能为空' });

  const userId = req.body.userId || 1;
  const info = db.prepare(
    'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)'
  ).run(postId, userId, content.trim(), parent_id || null);

  db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').run(postId);

  // Notify post owner
  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId);
  if (post && post.user_id !== userId) {
    const commenter = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);
    db.prepare('INSERT INTO notifications (user_id, type, from_user_id, post_id, content) VALUES (?, ?, ?, ?, ?)').run(
      post.user_id, 'comments', userId, postId, commenter ? `${commenter.nickname} 评论了你的帖子` : '有人评论了你的帖子'
    );
  }

  // If replying to another comment, also notify that comment's author
  if (parent_id) {
    const parentComment = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(parent_id);
    if (parentComment && parentComment.user_id !== userId && (!post || parentComment.user_id !== post.user_id)) {
      const replyer = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);
      db.prepare('INSERT INTO notifications (user_id, type, from_user_id, post_id, content) VALUES (?, ?, ?, ?, ?)').run(
        parentComment.user_id, 'comments', userId, postId, replyer ? `${replyer.nickname} 回复了你的评论` : '有人回复了你的评论'
      );
    }
  }

  res.json({ code: 0, data: { id: info.lastInsertRowid } });
});

// Toggle comment like
router.post('/:postId/comments/:commentId/like', (req, res) => {
  const { commentId } = req.params;
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ code: -1, msg: 'userId is required' });

  const existing = db.prepare('SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?').get(userId, commentId);

  if (existing) {
    db.prepare('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?').run(userId, commentId);
    db.prepare('UPDATE comments SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(commentId);
  } else {
    db.prepare('INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)').run(userId, commentId);
    db.prepare('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?').run(commentId);

    // Notify comment author
    const comment = db.prepare('SELECT user_id, post_id FROM comments WHERE id = ?').get(commentId);
    if (comment && comment.user_id !== userId) {
      const liker = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);
      db.prepare('INSERT INTO notifications (user_id, type, from_user_id, post_id, content) VALUES (?, ?, ?, ?, ?)').run(
        comment.user_id, 'comment_like', userId, comment.post_id, liker ? `${liker.nickname} 赞了你的评论` : '有人赞了你的评论'
      );
    }
  }

  const comment = db.prepare('SELECT likes_count FROM comments WHERE id = ?').get(commentId);
  res.json({ code: 0, data: { liked: !existing, likes: comment ? comment.likes_count : 0 } });
});

// POST report a post
router.post('/:id/report', (req, res) => {
  const postId = parseInt(req.params.id);
  const reporterId = req.body.userId || 1;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ code: -1, msg: '请选择举报理由' });

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ code: -1, msg: '帖子不存在' });

  db.prepare('INSERT INTO reports (reporter_id, post_id, reason) VALUES (?, ?, ?)').run(reporterId, postId, reason);
  res.json({ code: 0, data: { reported: true } });
});

module.exports = router;
