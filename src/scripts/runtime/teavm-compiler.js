import JavaSourceProject from './java-source-project';
import TeaVmAssetResolver from './teavm-assets';
import TeaVmDiagnosticFormatter from './teavm-diagnostics';

let sharedCompiler = null;

export class TeaVmCompilerPool {

  static getSharedCompiler(options = {}) {
    const urls = new TeaVmAssetResolver(options).buildUrls();
    const key = JSON.stringify(urls);

    if (!sharedCompiler || sharedCompiler.key !== key) {
      sharedCompiler = {
        key,
        compiler: new TeaVmPlaygroundCompiler(options),
      };
    }

    return sharedCompiler.compiler;
  }
}

export class TeaVmPlaygroundCompiler {

  constructor(options = {}) {
    this.options = options;
    this.urls = new TeaVmAssetResolver(options).buildUrls();
    this.sourceProject = new JavaSourceProject(options);
    this.diagnosticFormatter = new TeaVmDiagnosticFormatter(this.sourceProject);
    this.worker = null;
    this.pending = new Map();
    this.nextId = 1;
    this.readyPromise = null;
  }

  async ensureReady() {
    if (!this.readyPromise) {
      this.readyPromise = this.initialize();
    }

    return this.readyPromise;
  }

  initialize() {
    return new Promise((resolve, reject) => {
      this.worker = this.createWorker();

      const startupTimer = setTimeout(() => {
        reject(new Error('TeaVM compiler worker did not initialize.'));
      }, 30000);

      this.worker.onmessage = (event) => {
        const message = event.data || {};

        if (message.command === 'initialized') {
          clearTimeout(startupTimer);
          this.revokeWorkerBlobUrl();
          this.loadClasslib().then(resolve, reject);
          return;
        }

        this.handleWorkerMessage(message);
      };

      this.worker.onerror = (event) => {
        clearTimeout(startupTimer);
        this.revokeWorkerBlobUrl();
        reject(new Error(event.message || 'TeaVM compiler worker failed to load.'));
      };
    });
  }

  createWorker() {
    if (!this.shouldUseCrossOriginWorkerBridge()) {
      return new Worker(this.urls.workerUrl);
    }

    const blobUrl = URL.createObjectURL(new Blob([
      [
        `self.__H5P_TEAVM_ASSET_BASE_URL = ${JSON.stringify(this.getWorkerAssetBaseUrl())};`,
        `importScripts(${JSON.stringify(this.urls.workerUrl)});`,
      ].join('\n'),
    ], { type: 'text/javascript' }));
    const worker = new Worker(blobUrl);
    worker._h5pTeaVmBlobUrl = blobUrl;
    return worker;
  }

  shouldUseCrossOriginWorkerBridge() {
    if (typeof Worker === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
      return false;
    }

    try {
      const pageUrl = globalThis.location?.href || globalThis.document?.location?.href;
      const workerUrl = new URL(this.urls.workerUrl, pageUrl);
      const pageOrigin = new URL(pageUrl).origin;
      return workerUrl.origin !== pageOrigin;
    }
    catch {
      return false;
    }
  }

  getWorkerAssetBaseUrl() {
    try {
      return new URL('.', this.urls.workerUrl).href;
    }
    catch {
      return this.urls.workerUrl.replace(/[^/]*$/, '');
    }
  }

  revokeWorkerBlobUrl() {
    const blobUrl = this.worker?._h5pTeaVmBlobUrl;
    if (!blobUrl || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
      return;
    }

    URL.revokeObjectURL(blobUrl);
    delete this.worker._h5pTeaVmBlobUrl;
  }

  request(command, payload = {}, timeoutMs = 60000) {
    const id = String(this.nextId++);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`TeaVM worker request '${command}' timed out.`));
      }, timeoutMs);

      this.pending.set(id, {
        command,
        diagnostics: [],
        phases: [],
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });

      this.worker.postMessage({
        ...payload,
        id,
        command,
      });
    });
  }

  loadClasslib() {
    return this.request('load-classlib', {
      url: this.urls.stdlibUrl,
      runtimeUrl: this.urls.runtimeStdlibUrl,
    }, 60000);
  }

  async compile(source, timeoutMs = 60000, metadata = {}) {
    await this.ensureReady();

    return this.request('compile', {
      text: source,
      sources: metadata.sources,
      sourceFileName: this.sourceProject.getMainFileName(metadata.mainClassName || this.options.mainClassName),
      mainClassName: metadata.mainClassName || this.options.mainClassName || 'Main',
    }, timeoutMs);
  }

  handleWorkerMessage(message) {
    const id = String(message.id || '');
    const pending = this.pending.get(id);

    if (!pending) {
      return;
    }

    if (message.command === 'compiler-diagnostic' || message.command === 'diagnostic') {
      pending.diagnostics.push(this.diagnosticFormatter.format(message));
      return;
    }

    if (message.command === 'phase') {
      const phase = this.diagnosticFormatter.firstString(message.phase);
      pending.phases.push(phase);
      this.options.onPhase?.(phase);
      return;
    }

    if (message.command === 'ok') {
      this.pending.delete(id);
      pending.resolve({ ok: true });
      return;
    }

    if (message.command === 'error') {
      this.pending.delete(id);
      pending.reject(new Error(this.diagnosticFormatter.firstString(message.text, message.errorMessage, 'TeaVM worker error')));
      return;
    }

    if (message.command === 'compilation-complete') {
      this.pending.delete(id);
      if (message.status === 'successful') {
        pending.resolve({
          ok: true,
          wasm: message.script,
          diagnostics: pending.diagnostics,
        });
        return;
      }

      pending.resolve({
        ok: false,
        output: pending.diagnostics.join('\n') || 'TeaVM compilation failed.',
      });
    }
  }
}
