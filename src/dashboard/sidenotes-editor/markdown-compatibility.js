const UNSUPPORTED_PATTERNS = [
  {
    code: "bear-template",
    label: "Bear template directive",
    pattern: /\{\{[\s\S]*?\}\}/,
  },
  {
    code: "html-comment",
    label: "HTML comment",
    pattern: /<!--[\s\S]*?-->/,
  },
  {
    code: "footnote",
    label: "footnote",
    pattern: /\[\^[^\]\n]+\](?::|\b)/,
  },
  {
    code: "tab-link",
    label: "tab: link",
    pattern: /\]\(\s*tab:/i,
  },
  {
    code: "latex",
    label: "LaTeX",
    pattern:
      /\$\$|(^|[^\\$])\$(?![\s$])[^$\n]+?\S\$(?!\$)|\\(?:begin|end)\s*\{|\\[\(\)\[\]]/m,
  },
  {
    code: "highlight",
    label: "highlight syntax",
    pattern: /(^|[^=])==(?=\S)[\s\S]*?\S==([^=]|$)/m,
  },
  {
    code: "subscript",
    label: "subscript syntax",
    pattern: /(?:^|[^\s~])~[^~\n]+~(?:[^\s~]|$)/m,
  },
  {
    code: "superscript",
    label: "superscript syntax",
    pattern: /(?:^|[^\s^])\^[^^\n]+\^(?:[^\s^]|$)/m,
  },
  {
    code: "table",
    label: "Markdown table",
    pattern:
      /^\s*\|?.+\|.+\n\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/m,
  },
  {
    code: "task-list",
    label: "task list",
    pattern: /^\s*[-+*]\s+\[[ xX]\]\s+/m,
  },
  {
    code: "admonition",
    label: "custom fenced block",
    pattern: /^\s*:::+(?:\s|\w)/m,
  },
];

function maskRanges(text, pattern) {
  return text.replace(pattern, (match) =>
    match.replace(/[^\n]/g, " "),
  );
}

function maskCode(markdown) {
  let masked = maskRanges(
    markdown,
    /^( {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm,
  );
  masked = maskRanges(masked, /(`+)(?!`)(?:\\.|[^`\n])*?\1/g);
  masked = maskRanges(
    masked,
    /<(?:https?:\/\/|mailto:)[^>\n]+>/gi,
  );
  return masked;
}

export function scanMarkdownCompatibility(markdown) {
  const masked = maskCode(markdown);
  const reasons = [];

  for (const item of UNSUPPORTED_PATTERNS) {
    if (item.pattern.test(masked)) {
      reasons.push({ code: item.code, label: item.label });
    }
  }

  if (/<\/?[A-Za-z][^>\n]*>/.test(masked)) {
    reasons.push({ code: "raw-html", label: "raw HTML" });
  }

  return {
    safe: reasons.length === 0,
    reasons,
  };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== null && child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalJson(child)]),
  );
}

export function checkMarkdownRoundTrip(editor, markdown) {
  try {
    const parsed = editor.markdown.parse(markdown);
    const serialized = editor.markdown.serialize(parsed);
    const reparsed = editor.markdown.parse(serialized);
    const stable =
      JSON.stringify(canonicalJson(parsed)) ===
      JSON.stringify(canonicalJson(reparsed));

    if (!stable) {
      return {
        safe: false,
        reasons: [
          {
            code: "round-trip",
            label: "Markdown round-trip mismatch",
          },
        ],
      };
    }

    return { safe: true, reasons: [], serialized };
  } catch (error) {
    return {
      safe: false,
      reasons: [
        {
          code: "parse-error",
          label: "Markdown parse error",
          detail: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

export function describeCompatibility(result) {
  if (result.safe) return "";
  const labels = [...new Set(result.reasons.map((reason) => reason.label))];
  return `本文包含 ${labels.join("、")}，Visual 模式暂时关闭。Markdown 源码不会被改写。`;
}
