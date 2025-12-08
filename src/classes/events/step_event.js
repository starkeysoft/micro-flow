import { Event } from './index.js';
import { step_event_names } from '../../enums/index.js';

/**
 * Manages step-specific events by extending the base Event class.
 * @class StepEvent
 * @extends Event
 */
export default class StepEvent extends Event {
  event_names = step_event_names;

  /**
   * Creates a new StepEvent instance and registers all step events.
   * @constructor
   */
  constructor() {
    super();
    this.registerStepEvents();
  }
  
  /**
   * Registers all step event names defined in the step_event_names enum.
   * @returns {void}
   */
  registerStepEvents() {
    this.registerEvents(this.event_names);
  }
}
