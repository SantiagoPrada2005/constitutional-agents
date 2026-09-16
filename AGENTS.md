# Workspace Rules for AI Agents

## Mandatory Package Manager & Dependency Standards

1. **Exclusive Package Manager (`pnpm`)**:
   - ALL AI agents operating in this workspace MUST strictly and exclusively use `pnpm` as the package manager.
   - NEVER use `npm`, `yarn`, or `bun` under any circumstance.
   - All installations, additions, updates, and script executions must use `pnpm` (e.g., `pnpm add`, `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm exec`).

2. **Latest Versions Mandatory**:
   - When adding or upgrading dependencies, agents MUST install the latest available versions (`@latest`) unless explicitly constrained by peer dependency incompatibilities.
   - Always ensure lockfile consistency with `pnpm-lock.yaml`.
