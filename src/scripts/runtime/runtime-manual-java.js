import JavaRuntime from './runtime-java';

/**
 * Manual runtime: executes the student's code for interactive use (Run button).
 * Writes stdout via the shared manual output handler so console/popup behavior
 * matches the other CodeQuestion runtimes.
 */
export default class JavaManualRuntime extends H5P.ManualRuntimeMixin(JavaRuntime) {

  async runCode(code) {
    this.codeContainer.getStateManager().start();
    await JavaRuntime.prototype.runCode.call(this, code);
  }

  async onSuccess(stdout, stderr) {
    await super.onSuccess();

    if (stdout) {
      this.outputHandler(stdout, true);
    }

    if (stderr && stderr.trim()) {
      this.writeConsoleSafe(stderr, '!>');
      this.showConsoleSafe();
    }

    this.resizeActionHandler?.();
  }
}
