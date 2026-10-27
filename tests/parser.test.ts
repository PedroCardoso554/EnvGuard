import { describe, expect, it } from 'vitest';
import { parseEnvContent, splitValueAndComment } from '../src/core/parser.js';

describe('parser.ts — splitValueAndComment & parseEnvContent', () => {
  it('parses basic unquoted variable with inline @type and @required tags', () => {
    const content = `PORT=3000 # @type:number @required Porta HTTP do servidor`;
    const parsed = parseEnvContent(content);

    expect(parsed.entries).toHaveLength(1);
    const entry = parsed.entries[0];
    expect(entry.key).toBe('PORT');
    expect(entry.value).toBe('3000');
    expect(entry.type).toBe('number');
    expect(entry.required).toBe(true);
    expect(entry.description).toBe('Porta HTTP do servidor');
    expect(entry.lineNumber).toBe(1);
  });

  it('ignores # inside double-quoted values before extracting inline comment tags', () => {
    const content = `SECRET="abc#123#xyz" # @type:string @required Segredo com hash interno`;
    const parsed = parseEnvContent(content);

    expect(parsed.entries).toHaveLength(1);
    const entry = parsed.entries[0];
    expect(entry.key).toBe('SECRET');
    expect(entry.value).toBe('abc#123#xyz');
    expect(entry.type).toBe('string');
    expect(entry.required).toBe(true);
    expect(entry.description).toBe('Segredo com hash interno');
  });

  it('ignores # inside single-quoted values before extracting inline comment tags', () => {
    const content = `API_TOKEN='my#token # with spaces' # @type:string @required Token com hash`;
    const parsed = parseEnvContent(content);

    expect(parsed.entries).toHaveLength(1);
    const entry = parsed.entries[0];
    expect(entry.key).toBe('API_TOKEN');
    expect(entry.value).toBe('my#token # with spaces');
    expect(entry.type).toBe('string');
    expect(entry.required).toBe(true);
    expect(entry.description).toBe('Token com hash');
  });

  it('preserves URL fragments (#section) in unquoted URLs when not preceded by whitespace', () => {
    const { value, inlineComment } = splitValueAndComment(
      'https://example.com/docs#section # @type:url URL com âncora'
    );
    expect(value).toBe('https://example.com/docs#section');
    expect(inlineComment).toBe('@type:url URL com âncora');
  });

  it('uses preceding comment line as description when inline comment only has tags', () => {
    const content = [
      '# E-mail do administrador do sistema',
      'ADMIN_EMAIL=admin@example.com # @type:email @required',
    ].join('\n');

    const parsed = parseEnvContent(content);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].description).toBe('E-mail do administrador do sistema');
    expect(parsed.entries[0].type).toBe('email');
    expect(parsed.entries[0].required).toBe(true);
    expect(parsed.entries[0].lineNumber).toBe(2);
  });

  it('flags unknown @type annotations for validator reporting', () => {
    const content = `CUSTOM_VAR=123 # @type:uuid`;
    const parsed = parseEnvContent(content);

    expect(parsed.entries[0].invalidTypeAnnotation).toBe('uuid');
  });
});
