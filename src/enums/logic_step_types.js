/**
 * Enumeration of logic step types for control flow operations.
 * These types define different kinds of logic-based workflow steps.
 * 
 * @enum {string}
 * @readonly
 */
const LogicStepTypes = {
  CONDITIONAL: 'conditional',
  LOOP: 'loop',
  FLOW_CONTROL: 'flow_control',
  SWITCH: 'switch',
  SKIP: 'skip'
};

export default LogicStepTypes;
