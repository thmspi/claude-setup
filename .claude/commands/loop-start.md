# Loop Start Command

Start a managed autonomous loop pattern with safety defaults.

## Usage

`/loop-start [pattern] [--mode safe|fast]`

- `pattern`: `sequential`, `continuous-pr`, `rfc-dag`, `infinite`
- `--mode`:
  - `safe` (default): strict quality gates and checkpoints
  - `fast`: reduced gates for speed

## Flow

1. Confirm repository state and branch strategy.
2. Select loop pattern and model tier strategy.
3. Enable required hooks/profile for the chosen mode.
4. Run `/plan` first to define phases, risks, and checkpoints for the loop.
5. Save the approved plan as a runbook under `.claude/plans/` (for example: `.claude/plans/<pattern>-loop-plan.md`).
5. Print commands to start and monitor the loop.

## Required Safety Checks

- Verify tests pass before first loop iteration.
- Ensure required hooks are enabled for your selected mode.
- Ensure loop has explicit stop condition.

## Plan-First Example

```bash
# 1) Create and approve a loop plan
/plan Design a safe continuous-pr loop for bug fixes in this repo

# 2) Save approved plan notes under .claude/plans/
#    e.g. .claude/plans/continuous-pr-loop-plan.md

# 3) Start the loop using that approved plan
/loop-start continuous-pr --mode safe
```

## Arguments

$ARGUMENTS:
- `<pattern>` optional (`sequential|continuous-pr|rfc-dag|infinite`)
- `--mode safe|fast` optional
