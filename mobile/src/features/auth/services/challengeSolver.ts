/**
 * Lightweight, zero-dependency SHA-256 Proof-of-Work Challenge Solver
 * Optimized for React Native Hermes & V8 mobile runtimes.
 */

// Right rotate helper
function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

// SHA-256 constants
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256Hex(ascii: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    bytes.push(ascii.charCodeAt(i) & 0xff);
  }
  const l = bytes.length * 8;

  bytes.push(0x80);
  while ((bytes.length + 8) % 64 !== 0) {
    bytes.push(0);
  }

  // Append length in bits as 64-bit big endian (top 32 bits = 0)
  bytes.push(0, 0, 0, 0);
  bytes.push((l >>> 24) & 0xff);
  bytes.push((l >>> 16) & 0xff);
  bytes.push((l >>> 8) & 0xff);
  bytes.push(l & 0xff);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let i = 0; i < bytes.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      const idx = i + j * 4;
      w[j] =
        ((bytes[idx] & 0xff) << 24) |
        ((bytes[idx + 1] & 0xff) << 16) |
        ((bytes[idx + 2] & 0xff) << 8) |
        (bytes[idx + 3] & 0xff);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(7, w[j - 15]) ^ rotr(18, w[j - 15]) ^ (w[j - 15] >>> 3);
      const s1 = rotr(17, w[j - 2]) ^ rotr(19, w[j - 2]) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let j = 0; j < 64; j++) {
      const s1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + K[j] + w[j]) | 0;
      const s0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const hex = [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((val) => (val >>> 0).toString(16).padStart(8, '0'))
    .join('');

  return hex;
}

/**
 * Solve Proof-of-Work challenge by finding an integer salt
 * such that sha256(nonce + ':' + salt) starts with `difficulty` zeros.
 */
export function solveChallenge(nonce: string, difficulty: number): string {
  const targetPrefix = '0'.repeat(Math.max(1, difficulty));
  let counter = 0;
  while (counter < 2_000_000) {
    const candidate = counter.toString();
    const hash = sha256Hex(`${nonce}:${candidate}`);
    if (hash.startsWith(targetPrefix)) {
      return candidate;
    }
    counter++;
  }
  return counter.toString();
}
