# Agent Note: Logged web boots via `dsh web:log`

Status: implemented

English | [中文](2026-08-18-dsh-web-log-subcommands.zh.md)

## Problem

Upstream has no launch wrapper: `dsh web` output goes only to the terminal, so closing the window discards it and no history exists when the host or a plugin misbehaves (a provider-balance badge that would not refresh was the motivating case). The fork needs persisted boot logs without changing what the harness itself writes.

## Decision

The CLI owns two fork-local launcher subcommands, `dsh web:log` and `dsh web:log:tmp` (`apps/cli/src/web-log.ts`, parsing in `apps/cli/src/args.ts`). Each spawns this very bin as `dsh web …` via `process.execPath` + `process.execArgv`, so the wrapper never shares a process — or a crash — with the harness, and the tee is byte-exact. Per launch the wrapper writes one `web-<timestamp>.log` under `$DSH_HOME/logs` (the tmp variant uses `${TMPDIR}/dsh-web-logs`, reaped by the OS; `DSH_WEB_LOG_DIR` overrides both), with a `web-latest.log` symlink always naming the newest. It forwards SIGINT/SIGTERM to the child, waits for the child's `close` rather than `exit` so trailing output is drained before the log stream ends, and exits with the child's code. Flag parsing mirrors the `web` alias minus the boot-free config dumps. Usage and lookup recipes live in [FORK.md](../../../FORK.md); the upstream-facing `apps/cli/README.md` stays untouched.

## Alternatives considered

**A shell wrapper plus pnpm scripts** (`scripts/web-log.sh` with `web:log` / `web:log:tmp` entries in the root manifest). Built first on the same branch and replaced: a bash wrapper is a second entry shape to keep in sync with the launcher's flags, the pnpm indirection hid the flag surface, and the native subcommand reuses the commander adapter's `--patch` handling and parent-option rejection instead of duplicating them in bash.

**A dynamic Cordis plugin or slot.** Inapplicable: a plugin runs inside the booted process, so it cannot capture the host's own stdout/stderr and dies in the same crash the logging exists to diagnose. FORK.md's plugin-first order yields here because the capability must wrap the process from outside.

**Documenting `dsh web 2>&1 | tee <file>` for users.** No canonical location, no `web-latest.log` indirection, and every shell session must remember to opt in; the session that needs the logs is exactly the one where nobody did.

## Consequences

Boot logs survive the terminal and sit one `tail -f …/web-latest.log` away. The fork's upstream-sync surface grows by one new file, one `switch` case, and one registration block in `apps/cli`, all additive. Logs are not rotated: the default directory needs periodic manual cleanup, and the tmp variant relies on OS reaping. The symlink needs elevated privileges on Windows; the fork's developers are on macOS, so no fallback was added.
