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

const default_state = {
  messages: {
    errors,
    warnings,
  },
  statuses: {
    workflow: workflow_statuses,
    step: step_statuses
  },
  event_names: {
    workflow: workflow_event_names,
    step: step_event_names,
    state: state_event_names,
  },
  events: {
    workflow: new WorkflowEvent(),
    step: new StepEvent(),
    state: new StateEvent(),
  },
  types: {
    base_types,
    step_types,
    sub_step_types,
  },
  workflows: {},
  conditional_step_comparators
};

let state = { ...default_state };

// Module-level shortcuts for events and event_names
const events = state.events;
const event_names = state.event_names;

/**
 * Parses a property path string into an array of keys, supporting both dot notation
 * and bracket notation. Shared by both the deprecated singleton `State` and per-instance
 * `InstanceState`.
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
 * Builds a fresh data object for a `Workflow`/`Step` instance's own state, seeded with the
 * same framework constants (statuses, event enums, event emitters, comparators) the deprecated
 * `State` singleton used to provide - but with its own independent, empty `workflows` registry
 * rather than sharing the process-wide one.
 *
 * The event emitters (and other constant objects) are shared by reference with the singleton's
 * defaults so that `on()`/`off()` listeners registered via `State.get('events.workflow')` keep
 * receiving events regardless of whether a given `Workflow`/`Step` has opted back into
 * `use_state_singleton`.
 *
 * @returns {Object} A fresh instance-state data object.
 */
export function createInstanceStateData() {
  return {
    messages: default_state.messages,
    statuses: default_state.statuses,
    event_names: default_state.event_names,
    events: default_state.events,
    types: default_state.types,
    conditional_step_comparators: default_state.conditional_step_comparators,
    workflows: {},
  };
}

/**
 * Per-instance replacement for the deprecated `State` singleton. Each `Workflow` owns one of
 * these (created in its constructor), and shares it with every `Step` added to it, so that
 * `getState()`/`setState()`/`deleteState()` calls made anywhere in that workflow's tree read and
 * write the same, workflow-scoped data instead of a single process-wide object.
 *
 * Supports the same dot-notation/bracket-notation path access as `State`.
 *
 * @class InstanceState
 */
export class InstanceState {
  /**
   * Creates a new InstanceState.
   * @param {Object} [initial] - Initial data, defaults to a fresh `createInstanceStateData()` result.
   */
  constructor(initial = createInstanceStateData()) {
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

/**
 * Singleton class representing the global state for workflows, steps, and processes.
 * Provides methods for managing state with getter/setter functionality, nested path access,
 * and immutability options. The state is shared across all workflow and step instances.
 * 
 * @class State
 */
class State {
  /**
   * Deletes a state property using dot-notation or bracket-notation path access.
   * 
   * @param {string} path - The path of the state property to delete (e.g., "user.profile.email" or "users[0].email").
   * @returns {void}
   * @throws {Error} Throws if path is empty or invalid.
   */
  static delete(path) {
    if (!path) {
      throw new Error(errors.INVALID_STATE_PATH);
    }
    
    const parts = State.parsePath(path);
    let current = state;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!Object.prototype.hasOwnProperty.call(current, part) || typeof current[part] !== 'object') {
        return;
      }
      
      current = current[part];
    }
    
    delete current[parts[parts.length - 1]];

    events.state.emit(event_names.state.DELETED, { state });
  }

  /**
   * Iterates over a collection (array or object) located at the specified state path,
   * executing a callback function for each item.
   * 
   * @param {string} path - The path of the state property to iterate over.
   * @param {Function} callback - The function to execute for each item in the collection.
   * @throws {Error} Throws if the state property at the path is not an array or object.
   */
  static async each(path, callback) {
    const collection = State.get(path);
    
    if (Array.isArray(collection)) {
      for (const [index, item] of collection.entries()) {
        events.state.emit(event_names.state.EACH, { state });
        await callback(item, index);
      }
    } else if (
      typeof collection === 'object' &&
      Object.prototype.toString.call(collection) === '[object Object]'
    ) {
      for (const key of Object.keys(collection)) {
        events.state.emit(event_names.state.EACH, { state });
        await callback(collection[key], key);
      }
    } else {
      throw new Error(errors.VALUE_NOT_ITERABLE);
    }
  }

  /**
   * Freezes the entire state object, making it immutable.
   * @returns {void}
   */
  static freeze() {
    const frozen_state = Object.freeze(state);
    events.state.emit(event_names.state.FROZEN, { state });
    return frozen_state;
  }

