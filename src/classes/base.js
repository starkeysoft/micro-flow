import crypto from 'crypto';
import { base_types } from '../enums/index.js';
import State from './state.js';
import { InstanceState } from './instance_state.js';

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
   * @param {boolean} [options.use_state_singleton=false] - Deprecated. When true, `getState`/`setState`/`deleteState`
   * fall back to the process-wide `State` singleton instead of this instance's own state. `Workflow` passes this
   * value down to every `Step` it owns, so it only needs to be set once, on the workflow.
   * @param {InstanceState|null} [options.state=null] - The `InstanceState` this instance's `getState`/`setState`/
   * `deleteState` calls should read and write. `Workflow` creates its own on construction and shares it with its
   * `Step`s; a `Step` created standalone (not yet added to a workflow) gets its own until it's added to one.
   */
  constructor({ name, base_type = base_types.STEP, use_state_singleton = false, state = null }) {
    this.id = crypto.randomUUID();
    this.name = name ?? `${base_type}-${this.id}`;

    this.base_type = base_type;
    this.use_state_singleton = use_state_singleton;
    this.state = use_state_singleton ? null : (state ?? new InstanceState());
    this.timing = {
      cancel_time: null,
      complete_time: null,
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

    const log_message = message ? `\n[${this.base_type.toUpperCase()} - ${this.name}] ${message}` : `\n[${this.base_type.toUpperCase()} - ${this.name}] Event: ${event_name}`;
    const log_type = event_name.endsWith('_failed') ? 'error' : 'log';

    console[log_type](log_message);
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
    this.timing.start_time = this.timing.start_time ?? new Date();
    this.status = State.get('statuses')[this.base_type].RUNNING;

    this.log(
      State.get(`event_names.${this.base_type}`)[`${this.base_type.toUpperCase()}_RUNNING`],
      `${this.base_type.charAt(0).toUpperCase() + this.base_type.slice(1)} "${this.name}" started.`
    );
  }

  // State management methods
  /**
   * Gets a value from this instance's own state (the `Workflow`'s state, shared with its `Step`s).
   * Set `use_state_singleton: true` (on the owning `Workflow`) to instead read from the
   * deprecated, process-wide `State` singleton.
   * @param {string} path - Path to the state property.
   * @returns {*} The state value at the specified path.
   */
  getState(path) {
    if (this.use_state_singleton) {
      console.warn('The state singleton has been deprecated. Use the .prepareForSerialization() method on the workflow instance instead.');
      return State.get(path);
    }

    return this.state.get(path);
  }

  /**
   * Sets a value in this instance's own state (the `Workflow`'s state, shared with its `Step`s).
   * Set `use_state_singleton: true` (on the owning `Workflow`) to instead write to the
   * deprecated, process-wide `State` singleton.
   * @param {string} path - Path to the state property.
   * @param {*} value - Value to set.
   */
  setState(path, value) {
    if (this.use_state_singleton) {
      console.warn('The state singleton has been deprecated. Use the .prepareForSerialization() method on the workflow instance instead.');
      State.set(path, value);
      return;
    }

    this.state.set(path, value);
  }

  /**
   * Deletes a property from this instance's own state (the `Workflow`'s state, shared with its `Step`s).
   * Set `use_state_singleton: true` (on the owning `Workflow`) to instead delete from the
   * deprecated, process-wide `State` singleton.
   * @param {string} path - Path to the state property to delete.
   */
  deleteState(path) {
    if (this.use_state_singleton) {
      console.warn('The state singleton has been deprecated. Use the .prepareForSerialization() method on the workflow instance instead.');
      State.delete(path);
      return;
    }

    this.state.delete(path);
  }
}
