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
  should_break = false;
  should_continue = false;

  /**
   * Creates a new FlowControlStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the flow control step.
   * @param {*} options.subject - The value to compare against.
   * @param {string} options.operator - The comparison operator to use (e.g., '===',
   * '==', '!=', '>', '<', '>=', '<=').
   * @param {*} options.value - The value to compare the subject with.
   * @param {string} [options.name=''] - The name of the flow control step.
   */
  constructor({
    subject,
    operator,
    value,
    flow_control_type = flow_control_types.BREAK,
    name = '',
  } = {}) {
    this.subject = subject;
    this.operator = operator;
    this.value = value;
    this.flow_control_type = flow_control_type;

    super({
      type: logic_step_types.FLOW_CONTROL,
      name,
      callable: flow_control_type === flow_control_types.BREAK
        ? this.should_breakFlow.bind(this)
        : this.should_continueFlow.bind(this)
    });
  }

  /**
   * Determines whether to break the loop based on the condition.
   * @async
   * @returns {Promise<boolean>} True if the loop should break, false otherwise.
   */
  async should_breakFlow() {
    if (this.checkCondition()) {
      this.logStep(`Flow control condition met for step: ${this.name}`);
      this.should_break = true;
    } else {
      this.logStep(`Flow control condition not met for step: ${this.name}`);
      this.should_break = false;
    }

    return this.should_break;
  }

  /**
   * Determines whether to continue the loop based on the condition.
   * @async
   * @returns {Promise<boolean>} True if the loop should continue, false otherwise.
   */
  async should_continueFlow() {
    if (this.checkCondition()) {
      this.logStep(`Flow control condition met for step: ${this.name}`);
      this.should_continue = false;
    } else {
      this.logStep(`Flow control condition not met for step: ${this.name}`);
      this.should_continue = true;
    }

    return !this.should_continue;
  }
}
