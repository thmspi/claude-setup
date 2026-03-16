#!/usr/bin/env node
/**
 * Executes a local hook script with lightweight custom gating.
 *
 * Usage:
 *   node run-with-flags.js <hookId> <scriptRelativePath> [ignored]
 *
 * Optional env controls:
 *   CUSTOM_DISABLED_HOOKS=comma,separated,hook,ids
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MAX_STDIN = 1024 * 1024;

function readStdinRaw() {
  return new Promise(resolve => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (raw.length < MAX_STDIN) {
        const remaining = MAX_STDIN - raw.length;
        raw += chunk.substring(0, remaining);
      }
    });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', () => resolve(raw));
  });
}

function normalizeHookId(value) {
  return String(value || '').trim().toLowerCase();
}

function getDisabledHooks() {
  const raw = String(process.env.CUSTOM_DISABLED_HOOKS || '');
  if (!raw.trim()) return new Set();

  return new Set(
    raw
      .split(',')
      .map(normalizeHookId)
      .filter(Boolean)
  );
}

function getScriptsRoot() {
  if (process.env.CUSTOM_CLAUDE_ROOT && process.env.CUSTOM_CLAUDE_ROOT.trim()) {
    return process.env.CUSTOM_CLAUDE_ROOT;
  }
  // Default to the local .claude directory for this custom setup.
  return path.resolve(__dirname, '..', '..');
}

async function main() {
  const [, , hookId, relScriptPath] = process.argv;
  const raw = await readStdinRaw();

  if (!hookId || !relScriptPath) {
    process.stdout.write(raw);
    process.exit(0);
  }

  const disabledHooks = getDisabledHooks();
  if (disabledHooks.has(normalizeHookId(hookId))) {
    process.stdout.write(raw);
    process.exit(0);
  }

  const scriptsRoot = getScriptsRoot();
  const resolvedRoot = path.resolve(scriptsRoot);
  const scriptPath = path.resolve(scriptsRoot, relScriptPath);

  // Prevent path traversal outside the configured scripts root
  if (!scriptPath.startsWith(resolvedRoot + path.sep)) {
    process.stderr.write(`[Hook] Path traversal rejected for ${hookId}: ${scriptPath}\n`);
    process.stdout.write(raw);
    process.exit(0);
  }

  if (!fs.existsSync(scriptPath)) {
    process.stderr.write(`[Hook] Script not found for ${hookId}: ${scriptPath}\n`);
    process.stdout.write(raw);
    process.exit(0);
  }

  // Prefer direct require() when the hook exports a run(rawInput) function.
  // This eliminates one Node.js process spawn (~50-100ms savings per hook).
  //
  // SAFETY: Only require() hooks that export run(). Legacy hooks execute
  // side effects at module scope (stdin listeners, process.exit, main() calls)
  // which would interfere with the parent process or cause double execution.
  let hookModule;
  const src = fs.readFileSync(scriptPath, 'utf8');
  const hasRunExport = /\bmodule\.exports\b/.test(src) && /\brun\b/.test(src);

  if (hasRunExport) {
    try {
      hookModule = require(scriptPath);
    } catch (requireErr) {
      process.stderr.write(`[Hook] require() failed for ${hookId}: ${requireErr.message}\n`);
      // Fall through to legacy spawnSync path
    }
  }

  if (hookModule && typeof hookModule.run === 'function') {
    try {
      const output = hookModule.run(raw);
      if (output !== null && output !== undefined) process.stdout.write(output);
    } catch (runErr) {
      process.stderr.write(`[Hook] run() error for ${hookId}: ${runErr.message}\n`);
      process.stdout.write(raw);
    }
    process.exit(0);
  }

  // Legacy path: spawn a child Node process for hooks without run() export
  const result = spawnSync('node', [scriptPath], {
    input: raw,
    encoding: 'utf8',
    env: process.env,
    cwd: process.cwd(),
    timeout: 30000
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const code = Number.isInteger(result.status) ? result.status : 0;
  process.exit(code);
}

main().catch(err => {
  process.stderr.write(`[Hook] run-with-flags error: ${err.message}\n`);
  process.exit(0);
});
