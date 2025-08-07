class CrashHandler {
  private static originalHandler: any = null;
  private static crashCallback: ((error: Error, isFatal: boolean) => void) | null = null;

  static setup(callback: (error: Error, isFatal: boolean) => void): void {
    this.crashCallback = callback;
    
    try {
      if (typeof ErrorUtils !== 'undefined') {
        this.originalHandler = ErrorUtils.getGlobalHandler();
        ErrorUtils.setGlobalHandler(this.handleError.bind(this));
      }
    } catch {
      // ErrorUtils not available
    }

    try {
      const globalObj = (function() { return this; })();
      if (globalObj && globalObj.process && globalObj.process.on) {
        globalObj.process.on('unhandledRejection', (reason: any) => {
          const error = reason instanceof Error ? reason : new Error(String(reason));
          this.handleError(error, false);
        });
      }
    } catch {
      // Process events not available
    }
  }

  private static handleError(error: Error, isFatal: boolean): void {
    try {
      this.crashCallback?.(error, isFatal);
    } catch (callbackError) {
      console.error('Crash callback failed:', callbackError);
    }

    // Call original handler
    if (this.originalHandler) {
      this.originalHandler(error, isFatal);
    }
  }
}

export default CrashHandler;