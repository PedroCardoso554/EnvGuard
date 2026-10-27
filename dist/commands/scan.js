import fs from 'node:fs/promises';
import path from 'node:path';
import { parseEnvContent } from '../core/parser.js';
import { scanEnvFileForSecrets } from '../core/scanner.js';
import { colors, formatLocation, symbols } from '../utils/logger.js';
export async function runScanCommand(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const exampleRel = options.examplePath ?? '.env.example';
    const exampleFullPath = path.resolve(cwd, exampleRel);
    let content;
    try {
        content = await fs.readFile(exampleFullPath, 'utf-8');
    }
    catch {
        console.error(`${symbols.error} ${colors.red(`Arquivo para auditoria não encontrado: ${exampleRel}`)}`);
        return 1;
    }
    const parsed = parseEnvContent(content);
    const result = scanEnvFileForSecrets(parsed, exampleRel);
    console.log(`${colors.bold('EnvGuard Secret Scanner')} ${colors.gray(`(${exampleRel})`)}`);
    console.log('');
    if (!result.passed) {
        console.error(colors.red(colors.bold(`Possíveis segredos expostos detectados (${result.findings.length}):`)));
        for (const finding of result.findings) {
            console.error(`  ${symbols.error} ${formatLocation(finding.file, finding.line)} ${colors.bold(finding.key)} ${colors.magenta(`[${finding.ruleName}]`)} ${colors.gray(`(valor: ${finding.maskedValue})`)}`);
            console.error(`    ${colors.red(finding.message)}`);
        }
        console.error('');
        console.error(`${symbols.error} ${colors.red(colors.bold(`Auditoria falhou! Remova os segredos reais de ${exampleRel} antes de fazer commit.`))}`);
        return 1;
    }
    console.log(`${symbols.success} ${colors.green(colors.bold(`Nenhum segredo real detectado nas ${parsed.entries.length} variáveis de ${exampleRel}.`))}`);
    return 0;
}