  /**
   * Gets the value of a state property using dot-notation or bracket-notation path access.
   * 
   * @param {string} path - The path of the state property to get. Supports both dot notation
   * (e.g., "user.profile.name") and bracket notation (e.g., "users[0].name" or "data['key-name']").
   * Special values:
   * - Falsy values (null, undefined, false, ""): Returns entire state object
   * - "*": Returns entire state object
   * @param {*} [defaultValue=null] - Default value to return if the path doesn't exist.
   * @param {string} [type='string'] - The output type to convert the value to.
   * Supported types: "string", "number", "boolean".
   * @returns {*} The value of the state property, or defaultValue if not found. null if not found
   * and no defaultValue provided.
   * @throws {Error} Throws if the value cannot be converted to the specified type.
   */
  static get(path, defaultValue = null, type = null) {
    let gotten = state;
    if (!path || ['*', ''].includes(path)) {
      events.state.emit(event_names.state.GET, { state: gotten ?? defaultValue });
      return gotten;
    }

    gotten = State.getFromPropertyPath(path, false) ?? defaultValue;

    if (type) {
      try {
        switch (type) {
          case 'string':
            gotten = String(gotten);
            break;
          case 'number':
            gotten = Number(gotten);
            break;
          case 'boolean':
            gotten = Boolean(gotten);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error("Error converting state value: ", error);
      }
    }

    events.state.emit(event_names.state.GET, { state: gotten });

    return gotten ?? defaultValue;
  }

  /**
   * Resolves a nested property path within the state object.
   * Supports both dot notation and bracket notation.
   * 
   * @param {string} path - The path to the property (e.g., "user.profile.name", "users[0].name", "data['key-name']").
   * @param {boolean} [emit=true] - Whether to emit the GET_FROM_PROPERTY_PATH event.
   * @returns {*} The value at the specified path, or undefined if not found.
   */
  static getFromPropertyPath(path, emit = true) {
    const parts = State.parsePath(path);
    let current = state;

    for (const part of parts) {
      if (current && Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    if (emit) {
      events.state.emit(event_names.state.GET_FROM_PROPERTY_PATH, { state });
    }

    return current;
  }

  /**
   * Gets the entire state object.
   * @returns {Object} The entire state object.
   */
  static getState() {
    events.state.emit(event_names.state.GET_STATE, { state });
    return state;
  }

  /**
   * Merges an object into the current State.
   * @param {Object} newState - The object to merge into the current State.
   * @returns {object} The updated state object.
   */
  static merge(newState) {
    state = { ...state, ...newState };
    events.state.emit(event_names.state.MERGE, { state });
    return state;
  }

  /**
   * Parses a property path string into an array of keys, supporting both dot notation
   * and bracket notation.
   * 
   * @param {string} path - The path to parse (e.g., "user.profile.name", "users[0].name", "data['key-name']").
   * @returns {string[]} Array of property keys.
   */
  static parsePath(path) {
    const matches = path.match(/[^.[\]]+|(?<=\[)([^\]]+)(?=\])/g);
    
    if (!matches) {
      return [];
    }

    return matches.map(part => part.replace(/^['"]|['"]$/g, ''));
  }

  /**
   * Resets the state to its default values.
   * @returns {object} The reset state object.
   */
  static reset() {
    state = { 
      ...default_state,
      workflows: {},  // Always create fresh to avoid shared reference mutation
    };
    events.state.emit(event_names.state.RESET, { state });
    return state;
  }

  /**
   * Sets the value of a state property using dot-notation or bracket-notation path access.
   * Creates intermediate objects if they don't exist.
   * 
   * @param {string} path - The path of the state property to set. Supports both dot notation
   * (e.g., "user.profile.name") and bracket notation (e.g., "users[0].name" or "data['key-name']").
   * @param {*} value - The value to set for the state property.
   * @returns {void}
   * @throws {Error} Throws if path is empty or invalid.
   */
  static set(path, value) {
    if (!path) {
      throw new Error(errors.INVALID_STATE_PATH);
    }

    events.state.emit(event_names.state.SET, { state });

    State.setToPropertyPath(path, value, false);
  }

  /**
   * Sets a nested property value within the state object based on a path.
   * Supports both dot notation and bracket notation. Creates intermediate objects/arrays as needed.
   * 
   * @param {string} path - The path to the property (e.g., "user.profile.name", "users[0].name", "data['key-name']").
   * @param {*} value - The value to set at the specified path.
   * @param {boolean} [emit=true] - Whether to emit the SET_TO_PROPERTY_PATH event.
   */
  static setToPropertyPath(path, value, emit = true) {
    const parts = State.parsePath(path);
    let current = state;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const next_part = parts[i + 1];
      
      if (!Object.prototype.hasOwnProperty.call(current, part) || typeof current[part] !== 'object') {
        // Determine if next part is an array index (numeric)
        const is_next_part_numeric = /^\d+$/.test(next_part);
        current[part] = is_next_part_numeric ? [] : {};
      }
      current = current[part];
    }
    
    if (emit) {
      events.state.emit(event_names.state.SET_TO_PROPERTY_PATH, { state });
    }

    current[parts[parts.length - 1]] = value;
  }
}

export default State;
