import { v4 as uuidv4 } from 'uuid';
import { base_types } from '../enums/index.js';
import State from './state.js';

/**
 * Base class for workflows and steps.
 * Provides common functionality for timing, status management, logging, and state access.
 * @class Base
 */
export default class Base {
  /**
   * Creates a new Base instance.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the instance.
   * @param {string} [options.base_type=base_types.STEP] - Type of the base instance.
   */
  constructor({ name, base_type = base_types.STEP }) {
    this.id = uuidv4();
    this.name = name ?? `${base_type}-${this.id}`;

    this.base_type = base_type;
    this.timing = {
      cancel_time: null,
      complete_time: null,
      end_time: null,
      execution_time_ms: null,
      start_time: null,
    }
  }

  /**
   * Executes the instance. Must be overridden by subclasses.
   * @async
   * @throws {Error} Throws if not implemented in subclass.
   */
  async execute() {
    throw new Error('Execute method not implemented');
  }

  /**
   * Logs an event and emits it to the appropriate event emitter.
   * @param {string} event_name - Name of the event to log.
   * @param {string} [message=null] - Optional message to log.
   * @throws {Error} Throws if event name is invalid or event emitter not found.
   */
  log(event_name, message = null) {
    if (!event_name || !State.get(`events.${this.base_type}`)) {
      throw new Error('Invalid event name or event emitter not found');
    }

    State.get(`events.${this.base_type}`).emit(event_name, this);
    if (State.get('log_suppress')) {
      return;
    }

    const logMessage = message ? `\n[${this.base_type.toUpperCase()} - ${this.name}] ${message}` : `\n[${this.base_type.toUpperCase()} - ${this.name}] Event: ${event_name}`;
    const logType = event_name.endsWith('_FAILED') ? 'error' : 'log';

    console[logType](logMessage);
  }

  /**
   * Marks the instance as complete and calculates execution time.
   */
  markAsComplete() {
    this.timing.complete_time = new Date();
    this.status = State.get('statuses')[this.base_type].COMPLETE;
    this.timing.execution_time_ms = this.timing.complete_time - this.timing.start_time;

    if (this.steps_by_id) {
      delete this.steps_by_id;
    }

    this.log(
      State.get(`event_names.${this.base_type}`)[`${this.base_type.toUpperCase()}_COMPLETE`],
      `${this.base_type.charAt(0).toUpperCase() + this.base_type.slice(1)} "${this.name}" complete.`
    );
  }

  /**
   * Marks the instance as failed and calculates execution time.
   */
  markAsFailed() {
    this.timing.complete_time = new Date();
    this.status = State.get('statuses')[this.base_type].FAILED;
    this.timing.execution_time_ms = this.timing.complete_time - this.timing.start_time;

    this.log(
      State.get(`event_names.${this.base_type}`)[`${this.base_type.toUpperCase()}_FAILED`],
      `${this.base_type.charAt(0).toUpperCase() + this.base_type.slice(1)} "${this.name}" failed.`
    );
  }

  /**
   * Marks the instance as waiting. To be implemented by subclasses.
   */
  markAsWaiting() { }

  /**
   * Marks the instance as pending. To be implemented by subclasses.
   */
  markAsPending() { }

  /**
   * Marks the instance as running and sets the start time.
   */
  markAsRunning() {
    this.timing.start_time = new Date();
    this.status = State.get('statuses')[this.base_type].RUNNING;

    this.log(
      State.get(`event_names.${this.base_type}`)[`${this.base_type.toUpperCase()}_RUNNING`],
      `${this.base_type.charAt(0).toUpperCase() + this.base_type.slice(1)} "${this.name}" started.`
    );
  }

  // State management methods
  /**
   * Gets a value from the global state.
   * @param {string} path - Path to the state property.
   * @returns {*} The state value at the specified path.
   */
  getState(path) {
    return State.get(path);
  }

  /**
   * Sets a value in the global state.
   * @param {string} path - Path to the state property.
   * @param {*} value - Value to set.
   */
  setState(path, value) {
    State.set(path, value);
  }

  /**
   * Deletes a property from the global state.
   * @param {string} path - Path to the state property to delete.
   */
  deleteState(path) {
    State.delete(path);
  }
}
