# FORK.md — 本 fork 的工作流

本仓库是 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 的 fork：`origin` 指向 `aka-danielZhang/deepseek-harness`，`upstream` 指向官方仓库。本文件是 fork 专有约定，上游没有对应文件；根 `AGENTS.md` 的其余规则继续全部适用。

## Fork 的存在目的

处理上游没有 slot、也没有其他扩展点可以覆盖的场景。判断顺序：优先用动态 Cordis 插件或既有 slot 解决；确认没有任何扩展点可用时，才修改仓库代码。已经引入的两个先例：`mcp-client/status` 事件（`packages/mcp/mcp-client`）与 `settings.models.provider` 行级插槽（`packages/client/ui-settings-models`）。

## 修改三原则

简单、优雅、最小侵入。能加 slot 就加 slot，能不改核心包就不改；每处改动都要评估将来同步 upstream 时的合并成本，避免大面积重写上游会动的文件。

## 强制告知

任何修改前必须告知用户：这是 fork 本地修改、打算改什么、上游为什么没有对应能力。不允许静默改动。

## 分支纪律

修改前先检查是否已有相关 fix/feat 分支（`git branch -a`，必要时 `gh pr list --state all`）：

- 存在相关分支 → 先确认它是否已完成这项工作（`git log master..<branch>`、`git diff master...<branch>`）；已完成则在其上续写剩余部分，未开始则不占用该分支名。
- 改动足够大、依赖少、可独立交付 → 单独新开一个 `fix/` 或 `feat/` 分支。
- 都不匹配 → 从 master 新开分支。

已合并进 master 的功能分支（如 `feat/mcp-client-status-event`、`fix/models-provider-row-slot`）是完成态，不复用、不续写。

## 上游同步

定期 `git fetch upstream` 并把 `upstream/master` 合入 master；冲突时以保留双方语义为准，fork 本地提交不丢弃。同步后跑受影响包的聚焦测试确认 fork 改动仍然成立。

## 本地启动与日志（web:log）

上游没有启动包装脚本，进程输出只去终端、关窗即失。fork 增加 `scripts/web-log.sh`（分支 `feat/web-log-script`），启动同时落盘：

```sh
pnpm web:log                  # 默认 3080；等价 bash scripts/web-log.sh
pnpm web:log --port 0         # 让系统分配端口（可避开临时端口占用导致的 EADDRINUSE）
pnpm web:log:tmp              # 日志改放系统临时目录（macOS 定期自动清理，无需手动删）
```

日志位置（每次启动一个文件，`web-latest.log` 软链始终指向最新一次）：

```
默认：  ~/.dsh/logs/web-<yyyymmdd-HHMMSS>.log          # 重启后仍在，需手动清理
tmp：   ${TMPDIR:-/tmp}/dsh-web-logs/web-<时间戳>.log  # 操作系统自动回收
```

也可用环境变量自定义目录：`DSH_WEB_LOG_DIR=/path/to/dir pnpm web:log`。

常用查法：

| 目的 | 命令 |
|---|---|
| 实时跟随 | `tail -f ~/.dsh/logs/web-latest.log`（tmp 模式换成 `$TMPDIR/dsh-web-logs/web-latest.log`） |
| 只看余量插件 | `grep 'provider-balance' ~/.dsh/logs/web-latest.log` |
| 有哪些实例在跑 | `lsof -nP -iTCP -sTCP:LISTEN \| grep 'bin.ts web'` |

清理：默认目录 `rm ~/.dsh/logs/web-*.log`（日志不按大小轮转，定期手动删）；tmp 目录不用管，系统会收。
