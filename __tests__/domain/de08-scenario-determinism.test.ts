// DE-08 scenario determinism test
import { describe, expect, it } from 'vitest';
import { runDeterminismScenario } from '../../osric-engine/scenarios/determinism';

describe('DE-08 scenario determinism', () => {
  it('produces identical JSON for same seed', () => {
    const a = runDeterminismScenario(777);
    const b = runDeterminismScenario(777);
    const aj = JSON.stringify(a);
    const bj = JSON.stringify(b);
    expect(aj).toBe(bj);
  });
  it('differs for different seeds (likely)', () => {
    const a = runDeterminismScenario(1001);
    const b = runDeterminismScenario(1002);
    const aj = JSON.stringify(a);
    const bj = JSON.stringify(b);
    expect(aj).not.toBe(bj);
  });
});
