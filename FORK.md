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
