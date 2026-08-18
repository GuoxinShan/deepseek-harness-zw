#!/usr/bin/env bash
# web-log.sh — start the DSH web harness with stdout/stderr persisted to a log file.
#
# Fork-local convenience (see FORK.md § 本地启动与日志): upstream has no launch
# wrapper, so plugin/harness logs on the terminal vanish with the scrollback.
#
# Usage:
#   pnpm web:log                 # default port 3080
#   pnpm web:log --port 0        # OS-assigned port (avoids ephemeral-port EADDRINUSE)
#   pnpm web:log:tmp             # same, but logs go to the OS temp dir (auto-cleaned)
#   bash scripts/web-log.sh --port 62124
#
# Logs: ${DSH_WEB_LOG_DIR:-${DSH_HOME:-~/.dsh}/logs}/web-<yyyymmdd-HHMMSS>.log
# per launch, with a web-latest.log symlink alongside always naming the newest
# one. DSH_WEB_LOG_DIR redirects the directory (the tmp variant sets it to
# ${TMPDIR:-/tmp}/dsh-web-logs, which the OS reaps automatically).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${DSH_WEB_LOG_DIR:-${DSH_HOME:-$HOME/.dsh}/logs}"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/web-$(date +%Y%m%d-%H%M%S).log"
ln -sfn "$LOG" "$LOG_DIR/web-latest.log"

{
  echo "[web-log] $(date '+%F %T') starting (checkout: $ROOT)"
  cd "$ROOT"
  pnpm dsh web "$@"
} 2>&1 | tee -a "$LOG"
