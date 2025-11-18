import LogicStep from './logic_step.js';
import Step from './step.js';
import logic_step_types from '../enums/logic_step_types.js';

/**
 * Represents a conditional step that executes one of two possible paths based on a condition.
 * @class ConditionalStep
 * @extends LogicStep
 */
export default class ConditionalStep extends LogicStep {
  static step_name = logic_step_types.CONDITIONAL;
  /**
   * Creates a new ConditionalStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the conditional step.
   * @param {*} options.subject - The value to compare against.
   * @param {string} options.operator - The comparison operator to use (e.g., '===', '==', '!=', '>', '<', '>=', '<=').
   * @param {*} options.value - The value to compare the subject with.
   * @param {Step|Workflow} options.step_left - The step or workflow to execute if the condition is met (true branch).
   * @param {Step|Workflow} options.step_right - The step or workflow to execute if the condition is not met (false branch).
   * @param {string} [options.name=''] - The name of the conditional step.
   */
  constructor({
    subject,
    operator,
    value,
    step_left,
    step_right,
    name = '',
  } = {}) {
    super({
      type: logic_step_types.CONDITIONAL,
      name,
      callable: async () => {}
    });
    
    this.state.set('subject', subject);
    this.state.set('operator', operator);
    this.state.set('value', value);
    this.state.set('step_left', step_left);
    this.state.set('step_right', step_right);
    this.state.set('callable', this.conditional.bind(this));
  }

  /**
   * Executes either the left or right step based on the condition evaluation.
   * The workflow state is accessible through this.workflow during execution.
   * @async
   * @returns {Promise<Object|null>} The result of executing the chosen step {result, state}, or null if no step is provided.
   */
  async conditional() {
    const step_left = this.state.get('step_left');
    const step_right = this.state.get('step_right');
    
    if (this.checkCondition()) {
      this.logStep(`Condition met for step: ${this.state.get('name')}, executing left branch '${step_left.state.get('name')}'`);

      const result = step_left && typeof step_left.markAsComplete === 'function' ? await step_left.execute({ workflow: this.workflow, step: step_left }) : null;
    }

    this.logStep(`Condition not met for step: ${this.state.get('name')}, executing right branch '${step_right.state.get('name')}'`);
    const result = step_right && typeof step_right.markAsComplete === 'function' ? await step_right.execute({ workflow: this.workflow, step: step_right }) : null;
  
    return { message: `ConditionalStep ${this.state.get('name') ?? this.state.get('id')} executed ${this.checkCondition() ? `left ('${step_left.state.get('name')}')` : `right ('${step_right.state.get('name')}')`} branch`, ...result };
  }
}
