const express = require('express');
const db = require('../database/init');
const router = express.Router();

const HAVERSINE_SQL = `
  (6371 * acos(
    cos(radians(?)) * cos(radians(?)) * cos(radians(?) - radians(?))
    + sin(radians(?)) * sin(radians(?))
  ))
`;

const seedPlaces = [
  { id:1, name:"二沙岛宠物公园", type:"公园", lat:23.1140, lng:113.2950, rating:4.8, reviews:326, desc:"广州最大的宠物友好公园，分大狗区小狗区", phone:"020-87301234" },
  { id:2, name:"星巴克宠物友好店(天河城)", type:"咖啡馆", lat:23.1320, lng:113.3210, rating:4.5, reviews:189, desc:"户外区可带宠物，提供饮水和小零食", phone:"020-85591234" },
  { id:3, name:"珠江公园宠物区", type:"公园", lat:23.1250, lng:113.3350, rating:4.7, reviews:403, desc:"市中心宠物友好公园，遛狗草坪超大" },
  { id:4, name:"爪印友好餐厅·宠物主题", type:"餐厅", lat:23.1200, lng:113.3100, rating:4.3, reviews:156, desc:"可以和宠物一起用餐，有宠物专属餐单", phone:"020-88991234" },
  { id:5, name:"白云山宠物徒步路线", type:"户外", lat:23.1850, lng:113.2970, rating:4.9, reviews:541, desc:"全程5公里树荫步道，山顶有宠物饮水点" },
  { id:6, name:"珠江新城宠物美容馆", type:"美容", lat:23.1190, lng:113.3250, rating:4.6, reviews:278, desc:"金牌美容师，赛级洗护标准", phone:"020-38261234" },
  { id:7, name:"天河公园宠物草坪", type:"公园", lat:23.1265, lng:113.3610, rating:4.4, reviews:198, desc:"超大草坪，早晚遛狗高峰很热闹" },
  { id:8, name:"越秀公园遛狗专区", type:"公园", lat:23.1403, lng:113.2720, rating:4.5, reviews:267, desc:"历史名园，五羊雕像旁有宠物活动区" },
  { id:9, name:"海珠湿地公园", type:"户外", lat:23.0820, lng:113.3580, rating:4.8, reviews:612, desc:"广州绿肺，景观超美，适合拍照打卡" },
  { id:10, name:"大夫山森林公园", type:"户外", lat:22.9480, lng:113.3150, rating:4.7, reviews:389, desc:"番禺后花园，可带狗骑行徒步" },
  { id:11, name:"华南植物园", type:"公园", lat:23.1875, lng:113.3630, rating:4.6, reviews:445, desc:"超大园区，树木繁多，遛狗避暑好去处" },
  { id:12, name:"瑞鹏宠物医院(天河分院)", type:"宠物医院", lat:23.1320, lng:113.3480, rating:4.4, reviews:234, desc:"连锁品牌，24小时急诊，设备先进", phone:"020-38761234" },
  { id:13, name:"芭比堂宠物医院(珠江新城)", type:"宠物医院", lat:23.1195, lng:113.3240, rating:4.6, reviews:312, desc:"眼科专科，全科诊疗，服务态度好", phone:"020-38381234" },
  { id:14, name:"太古汇宠物友好区", type:"商场", lat:23.1340, lng:113.3330, rating:4.2, reviews:89, desc:"高端商场，部分区域可携带小型宠物" },
  { id:15, name:"正佳广场宠物乐园", type:"商场", lat:23.1330, lng:113.3280, rating:4.1, reviews:76, desc:"七楼有宠物互动区，可带宠物逛街" },
  { id:16, name:"广州塔珠江边遛狗道", type:"户外", lat:23.1090, lng:113.3250, rating:4.7, reviews:521, desc:"珠江夜景美，江边步道适合夜遛" },
  { id:17, name:"大学城中心湖", type:"户外", lat:23.0530, lng:113.3880, rating:4.5, reviews:167, desc:"大草坪环绕湖边，人少狗多超自由" },
  { id:18, name:"生物岛水墨园绿道", type:"户外", lat:23.0700, lng:113.3800, rating:4.8, reviews:298, desc:"环岛绿道，环境幽静，骑行遛狗绝佳" },
  { id:19, name:"荔湾湖公园", type:"公园", lat:23.1240, lng:113.2380, rating:4.3, reviews:145, desc:"老西关风情，湖边遛狗别有韵味" },
  { id:20, name:"东山湖公园", type:"公园", lat:23.1270, lng:113.2870, rating:4.4, reviews:178, desc:"九曲桥+紫荆花，东山口文艺遛狗地" },
  { id:21, name:"派多格宠物生活馆(天河)", type:"美容", lat:23.1300, lng:113.3400, rating:4.3, reviews:156, desc:"进口洗护产品，美容兼售卖宠物用品", phone:"020-38731234" },
  { id:22, name:"猫主题咖啡馆·喵星人基地", type:"咖啡馆", lat:23.1280, lng:113.3380, rating:4.6, reviews:423, desc:"可带自家猫咪来交友，有猫爬架和玩具" },
  { id:23, name:"番禺万达宠物友好区", type:"商场", lat:22.9800, lng:113.3480, rating:4.0, reviews:67, desc:"室外步行街可带宠物，部分店铺欢迎狗狗" },
  { id:24, name:"琶洲宠物友好咖啡", type:"咖啡馆", lat:23.1040, lng:113.3700, rating:4.4, reviews:134, desc:"江边露台座位，宠物可自由活动", phone:"020-89111234" },
  { id:25, name:"流花湖公园", type:"公园", lat:23.1390, lng:113.2550, rating:4.3, reviews:156, desc:"湖心岛白宫打卡，遛狗拍照两不误" },
];

