import { describe, expect, it } from 'vitest';
import { parseEnvContent } from '../src/core/parser.js';
import { compareAndValidateEnv, validateValueByType } from '../src/core/validator.js';

describe('validator.ts — validateValueByType & compareAndValidateEnv', () => {
  it('validates all 6 supported types in v1.0', () => {
    expect(validateValueByType('hello', 'string').valid).toBe(true);

    expect(validateValueByType('3000', 'number').valid).toBe(true);
    expect(validateValueByType('3.14', 'number').valid).toBe(true);
    expect(validateValueByType('abc', 'number').valid).toBe(false);

    expect(validateValueByType('true', 'boolean').valid).toBe(true);
    expect(validateValueByType('false', 'boolean').valid).toBe(true);
    expect(validateValueByType('1', 'boolean').valid).toBe(true);
    expect(validateValueByType('0', 'boolean').valid).toBe(true);
    expect(validateValueByType('talvez', 'boolean').valid).toBe(false);

    expect(validateValueByType('https://api.example.com', 'url').valid).toBe(true);
    expect(validateValueByType('postgresql://user:pass@localhost:5432/db', 'url').valid).toBe(true);
    expect(validateValueByType('not-a-url', 'url').valid).toBe(false);

    expect(validateValueByType('dev@example.com', 'email').valid).toBe(true);
    expect(validateValueByType('invalid-email@', 'email').valid).toBe(false);

    expect(validateValueByType('{"feature":true}', 'json').valid).toBe(true);
    expect(validateValueByType('{bad json}', 'json').valid).toBe(false);
  });

  it('detects missing keys, empty required keys, invalid types, and undocumented keys', () => {
    const example = parseEnvContent(
      [
        'PORT=3000 # @type:number @required',
        'DATABASE_URL=postgresql://user:password@localhost:5432/db # @type:url @required',
        'OPTIONAL_NOTE= # @type:string',
        'MISSING_VAR=true # @type:boolean',
      ].join('\n')
    );

    const env = parseEnvContent(
      [
        'PORT=not_a_number',
        'DATABASE_URL=',
        'OPTIONAL_NOTE=',
        'EXTRA_SECRET=123',
      ].join('\n')
    );

    const result = compareAndValidateEnv(example, env);
    expect(result.valid).toBe(false);

    const errorCodes = result.errors.map((e) => `${e.key}:${e.code}`);
    expect(errorCodes).toContain('PORT:INVALID_TYPE');
    expect(errorCodes).toContain('DATABASE_URL:EMPTY_REQUIRED');
    expect(errorCodes).toContain('MISSING_VAR:MISSING_KEY');

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].key).toBe('EXTRA_SECRET');
    expect(result.warnings[0].code).toBe('UNDOCUMENTED_KEY');
  });

  it('treats undocumented keys as errors when strict mode is enabled', () => {
    const example = parseEnvContent('PORT=3000 # @type:number');
    const env = parseEnvContent('PORT=3000\nUNDOCUMENTED=1');

    const nonStrict = compareAndValidateEnv(example, env, { strict: false });
    expect(nonStrict.valid).toBe(true);
    expect(nonStrict.warnings).toHaveLength(1);

    const strictResult = compareAndValidateEnv(example, env, { strict: true });
    expect(strictResult.valid).toBe(false);
    expect(strictResult.errors).toHaveLength(1);
    expect(strictResult.errors[0].code).toBe('UNDOCUMENTED_KEY');
  });
});
