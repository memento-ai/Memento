// Path: packages/utils/src/strip-common-indent.ts
export function stripCommonIndent(text: string): string {
    // Given a block of text spanning multiple lines, remove the common indent from all lines.
    // We assume that the first line may be empty or not indented and will be ignored.
    // We assume that the first indented line will set the indent level for the entire block.

    const lines = text.split('\n');
    const indentedLines = lines.filter(line => line.length > 0 && line[0]===' ');

    if (indentedLines.length === 0) {
        return text;
    }
    const firstIndentedLine: string = indentedLines[0];

    const m = firstIndentedLine.match(/^( +)/);
    if (!m) {
        return text;
    }

    const indent = m[1];

    const outDentedLines = lines.map(line => {
        if (line.startsWith(indent)) {
            return line.slice(indent.length);
        } else {
            return line;
        }
    });

    // Remove leading empty lines
    while (outDentedLines[0].trim() === '') {
        outDentedLines.shift();
    }

    // Remove trailing empty lines
    while (outDentedLines.length > 0 && outDentedLines[outDentedLines.length-1].trim() === '') {
        outDentedLines.pop();
    }

    return outDentedLines.join('\n') + '\n';
}
