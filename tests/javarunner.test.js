import { describe, expect, it, vi } from 'vitest';

async function freshRunner(opts = {}) {
  vi.resetModules();

  const { default: JavaRunner } = await import('../src/scripts/runtime/javarunner.js');

  const runtime = {
    onSuccess: vi.fn(),
    onError: vi.fn(),
    onStatus: vi.fn(),
  };
  const compiler = opts.compiler || {
    ensureReady: vi.fn(async () => {}),
    compile: vi.fn(async () => ({ ok: true, wasm: new Uint8Array([0, 1, 2]) })),
  };

  const runner = new JavaRunner(runtime, {
    compiler,
    mainClassName: 'Main',
    compileProgressDelaysMs: [],
    ...opts,
  });

  runner.runCompiledWebAssembly = opts.runCompiledWebAssembly || vi.fn(async () => ({
    stdout: 'Hello, World!\n',
    stderr: '',
    exitCode: 0,
  }));

  return { runner, runtime, compiler };
}

describe('JavaRunner.buildFullCode', () => {
  it('returns student code when no pre/post code is set', async () => {
    const { runner } = await freshRunner();
    expect(runner.buildFullCode('class Main {}')).toBe('class Main {}');
  });

  it('prepends preCode and appends postCode', async () => {
    const { runner } = await freshRunner({ preCode: '// pre', postCode: '// post' });
    expect(runner.buildFullCode('class Main {}')).toBe('// pre\nclass Main {}\n// post');
  });

  it('skips empty preCode / postCode entries', async () => {
    const { runner } = await freshRunner({ preCode: '', postCode: '   ' });
    expect(runner.buildFullCode('class Main {}')).toBe('class Main {}');
  });
});

