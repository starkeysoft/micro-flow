import LogicStep from './logic_step.js';
import Step from './step.js';
import logic_step_types from '../enums/logic_step_types.js';
import { state } from 'happy-dom/lib/PropertySymbol.js';

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
    
    this.setStepStateValue('subject', subject);
    this.setStepStateValue('operator', operator);
    this.setStepStateValue('value', value);
    this.setStepStateValue('step_left', step_left);
    this.setStepStateValue('step_right', step_right);
    this.setStepStateValue('callable', this.conditional.bind(this));
  }

  /**
   * Executes either the left or right step based on the condition evaluation.
   * The workflow state is accessible through this.workflow during execution.
   * @async
   * @returns {Promise<Object|null>} The result of executing the chosen step {result, state}, or null if no step is provided.
   */
  async conditional() {
    const step_left = this.getStepStateValue('step_left');
    const step_right = this.getStepStateValue('step_right');

    let result = null;
    
    if (this.checkCondition()) {
      this.logStep(`Condition met for step: ${this.getStepStateValue('name')}, executing left branch '${step_left.getStateStepValue('name')}'`);

      if (typeof step_left === 'function') {
        result = await step_left(state);
      } else {
        result = await step_left.execute(state);
      }
    } else {
      this.logStep(`Condition not met for step: ${this.getStepStateValue('name')}, executing right branch '${step_right.getStateStepValue('name')}'`);

      if (typeof step_right === 'function') {
        result = await step_right(state);
      } else {
        result = await step_right.execute(state);
      }
    }
  
    return { message: `ConditionalStep ${this.getStepStateValue('name') ?? this.getStepStateValue('id')} executed ${this.checkCondition() ? `left ('${step_left.getStateStepValue('name')}')` : `right ('${step_right.getStateStepValue('name')}')`} branch`, ...result };
  }
}
