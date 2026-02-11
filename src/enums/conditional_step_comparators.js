/**
 * Enumeration of comparison operators for conditional steps.
 * Provides both named and symbolic operator formats.
 * 
 * @enum {string}
 * @readonly
 */
const conditional_step_comparators = {
  EQUALS: 'equals',
  GREATER_THAN: 'greater_than',
  GREATER_THAN_OR_EQUAL: 'greater_than_or_equal',
  LESS_THAN: 'less_than',
  LESS_THAN_OR_EQUAL: 'less_than_or_equal',
  NOT_EQUALS: 'not_equals',
  STRICT_EQUALS: 'strict_equals',
  STRICT_NOT_EQUALS: 'strict_not_equals',

  SIGN_EQUALS: '==',
  SIGN_GREATER_THAN: '>',
  SIGN_GREATER_THAN_OR_EQUAL: '>=',
  SIGN_LESS_THAN: '<',
  SIGN_LESS_THAN_OR_EQUAL: '<=',
  SIGN_NOT_EQUALS: '!=',
  SIGN_STRICT_EQUALS: '===',
  SIGN_STRICT_NOT_EQUALS: '!==',

  STRING_CONTAINS: 'string_contains',
  STRING_INCLUDES: 'string_includes',
  STRING_STARTS_WITH: 'string_starts_with',
  STRING_ENDS_WITH: 'string_ends_with',

  ARRAY_CONTAINS: 'array_contains',
  ARRAY_INCLUDES: 'array_includes',

  EMPTY: 'empty',
  NOT_EMPTY: 'not_empty',

  REGEX_MATCH: 'regex_match',
  REGEX_NOT_MATCH: 'regex_not_match',

  IN: 'in',
  NOT_IN: 'not_in',

  NULLISH: 'nullish',
  NOT_NULLISH: 'not_nullish',

  CUSTOM_FUNCTION: 'custom_function'
};

export default conditional_step_comparators;