describe('JavaRunner — TeaVM playground compiler flow', () => {
  it('loads the browser compiler, compiles source in the worker, and runs returned WASM', async () => {
    globalThis.fetch = vi.fn();
    const { runner, runtime, compiler } = await freshRunner({
      preCode: '// header',
      postCode: '// footer',
    });

    await runner.execute('class Main {}');

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(compiler.ensureReady).toHaveBeenCalledOnce();
    expect(compiler.compile).toHaveBeenCalledOnce();
    expect(compiler.compile.mock.calls[0][0]).toBe('// header\nclass Main {}\n// footer');
    expect(compiler.compile.mock.calls[0][2]).toEqual({
      mainClassName: 'Main',
      sources: [
        {
          fileName: 'Main.java',
          text: '// header\nclass Main {}\n// footer',
        },
      ],
    });
    expect(runner.runCompiledWebAssembly).toHaveBeenCalledWith(new Uint8Array([0, 1, 2]));
    expect(runtime.onSuccess).toHaveBeenCalledWith('Hello, World!\n', '');
  });

  it('compiles multiple Java source files as one TeaVM project', async () => {
    const { runner, runtime, compiler } = await freshRunner();

    await runner.executeProject({
      entryFileName: 'Main.java',
      files: [
        {
          name: 'Main.java',
          code: 'public class Main { public static void main(String[] args) { System.out.println(new Helper().answer()); } }',
          isEntry: true,
        },
        {
          name: 'Helper.java',
          code: 'public class Helper { public int answer() { return 42; } }',
          isEntry: false,
        },
      ],
    });

    expect(compiler.compile).toHaveBeenCalledOnce();
    expect(compiler.compile.mock.calls[0][2]).toEqual({
      mainClassName: 'Main',
      sources: [
        {
          fileName: 'Main.java',
          text: 'public class Main { public static void main(String[] args) { System.out.println(new Helper().answer()); } }',
        },
        {
          fileName: 'Helper.java',
          text: 'public class Helper { public int answer() { return 42; } }',
        },
      ],
    });
    expect(runtime.onSuccess).toHaveBeenCalledWith('Hello, World!\n', '');
  });

  it('emits visible status messages for the TeaVM phases', async () => {
    const { runner, runtime } = await freshRunner({
      statusMessages: {
        loading: 'load compiler',
        ready: 'compiler ready',
        preparing: 'prepare source',
        compiling: 'compile source',
        running: 'run program',
      },
    });

    await runner.execute('class Main {}');

    expect(runtime.onStatus.mock.calls.map(([message]) => message)).toEqual([
      'load compiler',
      'compiler ready',
      'prepare source',
      'compile source',
      'run program',
    ]);
  });

  it('forwards compiler diagnostics when TeaVM reports a compile failure', async () => {
    const compiler = {
      ensureReady: vi.fn(async () => {}),
      compile: vi.fn(async () => ({
        ok: false,
        output: 'Main.java:1: cannot find symbol',
      })),
    };

    const { runner, runtime } = await freshRunner({ compiler });
    await runner.execute('class Main {}');

    expect(runtime.onSuccess).not.toHaveBeenCalled();
    expect(runtime.onError).toHaveBeenCalledOnce();
    const [message] = runtime.onError.mock.calls[0];
    expect(message).toContain('Compilation error');
    expect(message).toContain('cannot find symbol');
    expect(message).toContain('Check the spelling of variable, method, and class names');
  });

  it('rejects multi-file projects with duplicate Java file names before compiling', async () => {
    const { runner, runtime, compiler } = await freshRunner();

    await runner.executeProject({
      entryFileName: 'Main.java',
      files: [
        { name: 'Main.java', code: 'public class Main {}', isEntry: true },
        { name: 'Main.java', code: 'public class Main {}', isEntry: false },
      ],
    });

    expect(compiler.compile).not.toHaveBeenCalled();
    expect(runtime.onError).toHaveBeenCalledOnce();
    expect(runtime.onError.mock.calls[0][0]).toContain('Duplicate Java file "Main.java"');
  });

  it('rejects public class/file name mismatches with a learner-facing hint', async () => {
    const { runner, runtime, compiler } = await freshRunner();

    await runner.executeProject({
      entryFileName: 'Main.java',
      files: [
        { name: 'Main.java', code: 'public class OtherName {}', isEntry: true },
      ],
    });

    expect(compiler.compile).not.toHaveBeenCalled();
    expect(runtime.onError).toHaveBeenCalledOnce();
    const [message] = runtime.onError.mock.calls[0];
    expect(message).toContain('File "Main.java" declares public class "OtherName"');
    expect(message).toContain('Rename the file to "OtherName.java"');
  });

  it('fails with a concrete timeout message when browser compilation does not return', async () => {
    const compiler = {
      ensureReady: vi.fn(async () => {}),
      compile: vi.fn(() => new Promise(() => {})),
    };

    const { runner, runtime } = await freshRunner({
      compiler,
      compileTimeoutMs: 1,
      statusMessages: {
        compileTimeout: 'compile timed out',
      },
    });

    await runner.execute('class Main {}');

    expect(runtime.onSuccess).not.toHaveBeenCalled();
    const [message] = runtime.onError.mock.calls[0];
    expect(message).toContain('compile timed out');
  });

  it('keeps emitting status while TeaVM compilation takes a long time', async () => {
    const compiler = {
      ensureReady: vi.fn(async () => {}),
      compile: vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
        return { ok: true, wasm: new Uint8Array([1]) };
      }),
    };

    const { runner, runtime } = await freshRunner({
      compiler,
      compileProgressDelaysMs: [1, 2],
      statusMessages: {
        compilerStillRunning: 'still compiling',
        devToolsDebuggerHint: 'still waiting',
      },
    });
    await runner.execute('class Main {}');

    const messages = runtime.onStatus.mock.calls.map(([message]) => message);
    expect(messages).toContain('still compiling');
    expect(messages).toContain('still waiting');
  });
});

describe('JavaRunner — execution results', () => {
  it('calls onError when execution exits non-zero with no stdout', async () => {
    const { runner, runtime } = await freshRunner({
      runCompiledWebAssembly: vi.fn(async () => ({
        stdout: '',
        stderr: 'Exception in thread "main"\n',
        exitCode: 1,
      })),
    });

    await runner.execute('class Main {}');

    expect(runtime.onSuccess).not.toHaveBeenCalled();
    const [message] = runtime.onError.mock.calls[0];
    expect(message).toContain('Exception in thread');
  });

  it('passes stderr through on successful execution', async () => {
    const { runner, runtime } = await freshRunner({
      runCompiledWebAssembly: vi.fn(async () => ({
        stdout: 'ok\n',
        stderr: 'warning\n',
        exitCode: 0,
      })),
    });

    await runner.execute('class Main {}');

    expect(runtime.onSuccess).toHaveBeenCalledWith('ok\n', 'warning\n');
  });

  it('truncates excessive stdout and stderr before forwarding output', async () => {
    const { runner, runtime } = await freshRunner({
      maxOutputChars: 5,
      runCompiledWebAssembly: vi.fn(async () => ({
        stdout: 'abcdefghij',
        stderr: 'klmnopqrst',
        exitCode: 0,
      })),
    });

    await runner.execute('class Main {}');

    expect(runtime.onSuccess).toHaveBeenCalledWith(
      'abcde\n[Output truncated after 5 characters]',
      'klmno\n[Output truncated after 5 characters]',
    );
  });
});

