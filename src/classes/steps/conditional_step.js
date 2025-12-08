import { LogicStep } from './index.js';

/**
 * ConditionalStep class for branching logic based on conditions.
 * @class ConditionalStep
 * @extends LogicStep
 */
export default class ConditionalStep extends LogicStep {
  static step_name = 'conditional';

  /**
   * Creates a new ConditionalStep instance.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the step.
   * @param {Object} [options.conditional] - Conditional configuration.
   * @param {*} [options.conditional.subject] - Subject to evaluate.
   * @param {string} [options.conditional.operator] - Comparison operator.
   * @param {*} [options.conditional.value] - Value to compare against.
   * @param {Function|Step|Workflow} [options.true_callable=async () => {}] - Callable to execute if condition is true.
   * @param {Function|Step|Workflow} [options.false_callable=async () => {}] - Callable to execute if condition is false.
   */
  constructor({
    name,
    conditional = {
      subject: null,
      operator: null,
      value: null,
    },
    true_callable = async () => {},
    false_callable = async () => {},
  }) {
    super({
      name,
      conditional
    });

    this.true_callable = true_callable;
    this.false_callable = false_callable;

    this.callable = this.conditional.bind(this);
  }

  /**
   * Executes the appropriate branch based on the condition evaluation.
   * @async
   * @returns {Promise<*>} The result of the executed branch.
   */
  async conditional() {
    const true_callable = this.true_callable;
    const false_callable = this.false_callable;

    let result = null;

    if (this.checkCondition()) {
      this.log(
        this.getState('events.step.event_names.CONDITIONAL_TRUE_BRANCH_EXECUTED'),
        `Condition met for step: ${this.name}, executing true branch`
      );

      if (typeof true_callable === 'function') {
        result = await true_callable();
      } else {
        result = await true_callable.execute();
      }
    } else {
      this.log(
        this.getState('events.step.event_names.CONDITIONAL_FALSE_BRANCH_EXECUTED'),
        `Condition not met for step: ${this.name}, executing false branch`
      );

      if (typeof false_callable === 'function') {
        result = await false_callable();
      } else {
        result = await false_callable.execute();
      }
    }

    return result;
  }
}
