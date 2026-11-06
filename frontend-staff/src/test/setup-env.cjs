const zlib = require('node:zlib');

// Polyfill native zstd decompression for Node environments prior to v22.15.0
// This prevents undici/decompress.js from crashing with:
// TypeError: Cannot read properties of undefined (reading 'bind')
if (typeof zlib.createZstdDecompress !== 'function') {
  zlib.createZstdDecompress = function () {
    const { Transform } = require('node:stream');
    return new Transform({
      transform(chunk, encoding, callback) {
        callback(null, chunk);
      }
    });
  };
}

if (!zlib.constants) {
  zlib.constants = {};
}

if (typeof zlib.constants.ZSTD_d_windowLogMax === 'undefined') {
  zlib.constants.ZSTD_d_windowLogMax = 23;
}
