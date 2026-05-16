export const DEFAULT_TEAVM_ASSET_BASE_URL = 'https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/';

export default class TeaVmAssetResolver {

  constructor(options = {}) {
    this.options = options;
  }

  buildUrls() {
    const assetBaseUrl = String(this.options.teavmAssetBaseUrl || DEFAULT_TEAVM_ASSET_BASE_URL).trim();
    const fromBase = (fileName) => this.joinAssetUrl(assetBaseUrl, fileName);

    return {
      workerUrl: String(this.options.teavmWorkerUrl || fromBase('worker.js')),
      stdlibUrl: String(
        this.options.teavmStdlibUrl ||
        fromBase('compile-classlib-teavm.bin'),
      ),
      runtimeStdlibUrl: String(
        this.options.teavmRuntimeStdlibUrl ||
        fromBase('runtime-classlib-teavm.bin'),
      ),
      frameUrl: String(this.options.teavmFrameUrl || fromBase('run-frame.html')),
      frameScriptUrl: String(
        this.options.teavmFrameScriptUrl ||
        fromBase('frame.js'),
      ),
    };
  }

  joinAssetUrl(baseUrl, fileName) {
    const base = String(baseUrl || '').trim();
    if (!base) {
      return '';
    }

    try {
      return new URL(fileName, base.endsWith('/') ? base : `${base}/`).href;
    }
    catch {
      return `${base.replace(/\/+$/, '')}/${fileName}`;
    }
  }
}
