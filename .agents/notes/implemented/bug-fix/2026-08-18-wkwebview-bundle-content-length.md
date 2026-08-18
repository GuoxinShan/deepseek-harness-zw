# Agent Note: Explicit content-length on served client bundles

Status: implemented

English | [中文](2026-08-18-wkwebview-bundle-content-length.zh.md)

## Problem

The plugin-bundle route answered every `/plugins/<id>/client.js` request with `writeHead(...)` followed by `end(body)`, which suppresses Node's automatic length computation and frames the response `Transfer-Encoding: chunked`. Under the boot-time burst of ~39 concurrent bundle requests, WKWebView (the system WebView behind macOS desktop shells) drops or hangs some chunked loopback responses: the GUI shows a random bundle failing to load per run, and the per-page failure is permanent — in-page `fetch` of the same URL keeps failing with `Load failed` while `curl` fetches it fine. Chromium never exhibits it. The desktop-shell project that surfaced the failure root-caused it and verified the fix through its e2e probe: five consecutive green runs after, effectively zero before.

## Decision

`serveBundle` in `packages/client/modules` states the buffered body's length explicitly: `content-length: body.length` on both the bundle and its source map. For a fully-buffered body the explicit length is the canonical framing — Node sends a plain `content-length` response instead of a chunked one, and ordinary browsers are unaffected. The source-map spec pins the header, so a regression back to chunked framing fails a unit test before any shell hits it.

## Alternatives considered

**Raise the webserver `keepAliveTimeout`.** Tried first by the desktop-shell investigation; it did not fix the failure and was rolled back. Do not re-add without new evidence.

**Handle it in a plugin.** Rejected as impossible: the `/plugins` prefix route is registered exclusively (`WebServer.register` throws on a duplicate kind+path), and the response path has no tap or middleware seat, so no plugin can alter another handler's response headers. Copying `serveBundle` into a plugin would duplicate private registry state and break on every upstream change.

## Consequences

Every WKWebView consumer of the harness boots reliably; Chromium consumers see no behavioral change beyond the standard length header. The wire framing of the bundle route is now pinned by test, and the fix is a candidate for upstreaming so the fork carries no local diff once merged.
