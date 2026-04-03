import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ConditionalStep from '../src/classes/steps/conditional_step.js';
import LogicStep from '../src/classes/steps/logic_step.js';
import Step from '../src/classes/steps/step.js';
import Workflow from '../src/classes/workflow.js';
import State from '../src/classes/state.js';
import { conditional_step_comparators, step_types } from '../src/enums/index.js';

describe('LogicStep', () => {
  beforeEach(() => {
    State.reset();
    State.set('log_suppress', true);
  });

  afterEach(() => {
    State.reset();
  });

  describe('constructor', () => {
    it('should create a logic step with default options', () => {
      const step = new LogicStep({});

      expect(step.id).toBeDefined();
      expect(step.name).toBeDefined();
      expect(step.step_type).toBe(step_types.LOGIC);
      expect(step.conditional_config).toEqual({ subject: null, operator: null, value: null });
    });

    it('should create a logic step with a custom name', () => {
      const step = new LogicStep({ name: 'my-logic-step' });

      expect(step.name).toBe('my-logic-step');
    });

    it('should set conditional properties', () => {
      const step = new LogicStep({
        conditional: {
          subject: 10,
          operator: conditional_step_comparators.SIGN_GREATER_THAN,
          value: 5
        }
      });

      expect(step.conditional_config.subject).toBe(10);
      expect(step.conditional_config.operator).toBe('>');
      expect(step.conditional_config.value).toBe(5);
    });

    it('should have static step_name property', () => {
      expect(LogicStep.step_name).toBe('logic');
    });
  });

  describe('setConditional', () => {
    it('should update conditional properties', () => {
      const step = new LogicStep({});

      step.setConditional({
        subject: 'hello',
        operator: conditional_step_comparators.STRING_CONTAINS,
        value: 'ell'
      });

      expect(step.conditional_config.subject).toBe('hello');
      expect(step.conditional_config.operator).toBe('string_contains');
      expect(step.conditional_config.value).toBe('ell');
    });
  });

  describe('conditionalIsValid', () => {
    it('should return true when all conditional properties are set', () => {
      const step = new LogicStep({
        conditional: {
          subject: 10,
          operator: conditional_step_comparators.SIGN_GREATER_THAN,
          value: 5
        }
      });

      expect(step.conditionalIsValid()).toBe(true);
    });

    it('should return false when subject is null', () => {
      const step = new LogicStep({
        conditional: {
          subject: null,
          operator: conditional_step_comparators.SIGN_GREATER_THAN,
          value: 5
        }
      });

      expect(step.conditionalIsValid()).toBe(false);
    });

    it('should return false when operator is null', () => {
      const step = new LogicStep({
        conditional: {
          subject: 10,
          operator: null,
          value: 5
        }
      });

      expect(step.conditionalIsValid()).toBe(false);
    });

    it('should return true when value is null (value is optional)', () => {
      const step = new LogicStep({
        conditional: {
          subject: 10,
          operator: conditional_step_comparators.SIGN_GREATER_THAN,
          value: null
        }
      });

      // Value can be null/unset for operators that don't need it (e.g., empty, nullish)
      expect(step.conditionalIsValid()).toBe(true);
    });

    it('should return true when subject is falsy but not null/undefined', () => {
      const step = new LogicStep({
        conditional: {
          subject: 0,
          operator: conditional_step_comparators.SIGN_EQUALS,
          value: 0
        }
      });

      expect(step.conditionalIsValid()).toBe(true);
    });

    it('should return true when value is empty string', () => {
      const step = new LogicStep({
        conditional: {
          subject: '',
          operator: conditional_step_comparators.EMPTY,
          value: ''
        }
      });

      expect(step.conditionalIsValid()).toBe(true);
    });
  });

  describe('checkCondition', () => {
    describe('equality operators', () => {
      it('should evaluate strict equals (===) correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 5, operator: '===', value: 5 }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: '5', operator: '===', value: 5 });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate strict equals with named operator', () => {
        const step = new LogicStep({
          conditional: { subject: 5, operator: 'strict_equals', value: 5 }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate loose equals (==) correctly', () => {
        const step = new LogicStep({
          conditional: { subject: '5', operator: '==', value: 5 }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate loose equals with named operator', () => {
        const step = new LogicStep({
          conditional: { subject: '5', operator: 'equals', value: 5 }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate not equals (!=) correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 5, operator: '!=', value: 10 }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: '5', operator: '!=', value: 5 });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate not equals with named operator', () => {
        const step = new LogicStep({
          conditional: { subject: 5, operator: 'not_equals', value: 10 }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate strict not equals (!==) correctly', () => {
        const step = new LogicStep({
          conditional: { subject: '5', operator: '!==', value: 5 }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 5, operator: '!==', value: 5 });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate strict not equals with named operator', () => {
        const step = new LogicStep({
          conditional: { subject: '5', operator: 'strict_not_equals', value: 5 }
        });
        expect(step.checkCondition()).toBe(true);
      });
    });

    describe('comparison operators', () => {
      it('should evaluate greater than (>) correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 10, operator: '>', value: 5 }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 5, operator: '>', value: 10 });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate greater than with named operator', () => {
        const step = new LogicStep({
          conditional: { subject: 10, operator: 'greater_than', value: 5 }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate less than (<) correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 5, operator: '<', value: 10 }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 10, operator: '<', value: 5 });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate less than with named operator', () => {
        const step = new LogicStep({
          conditional: { subject: 5, operator: 'less_than', value: 10 }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate greater than or equal (>=) correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 10, operator: '>=', value: 10 }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 11, operator: '>=', value: 10 });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 9, operator: '>=', value: 10 });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate greater than or equal with named operator', () => {
        const step = new LogicStep({
          conditional: { subject: 10, operator: 'greater_than_or_equal', value: 10 }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate less than or equal (<=) correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 10, operator: '<=', value: 10 }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 9, operator: '<=', value: 10 });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 11, operator: '<=', value: 10 });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate less than or equal with named operator', () => {
        const step = new LogicStep({
          conditional: { subject: 10, operator: 'less_than_or_equal', value: 10 }
        });
        expect(step.checkCondition()).toBe(true);
      });
    });

    describe('string operators', () => {
      it('should evaluate string_contains correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello world', operator: 'string_contains', value: 'world' }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 'hello world', operator: 'string_contains', value: 'foo' });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate string_includes correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello world', operator: 'string_includes', value: 'llo' }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate string_not_contains correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello world', operator: 'string_not_contains', value: 'foo' }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 'hello world', operator: 'string_not_contains', value: 'hello' });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate string_not_includes correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello world', operator: 'string_not_includes', value: 'bar' }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate string_starts_with correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello world', operator: 'string_starts_with', value: 'hello' }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 'hello world', operator: 'string_starts_with', value: 'world' });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate string_ends_with correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello world', operator: 'string_ends_with', value: 'world' }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 'hello world', operator: 'string_ends_with', value: 'hello' });
        expect(step.checkCondition()).toBe(false);
      });

      it('should return false for string_starts_with with non-string subject', () => {
        const step = new LogicStep({
          conditional: { subject: 123, operator: 'string_starts_with', value: '1' }
        });
        expect(step.checkCondition()).toBe(false);
      });

      it('should return false for string_ends_with with non-string value', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello', operator: 'string_ends_with', value: 123 }
        });
        expect(step.checkCondition()).toBe(false);
      });
    });

    describe('array operators', () => {
      it('should evaluate array_contains correctly', () => {
        const step = new LogicStep({
          conditional: { subject: [1, 2, 3], operator: 'array_contains', value: 2 }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: [1, 2, 3], operator: 'array_contains', value: 5 });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate array_includes correctly', () => {
        const step = new LogicStep({
          conditional: { subject: ['a', 'b', 'c'], operator: 'array_includes', value: 'b' }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate array_not_contains correctly', () => {
        const step = new LogicStep({
          conditional: { subject: [1, 2, 3], operator: 'array_not_contains', value: 5 }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: [1, 2, 3], operator: 'array_not_contains', value: 2 });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate array_not_includes correctly', () => {
        const step = new LogicStep({
          conditional: { subject: ['a', 'b', 'c'], operator: 'array_not_includes', value: 'd' }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate in operator correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 1, operator: 'in', value: [1, 2, 3] }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate not_in operator correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 4, operator: 'not_in', value: [1, 2, 3] }
        });
        expect(step.checkCondition()).toBe(true);
      });
    });

    describe('empty/not_empty operators', () => {
      it('should evaluate empty correctly for empty string', () => {
        const step = new LogicStep({
          conditional: { subject: '', operator: 'empty', value: null }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate empty correctly for null', () => {
        const step = new LogicStep({
          conditional: { subject: null, operator: 'empty', value: null }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate empty correctly for undefined', () => {
        const step = new LogicStep({
          conditional: { subject: undefined, operator: 'empty', value: null }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate empty correctly for empty array', () => {
        const step = new LogicStep({
          conditional: { subject: [], operator: 'empty', value: null }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate empty correctly for non-empty values', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello', operator: 'empty', value: null }
        });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate not_empty correctly for non-empty string', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello', operator: 'not_empty', value: null }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate not_empty correctly for non-empty array', () => {
        const step = new LogicStep({
          conditional: { subject: [1, 2, 3], operator: 'not_empty', value: null }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate not_empty correctly for empty values', () => {
        const step = new LogicStep({
          conditional: { subject: '', operator: 'not_empty', value: null }
        });
        expect(step.checkCondition()).toBe(false);
      });
    });

    describe('regex operators', () => {
      it('should evaluate regex_match correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello123world', operator: 'regex_match', value: '\\d+' }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 'helloworld', operator: 'regex_match', value: '\\d+' });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate regex_not_match correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'helloworld', operator: 'regex_not_match', value: '\\d+' }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 'hello123', operator: 'regex_not_match', value: '\\d+' });
        expect(step.checkCondition()).toBe(false);
      });

      it('should throw error for regex_match with non-string value', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello', operator: 'regex_match', value: 123 }
        });
        expect(() => step.checkCondition()).toThrow('Regex input must be a string');
      });

      it('should throw error for regex_not_match with non-string value', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello', operator: 'regex_not_match', value: 123 }
        });
        expect(() => step.checkCondition()).toThrow('Regex input must be a string');
      });
    });

    describe('nullish operators', () => {
      it('should evaluate nullish correctly for null', () => {
        const step = new LogicStep({
          conditional: { subject: null, operator: 'nullish', value: null }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate nullish correctly for undefined', () => {
        const step = new LogicStep({
          conditional: { subject: undefined, operator: 'nullish', value: null }
        });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate nullish correctly for non-nullish values', () => {
        const step = new LogicStep({
          conditional: { subject: 0, operator: 'nullish', value: null }
        });
        expect(step.checkCondition()).toBe(false);

        step.setConditional({ subject: '', operator: 'nullish', value: null });
        expect(step.checkCondition()).toBe(false);

        step.setConditional({ subject: false, operator: 'nullish', value: null });
        expect(step.checkCondition()).toBe(false);
      });

      it('should evaluate not_nullish correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello', operator: 'not_nullish', value: null }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 0, operator: 'not_nullish', value: null });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: null, operator: 'not_nullish', value: null });
        expect(step.checkCondition()).toBe(false);
      });
    });

    describe('type operators', () => {
      it('should evaluate is_type correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello', operator: 'is_type', value: 'string' }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 123, operator: 'is_type', value: 'number' });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: true, operator: 'is_type', value: 'boolean' });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: {}, operator: 'is_type', value: 'object' });
        expect(step.checkCondition()).toBe(true);

        // Function subjects are called to get their value - use a function that returns a function
        step.setConditional({ subject: () => (() => {}), operator: 'is_type', value: 'function' });
        expect(step.checkCondition()).toBe(true);
      });

      it('should evaluate is_not_type correctly', () => {
        const step = new LogicStep({
          conditional: { subject: 'hello', operator: 'is_not_type', value: 'number' }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({ subject: 123, operator: 'is_not_type', value: 'string' });
        expect(step.checkCondition()).toBe(true);
      });
    });

    describe('custom_function operator', () => {
      it('should evaluate custom_function correctly', () => {
        const step = new LogicStep({
          conditional: {
            subject: 10,
            operator: 'custom_function',
            value: (subject) => subject > 5 && subject < 15
          }
        });
        expect(step.checkCondition()).toBe(true);

        step.setConditional({
          subject: 20,
          operator: 'custom_function',
          value: (subject) => subject > 5 && subject < 15
        });
        expect(step.checkCondition()).toBe(false);
      });

      it('should throw error for custom_function with non-function value', () => {
        const step = new LogicStep({
          conditional: { subject: 10, operator: 'custom_function', value: 'not a function' }
        });
        expect(() => step.checkCondition()).toThrow('Invalid custom function');
      });
    });

    describe('unknown operator', () => {
      it('should throw error for unknown operator', () => {
        const step = new LogicStep({
          conditional: { subject: 10, operator: 'unknown_operator', value: 5 }
        });
        expect(() => step.checkCondition()).toThrow('Unknown operator: unknown_operator');
      });
    });
  });
});

