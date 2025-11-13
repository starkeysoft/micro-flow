/**
 * Enumeration of comparison operators for conditional steps.
 * Provides both named and symbolic operator formats.
 * 
 * @enum {string}
 * @readonly
 */
const conditional_step_comparators = {
  EQUALS: 'equals',
  STRICT_EQUALS: 'strict_equals',
  NOT_EQUALS: 'not_equals',
  STRICT_NOT_EQUALS: 'strict_not_equals',
  GREATER_THAN: 'greater_than',
  LESS_THAN: 'less_than',
  GREATER_THAN_OR_EQUAL: 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL: 'less_than_or_equal',
  SIGN_EQUALS: '==',
  SIGN_STRICT_EQUALS: '===',
  SIGN_NOT_EQUALS: '!=',
  SIGN_STRICT_NOT_EQUALS: '!==',
  SIGN_GREATER_THAN: '>',
  SIGN_LESS_THAN: '<',
  SIGN_GREATER_THAN_OR_EQUAL: '>=',
  SIGN_LESS_THAN_OR_EQUAL: '<=',
};

export default conditional_step_comparators;
