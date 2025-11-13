// Mock for sub_step_types to avoid circular dependency in tests
// Export as an object, not a function, since step.js tries to call it
const sub_step_types = {};
export default sub_step_types;
