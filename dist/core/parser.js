import { SUPPORTED_ENV_TYPES, } from '../types.js';
/**
 * Splits the right-hand side of a KEY=VALUE assignment into the value and optional inline comment.
 * Carefully ignores `#` characters inside single ('...') or double ("...") quotes,
 * as well as unquoted `#` not preceded by whitespace (e.g. URL fragments like https://a.com#frag).
 */
export function splitValueAndComment(rawRightHandSide) {
    const trimmedStart = rawRightHandSide.replace(/^[ \t]+/, '');
    if (trimmedStart.length === 0) {
        return { value: '' };
    }
    // Case 1: Value starts with a single or double quote
    if (trimmedStart[0] === '"' || trimmedStart[0] === "'") {
        const quoteChar = trimmedStart[0];
        let valueChars = '';
        let i = 1;
        let closedQuoteIndex = -1;
        while (i < trimmedStart.length) {
            const ch = trimmedStart[i];
            if (ch === '\\' && i + 1 < trimmedStart.length) {
                const nextChar = trimmedStart[i + 1];
                if (quoteChar === '"') {
                    if (nextChar === 'n')
                        valueChars += '\n';
                    else if (nextChar === 'r')
                        valueChars += '\r';
                    else if (nextChar === 't')
                        valueChars += '\t';
                    else
                        valueChars += nextChar;
                    i += 2;
                    continue;
                }
                else if (nextChar === "'" || nextChar === '\\') {
                    valueChars += nextChar;
                    i += 2;
                    continue;
                }
            }
            if (ch === quoteChar) {
                closedQuoteIndex = i;
                break;
            }
            valueChars += ch;
            i++;
        }
        if (closedQuoteIndex !== -1) {
            const remainder = trimmedStart.slice(closedQuoteIndex + 1);
            const hashIndex = remainder.indexOf('#');
            if (hashIndex !== -1) {
                const inlineComment = remainder.slice(hashIndex + 1).trim();
                return {
                    value: valueChars,
                    inlineComment,
                };
            }
            return { value: valueChars };
        }
    }
    // Case 2: Unquoted value (or unclosed quote fallback)
    // Scan character-by-character while respecting any inline quotes
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let commentStartIndex = -1;
    for (let i = 0; i < trimmedStart.length; i++) {
        const ch = trimmedStart[i];
        const prev = i > 0 ? trimmedStart[i - 1] : '';
        if (ch === '\\') {
            i++; // skip escaped character
            continue;
        }
        if (ch === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            continue;
        }
        if (ch === "'" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            continue;
        }
        if (!inSingleQuote && !inDoubleQuote && ch === '#') {
            // A '#' starts a comment if it's at the very beginning of the value (e.g. KEY= # comment)
            // or preceded by whitespace (e.g. KEY=val # comment)
            if (i === 0 || prev === ' ' || prev === '\t') {
                commentStartIndex = i;
                break;
            }
        }
    }
    if (commentStartIndex !== -1) {
        const rawValue = trimmedStart.slice(0, commentStartIndex).trim();
        const inlineComment = trimmedStart.slice(commentStartIndex + 1).trim();
        return {
            value: rawValue,
            inlineComment,
        };
    }
    return {
        value: trimmedStart.trim(),
    };
}
/**
 * Extracts @type:<type>, @required, @optional, and human-readable description from comments.
 */
export function extractMetadataFromComments(inlineComment, precedingComments = []) {
    const combinedForTags = [...precedingComments, inlineComment ?? ''].join(' ').trim();
    let type = 'string';
    let invalidTypeAnnotation;
    const typeMatch = combinedForTags.match(/@type:([A-Za-z0-9_-]+)/i);
    if (typeMatch) {
        const candidate = typeMatch[1].toLowerCase();
        if (SUPPORTED_ENV_TYPES.includes(candidate)) {
            type = candidate;
        }
        else {
            invalidTypeAnnotation = typeMatch[1];
        }
    }
    const hasRequired = /@required\b/i.test(combinedForTags);
    const hasOptional = /@optional\b/i.test(combinedForTags);
    const required = hasRequired && !hasOptional;
    const cleanCommentText = (text) => text
        .replace(/@type:[A-Za-z0-9_-]+/gi, '')
        .replace(/@required\b/gi, '')
        .replace(/@optional\b/gi, '')
        .replace(/@desc:/gi, '')
        .replace(/^[\s\-:–—|]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
    const inlineDesc = inlineComment ? cleanCommentText(inlineComment) : '';
    if (inlineDesc.length > 0) {
        return { type, required, description: inlineDesc, invalidTypeAnnotation };
    }
    const precedingDesc = precedingComments
        .map(cleanCommentText)
        .filter((line) => line.length > 0)
        .join(' ');
    return {
        type,
        required,
        description: precedingDesc,
        invalidTypeAnnotation,
    };
}
/**
 * Parses the content of a .env or .env.example file into structured entries with line numbers.
 */
export function parseEnvContent(content) {
    const lines = content.split(/\r?\n/);
    const entries = [];
    const map = new Map();
    let pendingComments = [];
    for (let idx = 0; idx < lines.length; idx++) {
        const rawLine = lines[idx];
        const lineNumber = idx + 1;
        const trimmed = rawLine.trim();
        if (trimmed.length === 0) {
            pendingComments = [];
            continue;
        }
        if (trimmed.startsWith('#')) {
            const commentBody = trimmed.replace(/^#+\s*/, '').trim();
            // Ignore pure decorative separator lines like "# ----------------"
            if (commentBody.length > 0 && !/^[-=_*#]+$/.test(commentBody)) {
                pendingComments.push(commentBody);
            }
            continue;
        }
        const match = rawLine.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
        if (!match) {
            pendingComments = [];
            continue;
        }
        const key = match[1];
        const rawRhs = match[2];
        const { value, inlineComment } = splitValueAndComment(rawRhs);
        const metadata = extractMetadataFromComments(inlineComment, pendingComments);
        const entry = {
            key,
            value,
            rawLine,
            lineNumber,
            type: metadata.type,
            required: metadata.required,
            description: metadata.description,
            inlineComment,
            invalidTypeAnnotation: metadata.invalidTypeAnnotation,
        };
        entries.push(entry);
        map.set(key, entry);
        pendingComments = [];
    }
    return {
        entries,
        map,
        lines,
    };
}
