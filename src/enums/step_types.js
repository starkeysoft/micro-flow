/**
 * Enumeration of step types used throughout the workflow system.
 * These types categorize steps by their primary function.
 * 
 * @enum {string}
 * @readonly
 */
const step_types = {
  INITIATOR: 'initiator',
  ACTION: 'action',
  LOGIC: 'logic',
  DELAY: 'delay',
  SUBFLOW: 'subflow',
};

export default step_types;
