import LogicStep from './logic_step';
import logic_step_types from '../enums/logic_step_types.js';
import Workflow from './workflow.js';
import SubflowStep from './subflow_step.js';

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
   * @param {Array<Case>} options.cases - The array of cases to evaluate. 
   * @param {Case | Step | Workflow} [options.default_case=null] - The default case (Case/Step) or Workflow to execute if no cases match.
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
      callable: this.getMatchedCase.bind(this)
    });

    this.default_case = default_case;
    this.cases = cases;
  }

  /**
   * Evaluates the cases and returns the result of the matched case or the default case.
   * @async
   * @returns {Promise<*>} The result of the matched case or default case.
   */
  async getMatchedCase() {
    const switch_workflow = new Workflow(this.cases, `Switch Step Workflow: ${this.id}` );
    console.log('Executing SwitchStep with cases:', this.cases.length);

    if (this.default_case) {
      if (!(this.default_case instanceof Workflow)) {
        console.log('Adding default case as step.');

        switch_workflow.pushStep(this.default_case);

        return await switch_workflow.execute();
      }

      console.log('Adding default case as sub-workflow.');

      const sub_workflow_step = new SubflowStep({
        subflow: this.default_case,
        name: this.default_case.name ? `${this.default_case.name} Subflow` : 'Default Case Subflow'
      });

      switch_workflow.pushStep(sub_workflow_step);

      return await switch_workflow.execute();
    }
  }
}
