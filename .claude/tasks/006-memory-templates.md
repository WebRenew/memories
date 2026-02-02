# Task: Add Memory Templates

## Priority: Agent Improvement

## Description
Create pre-built memory templates for common patterns. Users can add structured memories with `memories add --template <name>` instead of writing free-form text.

## Why It Matters
- Ensures consistent memory format across team
- Faster to add well-structured memories
- AI agents get more predictable, parseable context

## Implementation Steps

- [ ] Create `src/lib/templates.ts` with built-in templates
- [ ] Built-in templates:
  - `error-fix`: Bug description, root cause, solution
  - `decision`: What, why, alternatives considered
  - `api-endpoint`: Method, path, params, response
  - `dependency`: Name, version, why we use it
  - `pattern`: Name, when to use, example
- [ ] Store custom templates in config
- [ ] Add `memories template list` - show available templates
- [ ] Add `memories template show <name>` - show template structure
- [ ] Add `memories template create <name>` - create custom template
- [ ] Update `memories add` to support `--template <name>`
- [ ] Interactive prompts to fill template fields

## Example Usage

```bash
# Use built-in template
memories add --template decision
# Prompts: What decision? Why? Alternatives?

# List templates
memories template list

# Create custom template
memories template create api-change
```

## Template Format

```yaml
name: decision
type: decision
fields:
  - name: what
    prompt: "What did you decide?"
    required: true
  - name: why
    prompt: "Why this choice?"
    required: true
  - name: alternatives
    prompt: "What alternatives were considered?"
    required: false
format: |
  Decision: {{what}}
  Rationale: {{why}}
  {{#if alternatives}}Alternatives: {{alternatives}}{{/if}}
```

## Acceptance Criteria

- [ ] `memories add --template decision` works interactively
- [ ] `memories template list` shows all templates
- [ ] Custom templates can be created and used
- [ ] Templates produce consistent, structured output
