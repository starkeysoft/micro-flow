/**
 * Enumeration of step types used throughout the workflow system.
 * These types categorize steps by their primary function.
 * 
 * @enum {string}
 * @readonly
 */
const step_types = {
  ACTION: 'action',
  DELAY: 'delay',
  LOGIC: 'logic',
  LOOP: 'loop',
};

export default step_types;
