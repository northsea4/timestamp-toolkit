# 时间工具箱

Raycast 风格的 MV3 开发者时间工具箱，支持时间戳解析、日期时间转换、常用格式复制、时区切换、右键菜单、快捷键和最近记录。

## 开发

```bash
npm install
npm run build
```

然后在 Chrome 扩展管理页加载 `dist` 目录。

## 第一版范围

- Popup 固定为 `460 x 600`，主转换界面不滚动
- 中文界面，支持深色、浅色、跟随系统
- 解析秒、毫秒、微秒、纳秒时间戳
- 生成秒、毫秒时间戳
- 支持 Local、UTC、Asia/Shanghai、America/Los_Angeles、Europe/London、Asia/Tokyo
- 最近 30 条历史记录保存在 `chrome.storage.local`
- 设置保存在 `chrome.storage.sync`
- 自动读取剪贴板默认关闭，开启时请求 `clipboardRead` 可选权限
