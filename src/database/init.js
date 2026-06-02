const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'pawgram.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, nickname TEXT, phone TEXT, avatar TEXT, bio TEXT DEFAULT '', lat REAL DEFAULT 0, lon REAL DEFAULT 0, follow_count INTEGER DEFAULT 0, follower_count INTEGER DEFAULT 0, like_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, content TEXT, images TEXT DEFAULT '[]', tags TEXT DEFAULT '[]', breed TEXT DEFAULT '', location TEXT DEFAULT '', like_count INTEGER DEFAULT 0, comment_count INTEGER DEFAULT 0, is_liked INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, user_id INTEGER, content TEXT, reply_to INTEGER, parent_id INTEGER REFERENCES comments(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS likes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, post_id INTEGER, UNIQUE(user_id, post_id));
`);

// Migration: add lat/lon columns if missing (for existing databases)
try { db.exec('ALTER TABLE users ADD COLUMN lat REAL DEFAULT 0'); } catch (e) { /* column exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN lon REAL DEFAULT 0'); } catch (e) { /* column exists */ }

// Migration: add parent_id if missing (for existing databases)
try {
  db.exec(`ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id)`);
} catch (e) {
  // Column already exists, ignore
}

// Helper: random Guangzhou-adjacent coordinate (23.1±0.05, 113.3±0.05)
const randGZ = () => ({
  lat: +(23.1 + (Math.random() - 0.5) * 0.1).toFixed(6),
  lon: +(113.3 + (Math.random() - 0.5) * 0.1).toFixed(6),
});

// Seed
const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (count.c === 0) {
  const u1 = randGZ(); const u2 = randGZ(); const u3 = randGZ(); const u4 = randGZ(); const u5 = randGZ();
  db.prepare("INSERT INTO users (id,username,nickname,phone,avatar,bio,lat,lon,follow_count,follower_count,like_count,created_at) VALUES (1,'lily','王丽丽','','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150','爱宠物爱生活',?,?,45,1204,1790,datetime('now'))").run(u1.lat, u1.lon);
  db.prepare("INSERT INTO users (id,username,nickname,phone,avatar,bio,lat,lon,follow_count,follower_count,like_count,created_at) VALUES (2,'bob','陈小波','','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150','猫咪控',?,?,89,120,450,datetime('now'))").run(u2.lat, u2.lon);
  db.prepare("INSERT INTO users (id,username,nickname,phone,avatar,bio,lat,lon,follow_count,follower_count,like_count,created_at) VALUES (3,'flower','张小花','','https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150','八哥犬妈妈',?,?,567,342,890,datetime('now'))").run(u3.lat, u3.lon);
  db.prepare("INSERT INTO users (id,username,nickname,phone,avatar,bio,lat,lon,follow_count,follower_count,like_count,created_at) VALUES (4,'alex','刘小帅','','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150','萨摩耶奶爸',?,?,120,89,320,datetime('now'))").run(u4.lat, u4.lon);
  db.prepare("INSERT INTO users (id,username,nickname,phone,avatar,bio,lat,lon,follow_count,follower_count,like_count,created_at) VALUES (5,'emma','赵小美','','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150','柴犬爱好者',?,?,210,156,670,datetime('now'))").run(u5.lat, u5.lon);
  
  db.prepare("INSERT INTO posts VALUES (1,1,'今天在公园玩得太开心了！贝利非常乖，还交到了一个柯基新朋友。🐾☀️','[\\\"https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800\\\",\\\"https://images.unsplash.com/photo-1668757183096-bc55a8992558?w=800\\\"]','[\\\"金毛\\\",\\\"公园日常\\\"]','金毛','阳光公园',342,12,1,datetime('now','-2 hours'))").run();
  db.prepare("INSERT INTO posts VALUES (2,2,'欢迎家里最小的新成员！还在想名字...大家有什么建议吗？🐱❤️','[\\\"https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=800\\\"]','[\\\"猫咪\\\",\\\"幼猫\\\"]','猫咪','温馨的家',891,45,0,datetime('now','-5 hours'))").run();
  db.prepare("INSERT INTO posts VALUES (3,3,'不知道他是在享受咖啡时光，还是单纯在等我掉面包屑... 😂☕️','[\\\"https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800\\\"]','[\\\"八哥犬\\\",\\\"搞笑\\\"]','八哥犬','市中心咖啡馆',124,8,0,datetime('now','-1 day'))").run();
  db.prepare("INSERT INTO posts VALUES (4,1,'周日下午的氛围。彻底放松。☁️💤','[\\\"https://images.unsplash.com/photo-1586289883499-f11d28aaf52f?w=800\\\"]','[\\\"布偶猫\\\",\\\"周末\\\"]','布偶猫','客厅',56,2,1,datetime('now','-2 days'))").run();
  db.prepare("INSERT INTO posts VALUES (5,1,'这是我的主场！迎来了今年的第一场雪。❄️🐺','[\\\"https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?w=800\\\"]','[\\\"柴犬\\\",\\\"下雪\\\"]','柴犬','城市街道',890,56,0,datetime('now','-5 days'))").run();
  db.prepare("INSERT INTO posts VALUES (6,2,'猫咪玩激光笔简直太搞笑了！根本停不下来 😂🔴','[{\\\"type\\\":\\\"video\\\",\\\"url\\\":\\\"https://www.w3schools.com/html/mov_bbb.mp4\\\",\\\"poster\\\":\\\"https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800\\\"},{\\\"type\\\":\\\"image\\\",\\\"url\\\":\\\"https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=800\\\"}]','[\\\"猫咪\\\",\\\"搞笑\\\",\\\"视频\\\"]','猫咪','温馨的家',567,34,0,datetime('now','-30 minutes'))").run();
  db.prepare("INSERT INTO posts VALUES (7,1,'带贝利去海边奔跑，浪花和狗狗的快乐时光 🌊🐕','[{\\\"type\\\":\\\"video\\\",\\\"url\\\":\\\"https://www.w3schools.com/html/mov_bbb.mp4\\\",\\\"poster\\\":\\\"https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800\\\"}]','[\\\"金毛\\\",\\\"海边\\\",\\\"视频\\\"]','金毛','海滨沙滩',234,19,0,datetime('now','-1 hour'))").run();
  console.log('Seed data inserted with Guangzhou coordinates');

  // Seed nested comments for post 1
  const commentCount = db.prepare('SELECT COUNT(*) as c FROM comments').get();
  if (commentCount.c === 0) {
    // Top-level comments
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, parent_id, created_at) VALUES (1, 1, 2, '金毛也太可爱了吧！', NULL, datetime('now','-30 minutes'))").run();
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, parent_id, created_at) VALUES (2, 1, 3, '这个公园在哪里呀？环境看起来真不错', NULL, datetime('now','-20 minutes'))").run();
    // Nested replies (parent_id references comment id)
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, parent_id, created_at) VALUES (3, 1, 1, '是呀，每天带它出来都很开心～', 1, datetime('now','-25 minutes'))").run();
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, parent_id, created_at) VALUES (4, 1, 2, '在阳光公园，超适合遛狗！', 2, datetime('now','-15 minutes'))").run();
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, parent_id, created_at) VALUES (5, 1, 3, '谢谢推荐，周末就去！', 4, datetime('now','-10 minutes'))").run();
    // Second-level reply (reply to a reply)
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, parent_id, created_at) VALUES (6, 1, 1, '哈哈不客气，记得早点去占位～', 5, datetime('now','-5 minutes'))").run();
    console.log('Seed comments inserted');
  }
} else {
  // Update existing users with random GZ coordinates if they have 0,0
  const zeroUsers = db.prepare('SELECT id FROM users WHERE lat = 0 AND lon = 0').all();
  for (const u of zeroUsers) {
    const gz = randGZ();
    db.prepare('UPDATE users SET lat = ?, lon = ? WHERE id = ?').run(gz.lat, gz.lon, u.id);
  }
  if (zeroUsers.length > 0) console.log(`Updated ${zeroUsers.length} users with Guangzhou coordinates`);
}

module.exports = db;
