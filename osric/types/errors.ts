import type { ErrorType } from '@osric/types/constants';

export interface OSRICError {
  type: ErrorType;

  message: string;

  context?: Record<string, unknown>;

  source?: string;

  details?: string[];

  cause?: Error | OSRICError;

  timestamp?: Date;

  suggestions?: string[];
}

export class OSRICErrorBuilder {
  private error: Partial<OSRICError> = {
    timestamp: new Date(),
  };

  static create(type: ErrorType, message: string): OSRICErrorBuilder {
    const builder = new OSRICErrorBuilder();
    builder.error.type = type;
    builder.error.message = message;
    return builder;
  }

  withContext(context: Record<string, unknown>): OSRICErrorBuilder {
    this.error.context = { ...this.error.context, ...context };
    return this;
  }

  withSource(source: string): OSRICErrorBuilder {
    this.error.source = source;
    return this;
  }

  withDetails(details: string[]): OSRICErrorBuilder {
    this.error.details = details;
    return this;
  }

  withCause(cause: Error | OSRICError): OSRICErrorBuilder {
    this.error.cause = cause;
    return this;
  }

  withSuggestions(suggestions: string[]): OSRICErrorBuilder {
    this.error.suggestions = suggestions;
    return this;
  }

  build(): OSRICError {
    if (!this.error.type || !this.error.message) {
      throw new Error('Error type and message are required');
    }
    return this.error as OSRICError;
  }
}

export interface CommandResult {
  kind: 'success' | 'failure';
  message: string;
  data?: Record<string, unknown>;
  effects?: string[];
  damage?: number[];
  error?: OSRICError;
}

export interface RuleResult {
  kind: 'success' | 'failure';
  message: string;
  stopChain?: boolean;
  critical?: boolean;
  data?: Record<string, unknown>;
  effects?: string[];
  damage?: number[];
  error?: OSRICError;
}

export const ErrorFactory = {
  entityNotFound(entityId: string, source?: string): OSRICError {
    return OSRICErrorBuilder.create('entity-not-found', `Entity with ID '${entityId}' not found`)
      .withContext({ entityId })
      .withSource(source || 'Unknown')
      .withSuggestions([
        'Verify the entity ID is correct',
        'Ensure the entity exists in the current context',
        'Check if the entity was properly created',
      ])
      .build();
  },

  invalidParameter(paramName: string, value: unknown, source?: string): OSRICError {
    return OSRICErrorBuilder.create(
      'invalid-parameter',
      `Invalid parameter '${paramName}': ${value}`
    )
      .withContext({ paramName, value, valueType: typeof value })
      .withSource(source || 'Unknown')
      .withSuggestions([
        `Check the type and format of parameter '${paramName}'`,
        'Refer to the command/rule documentation for valid values',
      ])
      .build();
  },

  missingParameter(paramName: string, source?: string): OSRICError {
    return OSRICErrorBuilder.create(
      'missing-parameter',
      `Required parameter '${paramName}' is missing`
    )
      .withContext({ paramName })
      .withSource(source || 'Unknown')
      .withSuggestions([
        `Provide the required parameter '${paramName}'`,
        'Check the command/rule documentation for required parameters',
      ])
      .build();
  },

  commandCannotExecute(commandType: string, reason: string, source?: string): OSRICError {
    return OSRICErrorBuilder.create(
      'command-cannot-execute',
      `Command '${commandType}' cannot execute: ${reason}`
    )
      .withContext({ commandType, reason })
      .withSource(source || 'Unknown')
      .withSuggestions([
        'Check command prerequisites',
        'Verify entity states and conditions',
        'Ensure required resources are available',
      ])
      .build();
  },

  ruleValidationFailed(ruleName: string, reason: string, source?: string): OSRICError {
    return OSRICErrorBuilder.create(
      'rule-validation-failed',
      `Rule '${ruleName}' validation failed: ${reason}`
    )
      .withContext({ ruleName, reason })
      .withSource(source || 'Unknown')
      .withSuggestions([
        'Check rule prerequisites',
        'Verify input parameters',
        'Review OSRIC compliance requirements',
      ])
      .build();
  },

  osricViolation(ruleName: string, violation: string, source?: string): OSRICError {
    return OSRICErrorBuilder.create(
      'osric-violation',
      `OSRIC rule violation in '${ruleName}': ${violation}`
    )
      .withContext({ ruleName, violation })
      .withSource(source || 'Unknown')
      .withDetails([
        'This operation would violate OSRIC game rules',
        'The system is designed to preserve exact OSRIC mechanics',
        `Violation: ${violation}`,
      ])
      .withSuggestions([
        'Adjust parameters to comply with OSRIC rules',
        'Check the OSRIC rulebook for valid ranges and restrictions',
        'Use valid OSRIC values and mechanics',
      ])
      .build();
  },

  spellFailure(spellName: string, reason: string, source?: string): OSRICError {
    return OSRICErrorBuilder.create('spell-failure', `Spell '${spellName}' failed: ${reason}`)
      .withContext({ spellName, reason })
      .withSource(source || 'Unknown')
      .withSuggestions([
        'Check spell components and requirements',
        'Verify caster has available spell slots',
        'Ensure target is within range and valid',
      ])
      .build();
  },

  attackFailed(reason: string, source?: string): OSRICError {
    return OSRICErrorBuilder.create('attack-failed', `Attack failed: ${reason}`)
      .withContext({ reason })
      .withSource(source || 'Unknown')
      .withSuggestions([
        'Check attacker and target states',
        'Verify weapon availability and proficiency',
        'Ensure target is within range',
      ])
      .build();
  },

  componentMissing(componentName: string, spellName: string, source?: string): OSRICError {
    return OSRICErrorBuilder.create(
      'component-missing',
      `Missing component '${componentName}' for spell '${spellName}'`
    )
      .withContext({ componentName, spellName })
      .withSource(source || 'Unknown')
      .withSuggestions([
        'Acquire the required component',
        'Check if component pouch can substitute',
        "Use a different spell that doesn't require this component",
      ])
      .build();
  },

  spellSlotUnavailable(spellLevel: number, source?: string): OSRICError {
    return OSRICErrorBuilder.create(
      'spell-slot-unavailable',
      `No available spell slot for level ${spellLevel}`
    )
      .withContext({ spellLevel })
      .withSource(source || 'Unknown')
      .withSuggestions([
        'Rest to recover spell slots',
        'Use a lower level spell slot if available',
        'Wait until after next rest period',
      ])
      .build();
  },

  internalError(message: string, cause?: Error, source?: string): OSRICError {
    const builder = OSRICErrorBuilder.create('internal-error', `Internal system error: ${message}`)
      .withContext({ originalMessage: message })
      .withSource(source || 'System')
      .withSuggestions([
        'This is a system error that should be reported',
        'Try the operation again',
        'Contact support if the issue persists',
      ]);

    if (cause) {
      builder.withCause(cause);
    }

    return builder.build();
  },
} as const;

