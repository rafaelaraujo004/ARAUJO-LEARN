import * as React from 'react';

/**
 * Renderizador de Markdown pequeno e seguro.
 *
 * Gera elementos React — nunca `dangerouslySetInnerHTML`. Assim, mesmo que um
 * dia o conteúdo venha de outra fonte, não há caminho para injeção de HTML.
 *
 * Suporta o que o tutor realmente usa ao escrever uma aula: títulos, parágrafos,
 * listas, citação, tabela, bloco de código e ênfase/link no meio do texto.
 */

export function Markdown({ content, className }: { content: string; className?: string }) {
  return <div className={className}>{renderBlocks(content)}</div>;
}

function renderBlocks(source: string): React.ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    // Linha em branco
    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Bloco de código cercado
    if (line.trimStart().startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? '').trimStart().startsWith('```')) {
        code.push(lines[index] ?? '');
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-xl bg-brand-950 px-4 py-3 text-sm leading-relaxed text-brand-100"
        >
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Títulos
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      const text = heading[2] ?? '';
      const Tag = (level <= 2 ? 'h2' : level === 3 ? 'h3' : 'h4') as 'h2' | 'h3' | 'h4';
      blocks.push(<Tag key={key++}>{renderInline(text)}</Tag>);
      index += 1;
      continue;
    }

    // Citação
    if (line.trimStart().startsWith('>')) {
      const quote: string[] = [];
      while (index < lines.length && (lines[index] ?? '').trimStart().startsWith('>')) {
        quote.push((lines[index] ?? '').replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push(<blockquote key={key++}>{renderInline(quote.join(' '))}</blockquote>);
      continue;
    }

    // Tabela
    if (line.includes('|') && /^\s*\|?.*\|/.test(line) && isSeparator(lines[index + 1])) {
      const header = splitRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && (lines[index] ?? '').includes('|')) {
        rows.push(splitRow(lines[index] ?? ''));
        index += 1;
      }
      blocks.push(
        <div key={key++} className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {header.map((cell, cellIndex) => (
                  <th
                    key={cellIndex}
                    className="border-b border-ink-200 px-3 py-2 text-left font-semibold text-ink-900"
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-ink-100 px-3 py-2 align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Lista numerada
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? '')) {
        items.push((lines[index] ?? '').replace(/^\s*\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ol key={key++}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Lista com marcadores
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? '')) {
        items.push((lines[index] ?? '').replace(/^\s*[-*]\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ul key={key++}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Parágrafo: junta linhas até a próxima linha em branco.
    const paragraph: string[] = [];
    while (index < lines.length && (lines[index] ?? '').trim() && !isBlockStart(lines[index] ?? '')) {
      paragraph.push(lines[index] ?? '');
      index += 1;
    }
    if (paragraph.length > 0) {
      blocks.push(<p key={key++}>{renderInline(paragraph.join(' '))}</p>);
    } else {
      index += 1;
    }
  }

  return blocks;
}

function isBlockStart(line: string): boolean {
  return (
    /^#{1,4}\s/.test(line) ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    line.trimStart().startsWith('>') ||
    line.trimStart().startsWith('```')
  );
}

function isSeparator(line: string | undefined): boolean {
  return Boolean(line && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes('-'));
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** **negrito**, *itálico*, `código` e [link](url). */
function renderInline(text: string): React.ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern).filter((part) => part !== undefined && part !== '');

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const href = link[2] ?? '#';
      // Só protocolos seguros — nada de javascript: vindo do texto.
      const safe = /^(https?:|mailto:|\/)/i.test(href) ? href : '#';
      return (
        <a key={index} href={safe} target={safe.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
          {link[1]}
        </a>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
