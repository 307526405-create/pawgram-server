const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'pawgram.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, nickname TEXT, phone TEXT, avatar TEXT, bio TEXT DEFAULT '', lat REAL DEFAULT 0, lon REAL DEFAULT 0, follow_count INTEGER DEFAULT 0, follower_count INTEGER DEFAULT 0, like_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, content TEXT, images TEXT DEFAULT '[]', tags TEXT DEFAULT '[]', breed TEXT DEFAULT '', location TEXT DEFAULT '', like_count INTEGER DEFAULT 0, comment_count INTEGER DEFAULT 0, is_liked INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, user_id INTEGER, content TEXT, content_en TEXT, reply_to INTEGER, parent_id INTEGER REFERENCES comments(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS likes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, post_id INTEGER, UNIQUE(user_id, post_id));
CREATE TABLE IF NOT EXISTS comment_likes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, comment_id INTEGER, UNIQUE(user_id, comment_id));
  CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, type TEXT NOT NULL, from_user_id INTEGER, post_id INTEGER, content TEXT, is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS follows (id INTEGER PRIMARY KEY AUTOINCREMENT, follower_id INTEGER NOT NULL, followed_id INTEGER NOT NULL, UNIQUE(follower_id, followed_id));
  CREATE TABLE IF NOT EXISTS paw_shakes (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, count INTEGER DEFAULT 1, UNIQUE(post_id, user_id));
  CREATE TABLE IF NOT EXISTS favorites (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, post_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, post_id));
  CREATE TABLE IF NOT EXISTS blocked_users (blocker_id INTEGER NOT NULL, blocked_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(blocker_id, blocked_id));
  CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, reporter_id INTEGER NOT NULL, post_id INTEGER NOT NULL, reason TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS device_tokens (device_token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, platform TEXT DEFAULT 'ios', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
`);

// Migration: add pet columns if missing
try { db.exec('ALTER TABLE users ADD COLUMN pet_name TEXT DEFAULT \'\''); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN pet_breed TEXT DEFAULT \'\''); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN pet_age TEXT DEFAULT \'\''); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN pet_gender TEXT DEFAULT \'\''); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN pet_personality TEXT DEFAULT \'\''); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN city TEXT DEFAULT '广州'"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN behavior_tags TEXT DEFAULT '[]'"); } catch (e) {}

// Migration: add likes_count to comments if missing
try { db.exec('ALTER TABLE comments ADD COLUMN likes_count INTEGER DEFAULT 0'); } catch (e) {}

// Migration: add parent_id if missing (for existing databases)
try {
  db.exec(`ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id)`);
} catch (e) {
  // Column already exists, ignore
}

// Migration: add featured column if missing
try { db.exec('ALTER TABLE posts ADD COLUMN featured INTEGER DEFAULT 0'); } catch (e) {}

// Migration: add paw_shake_count to posts if missing
try { db.exec('ALTER TABLE posts ADD COLUMN paw_shake_count INTEGER DEFAULT 0'); } catch (e) {}

// Migration: add privacy fields to users
try { db.exec('ALTER TABLE users ADD COLUMN hide_favorites INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN hide_likes INTEGER DEFAULT 0'); } catch (e) {}

// Migration: add openid for WeChat login
try { db.exec('ALTER TABLE users ADD COLUMN openid TEXT'); } catch (e) {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_openid ON users(openid)'); } catch (e) {}

// Migration: add apple_id for Apple login
try { db.exec('ALTER TABLE users ADD COLUMN apple_id TEXT'); } catch (e) {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id)'); } catch (e) {}

// Migration: add google_id for Google login
try { db.exec('ALTER TABLE users ADD COLUMN google_id TEXT'); } catch (e) {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)'); } catch (e) {}

// Helper: random Guangzhou-adjacent coordinate (23.1±0.05, 113.3±0.05)
const randGZ = () => ({
  lat: +(23.1 + (Math.random() - 0.5) * 0.1).toFixed(6),
  lon: +(113.3 + (Math.random() - 0.5) * 0.1).toFixed(6),
});

// Seed
const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (count.c === 0) {
  const u1 = randGZ(); const u2 = randGZ(); const u3 = randGZ(); const u4 = randGZ(); const u5 = randGZ();
  db.prepare("INSERT INTO users (id,username,nickname,phone,avatar,bio,lat,lon,follow_count,follower_count,like_count,pet_name,pet_breed,pet_age,pet_gender,pet_personality,city,behavior_tags,created_at) VALUES (1,'lily','贝利妈妈','','https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=200','爱宠物爱生活',?,?,45,1204,1790,'贝利','金毛','2岁','公','活泼亲人 喜欢游泳','广州','[\"友好\"]',datetime('now'))").run(u1.lat, u1.lon);
  db.prepare("INSERT INTO users (id,username,nickname,phone,avatar,bio,lat,lon,follow_count,follower_count,like_count,pet_name,pet_breed,pet_age,pet_gender,pet_personality,city,behavior_tags,created_at) VALUES (2,'bob','汤圆爸','','https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200','猫咪控',?,?,89,120,450,'汤圆','布偶猫','8个月','母','粘人精 喜欢踩奶','广州','[\"友好\"]',datetime('now'))").run(u2.lat, u2.lon);
  db.prepare("INSERT INTO users (id,username,nickname,phone,avatar,bio,lat,lon,follow_count,follower_count,like_count,pet_name,pet_breed,pet_age,pet_gender,pet_personality,city,behavior_tags,created_at) VALUES (3,'flower','豆豆姐姐','','https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200','八哥犬铁粉',?,?,567,342,890,'豆豆','八哥犬','3岁','公','搞笑担当 呼噜声大','广州','[\"友好\"]',datetime('now'))").run(u3.lat, u3.lon);
  db.prepare("INSERT INTO users (id,username,nickname,phone,avatar,bio,lat,lon,follow_count,follower_count,like_count,pet_name,pet_breed,pet_age,pet_gender,pet_personality,city,behavior_tags,created_at) VALUES (4,'alex','Lucky奶爸','','https://images.unsplash.com/photo-1536548665027-b96d34a005ae?w=200','萨摩耶最可爱',?,?,120,89,320,'Lucky','萨摩耶','1岁半','公','微笑天使 精力旺盛','广州','[\"友好\"]',datetime('now'))").run(u4.lat, u4.lon);
  db.prepare("INSERT INTO users (id,username,nickname,phone,avatar,bio,lat,lon,follow_count,follower_count,like_count,pet_name,pet_breed,pet_age,pet_gender,pet_personality,city,behavior_tags,created_at) VALUES (5,'emma','阿柴小美','','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200','柴犬八年资深铲屎官',?,?,210,156,670,'阿柴','柴犬','5岁','母','高冷傲娇 爱拆家','广州','[\"友好\"]',datetime('now'))").run(u5.lat, u5.lon);
  
  db.prepare("INSERT INTO posts VALUES (1,1,'今天带贝利去二沙岛公园，阳光正好，遇到好多狗友🐾','[\"https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800\"]','[\"金毛\",\"公园日常\"]','金毛','二沙岛公园',342,12,1,datetime('now','-5 minutes'),1,0)").run();
  db.prepare("INSERT INTO posts VALUES (2,2,'家里来了新成员！两个月大的小布偶，超粘人🥰','[\"https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=800\"]','[\"猫咪\",\"幼猫\"]','布偶猫','温馨的家',891,45,0,datetime('now','-5 hours'),1,0)").run();
  db.prepare("INSERT INTO posts VALUES (3,3,'周末在江南西偶遇一只超可爱的八哥犬，主人说它叫豆豆','[\"https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800\"]','[\"八哥犬\",\"搞笑\"]','八哥犬','江南西',124,8,0,datetime('now','-1 day'),1,0)").run();
  db.prepare("INSERT INTO posts VALUES (4,1,'周日下午的慵懒时光，汤圆又在沙发上睡着了💤','[\"https://images.unsplash.com/photo-1586289883499-f11d28aaf52f?w=800\"]','[\"布偶猫\",\"周末\"]','布偶猫','客厅',56,2,1,datetime('now','-2 days'),0,0)").run();
  db.prepare("INSERT INTO posts VALUES (5,1,'北京今年的第一场雪！阿柴玩疯了❄️','[\"https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?w=800\"]','[\"柴犬\",\"下雪\"]','柴犬','城市街道',890,56,0,datetime('now','-5 days'),0,0)").run();
  db.prepare("INSERT INTO posts VALUES (6,2,'猫咪玩激光笔简直太搞笑了！根本停不下来 😂🔴','[{\"type\":\"video\",\"url\":\"https://www.w3schools.com/html/mov_bbb.mp4\",\"poster\":\"https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800\"}]','[\"猫咪\",\"搞笑\",\"视频\"]','猫咪','温馨的家',567,34,0,datetime('now','-30 minutes'),0,0)").run();
  db.prepare("INSERT INTO posts VALUES (7,1,'带贝利去海边奔跑，浪花和狗狗的快乐时光 🌊🐕','[{\"type\":\"video\",\"url\":\"https://www.w3schools.com/html/mov_bbb.mp4\",\"poster\":\"https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800\"}]','[\"金毛\",\"海边\",\"视频\"]','金毛','海滨沙滩',234,19,0,datetime('now','-1 hour'),0,0)").run();
  console.log('Seed data inserted with Guangzhou coordinates');

  // Seed nested comments for post 1
  const commentCount = db.prepare('SELECT COUNT(*) as c FROM comments').get();
  if (commentCount.c === 0) {
    // Top-level comments
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, content_en, parent_id, created_at) VALUES (1, 1, 2, '金毛也太可爱了吧！', 'Your Golden Retriever is so adorable!', NULL, datetime('now','-30 minutes'))").run();
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, content_en, parent_id, created_at) VALUES (2, 1, 3, '这个公园在哪里呀？环境看起来真不错', 'Where is this park? Looks beautiful!', NULL, datetime('now','-20 minutes'))").run();
    // Nested replies (parent_id references comment id)
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, content_en, parent_id, created_at) VALUES (3, 1, 1, '是呀，每天带它出来都很开心～', 'Thanks! He loves coming here every day~', 1, datetime('now','-25 minutes'))").run();
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, content_en, parent_id, created_at) VALUES (4, 1, 2, '在阳光公园，超适合遛狗！', 'Sunshine Park is great for dog walking!', 2, datetime('now','-15 minutes'))").run();
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, content_en, parent_id, created_at) VALUES (5, 1, 3, '谢谢推荐，周末就去！', 'Thanks! Going there this weekend!', 4, datetime('now','-10 minutes'))").run();
    // Second-level reply (reply to a reply)
    db.prepare("INSERT INTO comments (id, post_id, user_id, content, content_en, parent_id, created_at) VALUES (6, 1, 1, '哈哈不客气，记得早点去占位～', 'No worries, get there early for a good spot!', 5, datetime('now','-5 minutes'))").run();
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

