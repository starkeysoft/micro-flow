import deep_clone from '../helpers/deep_clone';

/**
 * Class representing the state of a workflow or process.
 * Provides methods for managing workflow state with getter/setter functionality.
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
   * @returns {*} The value of the state property.
   */
  get(key) {
    return this.state[key];
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
   */
  set(key, value) {
    this.state[key] = value;
  }

  /**
   * Merges an object into the current state.
   * @param {Object} newState - The object to merge into the current state.
   */
  merge(newState) {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Freezes the state object to prevent further modifications.
   */
  freeze() {
    Object.freeze(this.state);
  }

  /**
   * Prepares the state by calculating execution time and freezing the state.
   * @param {number} start_time - The start time of the execution.
   */
  prepare(start_time) {
    this.state.execution_time_ms = Date.now() - start_time;
    this.freeze();
  }
}
