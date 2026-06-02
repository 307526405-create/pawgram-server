const express = require('express');
const db = require('../database/init');
const router = express.Router();

// Haversine formula in SQL: calculates distance in km between (lat,lon) and user's (u.lat,u.lon)
const HAVERSINE_SQL = `
  (6371 * acos(
    cos(radians(?)) * cos(radians(u.lat)) * cos(radians(u.lon) - radians(?))
    + sin(radians(?)) * sin(radians(u.lat))
  ))
`;

// GET /api/discover/nearby?lat=23.1291&lon=113.2644&limit=20
router.get('/nearby', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const limit = parseInt(req.query.limit) || 20;

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ code: -1, msg: '缺少或无效的 lat/lon 参数' });
  }

  // Nearby posts with distance, joined through users
  const posts = db.prepare(`
    SELECT p.*, u.nickname as user_name, u.avatar as user_avatar,
      ${HAVERSINE_SQL} as distance_km
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE u.lat != 0 AND u.lon != 0
    ORDER BY distance_km ASC
    LIMIT ?
  `).all(lat, lon, lat, limit);

  // Format posts
  const postList = posts.map(p => ({
    ...p,
    images: JSON.parse(p.images || '[]'),
    tags: JSON.parse(p.tags || '[]'),
    user: { id: p.user_id, name: p.user_name, avatar: p.user_avatar },
    distance_km: Math.round(p.distance_km * 100) / 100,
  }));

  // Nearby users (distinct from post authors, limited to users with coordinates)
  const users = db.prepare(`
    SELECT u.id, u.nickname, u.avatar, u.bio,
      ${HAVERSINE_SQL} as distance_km
    FROM users u
    WHERE u.lat != 0 AND u.lon != 0
    ORDER BY distance_km ASC
    LIMIT 20
  `).all(lat, lon, lat);

  const userList = users.map(u => ({
    ...u,
    distance_km: Math.round(u.distance_km * 100) / 100,
  }));

  res.json({
    code: 0,
    data: {
      posts: postList,
      users: userList,
    },
  });
});

module.exports = router;
