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
   * @param {*|Function} [options.subject=null] - Subject value to evaluate against each case. Can be a function that returns the value.
   */
  constructor({
    name,
    cases = [],
    default_callable = async () => {},
    subject = null
  }) {
    super({
      name,
      step_type: SwitchStep.step_name,
    });

    this.cases = cases;
    this._default_callable_type = this.getCallableType(default_callable);
    this._default_callable_raw = default_callable;
    this.default_callable = this._default_callable_type === 'function'
      ? default_callable.bind(this)
      : default_callable.execute.bind(default_callable);
    this.subject = subject;

    this.callable = this.switch.bind(this);
  }

  /**
   * Executes the switch logic by evaluating each case in order.
   * Returns the result of the first matching case, or the default callable if no match.
   * @returns {Promise<*>} The result of the matched case or default callable.
   */
  async switch() {
    // Resolve subject once - call it if it's a function
    const resolvedSubject = typeof this.subject === 'function' ? this.subject() : this.subject;
    
    for (const switch_case of this.cases) {
      switch_case.switch_subject = resolvedSubject;

      const is_matched = await switch_case.checkCondition();

      if (is_matched) {
        this.log(
          this.getState('events.step.event_names.SWITCH_CASE_MATCHED'),
          `Case matched for step: ${this.name}, executing case callable`
        );

        // Return the case's result value directly, not the Case object.
        // This keeps result structure consistent: switchStep.result contains the
        // callable's return value, matching how Step.result works.
        const caseResult = await switch_case.execute();
        return caseResult.result;
      }
    }

    // Unwrap Step/Workflow results for consistency with case results
    const defaultResult = await this.default_callable();
    if (this._default_callable_type !== 'function') {
      return defaultResult.result;
    }
    return defaultResult;
  }
}
