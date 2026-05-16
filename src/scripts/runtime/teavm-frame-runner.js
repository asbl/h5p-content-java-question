import TeaVmAssetResolver from './teavm-assets';
import TeaVmDiagnosticFormatter from './teavm-diagnostics';

export default class TeaVmFrameRunner {

  constructor(options = {}) {
    this.options = options;
    this.urls = new TeaVmAssetResolver(options).buildUrls();
    this.diagnosticFormatter = new TeaVmDiagnosticFormatter();
  }

  createHiddenFrame() {
    const iframe = document.createElement('iframe');
    iframe.src = this.getFrameUrl();
    iframe.setAttribute('title', 'TeaVM Java execution frame');
    iframe.style.position = 'absolute';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);
    return iframe;
  }

  getFrameUrl() {
    if (!this.shouldUseFrameBridge()) {
      return this.options.frameUrl || this.urls.frameUrl;
    }

    return this.createFrameBridgeUrl();
  }

  shouldUseFrameBridge() {
    if (typeof URL === 'undefined' || typeof Blob === 'undefined') {
      return false;
    }

    try {
      const pageUrl = globalThis.location?.href || globalThis.document?.location?.href;
      const frameUrl = new URL(this.options.frameUrl || this.urls.frameUrl, pageUrl);
      const pageOrigin = new URL(pageUrl).origin;
      return frameUrl.origin !== pageOrigin;
    }
    catch {
      return false;
    }
  }

  createFrameBridgeUrl() {
    const source = [
      '<!DOCTYPE html>',
      '<html>',
      '<head><meta charset="utf-8"><title>TeaVM Java Runner</title></head>',
      '<body>',
      '<script type="module">',
      `import { start } from ${JSON.stringify(this.urls.frameScriptUrl)};`,
      'if (document.readyState === "loading") {',
      '  document.addEventListener("DOMContentLoaded", start, { once: true });',
      '}',
      'else {',
      '  start();',
      '}',
      '</script>',
      '</body>',
      '</html>',
    ].join('\n');

    return URL.createObjectURL(new Blob([source], { type: 'text/html' }));
  }

  run(wasm) {
    if (typeof document === 'undefined') {
      return Promise.reject(new Error('TeaVM execution requires a browser document.'));
    }

    const iframe = this.createHiddenFrame();

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        this.revokeFrameBridgeUrl(iframe.src);
        iframe.remove();
      };

      const fail = (error) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const timeout = setTimeout(() => {
        fail(new Error(this.options.timeoutMessage || 'Java execution timed out.'));
      }, this.options.timeoutMs || 10000);

      const onMessage = (event) => {
        if (event.source !== iframe.contentWindow) {
          return;
        }

        const message = event.data || {};
        if (message.command === 'ready') {
          iframe.contentWindow.postMessage({ code: wasm }, '*');
          return;
        }

        if (message.command === 'stdout') {
          stdout += `${this.diagnosticFormatter.firstString(message.line)}\n`;
          return;
        }

        if (message.command === 'stderr') {
          stderr += `${this.diagnosticFormatter.firstString(message.line)}\n`;
          return;
        }

        if (message.command === 'failed') {
          fail(new Error(this.diagnosticFormatter.firstString(message.errorMessage, 'TeaVM program failed.')));
          return;
        }

        if (message.command === 'finished') {
          cleanup();
          resolve({ stdout, stderr, exitCode: 0 });
        }
      };

      window.addEventListener('message', onMessage);
    });
  }

  revokeFrameBridgeUrl(url) {
    if (!String(url || '').startsWith('blob:') || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
      return;
    }

    URL.revokeObjectURL(url);
  }
}
