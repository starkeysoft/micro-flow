import { Event } from './index.js';
import { state_event_names } from '../../enums/index.js';

/**
 * Manages state-specific events by extending the base Event class.
 * @class StateEvent
 * @extends Event
 */
export default class StateEvent extends Event {
  event_names = state_event_names;

  /**
   * Creates a new StateEvent instance and registers all state events.
   * @constructor
   */
  constructor() {
    super();
    this.registerStateEvents();
  }

  /**
   * Registers all state event names defined in the state_event_names enum.
   * @returns {void}
   */
  registerStateEvents() {
    this.registerEvents(this.event_names);
  }
}
