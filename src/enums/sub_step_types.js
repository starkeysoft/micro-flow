/**
 * Enumeration of sub-step types used in the workflow system.
 * @type {Object.<string, string>}
 * @readonly
 * @example
 * console.log(sub_step_types.step); // "step"
 * console.log(sub_step_types.conditional_step); // "conditional"
 */
const sub_step_types = {
  step: 'step',
  logic_step: 'logic',
  conditional_step: 'conditional',
  flow_control_step: 'flow_control',
  loop_step: 'loop',
  switch_step: 'switch',
  case: 'case',
  delay_step: 'delay',
};

export default sub_step_types;
