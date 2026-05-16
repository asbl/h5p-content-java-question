export function javaSafeName(name = '') {
  const normalized = String(name || 'value').replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[a-zA-Z_]/.test(normalized) ? normalized : `value_${normalized}`;
}

export function javaString(value = '') {
  return JSON.stringify(String(value || ''));
}

export function javaIndent(code = '', spaces = 4) {
  const prefix = ' '.repeat(spaces);
  const lines = String(code || '').split('\n').filter((line) => line.length > 0);
  return lines.length ? lines.map((line) => `${prefix}${line}`).join('\n') : `${prefix}// no instructions`;
}
