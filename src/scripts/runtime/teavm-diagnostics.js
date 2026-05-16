import JavaSourceProject from './java-source-project';

export default class TeaVmDiagnosticFormatter {

  constructor(sourceProject = new JavaSourceProject()) {
    this.sourceProject = sourceProject;
  }

  firstString(...values) {
    const value = values.find((candidate) => typeof candidate === 'string');
    return value ?? '';
  }

  format(message) {
    const fileName = this.firstString(message.fileName, this.sourceProject.getMainFileName('Main'));
    const line = Number.isFinite(Number(message.lineNumber)) ? Number(message.lineNumber) : null;
    const column = Number.isFinite(Number(message.columnNumber)) ? Number(message.columnNumber) : null;
    const location = line ? `${fileName}:${line}${column ? `:${column}` : ''}` : fileName;
    const text = this.firstString(message.message, message.text, 'Compilation diagnostic');

    return `${location}: ${text}`;
  }

  formatCompilerOutput(output = '', sources = []) {
    const text = String(output || '').trim();
    if (!text) {
      return 'Compilation error.';
    }

    const hints = this.buildHints(text, sources);
    return hints.length
      ? `${text}\n\nHints:\n${hints.map((hint) => `- ${hint}`).join('\n')}`
      : text;
  }

  buildHints(output = '', sources = []) {
    const hints = [];
    const text = String(output || '');

    if (/reached end of file while parsing|';' expected|\bexpected\b/i.test(text)) {
      hints.push('Check for a missing semicolon, closing brace, or closing parenthesis near the reported line.');
    }

    if (/cannot find symbol/i.test(text)) {
      hints.push('Check the spelling of variable, method, and class names. For multi-file projects, make sure the helper class file exists.');
    }

    if (/class .* is public, should be declared in a file named/i.test(text)) {
      hints.push('A public Java class must have the same name as its .java file.');
    }

    const sourceNames = (Array.isArray(sources) ? sources : [])
      .map((source) => source?.fileName)
      .filter(Boolean);
    if (sourceNames.length > 1 && /cannot find symbol|package .* does not exist|class .* not found/i.test(text)) {
      hints.push(`This project is compiled with these files: ${sourceNames.join(', ')}.`);
    }

    return [...new Set(hints)];
  }
}