export const ErrorUtils = {
  isOSRICError(error: unknown): error is OSRICError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error &&
      'timestamp' in error &&
      'source' in error
    );
  },

  isErrorType(error: OSRICError, errorType: ErrorType): boolean {
    return error.type === errorType;
  },

  hasContext<T = Record<string, unknown>>(error: OSRICError): error is OSRICError & { context: T } {
    return error.context !== undefined;
  },

  hasCause(error: OSRICError): error is OSRICError & { cause: Error } {
    return error.cause !== undefined;
  },

  formatForDisplay(error: OSRICError): string {
    let display = `[${error.type}] ${error.message}`;

    if (error.context) {
      const contextStr = Object.entries(error.context)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      display += ` (${contextStr})`;
    }

    if (error.suggestions && error.suggestions.length > 0) {
      display += '\nSuggestions:\n';
      display += error.suggestions.map((s) => `  • ${s}`).join('\n');
    }

    return display;
  },

  getErrorChain(error: OSRICError): OSRICError[] {
    const chain: OSRICError[] = [error];
    let current = error.cause;

    while (current && ErrorUtils.isOSRICError(current)) {
      chain.push(current);
      current = current.cause;
    }

    return chain;
  },

  aggregateErrors(errors: OSRICError[]): OSRICError {
    if (errors.length === 0) {
      return ErrorFactory.internalError('No errors to aggregate');
    }

    if (errors.length === 1) {
      return errors[0];
    }

    const primaryError = errors[0];
    const additionalErrors = errors.slice(1);

    return OSRICErrorBuilder.create(
      'multiple-errors',
      `Multiple errors occurred (${errors.length} total)`
    )
      .withContext({
        primaryError: primaryError.message,
        additionalErrorCount: additionalErrors.length,
        allErrorCodes: errors.map((e) => e.type),
      })
      .withSource('ErrorUtils.aggregateErrors')
      .withDetails([
        `Primary error: ${primaryError.message}`,
        ...additionalErrors.map((e, i) => `Error ${i + 2}: ${e.message}`),
      ])
      .withSuggestions([
        'Address the primary error first',
        'Check if resolving the primary error fixes the others',
        'Review all error details for complete resolution',
      ])
      .build();
  },

  fromString(message: string, type: ErrorType = 'unknown-error', source?: string): OSRICError {
    return OSRICErrorBuilder.create(type, message)
      .withSource(source || 'Legacy')
      .build();
  },
} as const;
