// Basic type definitions for compatibility
declare global {
  var ErrorUtils: {
    getGlobalHandler(): (error: Error, isFatal: boolean) => void;
    setGlobalHandler(handler: (error: Error, isFatal: boolean) => void): void;
  } | undefined;
  
  var global: any;
  var window: any;
  function require(module: string): any;
  function btoa(data: string): string;
  function atob(data: string): string;
  function fetch(input: string, init?: any): Promise<any>;
  function setInterval(callback: () => void, ms: number): any;
  function clearInterval(id: any): void;
  function setTimeout(callback: () => void, ms: number): any;
  function clearTimeout(id: any): void;
}

interface Array<T> {
  includes(searchElement: T): boolean;
}

export {};