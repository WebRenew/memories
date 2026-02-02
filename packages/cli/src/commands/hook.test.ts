import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";

const HOOK_MARKER_START = "# >>> memories.sh hook >>>";
const HOOK_MARKER_END = "# <<< memories.sh hook <<<";

describe("hook marker detection", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "memories-hook-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should detect hook markers in existing file", () => {
    const hookFile = join(tmpDir, "pre-commit");
    writeFileSync(
      hookFile,
      `#!/bin/sh\n\n${HOOK_MARKER_START}\nmemories generate all\n${HOOK_MARKER_END}\n`,
    );
    const content = readFileSync(hookFile, "utf-8");
    expect(content.includes(HOOK_MARKER_START)).toBe(true);
    expect(content.includes(HOOK_MARKER_END)).toBe(true);
  });

  it("should not detect markers in clean hook file", () => {
    const hookFile = join(tmpDir, "pre-commit");
    writeFileSync(hookFile, "#!/bin/sh\nnpm test\n");
    const content = readFileSync(hookFile, "utf-8");
    expect(content.includes(HOOK_MARKER_START)).toBe(false);
  });

  it("should remove hook section cleanly", () => {
    const hookFile = join(tmpDir, "pre-commit");
    const original = `#!/bin/sh\nnpm test\n\n${HOOK_MARKER_START}\nmemories generate all\n${HOOK_MARKER_END}\n\nnpm lint\n`;
    writeFileSync(hookFile, original);

    const content = readFileSync(hookFile, "utf-8");
    const regex = new RegExp(
      `\\n?${escapeRegex(HOOK_MARKER_START)}[\\s\\S]*?${escapeRegex(HOOK_MARKER_END)}\\n?`,
    );
    const cleaned = content.replace(regex, "\n");

    expect(cleaned).not.toContain(HOOK_MARKER_START);
    expect(cleaned).toContain("npm test");
    expect(cleaned).toContain("npm lint");
  });

  it("should detect hook-only file after removal", () => {
    const hookFile = join(tmpDir, "pre-commit");
    writeFileSync(
      hookFile,
      `#!/bin/sh\n${HOOK_MARKER_START}\nmemories generate all\n${HOOK_MARKER_END}\n`,
    );

    const content = readFileSync(hookFile, "utf-8");
    const regex = new RegExp(
      `\\n?${escapeRegex(HOOK_MARKER_START)}[\\s\\S]*?${escapeRegex(HOOK_MARKER_END)}\\n?`,
    );
    const cleaned = content.replace(regex, "\n");
    expect(cleaned.trim()).toBe("#!/bin/sh");
  });
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
