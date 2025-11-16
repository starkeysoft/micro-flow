import deep_clone from '../helpers/deep_clone.js';

/**
 * Class representing the state of a workflow, step, or process.
 * Provides methods for managing state with getter/setter functionality and immutability options.
 * @class State
 */
export default class State {
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
   * Gets the value of a state property.
   * @param {string} key - The key of the state property to get.
   * @param {*} [defaultValue=null] - Default value to return if the key doesn't exist.
   * @returns {*} The value of the state property, or defaultValue if not found.
   */
  get(key, defaultValue = null) {
    return this.state[key] ?? defaultValue;
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
   * Sets the value of a state property.
   * @param {string} key - The key of the state property to set.
   * @param {*} value - The value to set for the state property.
   * @returns {void}
   */
  set(key, value) {
    this.state[key] = value;
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
   * Prepares the state by calculating execution time and optionally freezing the state.
   * @param {number} start_time - The start time of the execution.
   * @param {boolean} [freeze=true] - Whether to freeze the state after preparation.
   * @returns {void}
   */
  prepare(start_time, freeze = true) {
    this.state.execution_time_ms = Date.now() - start_time;

    if (freeze) {
      this.freeze();
    }
  }
}
