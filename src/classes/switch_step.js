import LogicStep from './logic_step.js';
import logic_step_types from '../enums/logic_step_types.js';
import step_types from '../enums/step_types.js';
import Workflow from './workflow.js';
import Step from './step.js';

/**
 * Represents a switch step that evaluates multiple cases and executes the matched one.
 * @class SwitchStep
 * @extends LogicStep
 */
export default class SwitchStep extends LogicStep {
  static step_name = logic_step_types.SWITCH;

  /**
   * Creates a new SwitchStep instance.
   * @constructor
   * @param {Object} options - Configuration options for the switch step.
   * @param {Array<Case> | Array<Step> | Array<Workflow>} [options.cases=[]] - The array of Case instances to evaluate.
   * @param {Function | Case | Step | Workflow} [options.default_case=null] - The default case (Case/Step) or Workflow to execute if no cases match.
   * @param {string} [options.name=''] - The name of the switch step.
   */
  constructor({
    name = '',
    cases = [],
    default_case = null
  }) {
    super({
      type: logic_step_types.SWITCH,
      name,
      callable: async () => {}
    });

    this.state.set('default_case', default_case);
    this.state.set('cases', cases);
    this.state.set('callable', this.getMatchedCase.bind(this));
  }

  /**
   * Evaluates the cases and returns the result of the matched case or the default case.
   * Creates a workflow from the cases and executes them sequentially until one matches.
   * @async
   * @returns {Promise<Workflow>} The switch workflow instance with final state.
   */
  async getMatchedCase() {
    const cases = this.state.get('cases');
    const default_case = this.state.get('default_case');
    const switch_workflow = new Workflow({ steps: cases, name: `Switch Step Workflow: ${this.state.get('id')}` });
    this.logStep(`Executing SwitchStep ${this.state.get('name')} with ${cases.length} cases`);

    if (default_case) {
      switch_workflow.pushStep(default_case);
    }

    const result = await switch_workflow.execute();
    return { message: `SwitchStep ${this.state.get('name') ?? this.state.get('id')} executed case`, ...result };
  }
}
