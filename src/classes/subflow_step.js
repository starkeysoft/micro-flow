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
    this.subflow = subflow;

    super({
      name,
      type: step_types.SUBFLOW,
      callable: this.executeSubflow.bind(this)
    });
  }

  /**
   * Executes the sub-workflow with the provided arguments.
   * @async
   * @param {Object} args - The arguments to pass to the sub-workflow.
   * @returns {Promise<*>} The result of executing the sub-workflow.
   */
  async executeSubflow(args) {
    this.logStep(`executing subflow: ${this.subflow.name}`);
    return await this.subflow.execute(args);
  }
}
