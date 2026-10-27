import { describe, expect, it } from 'vitest';
import { parseEnvContent } from '../src/core/parser.js';
import { scanEnvFileForSecrets } from '../src/core/scanner.js';

describe('scanner.ts — scanEnvFileForSecrets', () => {
  it('passes when .env.example only contains safe placeholders', () => {
    const example = parseEnvContent(
      [
        'AWS_ACCESS_KEY_ID=your_aws_access_key_here',
        'GITHUB_TOKEN=ghp_xxxx_placeholder',
        'STRIPE_SECRET_KEY=your_stripe_secret_key',
        'DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb',
        'JWT_SECRET=changeme',
      ].join('\n')
    );

    const scanResult = scanEnvFileForSecrets(example);
    expect(scanResult.passed).toBe(true);
    expect(scanResult.findings).toHaveLength(0);
  });

  it('detects AWS keys, GitHub tokens, Stripe keys, DB URLs with real passwords, and JWT/Private keys', () => {
    const fakeAws = ['AKIA', '1234567890ABCDEF'].join('');
    const fakeGh = ['ghp', '1234567890abcdefghijklmnopqrstuvwxyzABCD'].join('_');
    const fakeStripe = ['sk', 'live', '51Nz999888777666555444333222'].join('_');
    const fakePemHeader = ['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' ');

    const leaked = parseEnvContent(
      [
        `AWS_ACCESS_KEY_ID=${fakeAws}`,
        `GITHUB_TOKEN=${fakeGh}`,
        `STRIPE_KEY=${fakeStripe}`,
        'DATABASE_URL=postgresql://admin:Pr0d_S3cr3t_P@ss99@db.internal:5432/prod',
        'JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
        `RSA_KEY="${fakePemHeader}"`,
      ].join('\n')
    );

    const scanResult = scanEnvFileForSecrets(leaked);
    expect(scanResult.passed).toBe(false);

    const ruleIds = scanResult.findings.map((f) => f.ruleId);
    expect(ruleIds).toContain('AWS_ACCESS_KEY');
    expect(ruleIds).toContain('GITHUB_TOKEN');
    expect(ruleIds).toContain('STRIPE_SECRET_KEY');
    expect(ruleIds).toContain('DATABASE_URL_WITH_PASSWORD');
    expect(ruleIds).toContain('JWT_TOKEN');
    expect(ruleIds).toContain('PRIVATE_KEY_HEADER');
  });
});
