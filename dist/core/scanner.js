import { maskSecret } from '../utils/logger.js';
const SAFE_PLACEHOLDER_PATTERNS = [
    /^$/,
    /^your[_-].+/i,
    /^my[_-].+/i,
    /^<[^>]+>$/,
    /^\{[^}]+\}$/,
    /^\[[^\]]+\]$/,
    /^(changeme|placeholder|example|sample|dummy|todo|replace_me|insert_here|none|null|undefined)$/i,
    /^[xX*._-]{4,}$/,
];
const SAFE_DB_PASSWORDS = new Set([
    'password',
    'pass',
    'passwd',
    'secret',
    'postgres',
    'root',
    'admin',
    'user',
    'test',
    'dev',
    'local',
    '1234',
    '123456',
    'changeme',
    'your_password',
    'your-password',
    'example',
    'placeholder',
]);
export function isLikelyPlaceholder(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0)
        return true;
    for (const pattern of SAFE_PLACEHOLDER_PATTERNS) {
        if (pattern.test(trimmed)) {
            return true;
        }
    }
    // Values ending or starting with obvious placeholder markers like "sk_live_xxxx" or "ghp_your_token_here"
    if (/(?:xxxx+|your[_-]?(?:key|token|secret)|placeholder|changeme|example)/i.test(trimmed)) {
        // Wait: make sure AWS official example key AKIAIOSFODNN7EXAMPLE is still caught if user tests AKIA...,
        // OR only ignore if it explicitly says your_key / xxxx
        if (/(?:xxxx+|your[_-]?(?:key|token|secret)|placeholder|changeme)/i.test(trimmed)) {
            return true;
        }
    }
    return false;
}
const SECRET_RULES = [
    {
        id: 'AWS_ACCESS_KEY',
        name: 'AWS Access Key ID',
        regex: /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/,
        message: 'Chave de acesso da AWS detectada (padrão AKIA/ASIA...). Use um placeholder como "your_aws_access_key".',
    },
    {
        id: 'GITHUB_TOKEN',
        name: 'GitHub Personal/App Token',
        regex: /\b(?:(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,255}|github_pat_[A-Za-z0-9_]{20,255})\b/,
        message: 'Token do GitHub detectado (padrão ghp_/github_pat_...). Nunca versione tokens reais no .env.example.',
    },
    {
        id: 'STRIPE_SECRET_KEY',
        name: 'Stripe Secret/Restricted Key',
        regex: /\b(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{10,99}\b/,
        message: 'Chave secreta da Stripe detectada (sk_live_/rk_live_/sk_test_). Substitua por um placeholder seguro.',
    },
    {
        id: 'PRIVATE_KEY_HEADER',
        name: 'Private Key (RSA/PEM/SSH)',
        regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/,
        message: 'Chave privada criptográfica (PEM/RSA/SSH) detectada.',
    },
    {
        id: 'JWT_TOKEN',
        name: 'JSON Web Token (JWT)',
        regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
        message: 'Token JWT real detectado no arquivo de exemplo.',
    },
    {
        id: 'DATABASE_URL_WITH_PASSWORD',
        name: 'Database Connection String with Password',
        regex: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|rediss|amqp):\/\/([^:\s/]+):([^@\s]+)@([^/\s]+)/i,
        message: 'URL de conexão de banco de dados contendo senha real detectada. Use "user:password@localhost" como placeholder.',
        customCheck: (_value, match) => {
            const rawPassword = match[2];
            const cleanedPassword = rawPassword.replace(/^[<{\[]|[>}\]]$/g, '').toLowerCase();
            if (SAFE_DB_PASSWORDS.has(cleanedPassword)) {
                return false;
            }
            if (/^[x*._-]+$/i.test(cleanedPassword)) {
                return false;
            }
            if (/^(?:your|my)[_-]/i.test(cleanedPassword)) {
                return false;
            }
            return true;
        },
    },
    {
        id: 'OPENAI_OR_ANTHROPIC_KEY',
        name: 'AI Provider API Key',
        regex: /\b(?:sk-ant-[A-Za-z0-9_-]{16,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b/,
        message: 'Chave de API (OpenAI / Anthropic) detectada.',
    },
    {
        id: 'SLACK_TOKEN',
        name: 'Slack Token',
        regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,
        message: 'Token do Slack (xoxb-/xoxp-...) detectado.',
    },
    {
        id: 'GOOGLE_API_KEY',
        name: 'Google Cloud / Firebase API Key',
        regex: /\bAIza[0-9A-Za-z_-]{35}\b/,
        message: 'Chave de API do Google (AIza...) detectada.',
    },
    {
        id: 'SENDGRID_API_KEY',
        name: 'SendGrid API Key',
        regex: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/,
        message: 'Chave de API do SendGrid (SG....) detectada.',
    },
];
export function scanEnvFileForSecrets(parsedFile, fileName = '.env.example') {
    const findings = [];
    for (const entry of parsedFile.entries) {
        const rawValue = entry.value.trim();
        if (isLikelyPlaceholder(rawValue)) {
            continue;
        }
        for (const rule of SECRET_RULES) {
            const match = rule.regex.exec(rawValue);
            if (!match)
                continue;
            if (rule.customCheck && !rule.customCheck(rawValue, match, entry.key)) {
                continue;
            }
            findings.push({
                key: entry.key,
                ruleId: rule.id,
                ruleName: rule.name,
                line: entry.lineNumber,
                file: fileName,
                maskedValue: maskSecret(rawValue),
                message: rule.message,
            });
            // Avoid duplicate findings on the same variable line
            break;
        }
    }
    return {
        passed: findings.length === 0,
        findings,
    };
}
