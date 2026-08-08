export type ArticleBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "image"; alt: string; src: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function tableCells(line: string) {
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function safeImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return value.startsWith("/");
  }
}

function listOrder(
  list: Extract<ArticleBlock, { type: "list" }> | null,
): boolean | undefined {
  return list?.ordered;
}

export function parseArticleBlocks(content: string): ArticleBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ArticleBlock[] = [];
  let paragraph: string[] = [];
  let list: Extract<ArticleBlock, { type: "list" }> | null = null;

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };
  const flushList = () => {
    if (list?.items.length) blocks.push(list);
    list = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line);
    if (image?.[2] && safeImageUrl(image[2])) {
      flushParagraph();
      flushList();
      blocks.push({ type: "image", alt: image[1] ?? "", src: image[2] });
      continue;
    }

    const nextLine = lines[index + 1]?.trim() ?? "";
    if (line.startsWith("|") && /^\|?\s*:?-{3,}/.test(nextLine)) {
      flushParagraph();
      flushList();
      const headers = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (
        index < lines.length &&
        (lines[index]?.trim().startsWith("|") ?? false)
      ) {
        rows.push(tableCells(lines[index]?.trim() ?? ""));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1]?.length === 3 ? 3 : 2,
        text: heading[2] ?? "",
      });
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    const item = unordered?.[1] ?? ordered?.[1];
    if (item) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (listOrder(list) !== isOrdered) flushList();
      list ??= { type: "list", ordered: isOrdered, items: [] };
      list.items.push(item);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}
