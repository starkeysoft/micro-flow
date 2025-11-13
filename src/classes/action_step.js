import Step from './step.js';
import step_types from '../enums/step_types.js';
import Workflow from './workflow.js';

/**
 * Represents an action step in a workflow that executes a callable function.
 * @class ActionStep
 * @extends Step
 */
export default class ActionStep extends Step {
  static step_name = 'action';
  /**
   * Creates a new ActionStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the action step.
   * @param {string} [options.name=''] - The name of the action step.
   * @param {Step | Workflow | Function} [options.callable=()=>{}] - The function to execute when this step runs.
   */
  constructor({ name = '', callable = async () => {} } = {}) {
    super({
      type: step_types.ACTION,
      name,
      callable
    });
  }

  /**
   * Sets the callable function for this action step. This is the only step that
   * can do that after instantiation. It is deliberately designed to be generic
   * and run whatever function is provided.
   * @param {Step | Workflow | Function} callable - The function to execute when this step runs.
   * @returns {void}
   * @throws {Error} If the provided callable is not a function.
   */
  setCallable(callable) {
    this.callable = callable;
  }
}
