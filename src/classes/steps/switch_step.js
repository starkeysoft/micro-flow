import Step from './step.js';

/**
 * SwitchStep class for implementing switch/case logic in workflows.
 * Evaluates cases in order and executes the first matching case, or a default callable if no cases match.
 * @class SwitchStep
 * @extends Step
 */
export default class SwitchStep extends Step {
  static step_name = 'switch';

  /**
   * Creates a new SwitchStep instance.
   * @param {Object} options - Configuration options.
   * @param {string} [options.name] - Name of the step.
   * @param {Array<Case|LogicStep>} [options.cases=[]] - Array of Case or LogicStep instances to evaluate. LogicStep instances MUST have conditional.subject set.
   * @param {Function|Step|Workflow} [options.default_callable=async () => {}] - Function, Step, or Workflow to execute if no cases match.
   * @param {*} [options.subject=null] - Subject value to evaluate against each case.
   */
  constructor({
    name,
    cases = [],
    default_callable = async () => {},
    subject = null
  }) {
    super({
      name,
      type: SwitchStep.step_name,
    });

    this.cases = cases;
    this.default_callable = default_callable.bind(this);
    this.subject = subject;

    this.callable = this.switch.bind(this);
  }

  /**
   * Executes the switch logic by evaluating each case in order.
   * Returns the result of the first matching case, or the default callable if no match.
   * @returns {Promise<*>} The result of the matched case or default callable.
   */
  async switch() {
    for (const switch_case of this.cases) {
      switch_case.switch_subject = this.subject;

      const is_matched = await switch_case.checkCondition();

      if (is_matched) {
        this.log(
          this.getState('events.step.event_names.SWITCH_CASE_MATCHED'),
          `Case matched for step: ${this.name}, executing case callable`
        );

        return switch_case.execute();
      }
    }

    return this.default_callable();
  }
}
