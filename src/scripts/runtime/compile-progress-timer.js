export default class CompileProgressTimer {

  constructor(options = {}) {
    this.timeoutMs = Number(options.timeoutMs || 120000);
    this.timeoutMessage = options.timeoutMessage || 'TeaVM compilation timed out.';
    this.delaysMs = Array.isArray(options.delaysMs) ? options.delaysMs : [];
    this.progressMessages = Array.isArray(options.progressMessages) ? options.progressMessages : [];
    this.onStatus = typeof options.onStatus === 'function' ? options.onStatus : () => {};
  }

  async race(compileCallback) {
    const timers = [];

    this.delaysMs.forEach((delay, index) => {
      const message = this.progressMessages[index] || this.progressMessages[0];
      if (!message) {
        return;
      }

      timers.push(setTimeout(() => {
        this.onStatus(message);
      }, delay));
    });

    const timeoutPromise = new Promise((resolve) => {
      timers.push(setTimeout(() => {
        resolve({
          ok: false,
          output: this.timeoutMessage,
        });
      }, this.timeoutMs));
    });

    try {
      return await Promise.race([
        compileCallback(),
        timeoutPromise,
      ]);
    }
    finally {
      timers.forEach((timer) => clearTimeout(timer));
    }
  }
}
