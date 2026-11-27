# 3D 大冰的小屋

[打开小屋](https://ayang0097.github.io/dabing-3d-cabin/) · [上传 BOT](https://ayang0097.github.io/dabing-3d-cabin/upload.html) · [屋主设置上传密钥](https://ayang0097.github.io/dabing-3d-cabin/manage-upload.html)

推门进屋，找一个位置听歌，读各地小屋的物件故事，或从树洞走进且曼教室。点开 BOT 名片即可复制到 Grok。带有分享模板的 BOT 会打开对应模板，其他 BOT 提供可复制的创建指令。

## 上传与密钥设置

- 投稿者从小屋右上角的「上传我的 BOT」进入上传页，每次都要先验证屋主提供的上传密钥。验证通过后可填写资料，提交成功后 BOT 会出现在公开名册中。
- 屋主使用独立的屋主密钥设置新上传密钥。保存后，旧上传密钥失效。
- GitHub Pages 从 `CABIN_BOT_API` 读取投稿接口地址。上传密钥的摘要保存在服务端数据库，屋主密钥由托管服务的 `BOT_OWNER_KEY` 密钥变量提供。

## 项目文件

- `index.html`、`main.js` 和场景模块组成民谣小屋。
- `classroom/` 提供且曼教室的公开 3D 展示。
- `deployment/worker.mjs` 和 `deployment/drizzle/` 提供投稿接口和数据库结构。
- `大冰的小屋·Bot民谣现场.html` 是可直接双击打开的离线小屋。
- 材质、照片与物件出处见[小屋取材手记](./小屋取材.md)。[Three.js 许可](./vendor/THREE-LICENSE.txt)随代码提供。

在仓库目录运行 `python3 deployment/build_pages.py` 生成公开网页，再用 `python3 -m http.server 8000 --directory _site` 预览。需要联调投稿时，将公开接口地址赋给 `CABIN_BOT_API` 环境变量。GitHub Pages 部署由 `.github/workflows/pages.yml` 执行。

本地版与线上版共用同一份小屋源码。每次更新时运行 `python3 打包单页.py` 更新本地离线版，再将同一批修改发布到 GitHub Pages。
