# Demo 本地运行与验证

## 启动

需要支持 ES modules 和 Node 内置测试运行器的 Node.js（本次验证为 v26.8.1）。测试脚本源码还需要 Python 3。没有第三方运行时依赖，无需 npm install。

```sh
npm run dev
```

打开 http://127.0.0.1:5173 。可用 PORT 环境变量覆盖端口。Ctrl+C 停止服务。源码没有构建步骤，修改后刷新页面。

## 检查

```sh
npm test
npm run check
```

- tests/game.test.js 验证目录隔离、所有直接文件可读、token/Enter 边界、num 匹配、错误输入、重复投递、移除、时间、终局和重开。
- tests/script.test.js 对展示的完整 Python 源码进行语法检查，模拟 urllib 边界，验证成功、缺少配置、HTTP/网络/超时失败、非法 JSON 和响应；断言一次请求、10 秒超时、无重试、错误消息不泄漏上游内容。
- check 执行 JavaScript 语法检查与 git diff --check。
- 本地服务器只提供 index.html、src 中的前端资源与 favicon；仓库文档、.env、Git 元数据和越界路径不提供 HTTP 访问。

## 本次验证记录（2026-10-19）

- npm test：11 项通过。
- npm run check：通过。
- HTTP 实际检查：4 个前端资源返回 200，4 个私有/越界路径返回 404。
- Chrome 桌面：确认根目录文件范围，cat .env 被证据区拒绝，cd 后仅展示子目录直接文件，cat 展示完整源码，运行脚本后原生拖拽同一 RESULT #103 到两个区域并成功通关。
- Chrome 390×844：完成 cd、cat .env、python balance.py、选择结果后点击两区提交；验证移除一份依据后提交被拦截，再补齐后通关；无横向溢出。
- 依据用户反馈调整后再次检查：JSON pre 无强调元素、证据区无 CNY 文案，成功弹窗才出现 CNY 揭晓。
- NEXT TOKEN PREDICTOR / CLAUDE 标识在桌面与手机均可见；最终浏览器控制台无 warning/error。
- 本地预览截图保存在忽略追踪的 artifacts/demo-desktop.jpg 与 artifacts/demo-mobile.jpg。

未调用真实 DeepSeek 接口，未验证真实账号、费用或联网服务互通。Python 代码仅使用模拟 HTTP 验证。超时规则由自动化时间边界测试验证，未在浏览器手动等待完整五分钟。该 Demo 使用浏览器内存状态与客户端校验，刷新即重开。
