import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCheckCommand } from '../src/commands/check.js';
import { runDocsCommand } from '../src/commands/docs.js';
import { runInitCommand } from '../src/commands/init.js';
import { runScanCommand } from '../src/commands/scan.js';

describe('CLI Commands Integration (check, scan, docs, init)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'envguard-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns exit code 0 when .env and .env.example are valid and synced', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.env.example'),
      'PORT=3000 # @type:number @required Porta HTTP\nSECRET="abc#123" # @type:string @required Segredo\n',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tmpDir, '.env'),
      'PORT=8080\nSECRET="my#real#secret"\n',
      'utf-8'
    );

    const code = await runCheckCommand({ cwd: tmpDir });
    expect(code).toBe(0);
  });

  it('returns exit code 1 when check finds a type mismatch or missing key', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.env.example'),
      'PORT=3000 # @type:number @required\n',
      'utf-8'
    );
    await fs.writeFile(path.join(tmpDir, '.env'), 'PORT=invalid\n', 'utf-8');

    const code = await runCheckCommand({ cwd: tmpDir });
    expect(code).toBe(1);
  });

  it('returns exit code 1 when scan detects a real AWS or Stripe secret', async () => {
    const fakeStripeKey = ['sk', 'live', '51Nz999888777666555444333222'].join('_');
    await fs.writeFile(
      path.join(tmpDir, '.env.example'),
      `STRIPE_SECRET_KEY=${fakeStripeKey}\n`,
      'utf-8'
    );

    const code = await runScanCommand({ cwd: tmpDir });
    expect(code).toBe(1);
  });

  it('updates README.md between ENVGUARD tags on docs command', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.env.example'),
      'PORT=3000 # @type:number @required Porta HTTP\n',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tmpDir, 'README.md'),
      '# Demo\n\n<!-- ENVGUARD: START -->\n<!-- ENVGUARD: END -->\n',
      'utf-8'
    );

    const code = await runDocsCommand({ cwd: tmpDir });
    expect(code).toBe(0);

    const updatedReadme = await fs.readFile(path.join(tmpDir, 'README.md'), 'utf-8');
    expect(updatedReadme).toContain('| `PORT` | `number` | ✅ Sim | `3000` | Porta HTTP |');
  });

  it('interactively generates a validated .env file via init command', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.env.example'),
      'PORT=3000 # @type:number @required Porta HTTP\nAPP_NAME=EnvGuard # @type:string Nome do App\n',
      'utf-8'
    );

    const answers: Record<string, string[]> = {
      PORT: ['invalid_port', '4000'], // First invalid, then valid 4000
      APP_NAME: [''], // Accept default 'EnvGuard'
    };

    const code = await runInitCommand({
      cwd: tmpDir,
      promptFn: async (_question, entry) => {
        const queue = answers[entry.key] ?? [''];
        return queue.shift() ?? '';
      },
    });

    expect(code).toBe(0);
    const generatedEnv = await fs.readFile(path.join(tmpDir, '.env'), 'utf-8');
    expect(generatedEnv).toContain('PORT=4000');
    expect(generatedEnv).toContain('APP_NAME=EnvGuard');
  });
});
