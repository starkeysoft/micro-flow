import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Step from '../src/classes/steps/step.js';
import Workflow from '../src/classes/workflow.js';
import State from '../src/classes/state.js';
import { step_types, sub_step_types, base_types } from '../src/enums/index.js';

describe('Step', () => {
  beforeEach(() => {
    State.reset();
    State.set('log_suppress', true);
  });

  afterEach(() => {
    State.reset();
  });

  describe('constructor', () => {
    it('should create a step with default options', () => {
      const step = new Step({});

      expect(step.id).toBeDefined();
      expect(step.name).toContain('step-');
      expect(step.step_type).toBe(step_types.ACTION);
      expect(step.sub_step_type).toBeNull();
      expect(step.base_type).toBe(base_types.STEP);
      expect(step.errors).toEqual([]);
      expect(step.result).toBeNull();
      expect(step.retry_results).toEqual([]);
    });

    it('should create a step with a custom name', () => {
      const step = new Step({ name: 'my-step' });

      expect(step.name).toBe('my-step');
    });

    it('should set step_type when provided', () => {
      const step = new Step({ step_type: step_types.LOGIC });

      expect(step.step_type).toBe(step_types.LOGIC);
    });

    it('should set sub_step_type when provided', () => {
      const step = new Step({ sub_step_type: sub_step_types.ConditionalStep });

      expect(step.sub_step_type).toBe(sub_step_types.ConditionalStep);
    });

    it('should set callable when provided', () => {
      const myCallable = async () => 'test result';
      const step = new Step({ callable: myCallable });

      expect(step.callable_type).toBe('function');
      expect(step._callable).toBeDefined();
    });

    it('should use default callable when not provided', () => {
      const step = new Step({});

      expect(step.callable_type).toBe('function');
      expect(step._callable).toBeDefined();
    });

    it('should have static step_name property', () => {
      expect(Step.step_name).toBe('step');
    });
  });

  describe('execute', () => {
    it('should execute the callable and store result', async () => {
      const step = new Step({
        name: 'test-step',
        callable: async () => 'test result'
      });

      const result = await step.execute();

      expect(result.result).toBe('test result');
    });

    it('should return the step instance', async () => {
      const step = new Step({
        name: 'test-step',
        callable: async () => 'result'
      });

      const result = await step.execute();

      expect(result).toBe(step);
    });

    it('should set status to RUNNING during execution', async () => {
      let statusDuringExecution;
      const step = new Step({
        name: 'check-status',
        callable: async function() {
          statusDuringExecution = this.status;
          return 'done';
        }
      });

      await step.execute();

      expect(statusDuringExecution).toBe(State.get('statuses.step').RUNNING);
    });

    it('should set status to COMPLETE after successful execution', async () => {
      const step = new Step({
        name: 'test-step',
        callable: async () => 'result'
      });

      await step.execute();

      expect(step.status).toBe(State.get('statuses.step').COMPLETE);
    });

    it('should set timing information', async () => {
      const before = new Date();
      const step = new Step({
        name: 'test-step',
        callable: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'result';
        }
      });

      await step.execute();
      const after = new Date();

      expect(step.timing.start_time).toBeDefined();
      expect(step.timing.start_time >= before).toBe(true);
      expect(step.timing.complete_time).toBeDefined();
      expect(step.timing.complete_time <= after).toBe(true);
      expect(step.timing.execution_time_ms).toBeGreaterThanOrEqual(10);
    });

    it('should catch errors and store them', async () => {
      const error = new Error('Test error');
      const step = new Step({
        name: 'failing-step',
        callable: async () => {
          throw error;
        }
      });

      await step.execute();

      expect(step.errors).toHaveLength(1);
      expect(step.errors[0]).toBe(error);
    });

    it('should set status to FAILED on error', async () => {
      const step = new Step({
        name: 'failing-step',
        callable: async () => {
          throw new Error('Test error');
        }
      });

      await step.execute();

      expect(step.status).toBe(State.get('statuses.step').FAILED);
    });

    it('should set end_time and execution_time_ms on error', async () => {
      const step = new Step({
        name: 'failing-step',
        callable: async () => {
          throw new Error('Test error');
        }
      });

      await step.execute();

      expect(step.timing.end_time).toBeDefined();
      expect(step.timing.execution_time_ms).toBeDefined();
    });

    it('should rethrow error when exit_on_error is true', async () => {
      State.set('exit_on_error', true);
      const error = new Error('Test error');
      const step = new Step({
        name: 'failing-step',
        callable: async () => {
          throw error;
        }
      });

      await expect(step.execute()).rejects.toThrow('Test error');
    });

    it('should not rethrow error when exit_on_error is false', async () => {
      State.set('exit_on_error', false);
      const step = new Step({
        name: 'failing-step',
        callable: async () => {
          throw new Error('Test error');
        }
      });

      const result = await step.execute();

      expect(result).toBe(step);
      expect(step.errors).toHaveLength(1);
    });

    it('should bind callable to step instance for functions', async () => {
      let boundThis;
      const step = new Step({
        name: 'bound-step',
        callable: async function() {
          boundThis = this;
          return 'result';
        }
      });

      await step.execute();

      expect(boundThis).toBe(step);
    });

    it('should allow callable to access step properties via this', async () => {
      const step = new Step({
        name: 'access-props',
        callable: async function() {
          return this.name;
        }
      });

      await step.execute();

      expect(step.result).toBe('access-props');
    });

    it('should return the nested step when callable is a Step', async () => {
      const innerStep = new Step({
        name: 'inner-step',
        callable: async () => 'inner result'
      });

      const outerStep = new Step({
        name: 'outer-step',
        callable: innerStep
      });

      const result = await outerStep.execute();

      expect(result).toBe(innerStep);
      expect(innerStep.result).toBe('inner result');
    });

    it('should return the nested workflow when callable is a Workflow', async () => {
      const innerWorkflow = new Workflow({
        name: 'inner-workflow',
        steps: [
          new Step({
            name: 'workflow-step',
            callable: async () => 'workflow result'
          })
        ]
      });

      const outerStep = new Step({
        name: 'outer-step',
        callable: innerWorkflow
      });

      const result = await outerStep.execute();

      expect(result).toBe(innerWorkflow);
      expect(innerWorkflow.status).toBe(State.get('statuses.workflow').COMPLETE);
    });

    it('should not call markAsComplete if step already failed', async () => {
      const step = new Step({
        name: 'failing-step',
        callable: async () => {
          throw new Error('Failure');
        }
      });

      await step.execute();

      expect(step.status).toBe(State.get('statuses.step').FAILED);
    });
  });

  describe('getCallableType', () => {
    it('should return "function" for a function', () => {
      const step = new Step({});
      const callable = async () => {};

      expect(step.getCallableType(callable)).toBe('function');
    });

    it('should return "step" for a Step instance', () => {
      const step = new Step({});
      const innerStep = new Step({ name: 'inner' });

      expect(step.getCallableType(innerStep)).toBe('step');
    });

    it('should return "workflow" for a Workflow instance', () => {
      const step = new Step({});
      const workflow = new Workflow({ name: 'test-workflow' });

      expect(step.getCallableType(workflow)).toBe('workflow');
    });

    it('should throw error for invalid callable type - null', () => {
      const step = new Step({});

      expect(() => step.getCallableType(null)).toThrow('Invalid callable type');
    });

    it('should throw error for invalid callable type - string', () => {
      const step = new Step({});

      expect(() => step.getCallableType('not a callable')).toThrow('Invalid callable type');
    });

    it('should throw error for invalid callable type - number', () => {
      const step = new Step({});

      expect(() => step.getCallableType(123)).toThrow('Invalid callable type');
    });

    it('should throw error for invalid callable type - plain object', () => {
      const step = new Step({});

      expect(() => step.getCallableType({ foo: 'bar' })).toThrow('Invalid callable type');
    });

    it('should throw error for invalid callable type - undefined', () => {
      const step = new Step({});

      expect(() => step.getCallableType(undefined)).toThrow('Invalid callable type');
    });
  });

  describe('setParentWorkflowValue', () => {
    it('should set a value on the parent workflow', () => {
      const workflow = new Workflow({ name: 'parent-workflow' });
      const step = new Step({ name: 'child-step' });
      step.parentWorkflowId = workflow.id;

      step.setParentWorkflowValue(workflow.id, 'customProperty', 'customValue');

      expect(workflow.customProperty).toBe('customValue');
    });

    it('should throw error if parent workflow not found', () => {
      const step = new Step({ name: 'orphan-step' });

      expect(() => {
        step.setParentWorkflowValue('non-existent-id', 'prop', 'value');
      }).toThrow('Parent workflow with ID non-existent-id not found');
    });

    it('should set nested properties on parent workflow', () => {
      const workflow = new Workflow({ name: 'parent-workflow' });
      const step = new Step({ name: 'child-step' });

      step.setParentWorkflowValue(workflow.id, 'should_break', true);

      expect(workflow.should_break).toBe(true);
    });
  });

  describe('callable setter', () => {
    it('should set callable_type to "function" for functions', () => {
      const step = new Step({});
      step.callable = async () => 'test';

      expect(step.callable_type).toBe('function');
    });

    it('should set callable_type to "step" for Step instances', () => {
      const step = new Step({});
      const innerStep = new Step({ name: 'inner' });
      step.callable = innerStep;

      expect(step.callable_type).toBe('step');
    });

    it('should set callable_type to "workflow" for Workflow instances', () => {
      const step = new Step({});
      const workflow = new Workflow({ name: 'inner-workflow' });
      step.callable = workflow;

      expect(step.callable_type).toBe('workflow');
    });

    it('should bind function callable to step instance', async () => {
      const step = new Step({});
      let boundContext;
      step.callable = async function() {
        boundContext = this;
        return 'result';
      };

      await step._callable();

      expect(boundContext).toBe(step);
    });

    it('should bind Step callable to execute method', async () => {
      const innerStep = new Step({
        name: 'inner',
        callable: async () => 'inner result'
      });
      const outerStep = new Step({});
      outerStep.callable = innerStep;

      const result = await outerStep._callable();

      expect(result.result).toBe('inner result');
    });

    it('should bind Workflow callable to execute method', async () => {
      const workflow = new Workflow({
        name: 'inner-workflow',
        steps: [
          new Step({
            name: 'wf-step',
            callable: async () => 'workflow step result'
          })
        ]
      });
      const step = new Step({});
      step.callable = workflow;

      const result = await step._callable();

      expect(result.status).toBe(State.get('statuses.workflow').COMPLETE);
    });

    it('should set parentWorkflowId on nested Step', () => {
      const outerStep = new Step({ name: 'outer' });
      outerStep.parentWorkflowId = 'test-workflow-id';

      const innerStep = new Step({ name: 'inner' });
      outerStep.callable = innerStep;

      expect(innerStep.parentWorkflowId).toBe('test-workflow-id');
    });

    it('should set parentWorkflowId to null on nested Step when outer has no parent', () => {
      const outerStep = new Step({ name: 'outer' });
      const innerStep = new Step({ name: 'inner' });
      outerStep.callable = innerStep;

      expect(innerStep.parentWorkflowId).toBeNull();
    });
  });

  describe('integration tests', () => {
    it('should work as part of a workflow', async () => {
      const step = new Step({
        name: 'workflow-step',
        callable: async () => 'step completed'
      });

      const workflow = new Workflow({
        name: 'test-workflow',
        steps: [step]
      });

      await workflow.execute();

      expect(step.result).toBe('step completed');
      expect(step.status).toBe(State.get('statuses.step').COMPLETE);
    });

    it('should chain multiple steps', async () => {
      const results = [];

      const step1 = new Step({
        name: 'step-1',
        callable: async () => {
          results.push('step1');
          return 'result1';
        }
      });

      const step2 = new Step({
        name: 'step-2',
        callable: async () => {
          results.push('step2');
          return 'result2';
        }
      });

      const step3 = new Step({
        name: 'step-3',
        callable: async () => {
          results.push('step3');
          return 'result3';
        }
      });

      const workflow = new Workflow({
        name: 'chain-workflow',
        steps: [step1, step2, step3]
      });

      await workflow.execute();

      expect(results).toEqual(['step1', 'step2', 'step3']);
      expect(step1.result).toBe('result1');
      expect(step2.result).toBe('result2');
      expect(step3.result).toBe('result3');
    });

    it('should allow step to access state', async () => {
      State.set('testData', { value: 42 });

      const step = new Step({
        name: 'state-access',
        callable: async function() {
          const data = this.getState('testData');
          return data.value * 2;
        }
      });

      await step.execute();

      expect(step.result).toBe(84);
    });

    it('should allow step to modify state', async () => {
      const step = new Step({
        name: 'state-modify',
        callable: async function() {
          this.setState('modifiedValue', 'set by step');
          return 'done';
        }
      });

      await step.execute();

      expect(State.get('modifiedValue')).toBe('set by step');
    });

    it('should handle deeply nested step execution', async () => {
      const level3 = new Step({
        name: 'level-3',
        callable: async () => 'deepest'
      });

      const level2 = new Step({
        name: 'level-2',
        callable: level3
      });

      const level1 = new Step({
        name: 'level-1',
        callable: level2
      });

      const result = await level1.execute();

      // Returns level2, which contains level3's result
      expect(result).toBe(level2);
      expect(level3.result).toBe('deepest');
    });

    it('should handle step with workflow containing nested steps', async () => {
      const innerStep1 = new Step({
        name: 'inner-1',
        callable: async () => 'inner1 result'
      });

      const innerStep2 = new Step({
        name: 'inner-2',
        callable: async () => 'inner2 result'
      });

      const innerWorkflow = new Workflow({
        name: 'inner-wf',
        steps: [innerStep1, innerStep2]
      });

      const outerStep = new Step({
        name: 'outer',
        callable: innerWorkflow
      });

      const result = await outerStep.execute();

      expect(result).toBe(innerWorkflow);
      expect(innerStep1.result).toBe('inner1 result');
      expect(innerStep2.result).toBe('inner2 result');
    });

    it('should propagate errors correctly in nested execution', async () => {
      const failingStep = new Step({
        name: 'failing',
        callable: async () => {
          throw new Error('Nested failure');
        }
      });

      const wrapperStep = new Step({
        name: 'wrapper',
        callable: failingStep
      });

      await wrapperStep.execute();

      expect(failingStep.status).toBe(State.get('statuses.step').FAILED);
      expect(failingStep.errors).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle callable that returns undefined', async () => {
      const step = new Step({
        name: 'undefined-return',
        callable: async () => undefined
      });

      await step.execute();

      expect(step.result).toBeUndefined();
      expect(step.status).toBe(State.get('statuses.step').COMPLETE);
    });

    it('should handle callable that returns null', async () => {
      const step = new Step({
        name: 'null-return',
        callable: async () => null
      });

      await step.execute();

      expect(step.result).toBeNull();
      expect(step.status).toBe(State.get('statuses.step').COMPLETE);
    });

    it('should handle callable that returns a promise', async () => {
      const step = new Step({
        name: 'promise-return',
        callable: async () => Promise.resolve('promise result')
      });

      await step.execute();

      expect(step.result).toBe('promise result');
    });

    it('should handle callable that returns complex objects', async () => {
      const complexResult = {
        array: [1, 2, 3],
        nested: { a: { b: { c: 'deep' } } },
        fn: () => 'function'
      };

      const step = new Step({
        name: 'complex-return',
        callable: async () => complexResult
      });

      await step.execute();

      expect(step.result).toBe(complexResult);
      expect(step.result.array).toEqual([1, 2, 3]);
      expect(step.result.nested.a.b.c).toBe('deep');
    });

    it('should handle synchronous-style async callable', async () => {
      const step = new Step({
        name: 'sync-style',
        callable: async () => {
          // No await, just return
          return 'sync result';
        }
      });

      await step.execute();

      expect(step.result).toBe('sync result');
    });

    it('should accumulate errors on multiple failures', async () => {
      const step = new Step({
        name: 'multi-fail',
        callable: async () => {
          throw new Error('First error');
        }
      });

      await step.execute();
      
      // Manually reset for another execution attempt
      step.status = State.get('statuses.step').PENDING;
      step.callable = async () => {
        throw new Error('Second error');
      };
      
      await step.execute();

      expect(step.errors).toHaveLength(2);
      expect(step.errors[0].message).toBe('First error');
      expect(step.errors[1].message).toBe('Second error');
    });

    it('should handle empty workflow as callable', async () => {
      const emptyWorkflow = new Workflow({ name: 'empty' });
      const step = new Step({
        name: 'empty-wf-step',
        callable: emptyWorkflow
      });

      const result = await step.execute();

      expect(result).toBe(emptyWorkflow);
      expect(emptyWorkflow.status).toBe(State.get('statuses.workflow').COMPLETE);
    });
  });
});