const seedNotes = {
  1: [
    { id:101, postId:1, user:"大黄铲屎官", avatar:"https://images.unsplash.com/photo-1761933808230-9a2e78956daa?w=80", content:"周末带金毛来玩了一下午，草坪超大！狗狗玩得超开心，还有很多小伙伴🐕", images:["https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"], time:"2天前", likes:23, placeId:1 },
    { id:102, postId:1, user:"橘猫日记", avatar:"https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=80", content:"这里管理很规范，每个区域都有围栏，大狗小狗分开，很放心", images:["https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400"], time:"5天前", likes:15, placeId:1 },
  ],
  2: [
    { id:201, postId:3, user:"柯基小短腿", avatar:"https://images.unsplash.com/photo-1615464670798-6e92fafa2a89?w=80", content:"店员超nice！主动给狗狗倒了水，还有免费的小零食。柯基表示五星好评⭐", images:["https://images.unsplash.com/photo-1668757183096-bc55a8992558?w=400"], time:"1天前", likes:34, placeId:2 },
  ],
  3: [
    { id:301, postId:4, user:"萨摩耶妈咪", avatar:"https://images.unsplash.com/photo-1568572933382-74d440642117?w=80", content:"凌晨两点紧急带狗狗来看病，医生非常专业，很快就处理好了。24小时急诊太重要了🙏", images:["https://images.unsplash.com/photo-1552053831-71594a27632d?w=400"], time:"3天前", likes:67, placeId:3 },
    { id:302, postId:1, user:"金毛阿福", avatar:"https://images.unsplash.com/photo-1536548665027-b96d34a005ae?w=80", content:"定期来这里做体检，设备很先进，价格也合理", images:["https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400"], time:"1周前", likes:12, placeId:3 },
  ],
  4: [
    { id:401, postId:4, user:"布偶猫主人", avatar:"https://images.unsplash.com/photo-1586289883499-f11d28aaf52f?w=80", content:"第一次带猫咪外出用餐！这家店有专门的宠物餐单，也太可爱了吧😍", images:["https://images.unsplash.com/photo-1604544203292-0daa7f847478?w=400"], time:"4天前", likes:45, placeId:4 },
  ],
  5: [
    { id:501, postId:5, user:"汪星人阿呆", avatar:"https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=80", content:"全程5公里，树荫很多不晒。山顶还有宠物饮水点，设计很贴心🌲", images:["https://images.unsplash.com/photo-1552053831-71594a27632d?w=400"], time:"6天前", likes:89, placeId:5 },
    { id:502, postId:5, user:"拉布拉多日记", avatar:"https://images.unsplash.com/photo-1516371535707-512a1e83bb9a?w=80", content:"每周必来的路线！建议早上来，人少狗狗可以放开跑", images:["https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=400"], time:"1周前", likes:31, placeId:5 },
  ],
  6: [
    { id:601, postId:1, user:"比熊小丸子", avatar:"https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=80", content:"美容师手法很温柔，比熊剪完毛像换了只狗哈哈！还送了小领结🎀", images:["https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400"], time:"3天前", likes:56, placeId:6 },
  ],
};

let submissions = [];
let nextId = 26;

// GET all places (approved only), optionally with distance_km
router.get('/', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const hasCoords = !isNaN(lat) && !isNaN(lon);

  let list = [...seedPlaces, ...submissions];
  if (hasCoords) {
    list = list.map(p => {
      const stmt = db.prepare(`SELECT ${HAVERSINE_SQL} as d`);
      const row = stmt.get(lat, p.lat, p.lng, lon, lat, p.lat);
      return { ...p, distance_km: Math.round(row.d * 100) / 100 };
    });
  }
  res.json({ code: 0, data: { list } });
});

// GET discover feed (real posts from database)
router.get('/feed/discover', (req, res) => {
  const limit = parseInt(req.query.limit) || 12;

  const posts = db.prepare(`
    SELECT p.*, u.nickname as user_name, u.avatar as user_avatar
    FROM posts p JOIN users u ON p.user_id = u.id
    ORDER BY p.like_count DESC
    LIMIT ?
  `).all(limit);

  const total = db.prepare('SELECT COUNT(*) as c FROM posts').get().c;

  const clean = (s) => (s || '[]').replace(/\\"/g, '"');
  const list = posts.map(p => ({
    id: p.id,
    postId: p.id,
    user: p.user_name,
    avatar: p.user_avatar,
    content: p.content,
    images: JSON.parse(clean(p.images)),
    likes: p.like_count,
    comment_count: p.comment_count,
    breed: p.breed || '',
    location: p.location || '',
    time: p.created_at,
  }));

  res.json({ code: 0, data: { list, total } });
});

// GET notes for a place
router.get('/:id/notes', (req, res) => {
  const placeId = parseInt(req.params.id);
  const notes = seedNotes[placeId] || [];
  res.json({ code: 0, data: { list: notes, total: notes.length } });
});

// POST submit a new place (pending review)
router.post('/', (req, res) => {
  const { name, type, desc, phone, lat, lng } = req.body;
  if (!name || !lat || !lng) return res.status(400).json({ code: -1, msg: '缺少必填字段' });
  
  const submission = {
    id: nextId++,
    name,
    type: type || '宠物友好',
    desc: desc || '',
    phone: phone || '',
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    rating: 0,
    reviews: 0,
    distance: '待审核',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  submissions.push(submission);
  console.log(`📍 新地点提交: ${name} (${lat}, ${lng})`);
  res.json({ code: 0, msg: '提交成功，等待审核', data: { id: submission.id } });
});

module.exports = router;