describe('JavaRunner — setup() and stop()', () => {
  it('setup() exists and resolves without throwing', async () => {
    const { runner } = await freshRunner();
    await expect(runner.setup()).resolves.toBeUndefined();
  });

  it('prevents callbacks from firing after stop()', async () => {
    let resolveCompile = null;
    const compiler = {
      ensureReady: vi.fn(async () => {}),
      compile: vi.fn(() => new Promise((resolve) => {
        resolveCompile = resolve;
      })),
    };

    const { runner, runtime } = await freshRunner({ compiler });
    const execPromise = runner.execute('class Main {}');

    await new Promise((resolve) => setTimeout(resolve, 0));
    runner.stop();
    resolveCompile({ ok: true, wasm: new Uint8Array([1]) });
    await execPromise;

    expect(runtime.onSuccess).not.toHaveBeenCalled();
    expect(runtime.onError).not.toHaveBeenCalled();
  });
});

describe('TeaVmAssetResolver CDN defaults', () => {
  it('uses the versioned jsDelivr asset base when no local override is configured', async () => {
    vi.resetModules();

    const { default: TeaVmAssetResolver, DEFAULT_TEAVM_ASSET_BASE_URL } = await import('../src/scripts/runtime/teavm-assets.js');
    const urls = new TeaVmAssetResolver().buildUrls();

    expect(DEFAULT_TEAVM_ASSET_BASE_URL).toBe('https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/');
    expect(urls).toEqual({
      workerUrl: 'https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/worker.js',
      stdlibUrl: 'https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/compile-classlib-teavm.bin',
      runtimeStdlibUrl: 'https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/runtime-classlib-teavm.bin',
      frameUrl: 'https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/run-frame.html',
      frameScriptUrl: 'https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/frame.js',
    });
    expect(Object.values(urls).some((url) => url.includes('/libraries/H5P.JavaQuestion-1.0/teavm/'))).toBe(false);
  });

  it('still allows all TeaVM CDN asset URLs to be overridden explicitly', async () => {
    vi.resetModules();

    const { default: TeaVmAssetResolver } = await import('../src/scripts/runtime/teavm-assets.js');
    const urls = new TeaVmAssetResolver({
      teavmAssetBaseUrl: 'https://cdn.example.test/base/',
      teavmWorkerUrl: 'https://cdn.example.test/custom/worker.js',
      teavmStdlibUrl: 'https://cdn.example.test/custom/sdk.bin',
      teavmRuntimeStdlibUrl: 'https://cdn.example.test/custom/runtime.bin',
      teavmFrameUrl: 'https://cdn.example.test/custom/run.html',
      teavmFrameScriptUrl: 'https://cdn.example.test/custom/frame.js',
    }).buildUrls();

    expect(urls).toEqual({
      workerUrl: 'https://cdn.example.test/custom/worker.js',
      stdlibUrl: 'https://cdn.example.test/custom/sdk.bin',
      runtimeStdlibUrl: 'https://cdn.example.test/custom/runtime.bin',
      frameUrl: 'https://cdn.example.test/custom/run.html',
      frameScriptUrl: 'https://cdn.example.test/custom/frame.js',
    });
  });
});

describe('TeaVmPlaygroundCompiler CDN worker bridge', () => {
  it('wraps cross-origin worker URLs in a same-origin blob worker', async () => {
    vi.resetModules();

    const previousWorker = globalThis.Worker;
    const previousLocation = globalThis.location;
    const previousCreateObjectUrl = globalThis.URL.createObjectURL;
    const previousRevokeObjectUrl = globalThis.URL.revokeObjectURL;
    const createdWorkers = [];

    class MockWorker {
      constructor(url) {
        this.url = url;
        createdWorkers.push(this);
      }
    }

    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { href: 'http://localhost:8080/view/H5P.JavaQuestion/JavaSmoke' },
    });
    globalThis.Worker = MockWorker;
    Object.defineProperty(globalThis.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:http://localhost:8080/teavm-worker'),
    });
    Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    try {
      const { TeaVmPlaygroundCompiler } = await import('../src/scripts/runtime/teavm-compiler.js');
      const compiler = new TeaVmPlaygroundCompiler({
        teavmWorkerUrl: 'https://cdn.jsdelivr.net/gh/example/h5p-java-question@v1.0.0/teavm/worker.js',
      });

      const worker = compiler.createWorker();
      const [blob] = globalThis.URL.createObjectURL.mock.calls[0];
      const wrapperSource = await blob.text();

      expect(worker.url).toBe('blob:http://localhost:8080/teavm-worker');
      expect(wrapperSource).toContain(
        'self.__H5P_TEAVM_ASSET_BASE_URL = "https://cdn.jsdelivr.net/gh/example/h5p-java-question@v1.0.0/teavm/";',
      );
      expect(wrapperSource).toContain(
        'importScripts("https://cdn.jsdelivr.net/gh/example/h5p-java-question@v1.0.0/teavm/worker.js");',
      );

      compiler.worker = worker;
      compiler.revokeWorkerBlobUrl();
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:8080/teavm-worker');
    }
    finally {
      globalThis.Worker = previousWorker;
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: previousLocation,
      });
      Object.defineProperty(globalThis.URL, 'createObjectURL', {
        configurable: true,
        value: previousCreateObjectUrl,
      });
      Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
        configurable: true,
        value: previousRevokeObjectUrl,
      });
    }
  });
});

