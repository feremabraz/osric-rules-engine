// CE-13 Public API snapshot
import { describe, expect, it } from 'vitest';
import * as api from '../../engine/index';

describe('CE-13 public API snapshot', () => {
  it('exports expected keys', () => {
    const keys = Object.keys(api).sort();
    expect(keys).toEqual([
      'Engine',
      'MemoryStore',
      'command',
      'computeHash',
      'createRng',
      'deepFreeze',
      'diffSnapshots',
      'domainFail',
      'engineFail',
      'processBatch',
      'success',
      'verifyHash',
    ]);
  });
});
