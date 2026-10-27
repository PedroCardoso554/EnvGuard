import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runCheckCommand } from './commands/check.js';
import { runScanCommand } from './commands/scan.js';
import { runDocsCommand } from './commands/docs.js';
import { runInitCommand } from './commands/init.js';
import { colors, symbols } from './utils/logger.js';

export const VERSION = '1.0.0';

export function printHelp(): void {
  console.log(`
${colors.bold(colors.cyan('EnvGuard v' + VERSION))} — CLI zero-config para validação, segurança e documentação de .env

${colors.bold('USO:')}
  npx envguard <comando> [opções]

${colors.bold('COMANDOS PRINCIPAIS:')}
  ${colors.cyan('check')}    Compara .env com .env.example e valida tipos por comentários (@type, @required)
  ${colors.cyan('scan')}     Audita o .env.example em busca de segredos reais vazados (AWS, GitHub, Stripe, DB, JWT)
  ${colors.cyan('docs')}     Gera ou atualiza automaticamente a tabela de variáveis no README.md
  ${colors.cyan('init')}     Assistente interativo para gerar um .env validado a partir do .env.example

${colors.bold('OPÇÕES GERAIS:')}
  ${colors.yellow('--env <arquivo>')}       Caminho do arquivo .env (padrão: .env)
  ${colors.yellow('--example <arquivo>')}   Caminho do arquivo .env.example (padrão: .env.example)
  ${colors.yellow('--readme <arquivo>')}    Caminho do README para o comando docs (padrão: README.md)
  ${colors.yellow('--out <arquivo>')}       Arquivo de destino para o comando init (padrão: .env)
  ${colors.yellow('--strict')}              No check, trata variáveis não documentadas como erro (exit 1)
  ${colors.yellow('--force, -f')}           No init, sobrescreve o .env existente sem perguntar
  ${colors.yellow('--stdout')}              No docs, imprime a tabela Markdown no terminal sem alterar arquivos
  ${colors.yellow('--help, -h')}            Exibe esta mensagem de ajuda
  ${colors.yellow('--version, -v')}         Exibe a versão atual

${colors.bold('EXEMPLOS DE COMENTÁRIOS NO .env.example:')}
  PORT=3000 # @type:number @required Porta HTTP da aplicação
  DATABASE_URL=postgresql://user:password@localhost:5432/db # @type:url @required
  ENABLE_CACHE=false # @type:boolean Habilita cache local
`);
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        env: { type: 'string' },
        example: { type: 'string' },
        readme: { type: 'string' },
        out: { type: 'string' },
        strict: { type: 'boolean', default: false },
        force: { type: 'boolean', short: 'f', default: false },
        stdout: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    });

    if (values.version) {
      console.log(VERSION);
      return 0;
    }

    const command = positionals[0]?.toLowerCase();

    if (values.help || !command) {
      printHelp();
      return 0;
    }

    switch (command) {
      case 'check':
        return await runCheckCommand({
          envPath: values.env,
          examplePath: values.example,
          strict: values.strict,
        });

      case 'scan':
        return await runScanCommand({
          examplePath: values.example ?? values.env,
        });

      case 'docs':
        return await runDocsCommand({
          examplePath: values.example,
          readmePath: values.readme,
          stdout: values.stdout,
        });

      case 'init':
        return await runInitCommand({
          examplePath: values.example,
          outPath: values.out ?? values.env,
          force: values.force,
        });

      default:
        console.error(
          `${symbols.error} ${colors.red(`Comando desconhecido: "${command}".`)} Use ${colors.cyan(
            'npx envguard --help'
          )} para ver os comandos disponíveis.`
        );
        return 1;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${symbols.error} ${colors.red(`Erro ao processar argumentos: ${message}`)}`);
    return 1;
  }
}

const isExecutedDirectly = (): boolean => {
  if (!process.argv[1]) return false;
  try {
    const entryPath = path.resolve(process.argv[1]);
    const currentFile = path.resolve(fileURLToPath(import.meta.url));
    return entryPath === currentFile || entryPath.endsWith('envguard');
  } catch {
    return false;
  }
};

if (isExecutedDirectly()) {
  runCli().then((exitCode) => {
    process.exit(exitCode);
  });
}
