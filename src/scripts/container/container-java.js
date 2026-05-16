export default class JavaCodeContainer extends H5P.CodeQuestionContainer {

  async setup() {
    await super.setup();
    this.registerJavaButtons();
    this.unregisterInheritedRunObservers();
    this.registerJavaObservers();
  }

  /**
   * Registers a loading spinner button used while TeaVM compiles/runs code.
   */
  registerJavaButtons() {
    const loadingLabel = this.getJavaRuntimeLoadingLabel();

    this.getButtonManager().addButtons([
      {
        identifier: 'java_run_spinner',
        label: '',
        ariaLabel: loadingLabel,
        class: 'java-run-spinner',
        weight: -1,
      },
    ]);

    const spinnerButton = this.getButtonManager().getButton('java_run_spinner');
    if (spinnerButton) {
      spinnerButton.disabled = true;
      spinnerButton.setAttribute('aria-busy', 'true');
    }

    this.getButtonManager().hideButton('java_run_spinner');
  }

  getJavaRuntimeLoadingLabel() {
    try {
      if (typeof this.l10n?.javaRuntimeLoading === 'string') {
        return this.l10n.javaRuntimeLoading;
      }
    }
    catch { /* CodeQuestion l10n proxy throws for JavaQuestion-only keys. */ }

    return 'Loading TeaVM browser compiler';
  }

  /**
   * Removes inherited run/stop observers that conflict with the Java spinner flow.
   */
  unregisterInheritedRunObservers() {
    [
      'state:run:showStopButton',
      'state:stop:hideStopButton',
      'state:stop:showRunButton',
    ].forEach((observerName) => this.getObserverManager().unregister(observerName));
  }

  /**
   * Registers Java-specific page-visibility observers so the toolbar state is
   * always consistent when the user navigates between pages.
   */
  registerJavaObservers() {
    this.getObserverManager().register(
      'page:hide:code',
      new H5P.PageHideObserver(
        this.getPageManager().getPage('code'),
        () => this.enforceJavaToolbarState(),
      ),
    );

    this.getObserverManager().register(
      'page:show:code',
      new H5P.PageShowObserver(
        this.getPageManager().getPage('code'),
        () => this.enforceJavaToolbarState(),
      ),
    );
  }

  enforceJavaToolbarState() {
    const buttonManager = this.getButtonManager();
    buttonManager?.showButton?.('runButton');
    buttonManager?.hideButton?.('showCodeButton');
  }

  /**
   * Overrides CodeQuestionContainer.run() to guard against the 1ms
   * setupOnDocumentReady delay: if the editor manager isn't ready yet,
   * retry after setup completes instead of crashing.
   */
  run() {
    if (!this._editorManager) {
      setTimeout(() => this.run(), 20);
      return;
    }
    super.run();
  }

  showCodePage() {
    super.showCodePage();
    this.enforceJavaToolbarState();
  }

  onHideCodePage() {
    this.clearPendingEditorFocus?.();
    this.enforceJavaToolbarState();
  }

  hideRunButton() {
    this.enforceJavaToolbarState();
  }

  showRunButton() {
    this.enforceJavaToolbarState();
  }

  hideCodeButton() {
    this.getButtonManager().hideButton('showCodeButton');
  }

  showLoadingSpinner() {
    this.getButtonManager()?.showButton?.('java_run_spinner');
  }

  hideLoadingSpinner() {
    this.getButtonManager()?.hideButton?.('java_run_spinner');
  }

  /**
   * Returns the CodeMirror language mode for the editor.
   * @returns {string}
   */
  getMode() {
    return 'java';
  }
}
