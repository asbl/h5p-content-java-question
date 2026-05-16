import { describe, expect, it } from 'vitest';
import JavaQuestion from '../src/scripts/java-question.js';

describe('JavaQuestion', () => {
  it('passes multi-file and Blockly options to normal code blocks', () => {
    const question = new JavaQuestion({
      advancedOptions: {
        externalLibraryUrls: [
          'teavmAssetBaseUrl: https://cdn.example.com/teavm/',
          'blockly: https://cdn.example.com/blockly/',
          'codeMirror: https://cdn.example.com/codemirror/',
        ].join('\n'),
      },
      editorSettings: {
        mainClassName: 'AssignmentMain',
      },
    }, 7);

    const categories = {
      variables: true,
      logic: false,
      loops: true,
      math: true,
      text: true,
      lists: false,
      functions: false,
    };

    expect(question.getCodeContainerOptions({
      type: 'code',
      code: 'public class Main {}',
      sourceFiles: [
        {
          fileName: 'Helper.java',
          code: 'public class Helper {}',
          visibleToLearner: false,
          learnerEditable: true,
        },
      ],
      allowAddingFiles: true,
      editorMode: 'both',
      blocklyCategories: categories,
      blocklyWorkspaceState: { blocks: { blocks: [] } },
    })).toMatchObject({
      fromParent: true,
      teavmAssetBaseUrl: 'https://cdn.example.com/teavm/',
      blocklyCdnUrl: 'https://cdn.example.com/blockly/',
      codeMirrorCdnUrl: 'https://cdn.example.com/codemirror/',
      entryFileName: 'AssignmentMain.java',
      downloadFilename: 'AssignmentMain.java',
      sourceFiles: [
        {
          name: 'Helper.java',
          code: 'public class Helper {}',
          visible: false,
          editable: true,
        },
      ],
      allowAddingFiles: true,
      editorMode: 'both',
      blocklyCategories: categories,
      blocklyWorkspaceState: { blocks: { blocks: [] } },
      blocklyPackages: [],
      projectStorageEnabled: true,
      projectBundleType: 'h5p-java-question-project',
    });
  });

  it('passes multi-file and Blockly options to assignment editors', () => {
    const categories = {
      variables: true,
      logic: true,
      loops: false,
      math: true,
      text: true,
      lists: true,
      functions: false,
    };

    const question = new JavaQuestion({
      advancedOptions: {},
      editorSettings: {
        mainClassName: 'CourseMain',
        sourceFiles: [
          {
            fileName: 'Model.java',
            code: 'public class Model {}',
            visibleToLearner: true,
            learnerEditable: false,
          },
        ],
        allowAddingFiles: true,
        editorMode: 'blocks',
        blocklyCategories: categories,
      },
    }, 8);

    expect(question.getCodeContainerOptions()).toMatchObject({
      entryFileName: 'CourseMain.java',
      downloadFilename: 'CourseMain.java',
      sourceFiles: [
        {
          name: 'Model.java',
          code: 'public class Model {}',
          visible: true,
          editable: false,
        },
      ],
      allowAddingFiles: true,
      editorMode: 'blocks',
      blocklyCategories: categories,
      blocklyWorkspaceState: null,
      blocklyPackages: [],
    });
  });

  it('normalizes Java runtime limit options from advanced settings', () => {
    const question = new JavaQuestion({
      advancedOptions: {
        compileTimeoutMs: 90000,
        executionTimeoutMs: 3000,
        maxOutputChars: 1234,
      },
      editorSettings: {
        mainClassName: 'Main',
        startingCode: 'public class Main {}',
      },
      gradingSettings: {},
    }, 9);

    expect(question.getRuntimeOptions()).toMatchObject({
      compileTimeoutMs: 90000,
      executionTimeoutMs: 3000,
      maxOutputChars: 1234,
    });
  });
});
