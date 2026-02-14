type SyntaxTokenStyle =
  | "default"
  | "keyword"
  | "string"
  | "fn"
  | "comment"
  | "number"
  | "boolean"
  | "null"
  | "property"
  | "punctuation";

export interface SyntaxToken {
  text: string;
  style: SyntaxTokenStyle;
}

export interface SyntaxLine {
  tokens: SyntaxToken[];
}

export function getSyntaxTokenClass(style: SyntaxTokenStyle): string {
  if (style === "keyword") return "text-purple-400";
  if (style === "string") return "text-green-400";
  if (style === "fn") return "text-primary";
  if (style === "comment") return "text-muted-foreground/60 italic";
  if (style === "number") return "text-sky-300";
  if (style === "boolean" || style === "null") return "text-amber-300";
  if (style === "property") return "text-primary/90";
  if (style === "punctuation") return "text-foreground/45";
  return "text-foreground/80";
}

const JSON_TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*")(\s*:)?|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|(\{|\}|\[|\]|,)/g;

export function tokenizeJson(source: string): SyntaxLine[] {
  return source.split("\n").map((line) => {
    const tokens: SyntaxToken[] = [];
    let lastIndex = 0;

    for (const match of line.matchAll(JSON_TOKEN_PATTERN)) {
      const index = match.index ?? 0;
      if (index > lastIndex) {
        tokens.push({ text: line.slice(lastIndex, index), style: "default" });
      }

      const [full, quoted, keySuffix, numberValue, literalValue, punctuationValue] = match;

      if (quoted) {
        if (keySuffix) {
          tokens.push({ text: quoted, style: "property" });
          tokens.push({ text: keySuffix, style: "punctuation" });
        } else {
          tokens.push({ text: quoted, style: "string" });
        }
      } else if (numberValue) {
        tokens.push({ text: numberValue, style: "number" });
      } else if (literalValue) {
        tokens.push({
          text: literalValue,
          style: literalValue === "null" ? "null" : "boolean",
        });
      } else if (punctuationValue) {
        tokens.push({ text: punctuationValue, style: "punctuation" });
      } else {
        tokens.push({ text: full, style: "default" });
      }

      lastIndex = index + full.length;
    }

    if (lastIndex < line.length) {
      tokens.push({ text: line.slice(lastIndex), style: "default" });
    }

    return { tokens };
  });
}
