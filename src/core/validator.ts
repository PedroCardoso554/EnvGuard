import {
  CheckDiagnostic,
  CheckResult,
  EnvVarType,
  ParsedEnvFile,
  SUPPORTED_ENV_TYPES,
} from '../types.js';

export interface TypeValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateValueByType(value: string, type: EnvVarType): TypeValidationResult {
  const trimmed = value.trim();

  switch (type) {
    case 'string':
      return { valid: true };

    case 'number': {
      if (trimmed.length === 0) {
        return { valid: false, reason: 'Esperado um número válido, mas recebeu vazio.' };
      }
      const num = Number(trimmed);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        return {
          valid: false,
          reason: `Valor "${value}" não é um número válido (ex.: 3000, 3.14).`,
        };
      }
      return { valid: true };
    }

    case 'boolean': {
      if (!/^(true|false|1|0|yes|no)$/i.test(trimmed)) {
        return {
          valid: false,
          reason: `Valor "${value}" não é um booleano válido (use true, false, 1, 0, yes ou no).`,
        };
      }
      return { valid: true };
    }

    case 'url': {
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/.+/.test(trimmed)) {
        return {
          valid: false,
          reason: `Valor "${value}" não é uma URL válida com protocolo (ex.: https://api.exemplo.com).`,
        };
      }
      try {
        const parsed = new URL(trimmed);
        if (!parsed.protocol) {
          return { valid: false, reason: `Valor "${value}" não possui protocolo válido.` };
        }
        return { valid: true };
      } catch {
        return {
          valid: false,
          reason: `Valor "${value}" não pôde ser interpretado como uma URL válida.`,
        };
      }
    }

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(trimmed)) {
        return {
          valid: false,
          reason: `Valor "${value}" não é um endereço de e-mail válido (ex.: dev@empresa.com).`,
        };
      }
      return { valid: true };
    }

    case 'json': {
      try {
        JSON.parse(trimmed);
        return { valid: true };
      } catch {
        return {
          valid: false,
          reason: `Valor "${value}" não é um JSON válido (ex.: {"debug":true} ou ["a","b"]).`,
        };
      }
    }

    default:
      return { valid: true };
  }
}

export interface CompareOptions {
  envFileName?: string;
  exampleFileName?: string;
  strict?: boolean;
}

export function compareAndValidateEnv(
  exampleFile: ParsedEnvFile,
  envFile: ParsedEnvFile,
  options: CompareOptions = {}
): CheckResult {
  const envFileName = options.envFileName ?? '.env';
  const exampleFileName = options.exampleFileName ?? '.env.example';
  const strict = Boolean(options.strict);

  const errors: CheckDiagnostic[] = [];
  const warnings: CheckDiagnostic[] = [];

  // 1. Validate entries defined in .env.example against .env
  for (const exampleEntry of exampleFile.entries) {
    if (exampleEntry.invalidTypeAnnotation) {
      errors.push({
        code: 'UNKNOWN_TYPE_ANNOTATION',
        severity: 'error',
        key: exampleEntry.key,
        file: exampleFileName,
        line: exampleEntry.lineNumber,
        message: `Tipo "@type:${exampleEntry.invalidTypeAnnotation}" não suportado na variável "${exampleEntry.key}". Tipos válidos: ${SUPPORTED_ENV_TYPES.join(', ')}.`,
      });
    }

    const envEntry = envFile.map.get(exampleEntry.key);

    if (!envEntry) {
      errors.push({
        code: 'MISSING_KEY',
        severity: 'error',
        key: exampleEntry.key,
        file: exampleFileName,
        line: exampleEntry.lineNumber,
        expectedType: exampleEntry.type,
        message: `Variável "${exampleEntry.key}" está definida no ${exampleFileName}, mas está faltando no ${envFileName}.`,
      });
      continue;
    }

    const rawVal = envEntry.value.trim();

    if (rawVal.length === 0) {
      if (exampleEntry.required) {
        errors.push({
          code: 'EMPTY_REQUIRED',
          severity: 'error',
          key: exampleEntry.key,
          file: envFileName,
          line: envEntry.lineNumber,
          expectedType: exampleEntry.type,
          actualValue: envEntry.value,
          message: `Variável obrigatória "${exampleEntry.key}" (@required) está vazia no ${envFileName}.`,
        });
      }
      continue;
    }

    const typeCheck = validateValueByType(rawVal, exampleEntry.type);
    if (!typeCheck.valid) {
      errors.push({
        code: 'INVALID_TYPE',
        severity: 'error',
        key: exampleEntry.key,
        file: envFileName,
        line: envEntry.lineNumber,
        expectedType: exampleEntry.type,
        actualValue: envEntry.value,
        message: `Tipo inválido para "${exampleEntry.key}" (esperado @type:${exampleEntry.type}): ${typeCheck.reason}`,
      });
    }
  }

  // 2. Check for undocumented variables present in .env but missing in .env.example
  for (const envEntry of envFile.entries) {
    if (!exampleFile.map.has(envEntry.key)) {
      const diagnostic: CheckDiagnostic = {
        code: 'UNDOCUMENTED_KEY',
        severity: strict ? 'error' : 'warning',
        key: envEntry.key,
        file: envFileName,
        line: envEntry.lineNumber,
        message: `Variável "${envEntry.key}" existe no ${envFileName}, mas não está documentada no ${exampleFileName}.`,
      };

      if (strict) {
        errors.push(diagnostic);
      } else {
        warnings.push(diagnostic);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
