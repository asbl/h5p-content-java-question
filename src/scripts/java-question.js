import JavaCodeContainer from './container/container-java';
import JavaTestRuntime from './runtime/runtime-test-java';
import JavaManualRuntime from './runtime/runtime-manual-java';
import { tJavaQuestion } from './services/javaquestion-l10n';
import {
  getExternalLibraryUrl,
  normalizeEditorMode,
  normalizePlainObject,
  parseExternalLibraryUrlsYaml,
} from '../../../H5P.LibCodeTools-6.0/src/scripts/services/code-question-config';

export { parseExternalLibraryUrlsYaml };

function getAdvancedLibraryUrl(advancedOptions, optionName) {
  const yamlUrls = parseExternalLibraryUrlsYaml(advancedOptions?.externalLibraryUrls);
  return getExternalLibraryUrl({ yamlUrls, advancedOptions, optionName });
}

function normalizeJavaSourceFiles(sourceFiles = []) {
  if (!Array.isArray(sourceFiles)) {
    return [];
  }

  return sourceFiles
    .map((file) => ({
      name: String(file?.fileName || file?.name || '').trim(),
      code: String(file?.code || ''),
      visible: file?.visibleToLearner !== false && file?.visible !== false,
      editable: file?.learnerEditable !== false && file?.editable !== false,
      blocklyWorkspaceState: file?.blocklyWorkspaceState || file?.workspaceState || null,
    }))
    .filter((file) => file.name);
}

function normalizeJavaEditorMode(mode) {
  return normalizeEditorMode(mode, ['code', 'blocks', 'both', 'fill-blanks']);
}

export default class JavaQuestion extends H5P.CodeQuestion {

  /**
   * @param {object} params Parameters passed by the editor
   * @param {number} contentId Content id
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super(params, contentId, extras);
    this.params = params;
    this.hasCheckButton = true;
    this.hasStopButton = false;
    this.language = 'java';
  }

  /**
   * Returns additional Java-specific container options.
   * @returns {object} Container options.
   */
  getCodeContainerOptions(contentParams = null) {
    const inheritedOptions = this.normalizeInheritedOptions(
      super.getCodeContainerOptions(contentParams),
    );
    const advancedOptions = this.params.advancedOptions || {};
    const editorSettings = this.params.editorSettings || {};
    const mainClassName = String(editorSettings.mainClassName || 'Main').trim() || 'Main';
    const editorParams = contentParams !== null
      ? {
        ...(contentParams || {}),
        ...(contentParams?.options || {}),
      }
      : {
        sourceFiles: Array.isArray(editorSettings?.options?.sourceFiles)
          ? editorSettings.options.sourceFiles
          : editorSettings.sourceFiles,
        allowAddingFiles: editorSettings?.options?.allowAddingFiles ?? editorSettings.allowAddingFiles,
        editorMode: editorSettings?.options?.editorMode ?? editorSettings.editorMode,
        blocklyCategories: editorSettings.blocklyCategories,
        blocklyWorkspaceState: editorSettings?.options?.blocklyWorkspaceState ?? editorSettings.blocklyWorkspaceState,
      };

    return {
      ...inheritedOptions,
      teavmAssetBaseUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmAssetBaseUrl'),
      teavmWorkerUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmWorkerUrl'),
      teavmStdlibUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmStdlibUrl'),
      teavmRuntimeStdlibUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmRuntimeStdlibUrl'),
      teavmFrameUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmFrameUrl'),
      teavmFrameScriptUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmFrameScriptUrl'),
      blocklyCdnUrl: getAdvancedLibraryUrl(advancedOptions, 'blocklyCdnUrl'),
      codeMirrorCdnUrl: getAdvancedLibraryUrl(advancedOptions, 'codeMirrorCdnUrl'),
      markdownCdnUrl: getAdvancedLibraryUrl(advancedOptions, 'markdownCdnUrl'),
      fontAwesomeCdnUrl: getAdvancedLibraryUrl(advancedOptions, 'fontAwesomeCdnUrl'),
      sweetAlertCdnUrl: getAdvancedLibraryUrl(advancedOptions, 'sweetAlertCdnUrl'),
      jsZipCdnUrl: getAdvancedLibraryUrl(advancedOptions, 'jsZipCdnUrl'),
      p5CdnUrl: getAdvancedLibraryUrl(advancedOptions, 'p5CdnUrl'),
      entryFileName: `${mainClassName.split('.').pop()}.java`,
      sourceFiles: normalizeJavaSourceFiles(editorParams.sourceFiles),
      allowAddingFiles: editorParams.allowAddingFiles === true,
      projectStorageEnabled: true,
      downloadFilename: `${mainClassName.split('.').pop()}.java`,
      projectDownloadFilename: 'java-project.zip',
      projectBundleType: 'h5p-java-question-project',
      editorMode: normalizeJavaEditorMode(editorParams.editorMode),
      blocklyCategories: editorParams.blocklyCategories || null,
      blocklyWorkspaceState: editorParams.blocklyWorkspaceState || null,
      blocklyPackages: [],
      consoleBelowCanvas: true,
    };
  }