describe('TeaVmFrameRunner CDN frame bridge', () => {
  it('wraps cross-origin frame URLs in a blob document that imports frame.js from the CDN', async () => {
    vi.resetModules();

    const previousLocation = globalThis.location;
    const previousCreateObjectUrl = globalThis.URL.createObjectURL;
    const createdUrls = [];

    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { href: 'http://localhost:8080/view/H5P.JavaQuestion/JavaSmoke' },
    });
    Object.defineProperty(globalThis.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => {
        const url = `blob:http://localhost:8080/frame-${createdUrls.length + 1}`;
        createdUrls.push(url);
        return url;
      }),
    });

    try {
      const { default: TeaVmFrameRunner } = await import('../src/scripts/runtime/teavm-frame-runner.js');
      const runner = new TeaVmFrameRunner({
        teavmAssetBaseUrl: 'https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/',
      });

      const frameUrl = runner.getFrameUrl();
      const [blob] = globalThis.URL.createObjectURL.mock.calls[0];
      const wrapperSource = await blob.text();

      expect(frameUrl).toBe('blob:http://localhost:8080/frame-1');
      expect(wrapperSource).toContain(
        'import { start } from "https://cdn.jsdelivr.net/gh/asbl/teaVM-h5p@1.0.0/frame.js";',
      );
    }
    finally {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: previousLocation,
      });
      Object.defineProperty(globalThis.URL, 'createObjectURL', {
        configurable: true,
        value: previousCreateObjectUrl,
      });
    }
  });
});

describe('JavaManualRuntime output handling', () => {
  async function freshManualRuntime() {
    vi.resetModules();
    const previousH5P = globalThis.H5P;

    globalThis.H5P = {
      Runtime: class {},
      ManualRuntimeMixin: (Base) => class extends Base {
        async onSuccess() {}
      },
    };

    const { default: JavaManualRuntime } = await import('../src/scripts/runtime/runtime-manual-java.js');
    const runtime = new JavaManualRuntime();

    return { runtime, restore: () => { globalThis.H5P = previousH5P; } };
  }

  it('writes stdout through the shared manual output handler', async () => {
    const { runtime, restore } = await freshManualRuntime();
    try {
      runtime.outputHandler = vi.fn();
      runtime.writeConsoleSafe = vi.fn();
      runtime.showConsoleSafe = vi.fn();
      runtime.resizeActionHandler = vi.fn();
      runtime.codeContainer = { renderJavaResult: vi.fn() };

      await runtime.onSuccess('Hello, World!\n', '');

      expect(runtime.outputHandler).toHaveBeenCalledWith('Hello, World!\n', true);
      expect(runtime.writeConsoleSafe).not.toHaveBeenCalled();
      expect(runtime.codeContainer.renderJavaResult).not.toHaveBeenCalled();
      expect(runtime.resizeActionHandler).toHaveBeenCalledOnce();
    }
    finally {
      restore();
    }
  });

  it('keeps stderr in the console without using the stdout popup path', async () => {
    const { runtime, restore } = await freshManualRuntime();
    try {
      runtime.outputHandler = vi.fn();
      runtime.writeConsoleSafe = vi.fn();
      runtime.showConsoleSafe = vi.fn();
      runtime.resizeActionHandler = vi.fn();

      await runtime.onSuccess('', 'warning\n');

      expect(runtime.outputHandler).not.toHaveBeenCalled();
      expect(runtime.writeConsoleSafe).toHaveBeenCalledWith('warning\n', '!>');
      expect(runtime.showConsoleSafe).toHaveBeenCalledOnce();
    }
    finally {
      restore();
    }
  });
});
