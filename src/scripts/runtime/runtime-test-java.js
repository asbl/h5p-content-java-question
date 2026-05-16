import JavaSolutionRuntime from './runtime-solution-java';
import JavaRuntime from './runtime-java';

/**
 * Test runtime: runs the student's code and compares its output to the
 * reference solution output via TestRuntimeMixin.
 */
export default class JavaTestRuntime extends H5P.TestRuntimeMixin(JavaRuntime) {

  createSolutionRuntime() {
    return new JavaSolutionRuntime(
      this.resizeActionHandler,
      this.solutionCode,
      this.codeTester,
      this.options,
    );
  }

  outputHandler(stdout, stderr) {
    const trimOutput = this.options?.trimOutput !== false;
    const normalizedStdout = trimOutput ? String(stdout || '').trim() : String(stdout || '');
    this.codeTester.addOutput(normalizedStdout, stderr);

    const testCaseIndex = this.codeTester.session.testCaseIndex;
    const testCaseLabel = this.codeTester.l10n.testCase;

    this.writeConsoleSafe(stdout, `${testCaseLabel} ${testCaseIndex + 1}`);
  }

  setup(codeContainer) {
    super.setup(codeContainer);
    this.runner = this.getRunner();
    this.isTest = true;
  }

  async onSuccess(stdout, stderr) {
    this.outputHandler(stdout, stderr);
    this.codeContainer?.hideConsole?.();
    await super.onSuccess();
    this.resizeActionHandler?.();
  }

  onError(errorMessage) {
    super.onError(errorMessage);
    this.codeContainer?.getConsoleManager?.()?.showConsole?.();
  }
}
