# Agent Note: 客户端插件 bundle 响应显式声明 content-length

Status: implemented

[English](2026-08-18-wkwebview-bundle-content-length.md) | 中文

## Problem

插件 bundle 路由对每个 `/plugins/<id>/client.js` 请求都以 `writeHead(...)` 加 `end(body)` 应答，这会抑制 Node 的自动长度计算，使响应按 `Transfer-Encoding: chunked` 分帧。在启动期约 39 个 bundle 请求的并发突发下，WKWebView（macOS 桌面壳背后的系统 WebView）会丢弃或挂死其中一些 chunked 回环响应：GUI 每次运行随机出现某个 bundle 加载失败，且该页面的失败是永久的——页内 `fetch` 同一 URL 持续报 `Load failed`，而 `curl` 能正常取回。Chromium 从不出现该问题。暴露该故障的桌面壳项目完成了根因定位，并用其 e2e 探针验证了修复：修复后连续五次全绿，修复前基本为零。

## Decision

`packages/client/modules` 的 `serveBundle` 显式声明已缓冲 body 的长度：bundle 与其 source map 都带 `content-length: body.length`。`packages/host/frontend-static` 的 `serveStatic` 对每个成功的 200 同样设置该头——包括渲染后的 index 和普通 dist 文件——避免卡住的 index 把窗口留成空白。对完全缓冲的 body，显式长度是规范分帧——Node 会发送带普通 `content-length` 的响应而非 chunked，普通浏览器不受影响。source map 的测试固定了 bundle 头，frontend-static 的真实组合测试固定了 index 与资产头，分帧退回 chunked 会在任何壳受影响之前就先挂掉单元测试。

上游 0.1.1-rc.1 把 `serveStatic` 的未命中项从 SPA 回退 200 改成 404。fork 保留该未命中契约，并继续给剩余的 200 响应设置 `Content-Length`。

## Alternatives considered

**提高 webserver 的 `keepAliveTimeout`。** 桌面壳调查中最先尝试的方案；未能修复故障，已回滚。没有新证据不要重新引入。

**在插件层面处理。** 判定为不可行：`/plugins` 前缀路由是独占注册的（`WebServer.register` 对重复的 kind+path 直接抛错），响应路径上也没有 tap 或中间件席位，任何插件都无法修改另一个 handler 的响应头。把 `serveBundle` 复制进插件则要复制私有注册表状态，且上游每次改动都会失配。

## Consequences

harness 的每个 WKWebView 消费者都能可靠启动；Chromium 消费者除了标准长度头外无行为变化。bundle 路由的线上分帧如今由测试固定，该修复适合上游化——合并后 fork 不再携带本地差异。
