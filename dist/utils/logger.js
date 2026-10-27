const isColorEnabled = () => {
    if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '') {
        return false;
    }
    if (process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR !== '0') {
        return true;
    }
    return Boolean(process.stdout.isTTY);
};
const wrapAnsi = (open, close) => (text) => {
    if (!isColorEnabled())
        return text;
    return `${open}${text}${close}`;
};
export const colors = {
    red: wrapAnsi('\x1b[31m', '\x1b[39m'),
    green: wrapAnsi('\x1b[32m', '\x1b[39m'),
    yellow: wrapAnsi('\x1b[33m', '\x1b[39m'),
    blue: wrapAnsi('\x1b[34m', '\x1b[39m'),
    magenta: wrapAnsi('\x1b[35m', '\x1b[39m'),
    cyan: wrapAnsi('\x1b[36m', '\x1b[39m'),
    gray: wrapAnsi('\x1b[90m', '\x1b[39m'),
    bold: wrapAnsi('\x1b[1m', '\x1b[22m'),
    dim: wrapAnsi('\x1b[2m', '\x1b[22m'),
};
export const symbols = {
    error: colors.red('✖'),
    warning: colors.yellow('⚠'),
    success: colors.green('✔'),
    info: colors.cyan('ℹ'),
};
export function formatLocation(file, line) {
    return colors.gray(`${file}:${line}`);
}
export function maskSecret(value) {
    const trimmed = value.trim();
    if (trimmed.length <= 8) {
        return '***';
    }
    const prefix = trimmed.slice(0, 4);
    const suffix = trimmed.slice(-3);
    return `${prefix}...${suffix}`;
}
