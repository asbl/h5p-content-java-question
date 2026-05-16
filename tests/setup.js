import { afterEach, vi } from 'vitest';

class BaseCodeQuestion {
  constructor(params = {}, contentId, extras = {}) {
    this.params = params;
    this.contentId = contentId;
    this.extras = extras;
    this.l10n = { parentValue: 'parent' };
  }

  getCodeContainerOptions() {
    return { fromParent: true };
  }

  getRuntimeOptions() {
    return {};
  }

  getDecodedCode(code = '') {
    return String(code || '');
  }

  getCodeTesterFactory() {
    return {
      create: vi.fn(() => ({ type: 'tester' })),
    };
  }
}

globalThis.H5P = {
  t: vi.fn((key) => `[Missing translation: ${key}]`),
  createUUID: vi.fn(() => 'uuid'),
  CodeQuestion: BaseCodeQuestion,
  CodeQuestionContainer: class {},
  Runtime: class {},
  TestRuntimeMixin: (Base) => class extends Base {},
  SolutionRuntimeMixin: (Base) => class extends Base {},
  ManualRuntimeMixin: (Base) => class extends Base {},
};

afterEach(() => {
  globalThis.H5P.t.mockClear();
  globalThis.H5P.createUUID.mockClear();
  if (typeof document !== 'undefined') {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  }
});
