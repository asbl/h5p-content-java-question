import JavaRunner from './javarunner';

/**
 * Java Runtime for executing Java code using JavaRunner (TeaVM-based).
 * Extends H5P.Runtime and internally uses JavaRunner for compilation and execution.
 */
export default class JavaRuntime extends H5P.Runtime {

  /**
   * Sets up the runtime with a code container and runner.
   * @param {object} codeContainer - The code container.
   */
  setup(codeContainer) {
    super.setup(codeContainer);

    if (!this._consoleManager && typeof this.createConsoleManager === 'function') {
      this._consoleManager = this.createConsoleManager();
    }

    this.runner = this.getRunner();
  }

  /**
   * Returns a console manager if one is available.
   * @returns {object|null}
   */
  getConsoleManagerSafe() {
    return this._consoleManager
      ?? this.codeContainer?.getConsoleManager?.()
      ?? null;
  }

  /**
   * Writes to the console only if one exists.
   * @param {string} text - Text to print.
   * @param {string} [title] - Optional title.
   */
  writeConsoleSafe(text, title) {
    this.getConsoleManagerSafe()?.write?.(text, title);
  }

  showConsoleSafe() {
    this.getConsoleManagerSafe()?.showConsole?.();
  }

  /**
   * Shows progress messages while TeaVM is compiling or running.
   * @param {string} message - Status message to display.
   */
  onStatus(message) {
    if (!message) {
      return;
    }

    this.writeConsoleSafe(message, 'Java');
    this.showConsoleSafe();
    this.resizeActionHandler?.();
  }

  /**
   * Handles runtime errors.
   * @param {string} error - Error message.
   */
  onError(error) {
    console.warn('Error while executing Java code:\n', error);
    this.writeConsoleSafe(error, '!>');
    this.codeContainer?.getStateManager?.().stop?.();

    if (typeof this.codeContainer?.showCodePage === 'function') {
      this.codeContainer.showCodePage();
      return;
    }

    this.codeContainer?.getPageManager?.().showPage?.('code');
  }

  /**
   * Creates the runner configuration from runtime options.
   * @returns {object} JavaRunner options.
   */
  getRunnerOptions() {
    return { ...(this.options ?? {}) };
  }

  /**
   * Returns (or lazily creates) the JavaRunner instance.
   * @returns {JavaRunner}
   */
  getRunner() {
    if (!this.runner) {
      this.runner = new JavaRunner(this, this.getRunnerOptions());
    }

    return this.runner;
  }

  /**
   * Executes Java code via the runner.
   * @param {string} code - Java source code entered by the student.
   */
  async runCode(code) {
    this.resizeActionHandler();

    const workspace = this.getRuntimeWorkspace(code);
    const hasSourceFiles = Array.isArray(workspace?.files) && workspace.files.length > 0;

    if (hasSourceFiles && typeof this.runner.executeProject === 'function') {
      await this.runner.executeProject(workspace, code);
      return;
    }

    await this.runner.execute(code);
  }

  /**
   * Builds a Java project snapshot for the runner.
   * @param {string} code - Entry source code passed by the generic runtime.
   * @returns {object|null} Workspace snapshot with entry and additional files.
   */
  getRuntimeWorkspace(code) {
    const liveWorkspace = this.codeContainer?.getWorkspaceSnapshot?.();

    if (Array.isArray(liveWorkspace?.files) && liveWorkspace.files.length > 1) {
      return liveWorkspace;
    }

    const optionFiles = Array.isArray(this.options?.sourceFiles)
      ? this.options.sourceFiles
      : [];

    if (!optionFiles.length) {
      return liveWorkspace;
    }

    const entryFileName = String(
      liveWorkspace?.entryFileName ||
      this.options?.entryFileName ||
      `${String(this.options?.mainClassName || 'Main').split('.').pop()}.java`,
    );
    const entryFile = Array.isArray(liveWorkspace?.files)
      ? liveWorkspace.files.find((file) => file?.isEntry === true || file?.name === entryFileName)
      : null;

    return {
      entryFileName,
      activeFileName: liveWorkspace?.activeFileName || entryFileName,
      files: [
        {
          name: entryFileName,
          code: String(entryFile?.code ?? code ?? ''),
          visible: true,
          editable: true,
          isEntry: true,
        },
        ...optionFiles
          .filter((file) => file?.name && file.name !== entryFileName)
          .map((file) => ({
            name: file.name,
            code: String(file.code || ''),
            visible: file.visible !== false,
            editable: file.editable !== false,
            isEntry: false,
          })),
      ],
    };
  }
}
