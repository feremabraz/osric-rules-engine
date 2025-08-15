import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCommand } from '../../osric/command/define';

// Enforce minimum one rule per command

describe('Zero rule command guard', () => {
  it('throws structural COMMAND_NO_RULES error when rules array empty', () => {
    expect(() => defineCommand({ key: 'empty', params: z.object({}), rules: [] })).toThrow(
      /COMMAND_NO_RULES: defineCommand requires at least one rule/
    );
  });
});
