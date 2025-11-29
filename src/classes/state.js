import deep_clone from '../helpers/deep_clone.js';
import { errors, warnings } from '../enums/errors.js';

/**
 * Singleton class representing the global state for workflows, steps, and processes.
 * Provides methods for managing state with getter/setter functionality, nested path access,
 * and immutability options. The state is shared across all workflow and step instances.
 * 
 * **Note:** This class is exported as a singleton instance, not the class itself.
 * 
 * @class State
 * @example
 * import state from './state.js';
 * 
 * // Set values using dot notation for nested paths
 * state.set('user.profile.name', 'Alice');
 * state.set('user.profile.age', 30);
 * 
 * // Get values using dot notation
 * console.log(state.get('user.profile.name')); // 'Alice'
 * console.log(state.get('user.profile.age')); // 30
 * 
 * // Get entire state
 * console.log(state.get()); // Returns entire state object
 */
class State {
  static defaultState = {
    id: null,
    name: null,
    exit_on_failure: true,
    current_step: null,
    steps: [],
    events: null,
    should_break: false,
    should_continue: false,
  };

  /**
   * Creates a new State instance.
   * @constructor
   * @param {Object} [initialState={}] - Optional initial state to merge with default state.
   */
  constructor(initialState = {}) {
    this.state = { ...State.defaultState, ...initialState };
  }

