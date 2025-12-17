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

const defaultState = {
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

let state = { ...defaultState };

// Module-level shortcuts for events and event_names
const events = state.events;
const event_names = state.event_names;

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
      collection.forEach(async (item, index) => {
        events.state.emit(event_names.state.EACH, { state });

        await callback(item, index);
      });
    } else if (
      typeof collection === 'object' &&
      Object.prototype.toString.call(collection) === '[object Object]'
    ) {
      Object.keys(collection).forEach(async key => {
        events.state.emit(event_names.state.EACH, { state });

        await callback(collection[key], key);
      });
    } else {
      throw new Error(errors.VALUE_NOT_ITERABLE);
    }
  }

  /**
   * Freezes the entire state object, making it immutable.
   * @returns {void}
   */
  static freeze() {
    const frozenState = Object.freeze(state);
    events.state.emit(event_names.state.FROZEN, { state });
    return frozenState;
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
    state = { ...defaultState };
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
      const nextPart = parts[i + 1];
      
      if (!Object.prototype.hasOwnProperty.call(current, part) || typeof current[part] !== 'object') {
        // Determine if next part is an array index (numeric)
        const isNextPartNumeric = /^\d+$/.test(nextPart);
        current[part] = isNextPartNumeric ? [] : {};
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
