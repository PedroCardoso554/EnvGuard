import fs from 'node:fs/promises';
import path from 'node:path';
import {
  generateMarkdownTable,
  injectDocsIntoReadme,
} from '../core/doc-generator.js';
import { parseEnvContent } from '../core/parser.js';
import { colors, symbols } from '../utils/logger.js';

export interface DocsCommandOptions {
  examplePath?: string;
  readmePath?: string;
  stdout?: boolean;
  cwd?: string;
}

export async function runDocsCommand(options: DocsCommandOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const exampleRel = options.examplePath ?? '.env.example';
  const readmeRel = options.readmePath ?? 'README.md';

  const exampleFullPath = path.resolve(cwd, exampleRel);
  const readmeFullPath = path.resolve(cwd, readmeRel);

  let exampleContent: string;
  try {
    exampleContent = await fs.readFile(exampleFullPath, 'utf-8');
  } catch {
    console.error(
      `${symbols.error} ${colors.red(`Arquivo de exemplo não encontrado: ${exampleRel}`)}`
    );
    return 1;
  }

  const parsedExample = parseEnvContent(exampleContent);
  const tableMarkdown = generateMarkdownTable(parsedExample);

  if (options.stdout) {
    console.log(tableMarkdown);
    return 0;
  }

  let existingReadme: string | null = null;
  try {
    existingReadme = await fs.readFile(readmeFullPath, 'utf-8');
  } catch {
    existingReadme = null;
  }

  const updateResult = injectDocsIntoReadme(existingReadme, tableMarkdown);
  await fs.writeFile(readmeFullPath, updateResult.content, 'utf-8');

  const actionMessage =
    updateResult.mode === 'updated_block'
      ? `Tabela atualizada entre os marcadores ENVGUARD em ${readmeRel}`
      : updateResult.mode === 'appended_section'
      ? `Seção de variáveis de ambiente adicionada ao final de ${readmeRel}`
      : `Arquivo ${readmeRel} criado com a tabela de variáveis de ambiente`;

  console.log(
    `${symbols.success} ${colors.green(colors.bold(actionMessage))} ${colors.gray(
      `(${parsedExample.entries.length} variáveis documentadas)`
    )}.`
  );
  return 0;
}
