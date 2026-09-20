import Step from './step.js';
import { event_names } from '../instance_state.js';

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
   * @param {string|null} [options.default_callable_registry_key=null] - Optional key to reference default_callable to be rehydrated after serialization.
   */
  constructor({
    name,
    cases = [],
    default_callable = async () => {},
    subject = null,
    default_callable_registry_key = null,
  }) {
    super({
      name,
      step_type: SwitchStep.step_name,
    });

    this.cases = cases;
    this.default_callable_registry_key = default_callable_registry_key;
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
   * Every `Case` (and, if it's a `Step`/`Workflow`, `default_callable`) is stamped with this
   * step's own `parent_workflow_id`/`use_state_singleton`/`state` before it runs, since `cases`
   * lives on this step rather than the parent workflow's `_steps`, so it never goes through
   * `Workflow.addStep()` to pick those up on its own.
   * @returns {Promise<*>} The result of the matched case or default callable.
   */
  async switch() {
    // Resolve subject once - call it if it's a function
    const resolved_subject = typeof this.subject === 'function' ? this.subject() : this.subject;
    
    for (const switch_case of this.cases) {
      switch_case.switch_subject = resolved_subject;
      // Cases live in `this.cases`, not the workflow's `_steps` array, so they never go through
      // Workflow.addStep() - stamp them here instead, mirroring what addStep() does.
      switch_case.parent_workflow_id = this.parent_workflow_id;
      switch_case.use_state_singleton = this.use_state_singleton;
      switch_case.state = this.state;

      const is_matched = await switch_case.checkCondition();

      if (is_matched) {
        this.log(
          event_names.step.SWITCH_CASE_MATCHED,
          `Case matched for step: ${this.name}, executing case callable`
        );

        // Return the case's result value directly, not the Case object.
        // This keeps result structure consistent: switchStep.result contains the
        // callable's return value, matching how Step.result works.
        const case_result = await switch_case.execute();
        return case_result.result;
      }
    }

    // Unwrap Step/Workflow results for consistency with case results
    if (this._default_callable_type !== 'function') {
      this._default_callable_raw.parent_workflow_id = this.parent_workflow_id;
      this._default_callable_raw.use_state_singleton = this.use_state_singleton;
      this._default_callable_raw.state = this.state;
    }

    const default_result = await this.default_callable();
    if (this._default_callable_type !== 'function') {
      return default_result.result;
    }
    return default_result;
  }

  /**
   * Inserts safely serializable properties of the step into a new object for serialization.
   * Note: a function-valued `subject` is not persisted, since there's no registry for it.
   * @returns {Object} An object containing the step's properties ready for serialization.
   */
  prepareForSerialization() {
    return {
      ...super.prepareForSerialization(),
      // The base `callable` is an internal wiring detail (the bound `switch` method) -
      // SwitchStep's constructor doesn't take a callable, so it isn't real data to persist.
      callable: null,
      cases: this.cases.map(switch_case => switch_case.prepareForSerialization()),
      default_callable: this.default_callable_registry_key
        ? { type: Step.callable_types.FUNCTION, value: this.default_callable_registry_key }
        : Step.serializeCallableField(this._default_callable_raw),
      subject: typeof this.subject === 'function' ? null : this.subject,
    };
  }

  /**
   * Hydrates a parsed step object into a SwitchStep instance, resolving its cases and default callable.
   * @param {Object} parsed_step - The parsed step object.
   * @param {import('../callable_registry.js').default|null} [callable_registry] - Registry used to resolve function callables.
   * @returns {SwitchStep} The hydrated SwitchStep instance.
   */
  static hydrate(parsed_step, callable_registry = null) {
    const default_descriptor = parsed_step.default_callable;

    return super.hydrate({
      ...parsed_step,
      cases: (parsed_step.cases ?? []).map(switch_case => Step.hydrateAny(switch_case, callable_registry)),
      default_callable: Step.hydrateCallableField(default_descriptor, callable_registry),
      default_callable_registry_key: default_descriptor?.type === Step.callable_types.FUNCTION
        ? default_descriptor.value
        : null,
    }, callable_registry);
  }
}

SwitchStep.registerStepClass(SwitchStep);
