import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '@/components/lesson/markdown';
import {
  clamp,
  formatDuration,
  formatTimecode,
  pluralize,
  slugify,
} from '@/lib/utils';

const html = (content: string) => renderToStaticMarkup(<Markdown content={content} />);

describe('Markdown das aulas', () => {
  it('nunca deixa HTML do texto virar HTML da página', () => {
    const out = html('<script>alert(1)</script> e <img src=x onerror=alert(1)>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;');
  });

  it('bloqueia links com protocolo perigoso', () => {
    const out = html('[clique](javascript:alert(1)) e [outro](data:text/html;base64,AAAA)');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('data:text/html');
    expect(out).toContain('href="#"');
  });

  it('mantém links seguros e abre externos em nova aba com rel', () => {
    const out = html('[site](https://exemplo.com) e [interno](/cursos)');
    expect(out).toContain('href="https://exemplo.com"');
    expect(out).toContain('rel="noreferrer"');
    expect(out).toContain('href="/cursos"');
  });

  it('renderiza títulos, listas, citação, código e tabela', () => {
    const out = html(
      [
        '## Título',
        '',
        '- um',
        '- dois',
        '',
        '1. primeiro',
        '2. segundo',
        '',
        '> citação',
        '',
        '```',
        'a < b',
        '```',
        '',
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
      ].join('\n'),
    );
    expect(out).toContain('<h2>Título</h2>');
    expect(out).toContain('<ul>');
    expect(out).toContain('<ol>');
    expect(out).toContain('<blockquote>');
    expect(out).toContain('a &lt; b');
    expect(out).toContain('<table');
    expect(out).toContain('<th');
  });

  it('negrito, itálico e código em linha', () => {
    const out = html('**forte**, *ênfase* e `código`');
    expect(out).toContain('<strong>forte</strong>');
    expect(out).toContain('<em>ênfase</em>');
    expect(out).toContain('<code>código</code>');
  });

  it('texto vazio não quebra', () => {
    expect(html('')).toBe('<div></div>');
  });
});

describe('utilitários de formato', () => {
  it('slugify tira acentos e símbolos', () => {
    expect(slugify('Leitura e Interpretação de Projetos!')).toBe('leitura-e-interpretacao-de-projetos');
    expect(slugify('  --Orçamento  Preliminar--  ')).toBe('orcamento-preliminar');
    expect(slugify('***')).toBe('');
  });

  it('formatDuration', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(240)).toBe('4min');
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(3725)).toBe('1h 02min');
    expect(formatDuration(-5)).toBe('0s');
  });

  it('formatTimecode (formato do player)', () => {
    expect(formatTimecode(0)).toBe('0:00');
    expect(formatTimecode(65)).toBe('1:05');
    expect(formatTimecode(3725)).toBe('1:02:05');
    expect(formatTimecode(Number.NaN)).toBe('0:00');
    expect(formatTimecode(-1)).toBe('0:00');
  });

  it('pluralize e clamp', () => {
    expect(pluralize(1, 'aula', 'aulas')).toBe('1 aula');
    expect(pluralize(0, 'aula', 'aulas')).toBe('0 aulas');
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-3, 0, 100)).toBe(0);
  });
});
