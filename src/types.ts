export type EnvVarType = 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json';

export const SUPPORTED_ENV_TYPES: readonly EnvVarType[] = [
  'string',
  'number',
  'boolean',
  'url',
  'email',
  'json',
] as const;

export interface ParsedEnvEntry {
  /** Variable name, e.g., PORT */
  key: string;
  /** Parsed value (unquoted) */
  value: string;
  /** Original raw line in the file */
  rawLine: string;
  /** 1-based line number in the file */
  lineNumber: number;
  /** Inferred or annotated type (defaults to 'string') */
  type: EnvVarType;
  /** Whether @required was explicitly annotated */
  required: boolean;
  /** Human-readable description extracted from comments */
  description: string;
  /** Raw inline comment text (without leading #), if any */
  inlineComment?: string;
  /** Unknown or invalid @type annotation if user wrote an unsupported type */
  invalidTypeAnnotation?: string;
}

export interface ParsedEnvFile {
  /** Ordered list of parsed environment variable entries */
  entries: ParsedEnvEntry[];
  /** Lookup map by variable key (last occurrence wins if duplicate) */
  map: Map<string, ParsedEnvEntry>;
  /** Raw lines of the original file */
  lines: string[];
}

export type DiagnosticSeverity = 'error' | 'warning';

export type CheckIssueCode =
  | 'MISSING_KEY'
  | 'EMPTY_REQUIRED'
  | 'INVALID_TYPE'
  | 'UNKNOWN_TYPE_ANNOTATION'
  | 'UNDOCUMENTED_KEY';

export interface CheckDiagnostic {
  code: CheckIssueCode;
  severity: DiagnosticSeverity;
  key: string;
  message: string;
  /** File where the issue was detected (.env or .env.example) */
  file: string;
  /** 1-based line number */
  line: number;
  expectedType?: EnvVarType;
  actualValue?: string;
}

export interface CheckResult {
  valid: boolean;
  errors: CheckDiagnostic[];
  warnings: CheckDiagnostic[];
}

export interface SecretFinding {
  key: string;
  ruleId: string;
  ruleName: string;
  line: number;
  file: string;
  maskedValue: string;
  message: string;
}

export interface ScanResult {
  passed: boolean;
  findings: SecretFinding[];
}
