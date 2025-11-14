import Step from './step.js';
import step_types from '../enums/step_types.js';

/**
 * Represents a subflow step in a workflow that executes a sub-workflow.
 * @class SubflowStep
 * @extends Step
 */
export default class SubflowStep extends Step {
  static step_name = step_types.SUBFLOW;

  /**
   * Creates a new SubflowStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the subflow step.
   * @param {Workflow} options.subflow - The sub-workflow to execute.
   * @param {string} [options.name=''] - The name of the subflow step.
   */
  constructor({
    subflow,
    name = '',
  }) {
    super({
      name,
      type: step_types.SUBFLOW,
    });

    this.subflow = subflow;
    this.callable = this.executeSubflow.bind(this);
  }

  /**
   * Executes the sub-workflow with the provided arguments.
   * @async
   * @param {Object} args - The arguments to pass to the sub-workflow.
   * @returns {Promise<*>} The result of executing the sub-workflow.
   * @throws {Error} If the sub-workflow execution fails with exit_on_failure=true.
   */
  async executeSubflow(args) {
    this.logStep(`executing subflow: ${this.subflow.state.get('name')}`);
    
    // Don't pass steps or steps_by_id to avoid overwriting the sub-workflow's own steps
    const { steps, steps_by_id, ...argsWithoutSteps } = args || {};
    
    // Listen for workflow errors to capture and re-throw them
    let workflowError = null;
    const errorHandler = ({ error }) => {
      workflowError = error;
    };
    
    this.subflow.events.on(this.subflow.events.event_names.WORKFLOW_ERRORED, errorHandler);
    
    try {
      const result = await this.subflow.execute(argsWithoutSteps);
      
      // Only throw if exit_on_failure is true and an error occurred
      if (workflowError && this.subflow.state.get('exit_on_failure')) {
        throw workflowError;
      }
      
      return result;
    } finally {
      this.subflow.events.off(this.subflow.events.event_names.WORKFLOW_ERRORED, errorHandler);
    }
  }
}
