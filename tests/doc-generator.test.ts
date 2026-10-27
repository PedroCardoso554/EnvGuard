import { describe, expect, it } from 'vitest';
import {
  generateMarkdownTable,
  injectDocsIntoReadme,
} from '../src/core/doc-generator.js';
import { parseEnvContent } from '../src/core/parser.js';

describe('doc-generator.ts — generateMarkdownTable & injectDocsIntoReadme', () => {
  const sampleEnv = parseEnvContent(
    [
      'PORT=3000 # @type:number @required Porta HTTP do servidor',
      'ENABLE_CACHE=false # @type:boolean Habilita cache local',
    ].join('\n')
  );

  it('generates a clean Markdown table from .env.example', () => {
    const table = generateMarkdownTable(sampleEnv);
    expect(table).toContain('| `PORT` | `number` | ✅ Sim | `3000` | Porta HTTP do servidor |');
    expect(table).toContain('| `ENABLE_CACHE` | `boolean` | ❌ Não | `false` | Habilita cache local |');
  });

  it('updates existing markers both without spaces and with spaces after the colon', () => {
    const table = generateMarkdownTable(sampleEnv);

    // Without spaces: <!-- ENVGUARD:START -->
    const readmeNoSpace = `# Meu App\n\n<!-- ENVGUARD:START -->\nantigo\n<!-- ENVGUARD:END -->\n\nRodapé`;
    const res1 = injectDocsIntoReadme(readmeNoSpace, table);
    expect(res1.mode).toBe('updated_block');
    expect(res1.content).toContain('`PORT`');
    expect(res1.content).not.toContain('antigo');

    // With spaces after colon: <!-- ENVGUARD: START -->
    const readmeWithSpace = `# Meu App\n\n<!-- ENVGUARD: START -->\nantigo\n<!-- ENVGUARD: END -->\n\nRodapé`;
    const res2 = injectDocsIntoReadme(readmeWithSpace, table);
    expect(res2.mode).toBe('updated_block');
    expect(res2.content).toContain('<!-- ENVGUARD: START -->');
    expect(res2.content).toContain('`PORT`');
    expect(res2.content).not.toContain('antigo');
  });

  it('appends a new section when README.md exists but has no markers', () => {
    const table = generateMarkdownTable(sampleEnv);
    const existing = '# Projeto X\n\nDescrição inicial.';
    const res = injectDocsIntoReadme(existing, table);

    expect(res.mode).toBe('appended_section');
    expect(res.content).toContain('<!-- ENVGUARD:START -->');
    expect(res.content).toContain('`PORT`');
    expect(res.content).toContain('<!-- ENVGUARD:END -->');
  });
});