describe('ConditionalStep', () => {
  beforeEach(() => {
    State.reset();
    State.set('log_suppress', true);
  });

  afterEach(() => {
    State.reset();
  });

  describe('constructor', () => {
    it('should create a conditional step with default options', () => {
      const step = new ConditionalStep({
        conditional: { subject: true, operator: '===', value: true }
      });

      expect(step.id).toBeDefined();
      expect(step.name).toBeDefined();
      expect(step.true_callable).toBeDefined();
      expect(step.false_callable).toBeDefined();
    });

    it('should create a conditional step with a custom name', () => {
      const step = new ConditionalStep({
        name: 'my-conditional',
        conditional: { subject: true, operator: '===', value: true }
      });

      expect(step.name).toBe('my-conditional');
    });

    it('should set true_callable and false_callable as bound functions', () => {
      const trueFunc = async () => 'true result';
      const falseFunc = async () => 'false result';

      const step = new ConditionalStep({
        conditional: { subject: true, operator: '===', value: true },
        true_callable: trueFunc,
        false_callable: falseFunc
      });

      // Function callables are bound to the step instance
      expect(typeof step.true_callable).toBe('function');
      expect(typeof step.false_callable).toBe('function');
    });

    it('should preserve Step/Workflow callables without binding', () => {
      const innerStep = new Step({
        name: 'inner',
        callable: async () => 'step result'
      });

      const step = new ConditionalStep({
        conditional: { subject: true, operator: '===', value: true },
        true_callable: innerStep
      });

      expect(step.true_callable).toBe(innerStep);
    });

    it('should have static step_name property', () => {
      expect(ConditionalStep.step_name).toBe('conditional');
    });
  });

  describe('execute', () => {
    it('should execute true_callable when condition is true', async () => {
      const trueSpy = vi.fn().mockResolvedValue('true result');
      const falseSpy = vi.fn().mockResolvedValue('false result');

      const step = new ConditionalStep({
        name: 'test-conditional',
        conditional: {
          subject: 10,
          operator: '>',
          value: 5
        },
        true_callable: trueSpy,
        false_callable: falseSpy
      });

      const result = await step.execute();

      expect(trueSpy).toHaveBeenCalledTimes(1);
      expect(falseSpy).not.toHaveBeenCalled();
      expect(result.result.result).toBe('true result');
      expect(result.result.message).toContain('test-conditional completed');
    });

    it('should execute false_callable when condition is false', async () => {
      const trueSpy = vi.fn().mockResolvedValue('true result');
      const falseSpy = vi.fn().mockResolvedValue('false result');

      const step = new ConditionalStep({
        name: 'test-conditional',
        conditional: {
          subject: 3,
          operator: '>',
          value: 5
        },
        true_callable: trueSpy,
        false_callable: falseSpy
      });

      const result = await step.execute();

      expect(falseSpy).toHaveBeenCalledTimes(1);
      expect(trueSpy).not.toHaveBeenCalled();
      expect(result.result.result).toBe('false result');
    });

    it('should handle Step as true_callable', async () => {
      const innerStep = new Step({
        name: 'inner-step',
        callable: async () => 'inner result'
      });

      const step = new ConditionalStep({
        conditional: {
          subject: true,
          operator: '===',
          value: true
        },
        true_callable: innerStep,
        false_callable: async () => 'false'
      });

      const result = await step.execute();

      expect(result.result.result.result).toBe('inner result');
    });

    it('should handle Step as false_callable', async () => {
      const innerStep = new Step({
        name: 'inner-step',
        callable: async () => 'inner result'
      });

      const step = new ConditionalStep({
        conditional: {
          subject: false,
          operator: '===',
          value: true
        },
        true_callable: async () => 'true',
        false_callable: innerStep
      });

      const result = await step.execute();

      expect(result.result.result.result).toBe('inner result');
    });

    it('should handle Workflow as true_callable', async () => {
      const workflow = new Workflow({
        name: 'inner-workflow',
        steps: [
          new Step({
            name: 'workflow-step',
            callable: async () => 'workflow result'
          })
        ]
      });

      const step = new ConditionalStep({
        conditional: {
          subject: 10,
          operator: '>=',
          value: 10
        },
        true_callable: workflow,
        false_callable: async () => 'false'
      });

      const result = await step.execute();

      // Workflow results are wrapped in {message, data} by the Workflow class
      expect(result.result.result.results).toHaveLength(1);
      expect(result.result.result.results[0].data.result).toBe('workflow result');
    });

    it('should handle Workflow as false_callable', async () => {
      const workflow = new Workflow({
        name: 'inner-workflow',
        steps: [
          new Step({
            name: 'workflow-step',
            callable: async () => 'workflow result'
          })
        ]
      });

      const step = new ConditionalStep({
        conditional: {
          subject: 5,
          operator: '>=',
          value: 10
        },
        true_callable: async () => 'true',
        false_callable: workflow
      });

      const result = await step.execute();

      // Workflow results are wrapped in {message, data} by the Workflow class
      expect(result.result.result.results).toHaveLength(1);
      expect(result.result.result.results[0].data.result).toBe('workflow result');
    });
  });

  describe('events', () => {
    it('should emit CONDITIONAL_TRUE_BRANCH_EXECUTED when condition is true', async () => {
      const eventSpy = vi.fn();
      const stepEvents = State.get('events.step');
      stepEvents.on('conditional_true_branch_executed', eventSpy);

      const step = new ConditionalStep({
        conditional: {
          subject: 'yes',
          operator: '===',
          value: 'yes'
        },
        true_callable: async () => 'true'
      });

      await step.execute();

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should emit CONDITIONAL_FALSE_BRANCH_EXECUTED when condition is false', async () => {
      const eventSpy = vi.fn();
      const stepEvents = State.get('events.step');
      stepEvents.on('conditional_false_branch_executed', eventSpy);

      const step = new ConditionalStep({
        conditional: {
          subject: 'no',
          operator: '===',
          value: 'yes'
        },
        false_callable: async () => 'false'
      });

      await step.execute();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('integration with State', () => {
    it('should access state within callables', async () => {
      State.set('user.role', 'admin');

      const step = new ConditionalStep({
        conditional: {
          subject: State.get('user.role'),
          operator: '===',
          value: 'admin'
        },
        true_callable: async function() {
          return `Welcome, ${this.getState('user.role')}`;
        },
        false_callable: async () => 'Access denied'
      });

      const result = await step.execute();

      expect(result.result.result).toBe('Welcome, admin');
    });

    it('should modify state within callables', async () => {
      State.set('counter', 0);

      const step = new ConditionalStep({
        conditional: {
          subject: true,
          operator: '===',
          value: true
        },
        true_callable: async function() {
          const current = this.getState('counter');
          this.setState('counter', current + 1);
          return this.getState('counter');
        }
      });

      await step.execute();

      expect(State.get('counter')).toBe(1);
    });
  });

  describe('complex conditions', () => {
    it('should handle string comparison conditions', async () => {
      const step = new ConditionalStep({
        conditional: {
          subject: 'hello world',
          operator: 'string_contains',
          value: 'world'
        },
        true_callable: async () => 'found',
        false_callable: async () => 'not found'
      });

      const result = await step.execute();

      expect(result.result.result).toBe('found');
    });

    it('should handle array conditions', async () => {
      const step = new ConditionalStep({
        conditional: {
          subject: ['apple', 'banana', 'cherry'],
          operator: 'array_contains',
          value: 'banana'
        },
        true_callable: async () => 'in list',
        false_callable: async () => 'not in list'
      });

      const result = await step.execute();

      expect(result.result.result).toBe('in list');
    });

    it('should handle custom function conditions', async () => {
      const step = new ConditionalStep({
        conditional: {
          subject: { age: 25, name: 'John' },
          operator: 'custom_function',
          value: (subject) => subject.age >= 18 && subject.name.length > 0
        },
        true_callable: async () => 'valid user',
        false_callable: async () => 'invalid user'
      });

      const result = await step.execute();

      expect(result.result.result).toBe('valid user');
    });

    it('should handle regex conditions', async () => {
      const step = new ConditionalStep({
        conditional: {
          subject: 'user@example.com',
          operator: 'regex_match',
          value: '^[\\w.-]+@[\\w.-]+\\.\\w+$'
        },
        true_callable: async () => 'valid email',
        false_callable: async () => 'invalid email'
      });

      const result = await step.execute();

      expect(result.result.result).toBe('valid email');
    });
  });

  describe('error handling', () => {
    it('should propagate errors from true_callable', async () => {
      const step = new ConditionalStep({
        conditional: {
          subject: true,
          operator: '===',
          value: true
        },
        true_callable: async () => {
          throw new Error('True branch error');
        }
      });

      const result = await step.execute();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('True branch error');
    });

    it('should propagate errors from false_callable', async () => {
      const step = new ConditionalStep({
        conditional: {
          subject: false,
          operator: '===',
          value: true
        },
        false_callable: async () => {
          throw new Error('False branch error');
        }
      });

      const result = await step.execute();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('False branch error');
    });
  });

  describe('parentWorkflowId propagation', () => {
    it('should propagate parentWorkflowId to nested steps', async () => {
      const innerStep = new Step({
        name: 'inner',
        callable: async function() {
          return this.parentWorkflowId;
        }
      });

      const workflow = new Workflow({
        name: 'parent-workflow',
        steps: [
          new ConditionalStep({
            conditional: {
              subject: true,
              operator: '===',
              value: true
            },
            true_callable: innerStep
          })
        ]
      });

      const result = await workflow.execute();

      // Path: workflow result -> conditional step data -> conditional result -> inner step -> step result
      expect(result.results[0].data.result.result.result).toBe(workflow.id);
    });
  });
});
