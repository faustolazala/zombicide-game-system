export class RuleValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RuleValidationError";
    this.code = code;
    Object.assign(this, details);
  }
}

export function assertRule(condition, code, message, details) {
  if (!condition) throw new RuleValidationError(code, message, details);
}
