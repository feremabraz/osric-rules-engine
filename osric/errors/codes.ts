// Phase 6: Central engine runtime error codes (expanded)
// Structural or startup validation errors (dependency missing, conflicting keys) throw directly before start completes.
export type CommandErrorCode =
  | 'PARAM_INVALID'
  | 'RULE_EXCEPTION'
  | 'STORE_CONSTRAINT'
  | 'DEPENDENCY_MISSING'
  | 'CONFLICTING_RESULT_KEY'
  // Domain specific examples (extend as needed)
  | 'CHARACTER_NOT_FOUND'
  | 'NO_LEADER';

// Phase 08: structural vs domain code categorization
export type EngineStructuralCode =
  | 'PARAM_INVALID'
  | 'RULE_EXCEPTION'
  | 'DEPENDENCY_MISSING'
  | 'CONFLICTING_RESULT_KEY';
export type DomainCode = Exclude<CommandErrorCode, EngineStructuralCode>;

export type EngineErrorCode = CommandErrorCode; // alias for public export

// Domain failure container produced by ctx.fail()
export interface DomainFailure {
  __fail: true;
  code: DomainCode;
  message: string;
}

export const domainFail = (code: DomainFailure['code'], message: string): DomainFailure => ({
  __fail: true,
  code,
  message,
});

export function isStructuralCode(code: CommandErrorCode): code is EngineStructuralCode {
  return (
    code === 'PARAM_INVALID' ||
    code === 'RULE_EXCEPTION' ||
    code === 'DEPENDENCY_MISSING' ||
    code === 'CONFLICTING_RESULT_KEY'
  );
}
