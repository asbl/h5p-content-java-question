import JavaRuntime from './runtime-java';

/**
 * Solution runtime: executes the reference solution code and records its
 * output so the TestRuntime can compare it against the student's output.
 */
export default class JavaSolutionRuntime extends H5P.SolutionRuntimeMixin(JavaRuntime) {

  setup(codeContainer) {
    super.setup(codeContainer);
    this.runner = this.getRunner();
    this.isTest = true;
  }

  outputHandler(stdout, stderr) {
    this.codeTester.setTargetOutput(stdout, stderr);

    const testCaseIndex = this.codeTester.session.testCaseIndex;
    const testCaseLabel = this.codeTester.l10n.testCase;

    this.writeConsoleSafe(stdout, `${testCaseLabel} ${testCaseIndex + 1}`);
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
