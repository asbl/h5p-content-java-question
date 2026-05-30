import CompileProgressTimer from './compile-progress-timer';
import JavaSourceProject from './java-source-project';
import TeaVmAssetResolver from './teavm-assets';
import { TeaVmCompilerPool } from './teavm-compiler';
import TeaVmDiagnosticFormatter from './teavm-diagnostics';
import TeaVmFrameRunner from './teavm-frame-runner';
import {
  H5P5_JAVA_FILE_NAME,
  H5P5_JAVA_SOURCE,
} from './h5p5-java-facade';
import {
  createJavaRuntimeError,
  createJavaRuntimeResult,
  formatJavaRuntimeError,
} from './java-runtime-result';

/**
 * Compiles and runs Java fully in the browser using the same architecture as
 * the TeaVM playground: a TeaVM-compiled javac/TeaVM worker produces WebAssembly,
 * then a small execution frame loads that module and calls main().
 */
export default class JavaRunner {

  constructor(runtime, options = {}) {
    this.runtime = runtime;
    this.options = options;
    this.urls = new TeaVmAssetResolver(options).buildUrls();
    this.sourceProject = new JavaSourceProject(options);
    this.diagnosticFormatter = new TeaVmDiagnosticFormatter(this.sourceProject);
    this.compiler = options.compiler || TeaVmCompilerPool.getSharedCompiler({
      ...options,
      onPhase: (message) => this.onStatus(message),
    });
    this.mainClassName = String(options.mainClassName || 'Main').trim() || 'Main';
    this.preCode = String(options.preCode || '');
    this.postCode = String(options.postCode || '');
    this.stdin = String(options.stdin || '');
    this.statusMessages = {
      loading: 'Loading TeaVM browser compiler...',
      ready: 'TeaVM compiler ready.',
      preparing: 'Preparing Java source...',
      compiling: 'Compiling Java in the browser...',
      compilerStillRunning: 'TeaVM compiler is still running...',
      devToolsDebuggerHint: 'Waiting for TeaVM compiler worker...',
      compileTimeout: 'TeaVM compilation timed out.',
      running: 'Starting Java program...',
      executionTimeout: 'Java execution timed out.',
      ...options.statusMessages,
    };
    this.compileTimeoutMs = Number(options.compileTimeoutMs || 120000);
    this.executionTimeoutMs = Number(options.executionTimeoutMs || 10000);
    this.maxOutputChars = Number(options.maxOutputChars || 20000);
    this.compileProgressDelaysMs = Array.isArray(options.compileProgressDelaysMs)
      ? options.compileProgressDelaysMs
      : [5000, 15000, 30000];
    this.stopped = false;
    this._runId = 0;
    this.canvasBridge = options.canvasBridge || null;
  }

  async execute(code) {
    await this.executeSources(this.sourceProject.buildSingleFileSources(code));
  }

  async executeProject(workspace = {}, fallbackCode = '') {
    await this.executeSources(this.buildProjectSources(workspace, fallbackCode));
  }

  async executeSources(sources) {
    this.stopped = false;
    const runId = ++this._runId;

    try {
      await this.onStatus(this.statusMessages.loading);
      await this.compiler.ensureReady();
      await this.onStatus(this.statusMessages.ready);

      if (this.stopped || runId !== this._runId) {
        return;
      }

      await this.onStatus(this.statusMessages.preparing);
      const projectSources = this.normalizeProjectSources(sources);
      this.sourceProject.validateSources(projectSources);

      await this.onStatus(this.statusMessages.compiling);
      const compileResult = await this.runCompileWithProgress(() => (
        this.compiler.compile(projectSources[0]?.text || '', this.compileTimeoutMs, {
          mainClassName: this.mainClassName,
          sources: projectSources,
        })
      ));

      if (!compileResult.ok) {
        if (runId === this._runId) {
          const diagnostics = this.diagnosticFormatter.formatCompilerOutput(
            compileResult.output,
            projectSources,
          );
          await this.onError(createJavaRuntimeError({
            phase: 'compile',
            message: 'Compilation error:',
            diagnostics: [diagnostics],
          }));
        }
        return;
      }

      if (this.stopped || runId !== this._runId) {
        return;
      }

      await this.onStatus(this.statusMessages.running);
      const runResult = await this.runCompiledWebAssembly(compileResult.wasm);

      if (runId !== this._runId) {
        return;
      }

      const limitedResult = this.limitRunOutput(createJavaRuntimeResult({
        phase: 'execution',
        ...runResult,
      }));

      if (limitedResult.exitCode !== 0 && !limitedResult.stdout) {
        await this.onError(createJavaRuntimeError({
          phase: 'execution',
          message: limitedResult.stderr || `Program exited with code ${limitedResult.exitCode}`,
          stderr: limitedResult.stderr,
          exitCode: limitedResult.exitCode,
        }));
        return;
      }

      await this.onSuccess(limitedResult.stdout, limitedResult.stderr);
    }
    catch (error) {
      if (runId === this._runId) {
        await this.onError(createJavaRuntimeError({
          phase: 'runtime',
          message: error?.message ?? String(error),
        }));
      }
    }
  }

