import Logic from './logic_step.js';

/**
 * Represents a case in a switch statement that evaluates a condition and executes a callable if matched.
 * @class Case
 * @extends Logic
 */
export default class Case extends Logic {
  /**
   * Creates a new Case instance.
   * @constructor
   * @param {Object} options - Configuration options for the case.
   * @param {*} options.subject - The value to compare against.
   * @param {string} options.operator - The comparison operator to use (e.g., '===', '==', '!=', '>', '<', '>=', '<=').
   * @param {*} options.value - The value to compare the subject with.
   * @param {Function|Step|Workflow} [options.callable=async()=>{}] - The async function, Step, or Workflow to execute if the condition is met.
   */
  constructor({
    subject,
    operator,
    value,
    callable = async () => {},
  }) {
    super({
      type: 'case',
      name: 'Case',
      callable,
    });

    this.state.set('subject', subject);
    this.state.set('operator', operator);
    this.state.set('value', value);
    this.state.set('shouldBreak', false);
    this.state.set('callable', callable);
  }

  /**
   * Checks the condition of the case and executes the callable if the condition is met.
   * Sets shouldBreak flag to true when condition matches.
   * @async
   * @returns {Promise<Object|boolean>} The result {result, state} from callable execution if condition is met, false otherwise.
   */
  async check() {
    if (this.checkCondition()) {
      this.logStep(`Case condition met.`);
      this.state.set('shouldBreak', true);
      const callable = this.state.get('callable');
      const result = await callable.execute();
      return { message: `ConditionalStep Case ${this.state.get('name') ?? this.state.get('id')} condition met`, ...result };
    } else {
      this.logStep(`Case condition not met.`);
      return { message: `ConditionalStep Case ${this.state.get('name') ?? this.state.get('id')} condition not met` };
    }
  }
}
