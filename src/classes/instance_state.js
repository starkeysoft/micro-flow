import { errors, warnings } from '../enums/errors.js';
import { StepEvent, WorkflowEvent, StateEvent } from './events/index.js';
import {
  base_types,
  conditional_step_comparators,
  state_event_names,
  step_event_names,
  step_statuses,
  step_types,
  sub_step_types,
  workflow_event_names,
  workflow_statuses,
} from '../enums/index.js';

/**
 * Parses a property path string into an array of keys, supporting both dot notation
 * and bracket notation.
 *
 * @param {string} path - The path to parse (e.g., "user.profile.name", "users[0].name", "data['key-name']").
 * @returns {string[]} Array of property keys.
 */
function parsePath(path) {
  const matches = path.match(/[^.[\]]+|(?<=\[)([^\]]+)(?=\])/g);

  if (!matches) {
    return [];
  }

  return matches.map(part => part.replace(/^['"]|['"]$/g, ''));
}

/**
 * Resolves a nested property path within an arbitrary object.
 * @param {Object} target - The object to read from.
 * @param {string} path - The path to the property.
 * @returns {*} The value at the specified path, or undefined if not found.
 */
function getAtPath(target, path) {
  const parts = parsePath(path);
  let current = target;

  for (const part of parts) {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Sets a nested property value within an arbitrary object based on a path.
 * Creates intermediate objects/arrays as needed.
 * @param {Object} target - The object to write to.
 * @param {string} path - The path to the property.
 * @param {*} value - The value to set at the specified path.
 */
function setAtPath(target, path, value) {
  const parts = parsePath(path);
  let current = target;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next_part = parts[i + 1];

    if (!Object.prototype.hasOwnProperty.call(current, part) || typeof current[part] !== 'object') {
      const is_next_part_numeric = /^\d+$/.test(next_part);
      current[part] = is_next_part_numeric ? [] : {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Deletes a property from an arbitrary object using a path.
 * @param {Object} target - The object to delete from.
 * @param {string} path - The path of the property to delete.
 */
function deleteAtPath(target, path) {
  const parts = parsePath(path);
  let current = target;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (!Object.prototype.hasOwnProperty.call(current, part) || typeof current[part] !== 'object') {
      return;
    }

    current = current[part];
  }

  delete current[parts[parts.length - 1]];
}

/**
 * Converts a resolved state value to the requested output type.
 * @param {*} value - The value to convert.
 * @param {string|null} type - One of "string", "number", "boolean".
 * @returns {*} The converted value, or the original value if conversion fails or type is unrecognized.
 */
function convertType(value, type) {
  if (!type) {
    return value;
  }

  try {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      default:
        return value;
    }
  } catch (error) {
    console.error('Error converting state value: ', error);
    return value;
  }
}

/**
 * Framework constants, built once here as the single canonical source. `Workflow` (see
 * `workflow.js`) assigns these as its own static members - the public surface library
 * consumers should reach them through - while step classes that need one directly may import
 * the named export straight from this module instead of going through `Workflow` (avoiding an
 * import cycle). The deprecated `State` singleton (`state.js`) also builds its `default_state`
 * from these same values, so the `events.*` instances stay identical (by reference) regardless
 * of whether a given `Workflow`/`Step` has opted into `use_state_singleton` - listeners
 * registered via `State.get('events.workflow')` keep receiving events either way.
 */
export const messages = { errors, warnings };
export const statuses = { workflow: workflow_statuses, step: step_statuses };
export const event_names = { workflow: workflow_event_names, step: step_event_names, state: state_event_names };
export const events = { workflow: new WorkflowEvent(), step: new StepEvent(), state: new StateEvent() };
export const types = { base_types, step_types, sub_step_types };
export { conditional_step_comparators };

/**
 * Per-instance replacement for the deprecated `State` singleton. Each `Workflow` owns one of
 * these (created in its constructor), and shares it with every `Step` added to it, so that
 * `getState()`/`setState()`/`deleteState()` calls made anywhere in that workflow's tree read and
 * write the same, workflow-scoped data instead of a single process-wide object. A `Workflow`
 * registers itself under the `workflow` key of its own `InstanceState` (see
 * `initializeWorkflowState()` in `workflow.js`), so `getState('workflow')` resolves to the live
 * owning `Workflow` instance; any other path is arbitrary user data set via `setState()`.
 *
 * Supports the same dot-notation/bracket-notation path access as `State`.
 *
 * @class InstanceState
 */
export class InstanceState {
  /**
   * Creates a new InstanceState.
   * @param {Object} [initial={}] - Initial data.
   */
  constructor(initial = {}) {
    this.data = initial;
  }

  /**
   * Gets the value of a state property using dot-notation or bracket-notation path access.
   * @param {string} path - The path of the state property to get. Falsy values, or "*", return the entire state.
   * @param {*} [defaultValue=null] - Default value to return if the path doesn't exist.
   * @param {string|null} [type=null] - The output type to convert the value to ("string", "number", "boolean").
   * @returns {*} The value of the state property, or defaultValue if not found.
   */
  get(path, defaultValue = null, type = null) {
    if (!path || ['*', ''].includes(path)) {
      return this.data ?? defaultValue;
    }

    const gotten = getAtPath(this.data, path) ?? defaultValue;

    return convertType(gotten, type) ?? defaultValue;
  }

  /**
   * Sets the value of a state property using dot-notation or bracket-notation path access.
   * Creates intermediate objects if they don't exist.
   * @param {string} path - The path of the state property to set.
   * @param {*} value - The value to set for the state property.
   * @throws {Error} Throws if path is empty or invalid.
   */
  set(path, value) {
    if (!path) {
      throw new Error(errors.INVALID_STATE_PATH);
    }

    setAtPath(this.data, path, value);
  }

  /**
   * Resolves a nested property path within this instance's data. Low-level counterpart to
   * `get()` - unlike `get()`, a falsy/`'*'` path is not special-cased to mean "entire state".
   * @param {string} path - The path to the property.
   * @returns {*} The value at the specified path, or undefined if not found.
   */
  getStateFromPropertyPath(path) {
    return getAtPath(this.data, path);
  }

  /**
   * Parses a property path string into an array of keys, supporting both dot notation
   * and bracket notation.
   * @param {string} path - The path to parse.
   * @returns {string[]} Array of property keys.
   */
  parseStatePath(path) {
    return parsePath(path);
  }

  /**
   * Sets a nested property value within this instance's data based on a path. Low-level
   * counterpart to `set()` - unlike `set()`, does not throw on an empty path.
   * @param {string} path - The path to the property.
   * @param {*} value - The value to set at the specified path.
   */
  setStateToPropertyPath(path, value) {
    setAtPath(this.data, path, value);
  }

  /**
   * Deletes a state property using dot-notation or bracket-notation path access.
   * @param {string} path - The path of the state property to delete.
   * @throws {Error} Throws if path is empty or invalid.
   */
  delete(path) {
    if (!path) {
      throw new Error(errors.INVALID_STATE_PATH);
    }

    deleteAtPath(this.data, path);
  }

  /**
   * Merges an object into the current instance state.
   * @param {Object} newState - The object to merge in.
   * @returns {Object} The updated state data.
   */
  merge(newState) {
    this.data = { ...this.data, ...newState };
    return this.data;
  }

  /**
   * Iterates over a collection (array or object) located at the specified path,
   * executing a callback function for each item.
   * @param {string} path - The path of the property to iterate over.
   * @param {Function} callback - The function to execute for each item in the collection.
   * @throws {Error} Throws if the value at the path is not an array or object.
   */
  async each(path, callback) {
    const collection = this.get(path);

    if (Array.isArray(collection)) {
      for (const [index, item] of collection.entries()) {
        await callback(item, index);
      }
    } else if (
      typeof collection === 'object' &&
      Object.prototype.toString.call(collection) === '[object Object]'
    ) {
      for (const key of Object.keys(collection)) {
        await callback(collection[key], key);
      }
    } else {
      throw new Error(errors.VALUE_NOT_ITERABLE);
    }
  }
}
