import argparse
import sys
from pathlib import Path

from .templates import AGENTS_SNIPPET, PLANS_MD


def ensure_agents_md(repo_root: Path) -> str:
    """Create or append the ExecPlans section in AGENTS.md.

    Returns a status string: created | appended | unchanged.
    """
    path = repo_root / "AGENTS.md"
    snippet = AGENTS_SNIPPET.strip() + "\n"

    if not path.exists():
        path.write_text(snippet, encoding="utf-8")
        return "created"

    content = path.read_text(encoding="utf-8")
    if snippet.strip() in content:
        return "unchanged"

    new_content = content.rstrip()
    if new_content:
        new_content += "\n\n"
    new_content += snippet
    path.write_text(new_content + "\n", encoding="utf-8")
    return "appended"


def ensure_plans_md(repo_root: Path, force: bool) -> str:
    """Create .agent/PLANS.md with the ExecPlan specification.

    Returns a status string: created | overwritten | unchanged.
    """
    agent_dir = repo_root / ".agent"
    agent_dir.mkdir(parents=True, exist_ok=True)

    path = agent_dir / "PLANS.md"
    already_present = path.exists()
    if already_present and not force:
        return "unchanged"

    path.write_text(PLANS_MD.strip() + "\n", encoding="utf-8")
    if already_present and force:
        return "overwritten"
    return "created"


def install(repo_root: Path, force: bool) -> None:
    agents_status = ensure_agents_md(repo_root)
    plans_status = ensure_plans_md(repo_root, force=force)

    print(f"AGENTS.md: {agents_status}")
    print(f".agent/PLANS.md: {plans_status}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Install ExecPlan scaffolding (AGENTS.md + .agent/PLANS.md) into a repository"
    )
    parser.add_argument(
        "-p",
        "--path",
        default=".",
        help="Target repository root (default: current directory)",
    )
    parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="Overwrite existing .agent/PLANS.md if present",
    )

    args = parser.parse_args(argv)
    repo_root = Path(args.path).expanduser().resolve()

    if not repo_root.exists():
        print(f"Error: path does not exist: {repo_root}", file=sys.stderr)
        return 1
    if not repo_root.is_dir():
        print(f"Error: path is not a directory: {repo_root}", file=sys.stderr)
        return 1

    install(repo_root, force=args.force)
    return 0


if __name__ == "__main__":
    sys.exit(main())
