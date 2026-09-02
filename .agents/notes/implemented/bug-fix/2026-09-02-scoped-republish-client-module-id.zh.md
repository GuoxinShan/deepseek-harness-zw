# Agent Note: 换 scope 再发布时，客户端模块 id 仍用 Loader specifier

Status: implemented

[English](2026-09-02-scoped-republish-client-module-id.md) | 中文

## Problem

node 半侧从已解析的模块 URL 向上找最近一份 `name` 等于 Loader specifier 的 `package.json`，再用该名字作为 boot-graph 行 id。HTML 启动预加载的是 `@deepseek-ai/dsh-client-modules`。fork 发布只能改 npm scope（磁盘清单是 `@crazx/dsh-client-modules`，安装路径仍是 `@deepseek-ai/*` 别名），于是walker 越过真正的包根、丢掉 modules 行，`create()` 抛出 `HTML did not preload @deepseek-ai/dsh-client-modules/client.js`。

## Decision

`nearestPackage` 接受去掉 scope 后包名相同的换 scope 再发布清单。返回的 `packageName` 是 Loader specifier，因此 `PARSER_PRELOAD_IDS`、combo URL 和 client.js 注册横幅仍用 `@deepseek-ai/…`。去掉 scope 后包名不同的清单仍不拥有该行。

## Testing

`packages/client/modules/tests/node-half.client.spec.ts` 经 `loader.internal.resolveSync` 把 Loader 名 `@deepseek-ai/dsh-alias-row` 解析进磁盘 `name` 为 `@crazx/dsh-alias-row` 的目录，断言图行 id 仍是 specifier；第二条用 `@crazx/other-package`，断言该行不存在。

## Alternatives considered

**安装后再把每份磁盘 `package.json` 的 `name` 改回 `@deepseek-ai/*`。** 这会在每个消费方抹掉已发布字节，下一个以别名出货的包仍会再踩一次。

**用物理清单名做图行 id。** 那样预加载名单、横幅和 `dsh.client.inject` 边都要认识 fork scope。Loader specifier 已经是组合身份。

**以 `@deepseek-ai` 发布。** 官方 scope 不属于本 fork。

## Consequences

任何通过 `@deepseek-ai/*` 别名安装 fork-scope tarball 的消费方都会保住 modules 行和其余客户端表。清单名本就等于 specifier 的官方包行为不变。只有 Loader 已经解析进该目录时，恶意或误装的 `@other/same-suffix` 才会被当成拥有者。
