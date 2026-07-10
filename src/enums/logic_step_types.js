/**
 * Enumeration of logic step types for control flow operations.
 * These types define different kinds of logic-based workflow steps.
 * 
 * @enum {string}
 * @readonly
 */
const logic_step_types = {
  CONDITIONAL: 'conditional',
  LOOP: 'loop',
  FLOW_CONTROL: 'flow_control',
  SWITCH: 'switch',
  SKIP: 'skip'
};

export default logic_step_types;
