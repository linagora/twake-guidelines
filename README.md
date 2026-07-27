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

Claude will auto-trigger the relevant skill based on what you are working on (a React file triggers `twake-react-conventions`, a commit triggers `twake-git-conventions`, and so on). No manual activation needed.

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
    "https://raw.githubusercontent.com/linagora/twake-guidelines/main/skills/twake-twake-react-conventions/SKILL.md",
    "https://raw.githubusercontent.com/linagora/twake-guidelines/main/skills/twake-twake-frontend-testing/SKILL.md",
    "https://raw.githubusercontent.com/linagora/twake-guidelines/main/skills/twake-twake-git-conventions/SKILL.md"
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
| `twake-react-conventions` | React / JS frontend | Functional components, named exports, twake-mui first then cozy-ui, no inline styles |
| `twake-javascript-conventions` | JS / TS | async/await, null over undefined, Intl/date-fns (not moment), AppLinker |
| `twake-javascript-naming` | JS / TS | Function prefixes, cozy-client query `as`, import order |
| `twake-frontend-testing` | Frontend tests | testing-library, data-testid, queryBy, colocated specs, no snapshots |
| `twake-frontend-lib-workflow` | React apps consuming cozy-* / twake-* libs | No hand-edits to `node_modules`, yarn link / rlink via cozy-libs monorepo |
| `twake-cozy-client` | Apps querying a Cozy stack | No direct collection access, Q() + useQuery/client.query, shared queries module, alias naming, mandatory fetchPolicy, sortBy/indexFields invariants |
| `twake-git-conventions` | All stacks | Conventional Commits, atomic commits, structured PR workflow with Summary-only bodies |
| `twake-start` | All stacks | Sync the detected default branch (main or master), pull, cut a feat/fix/chore branch before writing code |
| `twake-cozy-dev-env` | Cozy-web local dev | Boot cozy-stack + CouchDB + SSO via twake-workplace-docker, serve the locally-watched app, provision via SCIM, seed via ACH |
| `twake-package-manager-audit` | Any npm / yarn / pnpm project | Detect the package manager, clear audit vulns by upgrading real deps only (no overrides/resolutions), defer the rest, one PR per project |
| `twake-create-app` | New Cozy-web app | Decide pure cozy app vs coquille (external backend) by where the backend lives, scaffold from cozy-app-template, wire mandatory Sentry (DSN + release), set up registry publish CI (cozy-app-publish, REGISTRY_TOKEN, tag-driven channels), watch prod CSP |

### Planned

- `frontend-dependencies` — library dependency rules (peerDependencies, no Material-UI)
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

## Commands

OpenCode commands — reusable agent prompts that can be invoked from the CLI. Copy the `commands/` folder into your project or reference individual files via `opencode.json`:

```json
{
  "commands": [
    "https://raw.githubusercontent.com/linagora/twake-guidelines/main/commands/locales.md"
  ]
}
```

## Commands

OpenCode commands — reusable agent prompts that can be invoked from the CLI. Copy the `commands/` folder into your project or reference individual files via `opencode.json`:

```json
{
  "commands": [
    "https://raw.githubusercontent.com/linagora/twake-guidelines/main/commands/locales.md"
  ]
}
```

## Layout

```
twake-guidelines/
├── .claude-plugin/
│   ├── plugin.json             # Claude Code plugin manifest
│   └── marketplace.json        # Claude Code marketplace manifest
├── commands/                   # OpenCode commands — reusable agent prompts
│   └── locales.md              # Propagate EN locale changes to other languages
├── skills/                     # Source of truth — per-skill files
│   ├── twake-react-conventions/SKILL.md
│   ├── twake-javascript-conventions/SKILL.md
│   ├── twake-javascript-naming/SKILL.md
│   ├── twake-frontend-testing/SKILL.md
│   ├── twake-frontend-lib-workflow/SKILL.md
│   ├── twake-cozy-client/SKILL.md
│   └── twake-git-conventions/SKILL.md
├── AGENTS.md                   # Generated aggregate for OpenCode / other AGENTS.md consumers
├── scripts/
│   └── gen-agents.sh           # Regenerates AGENTS.md from skills/
├── README.md
└── LICENSE
```
twake-guidelines/
├── .claude-plugin/
│   ├── plugin.json             # Claude Code plugin manifest
│   └── marketplace.json        # Claude Code marketplace manifest
├── commands/                   # OpenCode commands — reusable agent prompts
│   └── locales.md              # Propagate EN locale changes to other languages
├── skills/                     # Source of truth — per-skill files
│   ├── twake-react-conventions/SKILL.md
│   ├── twake-javascript-conventions/SKILL.md
│   ├── twake-javascript-naming/SKILL.md
│   ├── twake-frontend-testing/SKILL.md
│   ├── twake-frontend-lib-workflow/SKILL.md
│   ├── twake-cozy-client/SKILL.md
│   └── twake-git-conventions/SKILL.md
├── AGENTS.md                   # Generated aggregate for OpenCode / other AGENTS.md consumers
├── scripts/
│   └── gen-agents.sh           # Regenerates AGENTS.md from skills/
├── README.md
└── LICENSE
```

## License

MIT — see [LICENSE](./LICENSE).
