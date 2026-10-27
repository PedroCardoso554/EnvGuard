import fs from 'node:fs/promises';
import path from 'node:path';
import { parseEnvContent } from '../core/parser.js';
import { compareAndValidateEnv } from '../core/validator.js';
import { colors, formatLocation, symbols } from '../utils/logger.js';
export async function runCheckCommand(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const envRel = options.envPath ?? '.env';
    const exampleRel = options.examplePath ?? '.env.example';
    const strict = Boolean(options.strict);
    const envFullPath = path.resolve(cwd, envRel);
    const exampleFullPath = path.resolve(cwd, exampleRel);
    let exampleContent;
    try {
        exampleContent = await fs.readFile(exampleFullPath, 'utf-8');
    }
    catch {
        console.error(`${symbols.error} ${colors.red(`Arquivo de exemplo não encontrado: ${exampleRel}`)}`);
        return 1;
    }
    let envContent;
    try {
        envContent = await fs.readFile(envFullPath, 'utf-8');
    }
    catch {
        console.error(`${symbols.error} ${colors.red(`Arquivo de ambiente não encontrado: ${envRel}`)} ${colors.gray(`(Dica: execute "npx envguard init" para criá-lo)`)}`);
        return 1;
    }
    const parsedExample = parseEnvContent(exampleContent);
    const parsedEnv = parseEnvContent(envContent);
    const result = compareAndValidateEnv(parsedExample, parsedEnv, {
        envFileName: envRel,
        exampleFileName: exampleRel,
        strict,
    });
    console.log(`${colors.bold('EnvGuard Check')} ${colors.gray(`(${exampleRel} ↔ ${envRel})`)}`);
    if (result.errors.length > 0) {
        console.log('');
        console.log(colors.red(colors.bold(`Erros Críticos (${result.errors.length}):`)));
        for (const err of result.errors) {
            console.log(`  ${symbols.error} ${formatLocation(err.file, err.line)} ${colors.bold(err.key)} — ${colors.red(err.message)}`);
        }
    }
    if (result.warnings.length > 0) {
        console.log('');
        console.log(colors.yellow(colors.bold(`Avisos — Variáveis Não Documentadas (${result.warnings.length}):`)));
        for (const warn of result.warnings) {
            console.log(`  ${symbols.warning} ${formatLocation(warn.file, warn.line)} ${colors.bold(warn.key)} — ${colors.yellow(warn.message)}`);
        }
    }
    console.log('');
    if (!result.valid) {
        console.error(`${symbols.error} ${colors.red(colors.bold(`Falha na validação: ${result.errors.length} erro(s) encontrado(s)${result.warnings.length > 0 ? ` e ${result.warnings.length} aviso(s)` : ''}.`))}`);
        return 1;
    }
    if (result.warnings.length > 0) {
        console.log(`${symbols.success} ${colors.green(`Todas as ${parsedExample.entries.length} variáveis obrigatórias/tipadas estão válidas`)} ${colors.yellow(`(${result.warnings.length} aviso(s) não bloqueante(s))`)}.`);
        return 0;
    }
    console.log(`${symbols.success} ${colors.green(colors.bold(`Sucesso! Todas as ${parsedExample.entries.length} variáveis estão sincronizadas e validadas.`))}`);
    return 0;
}
