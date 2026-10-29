import '@testing-library/jest-dom';
import zlib from 'node:zlib';

// Polyfill createZstdDecompress for Node environments prior to v22.15.0 to prevent undici decompress.bind error
if (zlib && typeof zlib.createZstdDecompress !== 'function') {
  zlib.createZstdDecompress = function () {
    return new (require('node:stream').Transform)();
  };
}

// Polyfill window.matchMedia for JSDOM
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
