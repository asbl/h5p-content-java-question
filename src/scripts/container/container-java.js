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

  shouldShowConsoleBelowCanvas() {
    return this.options?.consoleBelowCanvas === true && this.options?.hasConsole !== false;
  }

  getCanvasLabel() {
    try {
      return typeof this.l10n?.canvas === 'string' ? this.l10n.canvas : 'Canvas';
    }
    catch {
      return 'Canvas';
    }
  }

  getConsoleWrapper() {
    const consoleUID = this.getConsoleManager?.()?.consoleUID;
    if (!consoleUID) {
      return null;
    }

    const consoleBody = document.getElementById(consoleUID);
    return consoleBody?.closest('.console_wrapper') || null;
  }

  moveConsoleBelowCanvas() {
    if (!this.shouldShowConsoleBelowCanvas()) {
      return;
    }

    const wrapper = this.getConsoleWrapper();
    const canvasPage = this.getPageManager().getPage('canvas');
    if (!wrapper || !canvasPage) {
      return;
    }

    const canvasWrapper = canvasPage.querySelector('.canvas-wrapper');
    if (canvasWrapper) {
      canvasWrapper.insertAdjacentElement('afterend', wrapper);
      return;
    }

    canvasPage.appendChild(wrapper);
  }

  restoreConsoleToCodePage() {
    if (!this.shouldShowConsoleBelowCanvas()) {
      return;
    }

    const wrapper = this.getConsoleWrapper();
    const codePage = this.getPageManager().getPage('code');
    if (wrapper && codePage) {
      codePage.appendChild(wrapper);
    }
  }

  getUIRegistrations() {
    return this.mergeUIRegistrations(
      super.getUIRegistrations(),
      {
        buttons: [
          {
            identifier: 'canvas',
            label: () => this.getCanvasLabel(),
            class: 'canvas',
            weight: -1,
            state: 'hidden',
          },
        ],
        pages: [
          {
            name: 'canvas',
            content: '',
            additionalClass: 'canvas',
            visible: false,
          },
        ],
        observers: [
          {
            name: 'page:canvas:show',
            type: 'page-show',
            page: 'canvas',
            callback: 'onCanvasPageShown',
          },
          {
            name: 'page:canvas:hide',
            type: 'page-hide',
            page: 'canvas',
            callback: 'onCanvasPageHidden',
          },
          {
            name: 'button:canvas:clicked',
            type: 'button-click',
            button: 'canvas',
            callback: 'showCanvasPage',
          },
        ],
      },
    );
  }

  onCanvasPageShown() {
    this.moveConsoleBelowCanvas();
    this.getButtonManager().hideButton('canvas');
    this.getButtonManager().showButton('showCodeButton');
  }

  onCanvasPageHidden() {
    this.restoreConsoleToCodePage();
    if (!this.getPageManager().isEmpty('canvas')) {
      this.getButtonManager().showButton('canvas');
      this.registerDOM();
    }
  }

  showCanvasPage() {
    this.getPageManager().showPage('canvas');
    this.getButtonManager().hideButton('canvas');
    this.getButtonManager().showButton('showCodeButton');
    this.registerDOM();
    this.moveConsoleBelowCanvas();
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

    if (this.getPageManager().activePageName === 'code') {
      buttonManager?.hideButton?.('showCodeButton');
    }
    else {
      buttonManager?.showButton?.('showCodeButton');
    }
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
