import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { parseEnvContent } from '../core/parser.js';
import { validateValueByType } from '../core/validator.js';
import { colors, symbols } from '../utils/logger.js';
function formatEnvValueForFile(raw) {
    if (raw.length === 0)
        return '';
    if (/[\s#"']/.test(raw)) {
        const escaped = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${escaped}"`;
    }
    return raw;
}
export async function runInitCommand(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const exampleRel = options.examplePath ?? '.env.example';
    const outRel = options.outPath ?? '.env';
    const exampleFullPath = path.resolve(cwd, exampleRel);
    const outFullPath = path.resolve(cwd, outRel);
    let exampleContent;
    try {
        exampleContent = await fs.readFile(exampleFullPath, 'utf-8');
    }
    catch {
        console.error(`${symbols.error} ${colors.red(`Arquivo de exemplo não encontrado: ${exampleRel}`)}`);
        return 1;
    }
    const parsedExample = parseEnvContent(exampleContent);
    const rl = options.promptFn ? null : readline.createInterface({ input, output });
    const ask = async (question, entry) => {
        if (options.promptFn) {
            return options.promptFn(question, entry);
        }
        return rl.question(question);
    };
    try {
        let targetExists = false;
        try {
            await fs.access(outFullPath);
            targetExists = true;
        }
        catch {
            targetExists = false;
        }
        if (targetExists && !options.force) {
            const dummyEntry = {
                key: '__OVERWRITE__',
                value: 'n',
                rawLine: '',
                lineNumber: 0,
                type: 'boolean',
                required: false,
                description: 'Confirm overwrite',
            };
            const confirmAnswer = await ask(`${symbols.warning} O arquivo ${colors.bold(outRel)} já existe. Deseja sobrescrevê-lo? ${colors.gray('(s/N)')}: `, dummyEntry);
            if (!/^(s|sim|y|yes)$/i.test(confirmAnswer.trim())) {
                console.log(`${symbols.info} ${colors.yellow('Operação cancelada pelo usuário.')}`);
                return 0;
            }
        }
        console.log('');
        console.log(`${colors.bold('EnvGuard Init')} — Configurando ${colors.cyan(outRel)} a partir de ${colors.cyan(exampleRel)}`);
        console.log(colors.gray('Pressione ENTER para aceitar o valor padrão entre colchetes, quando disponível.\n'));
        const chosenValues = new Map();
        for (const entry of parsedExample.entries) {
            const reqBadge = entry.required
                ? colors.red('[obrigatória]')
                : colors.gray('[opcional]');
            const typeBadge = colors.cyan(`(@type:${entry.type})`);
            const descText = entry.description ? ` — ${colors.gray(entry.description)}` : '';
            console.log(`${colors.bold(entry.key)} ${typeBadge} ${reqBadge}${descText}`);
            const defaultHint = entry.value.length > 0 ? ` ${colors.gray(`[${entry.value}]`)}` : '';
            while (true) {
                const answer = await ask(`  Valor para ${entry.key}${defaultHint}: `, entry);
                const trimmedAnswer = answer.trim();
                const finalValue = trimmedAnswer.length > 0 ? trimmedAnswer : entry.value;
                if (finalValue.trim().length === 0) {
                    if (entry.required) {
                        console.log(`  ${symbols.error} ${colors.red(`A variável "${entry.key}" é obrigatória (@required). Informe um valor.`)}`);
                        continue;
                    }
                    chosenValues.set(entry.key, '');
                    break;
                }
                const validation = validateValueByType(finalValue, entry.type);
                if (!validation.valid) {
                    console.log(`  ${symbols.error} ${colors.red(validation.reason ?? 'Valor inválido.')}`);
                    continue;
                }
                chosenValues.set(entry.key, finalValue);
                break;
            }
        }
        // Reconstruct the .env content preserving comments and structure from .env.example
        const outputLines = parsedExample.lines.map((rawLine) => {
            const match = rawLine.match(/^(\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=)(.*)$/);
            if (!match) {
                return rawLine;
            }
            const prefix = match[1];
            const key = match[2];
            if (!chosenValues.has(key)) {
                return rawLine;
            }
            const formattedVal = formatEnvValueForFile(chosenValues.get(key));
            return `${prefix}${formattedVal}`;
        });
        await fs.writeFile(outFullPath, outputLines.join('\n'), 'utf-8');
        console.log('');
        console.log(`${symbols.success} ${colors.green(colors.bold(`Arquivo ${outRel} gerado e validado com sucesso (${chosenValues.size} variáveis)!`))}`);
        return 0;
    }
    finally {
        rl?.close();
    }
}
