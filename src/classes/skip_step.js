import LogicStep from './logic_step';
import logic_step_types from '../enums/logic_step_types';

class SkipStep extends LogicStep {
  static step_name = logic_step_types.SKIP;
  should_skip = false;

  constructor({
    subject,
    operator,
    value,
    name = ''
  }) {
    super({
      type: logic_step_types.SKIP,
      name,
      callable: this.skipStep.bind(this)
    });

    this.setConditional({ subject, operator, value });
  }

  skipStep() {
    if (this.checkCondition()) {
      this.should_skip = true;
    }

    return this.should_skip;
  }
}

export default SkipStep;
