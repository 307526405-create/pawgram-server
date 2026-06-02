const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'pawgram.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, nickname TEXT, phone TEXT, avatar TEXT, bio TEXT DEFAULT '', follow_count INTEGER DEFAULT 0, follower_count INTEGER DEFAULT 0, like_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, content TEXT, images TEXT DEFAULT '[]', tags TEXT DEFAULT '[]', breed TEXT DEFAULT '', location TEXT DEFAULT '', like_count INTEGER DEFAULT 0, comment_count INTEGER DEFAULT 0, is_liked INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, user_id INTEGER, content TEXT, reply_to INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS likes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, post_id INTEGER, UNIQUE(user_id, post_id));
`);

// Seed
const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (count.c === 0) {
  db.prepare("INSERT INTO users VALUES (1,'lily','王丽丽','','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150','爱宠物爱生活',45,1204,1790,datetime('now'))").run();
  db.prepare("INSERT INTO users VALUES (2,'bob','陈小波','','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150','猫咪控',89,120,450,datetime('now'))").run();
  db.prepare("INSERT INTO users VALUES (3,'flower','张小花','','https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150','八哥犬妈妈',567,342,890,datetime('now'))").run();
  
  db.prepare("INSERT INTO posts VALUES (1,1,'今天在公园玩得太开心了！贝利非常乖，还交到了一个柯基新朋友。🐾☀️','[\"https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800\",\"https://images.unsplash.com/photo-1668757183096-bc55a8992558?w=800\"]','[\"金毛\",\"公园日常\"]','金毛','阳光公园',342,12,1,datetime('now','-2 hours'))").run();
  db.prepare("INSERT INTO posts VALUES (2,2,'欢迎家里最小的新成员！还在想名字...大家有什么建议吗？🐱❤️','[\"https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=800\"]','[\"猫咪\",\"幼猫\"]','猫咪','温馨的家',891,45,0,datetime('now','-5 hours'))").run();
  db.prepare("INSERT INTO posts VALUES (3,3,'不知道他是在享受咖啡时光，还是单纯在等我掉面包屑... 😂☕️','[\"https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800\"]','[\"八哥犬\",\"搞笑\"]','八哥犬','市中心咖啡馆',124,8,0,datetime('now','-1 day'))").run();
  db.prepare("INSERT INTO posts VALUES (4,1,'周日下午的氛围。彻底放松。☁️💤','[\"https://images.unsplash.com/photo-1586289883499-f11d28aaf52f?w=800\"]','[\"布偶猫\",\"周末\"]','布偶猫','客厅',56,2,1,datetime('now','-2 days'))").run();
  db.prepare("INSERT INTO posts VALUES (5,1,'这是我的主场！迎来了今年的第一场雪。❄️🐺','[\"https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?w=800\"]','[\"柴犬\",\"下雪\"]','柴犬','城市街道',890,56,0,datetime('now','-5 days'))").run();
  console.log('Seed data inserted');
}

module.exports = db;
