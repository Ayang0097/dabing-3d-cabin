# 3D 大冰的小屋

[打开小屋](https://ayang0097.github.io/dabing-3d-cabin/) · [上传 BOT](https://ayang0097.github.io/dabing-3d-cabin/upload.html) · [我的 BOT](https://ayang0097.github.io/dabing-3d-cabin/upload.html?mode=edit) · [屋主管理](https://ayang0097.github.io/dabing-3d-cabin/manage-upload.html)

推门进屋，找一个位置听歌，读各地小屋的物件故事，或从树洞走进且曼教室。点开 BOT 名片即可复制到 Grok。带有分享模板的 BOT 会打开对应模板，其他 BOT 提供可复制的创建指令。

## 上传与密钥设置

- 投稿者从小屋右上角的「上传我的 BOT」进入上传页，填入上传密钥和 Grok 公开分享模板链接即可上传。模板的原名称和使用介绍会自动带入，也可以手动修改。读不到原名称时，留空将使用「Grok BOT」。颜色和形状可以预览后选择。服务端每次提交都验证密钥，投稿资料会显示在小屋名片上，访客可以从名片打开分享模板并复制 BOT。
- 屋主用屋主密钥给每位成员发放个人密钥。用个人密钥上传的 BOT 会自动归到该成员名下，用同一把密钥从「我的 BOT」进入即可编辑。重发个人密钥后，成员用新密钥管理原来的 BOT。
- 用共用密钥上传的 BOT 由屋主在「绑定旧投稿」确认归属。访客点名片仍可复制 BOT。
- GitHub Pages 从 `CABIN_BOT_API` 读取投稿接口地址。上传密钥的摘要保存在服务端数据库，屋主密钥由托管服务的 `BOT_OWNER_KEY` 密钥变量提供。

## 项目文件

- `index.html`、`main.js` 和场景模块组成民谣小屋。
- `classroom/` 提供且曼教室的公开 3D 展示。
- `deployment/worker.mjs` 和 `deployment/drizzle/` 提供投稿接口和数据库结构。
- `大冰的小屋·Bot民谣现场.html` 是可直接双击打开的离线小屋。
- 材质、照片与物件出处见[小屋取材手记](./小屋取材.md)。[Three.js 许可](./vendor/THREE-LICENSE.txt)随代码提供。

在仓库目录运行 `python3 deployment/build_pages.py` 生成公开网页，再用 `python3 -m http.server 8000 --directory _site` 预览。需要联调投稿时，将公开接口地址赋给 `CABIN_BOT_API` 环境变量。GitHub Pages 部署由 `.github/workflows/pages.yml` 执行。

本地版与线上版共用同一份小屋源码。每次更新时运行 `python3 打包单页.py` 更新本地离线版，再将同一批修改发布到 GitHub Pages。
