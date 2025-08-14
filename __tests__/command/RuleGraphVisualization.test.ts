import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Rule } from '../../osric/command/Rule';
import { defineCommand } from '../../osric/command/define';
import { explainRuleGraph } from '../../osric/command/graph';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';

// Local mini command to produce deterministic graph independent from large command set ordering
class A extends Rule<{ a: number }> {
  static ruleName = 'A';
  static output = z.object({ a: z.number() });
  apply() {
    return { a: 1 };
  }
}
class B extends Rule<{ b: number }> {
  static ruleName = 'B';
  static after = ['A'];
  static output = z.object({ b: z.number() });
  apply() {
    return { b: 2 };
  }
}
class C extends Rule<{ c: number }> {
  static ruleName = 'C';
  static after = ['A'];
  static output = z.object({ c: z.number() });
  apply() {
    return { c: 3 };
  }
}
class D extends Rule<{ d: number }> {
  static ruleName = 'D';
  static after = ['B', 'C'];
  static output = z.object({ d: z.number() });
  apply() {
    return { d: 4 };
  }
}

const Mini = defineCommand({ key: 'miniGraph', params: z.object({}), rules: [A, B, C, D] });

describe('RuleGraphVisualization', () => {
  it('produces stable graph structure', () => {
    resetRegisteredCommands();
    registerCommand(Mini as unknown as typeof import('../../osric/command/Command').Command);
    const graph = explainRuleGraph('miniGraph');
    expect(graph).toMatchInlineSnapshot(`
      {
        "command": "miniGraph",
        "edges": [
          {
            "from": "A",
            "to": "B",
            "type": "depends",
          },
          {
            "from": "A",
            "to": "C",
            "type": "depends",
          },
          {
            "from": "B",
            "to": "D",
            "type": "depends",
          },
          {
            "from": "C",
            "to": "D",
            "type": "depends",
          },
        ],
        "nodes": [
          "A",
          "B",
          "C",
          "D",
        ],
        "topoOrder": [
          "A",
          "B",
          "C",
          "D",
        ],
      }
    `);
  });
});
