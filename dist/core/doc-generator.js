export const DEFAULT_START_MARKER = '<!-- ENVGUARD:START -->';
export const DEFAULT_END_MARKER = '<!-- ENVGUARD:END -->';
const START_MARKER_REGEX = /<!--\s*ENVGUARD:\s*START\s*-->/i;
const END_MARKER_REGEX = /<!--\s*ENVGUARD:\s*END\s*-->/i;
const BLOCK_REPLACE_REGEX = /(<!--\s*ENVGUARD:\s*START\s*-->)[\s\S]*?(<!--\s*ENVGUARD:\s*END\s*-->)/i;
function escapeMarkdownCell(text) {
    return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}
/**
 * Generates a Markdown table documenting all variables from a parsed .env.example file.
 */
export function generateMarkdownTable(parsedExample) {
    if (parsedExample.entries.length === 0) {
        return '_Nenhuma variável de ambiente definida no `.env.example`._';
    }
    const lines = [
        '| Variável | Tipo | Obrigatória | Exemplo / Padrão | Descrição |',
        '| :--- | :--- | :---: | :--- | :--- |',
    ];
    for (const entry of parsedExample.entries) {
        const varName = `\`${escapeMarkdownCell(entry.key)}\``;
        const typeName = `\`${escapeMarkdownCell(entry.type)}\``;
        const requiredBadge = entry.required ? '✅ Sim' : '❌ Não';
        const exampleVal = entry.value.trim().length > 0 ? `\`${escapeMarkdownCell(entry.value)}\`` : '—';
        const description = entry.description.length > 0 ? escapeMarkdownCell(entry.description) : '—';
        lines.push(`| ${varName} | ${typeName} | ${requiredBadge} | ${exampleVal} | ${description} |`);
    }
    return lines.join('\n');
}
/**
 * Injects or updates the generated Markdown table inside README content between
 * <!-- ENVGUARD:START --> and <!-- ENVGUARD:END --> (supporting optional spaces after colon).
 */
export function injectDocsIntoReadme(existingReadmeContent, markdownTable) {
    if (existingReadmeContent === null) {
        const content = [
            '# Documentação do Projeto',
            '',
            '## Variáveis de Ambiente',
            '',
            DEFAULT_START_MARKER,
            markdownTable,
            DEFAULT_END_MARKER,
            '',
        ].join('\n');
        return { content, mode: 'created_file' };
    }
    if (START_MARKER_REGEX.test(existingReadmeContent) &&
        END_MARKER_REGEX.test(existingReadmeContent) &&
        BLOCK_REPLACE_REGEX.test(existingReadmeContent)) {
        const updated = existingReadmeContent.replace(BLOCK_REPLACE_REGEX, (_fullMatch, startTag, endTag) => `${startTag}\n${markdownTable}\n${endTag}`);
        return { content: updated, mode: 'updated_block' };
    }
    const trimmedEnd = existingReadmeContent.replace(/\s+$/, '');
    const prefix = trimmedEnd.length > 0 ? `${trimmedEnd}\n\n` : '';
    const appended = [
        `${prefix}## Variáveis de Ambiente`,
        '',
        DEFAULT_START_MARKER,
        markdownTable,
        DEFAULT_END_MARKER,
        '',
    ].join('\n');
    return { content: appended, mode: 'appended_section' };
}
