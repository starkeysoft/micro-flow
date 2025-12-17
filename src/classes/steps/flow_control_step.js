import { LogicStep } from './index.js';
import flow_control_types from '../../enums/flow_control_types.js';

/**
 * FlowControlStep class for controlling workflow execution flow (break, continue, skip, pause).
 * @class FlowControlStep
 * @extends LogicStep
 */
export default class FlowControlStep extends LogicStep {
  static step_name = 'flow_control';

  /**
   * Creates a new FlowControlStep instance.
   * @param {Object} options - Configuration options.
   * @param {Object} [options.conditional] - Conditional configuration.
   * @param {*} [options.conditional.subject] - Subject to evaluate.
   * @param {string} [options.conditional.operator] - Comparison operator.
   * @param {*} [options.conditional.value] - Value to compare against.
   * @param {string} [options.name] - Name of the step.
   * @param {string} [options.flow_control_type=flow_control_types.BREAK] - Type of flow control.
   * @throws {Error} Throws if flow_control_type is invalid.
   */
  constructor({
    conditional = {
      subject: null,
      operator: null,
      value: null,
    },
    name,
    flow_control_type = flow_control_types.BREAK,
  }) {
    super({
      name,
      conditional
    });

    if (!Object.values(flow_control_types).includes(flow_control_type)) {
      throw new Error(`Invalid flow control type: ${flow_control_type}`);
    }

    this.flow_control_type = flow_control_type;
    this.callable = this.shouldFlowControl.bind(this);
  }

  /**
   * Evaluates the condition and sets the appropriate flow control flag.
   * @async
   * @returns {Promise<boolean>} True if the flow control should be activated.
   */
  async shouldFlowControl() {
    if (this.checkCondition()) {
      this.log(
        this.getState('events.step.event_names.CONDITIONAL_TRUE_BRANCH_EXECUTED'),
        `Break condition met for step: ${this.name}`
      );
      this.setParentWorkflowValue(this.parentWorkflowId, `should_${this.flow_control_type}`, true);

      return true;
    } else {
      this.log(
        this.getState('events.step.event_names.CONDITIONAL_FALSE_BRANCH_EXECUTED'),
        `Break condition not met for step: ${this.name}`
      );
      this.setParentWorkflowValue(this.parentWorkflowId, `should_${this.flow_control_type}`, false);

      return false;
    }
  }
}
