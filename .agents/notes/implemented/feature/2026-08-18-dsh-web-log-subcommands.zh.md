# Agent Note: 通过 `dsh web:log` 落盘启动 web

Status: implemented

[English](2026-08-18-dsh-web-log-subcommands.md) | 中文

## Problem

上游没有启动包装：`dsh web` 的输出只去终端，关窗即失，宿主或插件出问题时不存在任何历史记录（触发本工作的案例是余量徽章刷不出来）。fork 需要持久化的启动日志，且不改变 harness 自身写出的内容。

## Decision

CLI 持有两个 fork 本地子命令 `dsh web:log` 与 `dsh web:log:tmp`（`apps/cli/src/web-log.ts`，解析在 `apps/cli/src/args.ts`）。两者通过 `process.execPath` + `process.execArgv` spawn 自身 bin 为 `dsh web …`，因此 wrapper 从不与 harness 共享进程——也不共享崩溃——且 tee 逐字节精确。每次启动 wrapper 在 `$DSH_HOME/logs` 下写一个 `web-<时间戳>.log`（tmp 变体用 `${TMPDIR}/dsh-web-logs`，由操作系统回收；`DSH_WEB_LOG_DIR` 覆盖两者），旁置的 `web-latest.log` 软链始终指向最新一次。wrapper 向子进程转发 SIGINT/SIGTERM，等待子进程的 `close` 而非 `exit`，使尾部输出在日志流结束前排空，并以子进程的退出码退出。旗标解析镜像 `web` 别名，仅去掉免启动的 config dump。用法与查法见 [FORK.md](../../../../FORK.md)；面向上游的 `apps/cli/README.md` 保持不动。

## Alternatives considered

**shell 包装脚本加 pnpm scripts**（`scripts/web-log.sh` 及根 manifest 的 `web:log` / `web:log:tmp` 条目）。在同一分支上先行实现并被替换：bash 包装是需要与 launcher 旗标保持同步的第二套入口形态，pnpm 间接层掩盖了旗标面，而原生子命令直接复用 commander 适配器的 `--patch` 处理与父选项拒绝，无需在 bash 里重复实现。

**动态 Cordis 插件或 slot。** 不适用：插件运行在被启动的进程内部，无法捕获宿主自身的 stdout/stderr，且会在它所要诊断的同一场崩溃中一同死去。FORK.md 的插件优先顺序在此让位，因为该能力必须从进程外部包裹。

**给用户文档化 `dsh web 2>&1 | tee <文件>`。** 没有规范位置，没有 `web-latest.log` 间接层，且每个 shell 会话都要记得手动加上；最需要日志的那次会话恰恰是没人加的那次。

## Consequences

启动日志在终端关闭后仍然存活，`tail -f …/web-latest.log` 即可直达。fork 的上游同步面在 `apps/cli` 增加了一个新文件、一个 `switch` 分支和一处注册块，全部为增量。日志不按大小轮转：默认目录需要定期手动清理，tmp 变体依赖操作系统回收。Windows 上软链需要提权；fork 的开发者都在 macOS 上，未加回退。
