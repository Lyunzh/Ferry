# Demo 前端结构

采用原生 HTML、CSS 与 ES modules，无运行时第三方依赖。index.html 为语义化界面；src/style.css 负责响应式布局；src/scenario.js 是关卡文件、命令与结果 num 的唯一配置来源；src/game.js 是纯状态转换与验证；src/app.js 处理 DOM、定时器与拖拽输入。

静态 DOM 文本与 JSON 通过 textContent 写入；只允许预设命令。拖拽 payload 使用独立 MIME 类型并验证整数、当前结果与目标区。纯规则层再次验证，不信任 DOM。输出和证据可重复渲染但仅由规则层写入状态。触屏与键盘使用「选择结果 → 点击证据区」。交互反馈使用 aria-live，终局弹窗处理初始焦点与关闭后焦点恢复。

视觉采用浅色工作台、深色终端、橙色任务线与紫色怀疑线；窄屏按任务、终端、证据顺序排列。减少动画偏好受到尊重。

用户确认的呈现规则：token 选择框直接标注 NEXT TOKEN PREDICTOR 与 CLAUDE，强化扮演身份。JSON 以统一样式显示；仅在成功结算中解释 CNY 线索，证据卡及玩法说明不提前揭晓。
