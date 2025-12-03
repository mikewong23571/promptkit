# execplan-installer

A tiny Python CLI that drops the required ExecPlan scaffolding into a repository. It writes/updates `AGENTS.md` with the ExecPlans rule and creates `.agent/PLANS.md` containing the full Codex ExecPlan specification.

## Install locally

```
pip install .
```

Or use pipx to keep it isolated:

```
pipx install .
```

## Usage

Run from any repository root (defaults to current directory):

```
execplan-install
```

Options:

- `-p, --path PATH`  Target repo root (default: `.`).
- `-f, --force`      Overwrite an existing `.agent/PLANS.md`.

The command is idempotent: it appends the ExecPlans section to `AGENTS.md` only if missing, and it will not overwrite `.agent/PLANS.md` unless `--force` is provided.

## What it writes

- `AGENTS.md` gets the section:
  
  ````md
  # ExecPlans
  
  When writing complex features or significant refactors, use an ExecPlan (as described in .agent/PLANS.md) from design to implementation.
  ````

- `.agent/PLANS.md` is populated with the full ExecPlan specification so a novice contributor can read it and create living plans immediately.

