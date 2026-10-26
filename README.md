# forum 简易论坛

一个前后端完整的简易论坛示例：后端使用 **Node.js + Express** 提供 REST API，数据持久化在 `server/data.json` 文件中；前端使用原生 **HTML / CSS / JavaScript**（`client/` 目录），由后端同一端口直接托管。

## 功能

- 📋 帖子列表（按发帖时间倒序）
- 🏷️ 按分类筛选：技术 / 问答 / 分享 / 灌水
- ✍️ 发新帖
- 📝 帖子详情展开，查看全部回帖
- 💬 回帖
- ❤️ 点赞（点赞状态记录在浏览器 localStorage）
- 🛠️ 后端另提供帖子修改 / 删除、回帖删除接口

## 目录结构

```
forum/
├── client/            # 前端页面
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server/            # 后端（Express）
│   ├── index.js       # 服务入口与全部 API 路由
│   └── data.json      # 数据文件（持久化，内置 8 篇示例帖子）
├── package.json
└── README.md
```

## 安装与启动

需要 Node.js 16 及以上版本。

```bash
cd forum
npm install
npm start
```

启动后打开浏览器访问：

> **http://localhost:3006**

（后端固定监听 **3006** 端口，可用环境变量 `PORT` 覆盖；前端页面与 API 同端口，无需单独启动前端服务。）

## REST API 一览

| 方法   | 路径                              | 说明                                     |
| ------ | --------------------------------- | ---------------------------------------- |
| GET    | `/api/posts?category=分类`        | 帖子列表，可按分类筛选（不传返回全部）   |
| GET    | `/api/posts/:id`                  | 单个帖子详情（含回帖）                   |
| POST   | `/api/posts`                      | 发帖，body：`{ title, author, category, content }` |
| PUT    | `/api/posts/:id`                  | 修改帖子，body 可含 `title / category / content` |
| DELETE | `/api/posts/:id`                  | 删除帖子                                 |
| POST   | `/api/posts/:id/replies`          | 回帖，body：`{ author, content }`        |
| DELETE | `/api/posts/:id/replies/:replyId` | 删除某条回帖                             |
| POST   | `/api/posts/:id/like`             | 点赞（点赞数 +1）                        |
| GET    | `/api/categories`                 | 分类列表                                 |

### curl 示例

```bash
# 列出全部帖子
curl http://localhost:3006/api/posts

# 按分类筛选
curl 'http://localhost:3006/api/posts?category=技术'

# 发帖
curl -X POST http://localhost:3006/api/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"你好论坛","author":"测试","category":"灌水","content":"第一篇帖子"}'

# 回帖（id 换成实际帖子 id）
curl -X POST http://localhost:3006/api/posts/1/replies \
  -H 'Content-Type: application/json' \
  -d '{"author":"路人","content":"写得不错！"}'

# 点赞
curl -X POST http://localhost:3006/api/posts/1/like
```

## 数据持久化

所有帖子与回帖都保存在 `server/data.json`，重启服务不丢失。项目已内置 8 篇示例帖子；如需重置，把该文件恢复为初始内容或删除后重启即可（删除后会以空列表启动）。
