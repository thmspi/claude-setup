#!/usr/bin/env bash
set -euo pipefail

HOOK_ID="${1:-}"
REL_SCRIPT_PATH="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_ROOT="${CUSTOM_CLAUDE_ROOT:-$(cd "${SCRIPT_DIR}/../.." && pwd)}"

# Preserve stdin for passthrough or script execution
INPUT="$(cat)"

if [[ -z "$HOOK_ID" || -z "$REL_SCRIPT_PATH" ]]; then
  printf '%s' "$INPUT"
  exit 0
fi

# Optional custom disable list: CUSTOM_DISABLED_HOOKS="id1,id2"
if [[ -n "${CUSTOM_DISABLED_HOOKS:-}" ]]; then
  HOOK_ID_NORM="$(printf '%s' "$HOOK_ID" | tr '[:upper:]' '[:lower:]')"
  if printf ',%s,' "$(printf '%s' "$CUSTOM_DISABLED_HOOKS" | tr '[:upper:]' '[:lower:]' | tr -d ' ')" | grep -q ",${HOOK_ID_NORM},"; then
    printf '%s' "$INPUT"
    exit 0
  fi
fi

SCRIPT_PATH="${SCRIPTS_ROOT}/${REL_SCRIPT_PATH}"
RESOLVED_ROOT="$(cd "$SCRIPTS_ROOT" && pwd)"
RESOLVED_SCRIPT="$(node -e "const path=require('path'); process.stdout.write(path.resolve(process.argv[1]));" "$SCRIPT_PATH")"

# Prevent path traversal outside configured root
case "$RESOLVED_SCRIPT" in
  "$RESOLVED_ROOT"/*) ;;
  *)
    echo "[Hook] Path traversal rejected for ${HOOK_ID}: ${SCRIPT_PATH}" >&2
    printf '%s' "$INPUT"
    exit 0
    ;;
esac

if [[ ! -f "$RESOLVED_SCRIPT" ]]; then
  echo "[Hook] Script not found for ${HOOK_ID}: ${RESOLVED_SCRIPT}" >&2
  printf '%s' "$INPUT"
  exit 0
fi

printf '%s' "$INPUT" | "$RESOLVED_SCRIPT"
