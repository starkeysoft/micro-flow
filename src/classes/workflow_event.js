import Event from './event.js';
import workflow_event_names from '../enums/workflow_event_names.js';

/**
 * Manages workflow-specific events by extending the base Event class.
 * @class WorkflowEvent
 * @extends Event
 */
export default class WorkflowEvent extends Event {
  event_names = workflow_event_names;

  /**
   * Creates a new WorkflowEvent instance and registers all workflow events.
   * @constructor
   */
  constructor() {
    super();
    this.registerWorkflowEvents();
  }

  /**
   * Registers all workflow event names defined in the workflow_event_names enum.
   * @returns {void}
   */
  registerWorkflowEvents() {
    this.registerEvents(this.event_names);
  }
}
