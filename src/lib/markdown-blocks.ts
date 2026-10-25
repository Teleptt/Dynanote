export type BlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'paragraph'
  | 'math_display'
  | 'code'
  | 'simulation_embed'
  | 'list_item'
  | 'quote';

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  language?: string;
}

/**
 * Parses markdown text into discrete typed blocks for live WYSIWYG editing.
 * Accurately parses display math ($$ ... $$), code blocks, headings, lists, and paragraphs.
 */
export function parseMarkdownToBlocks(markdown: string): EditorBlock[] {
  if (!markdown || !markdown.trim()) {
    return [
      { id: `block-${Date.now()}-0`, type: 'paragraph', content: '' }
    ];
  }

  const blocks: EditorBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  let blockIndex = 0;

  const nextId = () => `b-${Date.now()}-${blockIndex++}`;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Display Math Block: $$ ... $$
    if (line.trim().startsWith('$$')) {
      const mathLines: string[] = [];
      const trimmed = line.trim();

      // Check if it opens and closes on the same line: $$math$$
      if (trimmed.length > 2 && trimmed.endsWith('$$') && trimmed !== '$$') {
        const mathContent = trimmed.substring(2, trimmed.length - 2).trim();
        blocks.push({ id: nextId(), type: 'math_display', content: mathContent });
        i++;
        continue;
      }

      // Multi-line math block
      const startMath = trimmed.substring(2).trim();
      if (startMath) mathLines.push(startMath);
      i++;

      while (i < lines.length && !lines[i].trim().endsWith('$$')) {
        mathLines.push(lines[i]);
        i++;
      }

      if (i < lines.length) {
        const endLine = lines[i].trim();
        const endMath = endLine.substring(0, endLine.length - 2).trim();
        if (endMath) mathLines.push(endMath);
        i++;
      }

      blocks.push({
        id: nextId(),
        type: 'math_display',
        content: mathLines.join('\n').trim()
      });
      continue;
    }

    // 2. Fenced Code Block: ```lang ... ```
    if (line.trim().startsWith('```')) {
      const lang = line.trim().substring(3).trim();
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```

      const codeContent = codeLines.join('\n');

      if (lang === 'dynanote-visual' || lang === 'simulation') {
        blocks.push({
          id: nextId(),
          type: 'simulation_embed',
          content: codeContent.trim(),
          language: lang
        });
        continue;
      }

      blocks.push({
        id: nextId(),
        type: 'code',
        content: codeContent,
        language: lang || 'plaintext'
      });
      continue;
    }

    // 3. Headings: #, ##, ###
    if (line.startsWith('# ')) {
      blocks.push({ id: nextId(), type: 'h1', content: line.substring(2).trim() });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ id: nextId(), type: 'h2', content: line.substring(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ id: nextId(), type: 'h3', content: line.substring(4).trim() });
      i++;
      continue;
    }

    // 4. Bullet list: - or *
    if (line.match(/^[-*]\s+/)) {
      blocks.push({ id: nextId(), type: 'list_item', content: line.replace(/^[-*]\s+/, '').trim() });
      i++;
      continue;
    }

    // 5. Blockquote: >
    if (line.startsWith('>')) {
      blocks.push({ id: nextId(), type: 'quote', content: line.substring(1).trim() });
      i++;
      continue;
    }

    // 6. Empty line: skip or absorb
    if (!line.trim()) {
      i++;
      continue;
    }

    // 7. Regular paragraph (can span consecutive non-empty lines until next block element)
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].trim().startsWith('$$') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].match(/^[-*]\s+/) &&
      !lines[i].startsWith('>')
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    blocks.push({
      id: nextId(),
      type: 'paragraph',
      content: paraLines.join('\n')
    });
  }

  return blocks.length > 0 ? blocks : [{ id: nextId(), type: 'paragraph', content: '' }];
}

/**
 * Serializes typed blocks back into standard Markdown text
 */
export function serializeBlocksToMarkdown(blocks: EditorBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'h1':
          return `# ${b.content.trim()}`;
        case 'h2':
          return `## ${b.content.trim()}`;
        case 'h3':
          return `### ${b.content.trim()}`;
        case 'math_display':
          return `$$\n${b.content.trim()}\n$$`;
        case 'code':
          return `\`\`\`${b.language || ''}\n${b.content}\n\`\`\``;
        case 'list_item':
          return `- ${b.content.trim()}`;
        case 'quote':
          return `> ${b.content.trim()}`;
        case 'simulation_embed':
          return `\`\`\`dynanote-visual\n${b.content.trim()}\n\`\`\``;
        case 'paragraph':
        default:
          return b.content.trim();
      }
    })
    .filter((chunk) => chunk.length > 0)
    .join('\n\n');
}

/**
 * Inserts a simulation embed block into Markdown text.
 * If targetSnippet is provided and found, places the block immediately after its line;
 * otherwise appends it cleanly to the document.
 */
export function insertSimulationBlockAfter(
  markdown: string,
  spec: any,
  targetSnippet?: string
): string {
  const jsonContent = typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2);
  const visualBlock = `\`\`\`dynanote-visual\n${jsonContent.trim()}\n\`\`\``;

  if (!targetSnippet || !markdown.includes(targetSnippet)) {
    return `${markdown.trim()}\n\n${visualBlock}\n`;
  }

  const snippetIdx = markdown.indexOf(targetSnippet);
  const afterSnippetIdx = snippetIdx + targetSnippet.length;

  // Find the end of line/block
  const nextNewline = markdown.indexOf('\n', afterSnippetIdx);
  if (nextNewline === -1) {
    return `${markdown.trim()}\n\n${visualBlock}\n`;
  }

  // If there is an immediate second newline (paragraph gap), insert after it
  const insertionPoint =
    markdown[nextNewline + 1] === '\n' ? nextNewline + 2 : nextNewline + 1;

  return (
    markdown.substring(0, insertionPoint).trimEnd() +
    '\n\n' +
    visualBlock +
    '\n\n' +
    markdown.substring(insertionPoint).trimStart()
  );
}
