/**
 * Enumeration of sub-step types used in the workflow system.
 * @type {Object.<string, string>}
 * @readonly
 * @example
 * console.log(sub_step_types.Step); // "step"
 * console.log(sub_step_types.ConditionalStep); // "conditional"
 */
const sub_step_types = {
  Step: 'step',
  LogicStep: 'logic',
  ConditionalStep: 'conditional',
  FlowControlStep: 'flow_control',
  LoopStep: 'loop',
  SwitchStep: 'switch',
  Case: 'case',
  DelayStep: 'delay',
};

export default sub_step_types;
