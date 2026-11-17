import { sha256Hex, solveChallenge } from '@/features/auth/services/challengeSolver';

describe('Proof-of-Work Challenge Solver', () => {
  it('correctly hashes standard strings with SHA-256', () => {
    // Known SHA-256 test vectors:
    // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    // sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('finds a valid PoW solution meeting the requested difficulty', () => {
    const nonce = 'test-nonce-salt-12345';
    const difficulty = 2; // Starts with "00"
    const solution = solveChallenge(nonce, difficulty);

    expect(solution).toBeDefined();
    const hash = sha256Hex(`${nonce}:${solution}`);
    expect(hash.startsWith('00')).toBe(true);
  });
});
