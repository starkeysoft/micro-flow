/**
 * Error messages used in the micro-flow library.
 * 
 * @enum {string}
 * @readonly
 */
const errors = {
  INVALID_STATE_PATH: 'The provided state path is invalid.\n',
  INVALID_CONDITIONAL: 'Conditional properties are required for LogicStep.',
};

/**
 * Warning messages used in the micro-flow library.
 * These are typically logged to the console to alert developers of potential issues.
 * 
 * @enum {string}
 * @readonly
 */
const warnings = {
  DO_NOT_SET_STEPS_DIRECTLY: 'Using this.setState("steps", ...) is not recommended. ' +
    'State will not be initialized correctly. Use workflow methods to manage steps instead.',
  BROADCAST_FAILED: 'Broadcast failed or is not supported in this environment. The error has more detail:\n',
};

export { errors, warnings };
