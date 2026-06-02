const express = require('express');
const router = express.Router();

const seedPlaces = [
  { id:1, name:"二沙岛宠物公园", type:"公园", distance:"2.1km", lat:23.1140, lng:113.2950, rating:4.8, reviews:126, desc:"广州最大的宠物友好公园", phone:"020-87301234" },
  { id:2, name:"星巴克宠物友好店(天河城)", type:"咖啡馆", distance:"1.5km", lat:23.1320, lng:113.3210, rating:4.5, reviews:89, desc:"提供宠物饮水点和小零食", phone:"020-85591234" },
  { id:3, name:"瑞鹏宠物医院(天河分院)", type:"医院", distance:"0.8km", lat:23.1350, lng:113.3280, rating:4.7, reviews:203, desc:"24小时急诊", phone:"020-87561234" },
  { id:4, name:"爪印友好餐厅·宠物主题", type:"餐厅", distance:"3.2km", lat:23.1200, lng:113.3100, rating:4.3, reviews:56, desc:"可以和宠物一起用餐", phone:"020-88991234" },
  { id:5, name:"白云山宠物徒步路线", type:"户外", distance:"5.8km", lat:23.1850, lng:113.2970, rating:4.9, reviews:341, desc:"最受欢迎的遛狗路线" },
  { id:6, name:"珠江新城宠物美容馆", type:"美容", distance:"1.9km", lat:23.1190, lng:113.3250, rating:4.6, reviews:178, desc:"金牌美容师", phone:"020-38261234" },
];

const seedNotes = {
  1: [
    { id:101, user:"大黄铲屎官", avatar:"https://images.unsplash.com/photo-1761933808230-9a2e78956daa?w=80", content:"周末带金毛来玩了一下午，草坪超大！狗狗玩得超开心，还有很多小伙伴🐕", images:["https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"], time:"2天前", likes:23, placeId:1 },
    { id:102, user:"橘猫日记", avatar:"https://images.unsplash.com/photo-1536548665027-b96d34a005ae?w=80", content:"这里管理很规范，每个区域都有围栏，大狗小狗分开，很放心", time:"5天前", likes:15, placeId:1 },
  ],
  2: [
    { id:201, user:"柯基小短腿", avatar:"https://images.unsplash.com/photo-1615464670798-6e92fafa2a89?w=80", content:"店员超nice！主动给狗狗倒了水，还有免费的小零食。柯基表示五星好评⭐", time:"1天前", likes:34, placeId:2 },
  ],
  3: [
    { id:301, user:"萨摩耶妈咪", avatar:"https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=80", content:"凌晨两点紧急带狗狗来看病，医生非常专业，很快就处理好了。24小时急诊太重要了🙏", time:"3天前", likes:67, placeId:3 },
    { id:302, user:"金毛阿福", avatar:"https://images.unsplash.com/photo-1755151234567-abc?w=80", content:"定期来这里做体检，设备很先进，价格也合理", time:"1周前", likes:12, placeId:3 },
  ],
  4: [
    { id:401, user:"布偶猫主人", avatar:"https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=80", content:"第一次带猫咪外出用餐！这家店有专门的宠物餐单，也太可爱了吧😍", images:["https://images.unsplash.com/photo-1604544203292-0daa7f847478?w=400"], time:"4天前", likes:45, placeId:4 },
  ],
  5: [
    { id:501, user:"汪星人阿呆", avatar:"https://images.unsplash.com/photo-1615464670798-6e92fafa2a89?w=80", content:"全程5公里，树荫很多不晒。山顶还有宠物饮水点，设计很贴心🌲", images:["https://images.unsplash.com/photo-1506905925346-21bda4d21df4?w=400"], time:"6天前", likes:89, placeId:5 },
    { id:502, user:"拉布拉多日记", avatar:"https://images.unsplash.com/photo-1601758003839-512c0a28a7e5?w=80", content:"每周必来的路线！建议早上来，人少狗狗可以放开跑", time:"1周前", likes:31, placeId:5 },
  ],
  6: [
    { id:601, user:"比熊小丸子", avatar:"https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=80", content:"美容师手法很温柔，比熊剪完毛像换了只狗哈哈！还送了小领结🎀", images:["https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400"], time:"3天前", likes:56, placeId:6 },
  ],
};

let submissions = [];
let nextId = 7;

// GET all places (approved only)
router.get('/', (req, res) => {
  res.json({ code: 0, data: { list: seedPlaces } });
});

// GET discover feed (aggregated notes from all places)
router.get('/feed/discover', (req, res) => {
  const limit = parseInt(req.query.limit) || 12;
  const feed = [];
  for (const [placeId, notes] of Object.entries(seedNotes)) {
    const place = seedPlaces.find(p => p.id === parseInt(placeId));
    for (const note of notes) {
      feed.push({...note, placeName: place?.name, placeType: place?.type, placeRating: place?.rating});
    }
  }
  feed.sort((a, b) => b.likes - a.likes);
  res.json({ code: 0, data: { list: feed.slice(0, limit), total: feed.length } });
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