  /**
   * Returns inherited options as a plain object.
   * @param {unknown} options - Options returned by a parent implementation.
   * @returns {object} Normalized option object.
   */
  normalizeInheritedOptions(options) {
    return normalizePlainObject(options);
  }

  /**
   * CSS class name
   * @returns {string}
   */
  getQuestionName() {
    return 'h5p-java-question';
  }

  getCodingLanguage() {
    return 'java';
  }

  getTestRuntimeClass() {
    return JavaTestRuntime;
  }

  getManualRuntimeClass() {
    return JavaManualRuntime;
  }

  /**
   * Extends the base factory to support the Java-specific 'byOutputMatch'
   * grading method by converting it to a single-testcase IOTester.
   */
  getCodeTesterFactory() {
    const gradingSettings = this.params?.gradingSettings || {};
    if (gradingSettings.gradingMethod !== 'byOutputMatch') {
      return super.getCodeTesterFactory();
    }

    const expectedOutput = String(gradingSettings.expectedOutput || '');
    const trimOutput = gradingSettings.trimOutput !== false;
    const normalized = trimOutput ? expectedOutput.trim() : expectedOutput;

    const FactoryClass = this.getCodeTesterFactoryClass();
    return new FactoryClass(
      [{ outputs: [normalized], inputs: [] }],
      'ioTestCases',
      () => this.evaluate(),
      () => this.getTestRuntimeFactory(),
      this.l10n,
      this.dueDate,
      this.enableDueDate,
      null,
    );
  }

  getRuntimeOptions() {
    const editorSettings = this.params.editorSettings || {};
    const gradingSettings = this.params.gradingSettings || {};
    const advancedOptions = this.params.advancedOptions || {};
    const mainClassName = String(editorSettings.mainClassName || 'Main').trim() || 'Main';
    const entryFileName = `${mainClassName.split('.').pop()}.java`;

    return {
      ...super.getRuntimeOptions(),
      teavmAssetBaseUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmAssetBaseUrl'),
      teavmWorkerUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmWorkerUrl'),
      teavmStdlibUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmStdlibUrl'),
      teavmRuntimeStdlibUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmRuntimeStdlibUrl'),
      teavmFrameUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmFrameUrl'),
      teavmFrameScriptUrl: getAdvancedLibraryUrl(advancedOptions, 'teavmFrameScriptUrl'),
      p5CdnUrl: getAdvancedLibraryUrl(advancedOptions, 'p5CdnUrl'),
      disableOutputPopups: advancedOptions.disableOutputPopups === true,
      compileTimeoutMs: Number(advancedOptions.compileTimeoutMs || 120000),
      executionTimeoutMs: Number(advancedOptions.executionTimeoutMs || 10000),
      maxOutputChars: Number(advancedOptions.maxOutputChars || 20000),
      mainClassName,
      entryFileName,
      sourceFiles: normalizeJavaSourceFiles(editorSettings.sourceFiles),
      preCode: this.getDecodedCode(editorSettings.preCode),
      postCode: this.getDecodedCode(editorSettings.postCode),
      stdin: String(editorSettings.stdin || ''),
      gradingMethod: gradingSettings.gradingMethod || 'please_choose',
      expectedOutput: String(gradingSettings.expectedOutput || ''),
      trimOutput: gradingSettings.trimOutput !== false,
      solutionCode: gradingSettings.gradingMethod === 'bySolution'
        ? this.getDecodedCode(gradingSettings.solution)
        : null,
      statusMessages: {
        loading: tJavaQuestion(this.contentL10n, 'javaRuntimeLoading'),
        ready: tJavaQuestion(this.contentL10n, 'javaRuntimeReady'),
        preparing: tJavaQuestion(this.contentL10n, 'javaRuntimePreparing'),
        compiling: tJavaQuestion(this.contentL10n, 'javaCompiling'),
        compilerStillRunning: tJavaQuestion(this.contentL10n, 'javaCompilerStillRunning'),
        devToolsDebuggerHint: tJavaQuestion(this.contentL10n, 'javaDevToolsDebuggerHint'),
        compileTimeout: tJavaQuestion(this.contentL10n, 'javaCompileTimeout'),
        running: tJavaQuestion(this.contentL10n, 'javaRunning'),
      },
    };
  }

  getFeedbackText() {
    const comparison = this.codeTester?.lastComparison;

    if (!comparison) {
      return super.getFeedbackText();
    }

    if (comparison.identical) {
      return tJavaQuestion(this.contentL10n, 'javaFeedbackSuccess');
    }

    return tJavaQuestion(this.contentL10n, 'javaFeedbackFailure');
  }

  getContainerClass() {
    return JavaCodeContainer;
  }
}
