/**
 * @fileoverview Error messages and warnings used throughout the micro-flow library.
 * These constants provide consistent error messaging and help with debugging.
 */

/**
 * Error messages used in the micro-flow library.
 * 
 * @enum {string}
 * @readonly
 */
const errors = {
  INVALID_STATE_PATH: 'The provided state path is invalid.\n',
};

/**
 * Warning messages used in the micro-flow library.
 * These are typically logged to the console to alert developers of potential issues.
 * 
 * @enum {string}
 * @readonly
 * @example
 * import { warnings } from 'micro-flow';
 * 
 * if (path === 'steps' && !suppressWarning) {
 *   console.warn(warnings.DO_NOT_SET_STEPS_DIRECTLY);
 * }
 */
const warnings = {
  DO_NOT_SET_STEPS_DIRECTLY: 'Directly setting the "steps" property is not recommended.\n\tState will not be initialized correctly.\n\tUse workflow methods to manage steps.\n',
  BROADCAST_FAILED: 'Broadcast failed or is not supported in this environment. The error has more detail:\n',
};

export { errors, warnings };
