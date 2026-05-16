export default class JavaSourceProject {

  constructor(options = {}) {
    this.mainClassName = String(options.mainClassName || 'Main').trim() || 'Main';
    this.preCode = String(options.preCode || '');
    this.postCode = String(options.postCode || '');
  }

  getMainFileName(mainClassName = this.mainClassName) {
    const simpleName = String(mainClassName || 'Main').split('.').pop().trim() || 'Main';
    return `${simpleName}.java`;
  }

  normalizeFileName(fileName, index = 0) {
    const name = String(fileName || '').trim();
    if (!name) {
      return index === 0 ? this.getMainFileName('Main') : `Source${index + 1}.java`;
    }

    return name.endsWith('.java') ? name : `${name}.java`;
  }

  buildFullCode(studentCode) {
    return [this.preCode, studentCode, this.postCode]
      .filter((part) => part && part.trim())
      .join('\n');
  }

  buildSingleFileSources(code) {
    return [
      {
        fileName: this.getMainFileName(),
        text: this.buildFullCode(code),
      },
    ];
  }

  buildWorkspaceSources(workspace = {}, fallbackCode = '') {
    const files = Array.isArray(workspace?.files) ? workspace.files : [];
    const entryFileName = this.normalizeFileName(
      workspace?.entryFileName || this.getMainFileName(),
    );

    if (!files.length) {
      return [{
        fileName: entryFileName,
        text: this.buildFullCode(fallbackCode),
      }];
    }

    return files.map((file, index) => {
      const fileName = this.normalizeFileName(file?.name, index);
      return {
        fileName,
        text: file?.isEntry === true || fileName === entryFileName
          ? this.buildFullCode(file?.code || fallbackCode)
          : String(file?.code || ''),
      };
    });
  }

  normalizeSources(sources = []) {
    const normalized = (Array.isArray(sources) ? sources : [])
      .map((source, index) => ({
        fileName: this.normalizeFileName(source?.fileName, index),
        text: String(source?.text || ''),
      }))
      .filter((source) => source.text.trim());

    if (!normalized.length) {
      return [{
        fileName: this.getMainFileName(),
        text: this.buildFullCode(''),
      }];
    }

    return normalized;
  }

  validateSources(sources = []) {
    const seen = new Set();

    for (const source of Array.isArray(sources) ? sources : []) {
      const fileName = this.normalizeFileName(source?.fileName);
      const simpleName = fileName.replace(/\.java$/i, '');

      if (!/^[A-Za-z_$][A-Za-z0-9_$]*\.java$/.test(fileName)) {
        throw new Error(`Invalid Java file name "${fileName}". Use a simple class file name like Helper.java.`);
      }

      if (seen.has(fileName)) {
        throw new Error(`Duplicate Java file "${fileName}". Each Java source file needs a unique name.`);
      }
      seen.add(fileName);

      const publicClassName = this.findPublicClassName(source?.text || '');
      if (publicClassName && publicClassName !== simpleName) {
        throw new Error(
          `File "${fileName}" declares public class "${publicClassName}". `
          + `In Java, a public class must match its file name. Rename the file to "${publicClassName}.java" or the class to "${simpleName}".`,
        );
      }
    }
  }

  findPublicClassName(code = '') {
    const match = String(code || '').match(/\bpublic\s+(?:abstract\s+|final\s+|sealed\s+|non-sealed\s+)*class\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/);
    return match?.[1] || '';
  }
}