  async setup() {}

  stop() {
    this.stopped = true;
    this._runId++;
  }

  async runCompileWithProgress(compileCallback) {
    return new CompileProgressTimer({
      timeoutMs: this.compileTimeoutMs,
      timeoutMessage: this.statusMessages.compileTimeout,
      delaysMs: this.compileProgressDelaysMs,
      progressMessages: [
        this.statusMessages.compilerStillRunning,
        this.statusMessages.devToolsDebuggerHint,
        this.statusMessages.compilerStillRunning,
      ],
      onStatus: (message) => this.onStatus(message),
    }).race(compileCallback);
  }

  async runCompiledWebAssembly(wasm) {
    return new TeaVmFrameRunner({
      frameUrl: this.urls.frameUrl,
      teavmFrameScriptUrl: this.urls.frameScriptUrl,
      timeoutMs: this.executionTimeoutMs,
      timeoutMessage: this.statusMessages.executionTimeout,
      canvasBridge: this.canvasBridge,
    }).run(wasm);
  }

  /**
   * Sets the bridge used by sandboxed TeaVM code for visual p5 output.
   * @param {object|null} canvasBridge Bridge instance.
   * @returns {void}
   */
  setCanvasBridge(canvasBridge) {
    this.canvasBridge = canvasBridge || null;
  }

  buildFullCode(studentCode) {
    return this.sourceProject.buildFullCode(studentCode);
  }

  buildProjectSources(workspace = {}, fallbackCode = '') {
    return this.sourceProject.buildWorkspaceSources(workspace, fallbackCode);
  }

  normalizeProjectSources(sources = []) {
    const projectSources = this.sourceProject.normalizeSources(sources);
    if (!this.usesH5P5(projectSources) || this.hasH5P5Facade(projectSources)) {
      return projectSources;
    }

    return [
      ...projectSources,
      {
        fileName: H5P5_JAVA_FILE_NAME,
        text: H5P5_JAVA_SOURCE,
      },
    ];
  }

  /**
   * Checks whether the project uses the bundled p5 facade.
   * @param {Array<object>} sources Java sources.
   * @returns {boolean} True if H5P5 appears in user code.
   */
  usesH5P5(sources = []) {
    return sources.some((source) => /\bH5P5\b/.test(String(source?.text || '')));
  }

  /**
   * Checks whether the project already defines the facade itself.
   * @param {Array<object>} sources Java sources.
   * @returns {boolean} True if H5P5.java is present.
   */
  hasH5P5Facade(sources = []) {
    return sources.some((source) => String(source?.fileName || '') === H5P5_JAVA_FILE_NAME);
  }

  limitRunOutput(runResult = {}) {
    return {
      ...runResult,
      stdout: this.limitText(runResult.stdout),
      stderr: this.limitText(runResult.stderr),
    };
  }

  limitText(text = '') {
    const value = String(text || '');
    if (!this.maxOutputChars || value.length <= this.maxOutputChars) {
      return value;
    }

    return `${value.slice(0, this.maxOutputChars)}\n[Output truncated after ${this.maxOutputChars} characters]`;
  }

  async onSuccess(stdout, stderr) {
    await this.runtime.onSuccess?.(stdout, stderr);
  }

  async onStatus(message) {
    await this.runtime.onStatus?.(message);
  }

  async onError(error) {
    const message = typeof error === 'string'
      ? error
      : formatJavaRuntimeError(error);
    this.runtime.onError?.(message);
  }
}
