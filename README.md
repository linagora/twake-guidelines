# Twake Guidelines

Linagora Twake / Cozy coding guidelines, packaged for AI coding agents.
Install once per project and your agent automatically follows Twake conventions.

Works with:

- [**Claude Code**](https://docs.claude.com/en/docs/claude-code/overview) — via the native plugin system, with per-skill auto-triggering.
- [**OpenCode**](https://opencode.ai) — via the standard `AGENTS.md` / `opencode.json` mechanism.

Other agents that honor `AGENTS.md` (Codex CLI and similar) can also point at the `AGENTS.md` file at the root of this repo.

## Install

### Claude Code

Inside any Twake / Linagora project, from the Claude Code prompt:

```
/plugin marketplace add linagora/twake-guidelines
/plugin install twake-guidelines@twake-guidelines
/plugin list
```

Claude will auto-trigger the relevant skill based on what you are working on (a React file triggers `react-conventions`, a commit triggers `git-conventions`, and so on). No manual activation needed.

**Update / uninstall:**

```
/plugin update twake-guidelines@twake-guidelines
/plugin uninstall twake-guidelines@twake-guidelines
```

### OpenCode

Add an `opencode.json` to your project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "https://raw.githubusercontent.com/linagora/twake-guidelines/main/AGENTS.md"
  ]
}
```

OpenCode will fetch the aggregated rules file on every session and apply it to all requests.

**Prefer selective loading?** Replace the one URL with the specific skill files you want:

```json
{
  "instructions": [
    "https://raw.githubusercontent.com/linagora/twake-guidelines/main/skills/react-conventions/SKILL.md",
    "https://raw.githubusercontent.com/linagora/twake-guidelines/main/skills/frontend-testing/SKILL.md",
    "https://raw.githubusercontent.com/linagora/twake-guidelines/main/skills/git-conventions/SKILL.md"
  ]
}
```

**Global install** (applies to every OpenCode session, not just this project): copy the aggregate file once:

```bash
mkdir -p ~/.config/opencode
curl -fsSL https://raw.githubusercontent.com/linagora/twake-guidelines/main/AGENTS.md \
  > ~/.config/opencode/AGENTS.md
```

### Other agents

Any agent that reads `AGENTS.md` at the repo root can pick up the aggregated rules. Either commit a copy to your project (`curl ... > AGENTS.md`) or use a git submodule:

```bash
git submodule add https://github.com/linagora/twake-guidelines.git .twake-guidelines
ln -s .twake-guidelines/AGENTS.md AGENTS.md
```

## What's included

| Skill | Applies to | Summary |
|---|---|---|
| `react-conventions` | React / JS frontend | Functional components, named exports, twake-mui first then cozy-ui, no inline styles |
| `javascript-conventions` | JS / TS | async/await, null over undefined, Intl/date-fns (not moment), AppLinker |
| `javascript-naming` | JS / TS | Function prefixes, cozy-client query `as`, import order |
| `frontend-testing` | Frontend tests | testing-library, data-testid, queryBy, colocated specs, no snapshots |
| `git-conventions` | All stacks | Conventional Commits, per-dep-upgrade commits, PR checklist |

### Planned

- `frontend-dependencies` — library dependency rules (peerDependencies, no Material-UI)
- `cozy-client-patterns` — query conventions, doctype naming
- `java-conventions` — Spring / Quarkus patterns
- `go-conventions` — project layout, error handling
- `ci-deployment` — Travis / GitHub Actions, feature flags

## Contributing

Each skill lives in `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`). The `description` field decides when Claude Code auto-triggers the skill — be specific about the trigger context.

**After editing any skill, regenerate `AGENTS.md`:**

```bash
./scripts/gen-agents.sh
```

The script concatenates every `skills/*/SKILL.md` into `AGENTS.md`, stripping YAML frontmatter and demoting headings by one level. It has no dependencies (pure Bash + `awk`). Commit the regenerated `AGENTS.md` alongside the skill change.

Do not hand-edit `AGENTS.md` — changes there will be overwritten on the next regeneration.

## Layout

```
twake-guidelines/
├── .claude-plugin/
│   ├── plugin.json             # Claude Code plugin manifest
│   └── marketplace.json        # Claude Code marketplace manifest
├── skills/                     # Source of truth — per-skill files
│   ├── react-conventions/SKILL.md
│   ├── javascript-conventions/SKILL.md
│   ├── javascript-naming/SKILL.md
│   ├── frontend-testing/SKILL.md
│   └── git-conventions/SKILL.md
├── AGENTS.md                   # Generated aggregate for OpenCode / other AGENTS.md consumers
├── scripts/
│   └── gen-agents.sh           # Regenerates AGENTS.md from skills/
├── README.md
└── LICENSE
```

## License

MIT — see [LICENSE](./LICENSE).