  /**
   * Deletes a state property using dot-notation or bracket-notation path access.
   * 
   * @param {string} path - The path of the state property to delete (e.g., "user.profile.email" or "users[0].email").
   * @returns {void}
   * @throws {Error} Throws if path is empty or invalid.
   * @example
   * state.set('user.profile.email', 'alice@example.com');
   * state.delete('user.profile.email');
   * console.log(state.get('user.profile.email')); // null
   * 
   * // Using bracket notation for arrays
   * state.delete('users[0].email');
   */
  delete(path) {
    if (!path) {
      throw new Error(errors.INVALID_STATE_PATH);
    }

    const parts = this.parsePath(path);
    let current = this.state;

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
   * Gets the value of a state property using dot-notation or bracket-notation path access.
   * 
   * @param {string} path - The path of the state property to get. Supports both dot notation
   * (e.g., "user.profile.name") and bracket notation (e.g., "users[0].name" or "data['key-name']").
   * Special values:
   * - Falsy values (null, undefined, false): Returns entire state object
   * - "*" or "": Returns entire state object
   * @param {*} [defaultValue=null] - Default value to return if the path doesn't exist.
   * @returns {*} The value of the state property, or defaultValue if not found.
   * @example
   * // Get nested value with dot notation
   * const name = state.get('user.profile.name');
   * 
   * // Get array element with bracket notation
   * const firstUser = state.get('users[0]');
   * const userName = state.get('users[0].name');
   * 
   * // Get dynamic key with bracket notation
   * const value = state.get("config['api-key']");
   * 
   * // Get with default value
   * const email = state.get('user.email', 'no-email@example.com');
   * 
   * // Get entire state
   * const allState = state.get();
   * const allState2 = state.get('*');
   */
  get(path, defaultValue = null) {
    if (!path || ['*', ''].includes(path)) {
      return this.state;
    }

    return this.getFromPropertyPath(path) ?? defaultValue;
  }

  /**
   * Gets the entire state object.
   * @returns {Object} The entire state object.
   */
  getState() {
    return this.state;
  }

  /**
   * Gets a deep clone of the entire state object.
   * @returns {Object} A deep clone of the entire state object.
   */
  getStateClone() {
    return deep_clone(this.state);
  }

  /**
   * Sets the value of a state property using dot-notation or bracket-notation path access.
   * Creates intermediate objects if they don't exist.
   * 
   * **Warning:** Setting the 'steps' property directly will trigger a console warning.
   * Use Workflow methods to manage steps instead.
   * 
   * @param {string} path - The path of the state property to set. Supports both dot notation
   * (e.g., "user.profile.name") and bracket notation (e.g., "users[0].name" or "data['key-name']").
   * @param {*} value - The value to set for the state property.
   * @returns {void}
   * @throws {Error} Throws if path is empty or invalid.
   * @example
   * // Set nested value (creates intermediate objects)
   * state.set('user.profile.name', 'Alice');
   * state.set('user.profile.age', 30);
   * 
   * // Set array element with bracket notation
   * state.set('users[0].name', 'Bob');
   * state.set('users[0].email', 'bob@example.com');
   * 
   * // Set dynamic key with bracket notation
   * state.set("config['api-key']", 'secret123');
   * 
   * // Set top-level value
   * state.set('status', 'active');
   */
  set(path, value) {
    if (!path) {
      throw new Error(errors.INVALID_STATE_PATH);
    }

    if (path == 'steps' && !this.get('suppress_step_warning')) {
      console.warn(warnings.DO_NOT_SET_STEPS_DIRECTLY);
    }

    this.setToPropertyPath(path, value);
  }

  /**
   * Merges an object into the current state.
   * @param {Object} newState - The object to merge into the current state.
   * @returns {void}
   */
  merge(newState) {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Freezes the state object to prevent further modifications.
   * @returns {void}
   */
  freeze() {
    Object.freeze(this.state);
  }

  /**
   * Parses a property path string into an array of keys, supporting both dot notation
   * and bracket notation.
   * 
   * @param {string} path - The path to parse (e.g., "user.profile.name", "users[0].name", "data['key-name']").
   * @returns {string[]} Array of property keys.
   * @private
   * @example
   * parsePath('user.profile.name') // ['user', 'profile', 'name']
   * parsePath('users[0].name') // ['users', '0', 'name']
   * parsePath("config['api-key']") // ['config', 'api-key']
   * parsePath('items[0][1].value') // ['items', '0', '1', 'value']
   */
  parsePath(path) {
    // Match either:
    // - Word characters followed by optional dots (standard keys)
    // - Bracket notation with optional quotes: [0], ['key'], ["key"]
    const matches = path.match(/[^.[\]]+|(?<=\[)([^\]]+)(?=\])/g);
    
    if (!matches) {
      return [];
    }
    
    // Remove quotes from bracketed keys
    return matches.map(part => part.replace(/^['"]|['"]$/g, ''));
  }

  /**
   * Resolves a nested property path within the state object.
   * Supports both dot notation and bracket notation.
   * 
   * @param {string} path - The path to the property (e.g., "user.profile.name", "users[0].name", "data['key-name']").
   * @returns {*} The value at the specified path, or undefined if not found.
   * @example
   * // Given state: { user: { profile: { name: 'Alice' } }, users: [{ name: 'Bob' }] }
   * state.getFromPropertyPath('user.profile.name'); // returns 'Alice'
   * state.getFromPropertyPath('users[0].name'); // returns 'Bob'
   * state.getFromPropertyPath("data['api-key']"); // returns value at data['api-key']
   */
  getFromPropertyPath(path) {
    const parts = this.parsePath(path);
    let current = this.state;

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
   * Sets a nested property value within the state object based on a path.
   * Supports both dot notation and bracket notation. Creates intermediate objects/arrays as needed.
   * 
   * @param {string} path - The path to the property (e.g., "user.profile.name", "users[0].name", "data['key-name']").
   * @param {*} value - The value to set at the specified path.
   * @example
   * // To set state.user.profile.name = 'Alice'
   * state.setToPropertyPath('user.profile.name', 'Alice');
   * 
   * // To set state.users[0].name = 'Bob'
   * state.setToPropertyPath('users[0].name', 'Bob');
   * 
   * // To set state.data['api-key'] = 'secret'
   * state.setToPropertyPath("data['api-key']", 'secret');
   */
  setToPropertyPath(path, value) {
    const parts = this.parsePath(path);
    let current = this.state;

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

    current[parts[parts.length - 1]] = value;
  }
}

const stateInstance = new State();
export default stateInstance;
