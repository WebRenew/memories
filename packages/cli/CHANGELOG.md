# @memories.sh/cli

## 0.7.0

### Minor Changes

- Improve default skill ingestion coverage for agent setups.

  - `memories setup` now imports existing project skills into memories by default.
  - Added `--skip-skill-ingest` to opt out during setup.
  - `memories ingest skills` now scans the full set of project skill directories, including `.codex/skills` and other supported tool locations.
