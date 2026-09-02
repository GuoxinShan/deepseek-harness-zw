# Agent Note: Scoped republish keeps the Loader specifier as the client module id

Status: implemented

English | [中文](2026-09-02-scoped-republish-client-module-id.zh.md)

## Problem

The node half walks from a resolved module URL to the nearest `package.json` whose `name` equals the Loader specifier, then uses that name as the boot-graph row id. HTML bootstrap preloads `@deepseek-ai/dsh-client-modules`. A fork publish that must change only the npm scope (`@crazx/dsh-client-modules` in the on-disk manifest, still installed under the `@deepseek-ai/*` alias) therefore walks past the real package root, drops the modules row, and `create()` throws `HTML did not preload @deepseek-ai/dsh-client-modules/client.js`.

## Decision

`nearestPackage` accepts a scoped republish of the same unscoped name. The returned `packageName` is the Loader specifier, so `PARSER_PRELOAD_IDS`, combo URLs, and the client.js registration banner keep using `@deepseek-ai/…`. A manifest whose unscoped name differs still does not own the row.

## Testing

`packages/client/modules/tests/node-half.client.spec.ts` resolves a `@deepseek-ai/dsh-alias-row` Loader entry through `loader.internal.resolveSync` into a directory whose on-disk `name` is `@crazx/dsh-alias-row` and asserts the graph id stays the specifier; a second case with `@crazx/other-package` asserts the row is absent.

## Alternatives considered

**Rewrite every on-disk `package.json` `name` back to `@deepseek-ai/*` after install.** That undoes the published bytes at every consumer and hides the next package that ships under an alias.

**Key the graph on the physical manifest name.** Then every preload list, banner, and `dsh.client.inject` edge would have to learn the fork scope. The Loader specifier is already the composition identity.

**Publish under `@deepseek-ai`.** The official scope is not available to the fork.

## Consequences

Any consumer that installs a fork-scoped tarball through an `@deepseek-ai/*` alias now keeps the modules row and the rest of the client table. Official packages whose manifest name already matches the specifier are unchanged. A hostile or mistaken `@other/same-suffix` package only matches if the Loader already resolved into that directory.
