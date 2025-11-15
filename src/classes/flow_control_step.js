import LogicStep from './logic_step';
import logic_step_types from '../enums/logic_step_types.js';
import flow_control_types from '../enums/flow_control_types.js';

/**
 * Represents a flow control step that can break or continue loops based on conditions.
 * @class FlowControlStep
 * @extends LogicStep
 */
export default class FlowControlStep extends LogicStep {
  static step_name = 'flow_control';

  /**
   * Creates a new FlowControlStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the flow control step.
   * @param {*} options.subject - The value to compare against.
   * @param {string} options.operator - The comparison operator to use (e.g., '===', '==', '!=', '>', '<', '>=', '<=').
   * @param {*} options.value - The value to compare the subject with.
   * @param {string} [options.flow_control_type='break'] - The type of flow control (from flow_control_types enum: 'break' or 'continue').
   * @param {string} [options.name=''] - The name of the flow control step.
   */
  constructor({
    subject,
    operator,
    value,
    flow_control_type = flow_control_types.BREAK,
    name = '',
  } = {}) {
    super({
      type: logic_step_types.FLOW_CONTROL,
      name,
      callable: async () => {}
    });

    this.state.set('subject', subject);
    this.state.set('operator', operator);
    this.state.set('value', value);
    this.state.set('flow_control_type', flow_control_type);
    this.state.set('should_break', false);
    this.state.set('should_continue', false);
    
    // Now properly bind the callable after super
    this.state.set('callable', flow_control_type === flow_control_types.BREAK
      ? this.shouldBreakFlow.bind(this)
      : this.shouldContinueFlow.bind(this));
  }

  /**
   * Determines whether to break the loop based on the condition.
   * @async
   * @returns {Promise<boolean>} True if the loop should break, false otherwise.
   */
  async shouldBreakFlow() {
    if (this.checkCondition()) {
      this.logStep(`Flow control condition met for step: ${this.state.get('name')}`);
      this.state.set('should_break', true);
    } else {
      this.logStep(`Flow control condition not met for step: ${this.state.get('name')}`);
      this.state.set('should_break', false);
    }

    return this.state.get('should_break');
  }

  /**
   * Determines whether to continue the loop based on the condition.
   * @async
   * @returns {Promise<boolean>} True if the loop should continue, false otherwise.
   */
  async shouldContinueFlow() {
    if (this.checkCondition()) {
      this.logStep(`Flow control condition met for step: ${this.state.get('name')}`);
      this.state.set('should_continue', false);
    } else {
      this.logStep(`Flow control condition not met for step: ${this.state.get('name')}`);
      this.state.set('should_continue', true);
    }

    return !this.state.get('should_continue');
  }
}
