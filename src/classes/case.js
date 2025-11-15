import Logic from './logic_step';

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
   * @param {Step | Workflow | Function} [options.callable=async()=>{}] - The async function to execute if the condition is met.
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
  }

  /**
   * Checks the condition of the case and executes the callable if the condition is met.
   * @async
   * @returns {Promise<*|boolean>} The result of the callable function if condition is met, false otherwise.
   */
  async check() {
    if (this.checkCondition()) {
      this.logStep(`Case condition met.`);
      this.state.set('shouldBreak', true);
      const callable = this.state.get('callable');
      return await callable.execute();
    } else {
      this.logStep(`Case condition not met.`);
      return false;
    }
  }
}
