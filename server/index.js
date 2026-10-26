const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3006;
const DATA_FILE = path.join(__dirname, 'data.json');

const CATEGORIES = ['技术', '问答', '分享', '灌水'];

app.use(express.json());
// 前端静态页面由后端同一端口提供，浏览器直接访问 http://localhost:3006
app.use(express.static(path.join(__dirname, '..', 'client')));

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    // data.json 缺失或损坏时，用空数据兜底，避免整个服务起不来
    return { posts: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function findPost(data, id) {
  return data.posts.find((p) => p.id === Number(id));
}

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

// ---------- 帖子 ----------

// 帖子列表，支持 ?category=分类名 筛选，按发帖时间倒序
app.get('/api/posts', (req, res) => {
  const data = loadData();
  let posts = data.posts;
  const { category } = req.query;
  if (category && category !== '全部') {
    posts = posts.filter((p) => p.category === category);
  }
  posts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(posts);
});

// 单个帖子详情
app.get('/api/posts/:id', (req, res) => {
  const data = loadData();
  const post = findPost(data, req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  res.json(post);
});

// 发帖
app.post('/api/posts', (req, res) => {
  const { title, author, category, content } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: '标题不能为空' });
  if (!content || !String(content).trim()) return res.status(400).json({ error: '内容不能为空' });

  const data = loadData();
  const post = {
    id: nextId(data.posts),
    title: String(title).trim(),
    author: author && String(author).trim() ? String(author).trim() : '匿名',
    category: CATEGORIES.includes(category) ? category : '灌水',
    content: String(content).trim(),
    likes: 0,
    replies: [],
    createdAt: new Date().toISOString()
  };
  data.posts.push(post);
  saveData(data);
  res.status(201).json(post);
});

// 修改帖子（标题 / 分类 / 内容，可部分更新）
app.put('/api/posts/:id', (req, res) => {
  const data = loadData();
  const post = findPost(data, req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const { title, category, content } = req.body || {};
  if (title !== undefined) {
    if (!String(title).trim()) return res.status(400).json({ error: '标题不能为空' });
    post.title = String(title).trim();
  }
  if (category !== undefined) {
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: '分类不合法' });
    post.category = category;
  }
  if (content !== undefined) {
    if (!String(content).trim()) return res.status(400).json({ error: '内容不能为空' });
    post.content = String(content).trim();
  }
  saveData(data);
  res.json(post);
});

// 删除帖子
app.delete('/api/posts/:id', (req, res) => {
  const data = loadData();
  const index = data.posts.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: '帖子不存在' });
  const [removed] = data.posts.splice(index, 1);
  saveData(data);
  res.json({ message: '已删除', post: removed });
});

// ---------- 回帖 ----------

// 给帖子添加回帖
app.post('/api/posts/:id/replies', (req, res) => {
  const { author, content } = req.body || {};
  if (!content || !String(content).trim()) return res.status(400).json({ error: '回帖内容不能为空' });

  const data = loadData();
  const post = findPost(data, req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const reply = {
    id: nextId(post.replies),
    author: author && String(author).trim() ? String(author).trim() : '匿名',
    content: String(content).trim(),
    createdAt: new Date().toISOString()
  };
  post.replies.push(reply);
  saveData(data);
  res.status(201).json(reply);
});

// 删除某条回帖
app.delete('/api/posts/:id/replies/:replyId', (req, res) => {
  const data = loadData();
  const post = findPost(data, req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const index = post.replies.findIndex((r) => r.id === Number(req.params.replyId));
  if (index === -1) return res.status(404).json({ error: '回帖不存在' });
  const [removed] = post.replies.splice(index, 1);
  saveData(data);
  res.json({ message: '已删除', reply: removed });
});

// ---------- 点赞 ----------

// 给帖子点赞（点赞数 +1）
app.post('/api/posts/:id/like', (req, res) => {
  const data = loadData();
  const post = findPost(data, req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  post.likes += 1;
  saveData(data);
  res.json({ id: post.id, likes: post.likes });
});

// 分类列表（供前端下拉框使用）
app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`forum 简易论坛已启动: http://localhost:${PORT}`);
});
