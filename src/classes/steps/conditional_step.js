import Step from './step.js';
import LogicStep from './logic_step.js';
import { conditional_step_comparators } from '../../enums/index.js';
import { event_names } from '../instance_state.js';

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
   * @param {*|Function} [options.conditional.subject] - Subject to evaluate. Can be a function that returns the value.
   * @param {conditional_step_comparators|string} [options.conditional.operator] - Comparison operator.
   * @param {*|Function} [options.conditional.value] - Value to compare against. Can be a function that returns the value.
   * @param {Function|Step|Workflow} [options.true_callable=async () => {}] - Callable to execute if condition is true.
   * @param {Function|Step|Workflow} [options.false_callable=async () => {}] - Callable to execute if condition is false.
   * @param {string|null} [options.true_callable_registry_key=null] - Optional key to reference true_callable to be rehydrated after serialization.
   * @param {string|null} [options.false_callable_registry_key=null] - Optional key to reference false_callable to be rehydrated after serialization.
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
    true_callable_registry_key = null,
    false_callable_registry_key = null,
  }) {
    super({
      name,
      conditional
    });

    // Optional keys to reference true_callable/false_callable to be rehydrated after serialization.
    this.true_callable_registry_key = true_callable_registry_key;
    this.false_callable_registry_key = false_callable_registry_key;

    // Keep the raw (unbound) originals for serialization - binding renames a function
    // (e.g. "falseBranch" -> "bound falseBranch"), which would break registry lookups on hydrate.
    this._true_callable_raw = true_callable;
    this._false_callable_raw = false_callable;

    // Bind function callables to this step instance for state access
    if (typeof true_callable === 'function') {
      this.true_callable = true_callable.bind(this);
    } else {
      this.true_callable = true_callable;
    }

    if (typeof false_callable === 'function') {
      this.false_callable = false_callable.bind(this);
    } else {
      this.false_callable = false_callable;
    }

    this.callable = this.conditional.bind(this);
  }

  /**
   * Executes the appropriate branch based on the condition evaluation. When the executed branch
   * is a `Step`/`Workflow` (not a plain function), it is stamped with this step's own
   * `parent_workflow_id`/`use_state_singleton`/`state` first - true/false_callable are never
   * added to the parent workflow via `addStep()`, so this is the only way they end up sharing
   * its state instead of their own, independent one.
   * @async
   * @returns {Promise<*>} The result of the executed branch.
   */
  async conditional() {
    const true_callable = this.true_callable;
    const false_callable = this.false_callable;

    let result = null;

    if (this.checkCondition()) {
      this.log(
        event_names.step.CONDITIONAL_TRUE_BRANCH_EXECUTED,
        `Condition met for step: ${this.name}, executing true branch`
      );

      if (typeof true_callable === 'function') {
        result = await true_callable();
      } else {
        true_callable.parent_workflow_id = this.parent_workflow_id;
        true_callable.use_state_singleton = this.use_state_singleton;
        true_callable.state = this.state;
        result = await true_callable.execute();
      }
    } else {
      this.log(
        event_names.step.CONDITIONAL_FALSE_BRANCH_EXECUTED,
        `Condition not met for step: ${this.name}, executing false branch`
      );

      if (typeof false_callable === 'function') {
        result = await false_callable();
      } else {
        false_callable.parent_workflow_id = this.parent_workflow_id;
        false_callable.use_state_singleton = this.use_state_singleton;
        false_callable.state = this.state;
        result = await false_callable.execute();
      }
    }

    return { message: `Conditional step ${this.name} completed`, result };
  }

  /**
   * Inserts safely serializable properties of the step into a new object for serialization.
   * @returns {Object} An object containing the step's properties ready for serialization.
   */
  prepareForSerialization() {
    return {
      ...super.prepareForSerialization(),
      // The base `callable` is an internal wiring detail (the bound `conditional` method) -
      // ConditionalStep's constructor doesn't take a callable, so it isn't real data to persist.
      callable: null,
      true_callable: this.true_callable_registry_key
        ? { type: Step.callable_types.FUNCTION, value: this.true_callable_registry_key }
        : Step.serializeCallableField(this._true_callable_raw),
      false_callable: this.false_callable_registry_key
        ? { type: Step.callable_types.FUNCTION, value: this.false_callable_registry_key }
        : Step.serializeCallableField(this._false_callable_raw),
    };
  }

  /**
   * Hydrates a parsed step object into a ConditionalStep instance, resolving the true/false branch callables.
   * @param {Object} parsed_step - The parsed step object.
   * @param {import('../callable_registry.js').default|null} [callable_registry] - Registry used to resolve function callables.
   * @returns {ConditionalStep} The hydrated ConditionalStep instance.
   */
  static hydrate(parsed_step, callable_registry = null) {
    const true_descriptor = parsed_step.true_callable;
    const false_descriptor = parsed_step.false_callable;

    return super.hydrate({
      ...parsed_step,
      true_callable: Step.hydrateCallableField(true_descriptor, callable_registry),
      false_callable: Step.hydrateCallableField(false_descriptor, callable_registry),
      true_callable_registry_key: true_descriptor?.type === Step.callable_types.FUNCTION
        ? true_descriptor.value
        : null,
      false_callable_registry_key: false_descriptor?.type === Step.callable_types.FUNCTION
        ? false_descriptor.value
        : null,
    }, callable_registry);
  }
}

ConditionalStep.registerStepClass(ConditionalStep);
