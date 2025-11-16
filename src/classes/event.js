/**
 * Base event class that extends EventTarget for cross-platform event management.
 * Compatible with both Node.js (v14.5+) and web browsers. Can be used with either
 * addEventListener/removeEventListener or EventEmitter-style on/off methods.
 * @class Event
 * @extends EventTarget
 */
export default class Event extends EventTarget {
  /**
   * Creates a new Event instance.
   * @constructor
   */
  constructor() {
    super();
    this.events = {};
    this._listener_map = new WeakMap();
  }

  /**
   * Registers multiple events by creating Event instances for each event name.
   * @param {Object} event_names - An object containing event name constants.
   * @returns {void}
   */
  registerEvents(event_names) {
    for (const event_name of Object.values(event_names)) {
      this.events[event_name] = new Event();
    }
  }

  /**
   * Emits a custom event with optional data payload.
   * This method maintains API compatibility with EventEmitter while using CustomEvent.
   * @param {string} event_name - The name of the event to emit.
   * @param {*} [data] - Optional data to pass with the event in the detail property.
   * @param {boolean} [bubbles=false] - Whether the event should bubble up through the DOM.
   * @param {boolean} [cancelable=true] - Whether the event is cancelable.
   * @returns {boolean} True if the event was not cancelled, false if it was cancelled.
   */
  emit(event_name, data, bubbles = false, cancelable = true) {
    const custom_event = new CustomEvent(event_name, {
      detail: data,
      bubbles,
      cancelable
    });
    return this.dispatchEvent(custom_event);
  }

  /**
   * Adds an event listener with EventEmitter-style API.
   * Maintains compatibility with the original API while using addEventListener.
   * @param {string} event_name - The name of the event to listen for.
   * @param {Function} listener - The callback function to execute when the event fires.
   * @returns {Event} Returns this for chaining.
   */
  on(event_name, listener) {
    const wrapped_listener = (event) => {
      // Call the listener with the detail (data) from CustomEvent
      listener(event.detail);
    };
    
    // Store the original listener reference for removeListener
    this._listener_map.set(listener, wrapped_listener);
    
    this.addEventListener(event_name, wrapped_listener);
    return this;
  }

  /**
   * Adds a one-time event listener with EventEmitter-style API.
   * @param {string} event_name - The name of the event to listen for.
   * @param {Function} listener - The callback function to execute when the event fires.
   * @returns {Event} Returns this for chaining.
   */
  once(event_name, listener) {
    const wrapped_listener = (event) => {
      listener(event.detail);
    };
    
    this.addEventListener(event_name, wrapped_listener, { once: true });
    return this;
  }

  /**
   * Removes an event listener with EventEmitter-style API.
   * @param {string} event_name - The name of the event.
   * @param {Function} listener - The callback function to remove.
   * @returns {Event} Returns this for chaining.
   */
  off(event_name, listener) {
    if (this._listener_map && this._listener_map.has(listener)) {
      const wrapped_listener = this._listener_map.get(listener);
      this.removeEventListener(event_name, wrapped_listener);
      this._listener_map.delete(listener);
    }
    return this;
  }

  /**
   * Alias for off() to maintain EventEmitter API compatibility.
   * @param {string} event_name - The name of the event.
   * @param {Function} listener - The callback function to remove.
   * @returns {Event} Returns this for chaining.
   */
  removeListener(event_name, listener) {
    return this.off(event_name, listener);
  }
}
