# Twake Guidelines

Linagora Twake coding guidelines, packaged as a [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) plugin. Install once, and your AI assistant automatically follows Twake conventions across every repo.

## Install

### Prerequisites

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) installed (`npm install -g @anthropic-ai/claude-code` or the installer for your platform).

### 1. Add the marketplace

Inside any Twake / Linagora project, from the Claude Code prompt:

```
/plugin marketplace add linagora/twake-guidelines
```

This registers this GitHub repository as a Claude Code marketplace.

### 2. Install the plugin

```
/plugin install twake-guidelines@twake-guidelines
```

(The `@twake-guidelines` suffix is the marketplace name — same as the plugin name here.)

### 3. Verify

```
/plugin list
```

You should see `twake-guidelines` in the list. The skills under `skills/` are now auto-discoverable. Claude will trigger them automatically based on what you are working on — a React file triggers `react-conventions`, a Git commit triggers `git-conventions`, and so on. No manual activation needed.

### Update

```
/plugin update twake-guidelines@twake-guidelines
```

### Uninstall

```
/plugin uninstall twake-guidelines@twake-guidelines
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
- `ci-deployment` — Travis/GitHub Actions, feature flags

## Contributing

To add a new skill:

1. Create `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`).
2. The `description` field decides when Claude auto-triggers the skill — be specific about the trigger context.
3. Open a PR.

## Layout

```
twake-guidelines/
├── .claude-plugin/
│   ├── plugin.json         # plugin metadata
│   └── marketplace.json    # marketplace manifest (one plugin)
├── skills/
│   ├── react-conventions/SKILL.md
│   ├── javascript-conventions/SKILL.md
│   ├── javascript-naming/SKILL.md
│   ├── frontend-testing/SKILL.md
│   └── git-conventions/SKILL.md
└── README.md
```

## License

AGPL-3.0
