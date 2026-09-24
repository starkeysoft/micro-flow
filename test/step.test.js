import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Step from '../src/classes/steps/step.js';
import Workflow from '../src/classes/workflow.js';
import CallableRegistry from '../src/classes/callable_registry.js';
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
      const step = new Step({ sub_step_type: sub_step_types.conditional_step });

      expect(step.sub_step_type).toBe(sub_step_types.conditional_step);
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

    it('should default max_retries to 0', () => {
      const step = new Step({});
      expect(step.max_retries).toBe(0);
    });

    it('should default max_timeout_ms to 30000', () => {
      const step = new Step({});
      expect(step.max_timeout_ms).toBe(30000);
    });

    it('should set max_retries when provided', () => {
      const step = new Step({ max_retries: 3 });
      expect(step.max_retries).toBe(3);
    });

    it('should set max_timeout_ms when provided', () => {
      const step = new Step({ max_timeout_ms: 5000 });
      expect(step.max_timeout_ms).toBe(5000);
    });

    it('should initialize retry_count to 0', () => {
      const step = new Step({});
      expect(step.retry_count).toBe(0);
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

    it('should return the serialized step', async () => {
      const step = new Step({
        name: 'test-step',
        callable: async () => 'result'
      });

      const result = await step.execute();

      expect(result).toEqual(step.prepareForSerialization());
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

    it('should rethrow error when exit_on_error is true', async () => {
      const error = new Error('Test error');
      const step = new Step({
        name: 'failing-step',
        callable: async () => {
          throw error;
        }
      });
      step.setState('exit_on_error', true);

      await expect(step.execute()).rejects.toThrow('Test error');
    });

    it('should not rethrow error when exit_on_error is false', async () => {
      const step = new Step({
        name: 'failing-step',
        callable: async () => {
          throw new Error('Test error');
        }
      });

      const result = await step.execute();

      expect(result).toEqual(step.prepareForSerialization());
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

  describe('timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should fail with a timeout error when callable exceeds max_timeout_ms', async () => {
      const step = new Step({
        name: 'slow-step',
        max_timeout_ms: 1000,
        callable: async () => new Promise(() => {}), // never resolves
      });

      const promise = step.execute();
      vi.advanceTimersByTime(1000);
      await promise;

      expect(step.status).toBe(State.get('statuses.step').FAILED);
      expect(step.errors).toHaveLength(1);
      expect(step.errors[0].message).toMatch(/timed out after 1000ms/);
    });

    it('should include the step name in the timeout error message', async () => {
      const step = new Step({
        name: 'named-step',
        max_timeout_ms: 500,
        callable: async () => new Promise(() => {}),
      });

      const promise = step.execute();
      vi.advanceTimersByTime(500);
      await promise;

      expect(step.errors[0].message).toContain('"named-step"');
    });

    it('should not time out when callable completes within max_timeout_ms', async () => {
      const step = new Step({
        name: 'fast-step',
        max_timeout_ms: 1000,
        callable: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'done';
        },
      });

      const promise = step.execute();
      vi.advanceTimersByTime(100);
      await promise;

      expect(step.status).toBe(State.get('statuses.step').COMPLETE);
      expect(step.result).toBe('done');
    });

    it('should give each retry a fresh timeout after an attempt times out', async () => {
      let callCount = 0;
      const step = new Step({
        name: 'retry-timeout-step',
        max_retries: 2,
        max_timeout_ms: 1000,
        callable: async () => {
          callCount++;
          if (callCount === 1) {
            // First attempt hangs past the timeout
            return new Promise(() => {});
          }
          return new Promise(resolve => setTimeout(resolve, 500, 'ok'));
        },
      });

      const promise = step.execute();
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(500);
      await promise;

      expect(callCount).toBe(2);
      expect(step.status).toBe(State.get('statuses.step').COMPLETE);
      expect(step.result).toBe('ok');
      expect(step.retry_count).toBe(1);
      expect(step.errors).toHaveLength(0);
    });

    it('should not leave a pending timer after the step completes', async () => {
      const step = new Step({ max_timeout_ms: 1000, callable: async () => 'done' });

      await step.execute();

      expect(vi.getTimerCount()).toBe(0);
    });

    it('should set start_time only on the first execute call', async () => {
      let callCount = 0;
      const step = new Step({
        name: 'retry-start-time',
        max_retries: 1,
        max_timeout_ms: 1000,
        callable: async () => {
          callCount++;
          if (callCount === 1) throw new Error('first fail');
          return 'ok';
        },
      });

      await step.execute();

      expect(step.timing.start_time).toBeInstanceOf(Date);
    });
  });

  describe('retries', () => {
    it('should retry up to max_retries times on failure', async () => {
      let callCount = 0;
      const step = new Step({
        name: 'retry-step',
        max_retries: 3,
        callable: async () => {
          callCount++;
          throw new Error('always fails');
        },
      });

      await step.execute();

      expect(callCount).toBe(4); // 1 original + 3 retries
    });

    it('should succeed if a retry eventually passes', async () => {
      let callCount = 0;
      const step = new Step({
        name: 'eventually-succeeds',
        max_retries: 3,
        callable: async () => {
          callCount++;
          if (callCount < 3) throw new Error('not yet');
          return 'success';
        },
      });

      await step.execute();

      expect(step.status).toBe(State.get('statuses.step').COMPLETE);
      expect(callCount).toBe(3);
    });

    it('should mark step as FAILED after all retries are exhausted', async () => {
      const step = new Step({
        name: 'always-fails',
        max_retries: 2,
        callable: async () => {
          throw new Error('permanent failure');
        },
      });

      await step.execute();

      expect(step.status).toBe(State.get('statuses.step').FAILED);
    });

    it('should store the error only when retries are exhausted', async () => {
      const step = new Step({
        name: 'exhaust-retries',
        max_retries: 2,
        callable: async () => {
          throw new Error('permanent failure');
        },
      });

      await step.execute();

      expect(step.errors).toHaveLength(1);
      expect(step.errors[0].message).toBe('permanent failure');
    });

    it('should increment retry_count for each retry attempt', async () => {
      const step = new Step({
        name: 'count-retries',
        max_retries: 3,
        callable: async () => {
          throw new Error('fail');
        },
      });

      await step.execute();

      expect(step.retry_count).toBe(3);
    });

    it('should populate retry_results with each retry outcome', async () => {
      let callCount = 0;
      const step = new Step({
        name: 'retry-results-step',
        max_retries: 1,
        callable: async () => {
          callCount++;
          if (callCount === 1) throw new Error('fail');
          return 'finally ok';
        },
      });

      await step.execute();

      expect(step.retry_results).toHaveLength(1);
      expect(step.retry_results[0].retry_count).toBe(1);
      expect(step.retry_results[0].result).toBe('finally ok');
    });

    it('should record the error of each failed retry in retry_results', async () => {
      const step = new Step({
        name: 'retry-errors-step',
        max_retries: 2,
        callable: async () => { throw new Error('nope'); },
      });

      await step.execute();

      expect(step.retry_results.map(r => r.retry_count)).toEqual([1, 2]);
      expect(step.retry_results.every(r => r.error.message === 'nope')).toBe(true);
    });

    it('should emit step_retrying (not step_running) for each retry', async () => {
      const emitted = [];
      const events = Workflow.events.step;
      const listener = (event_name) => (step) => { if (step.name === 'retry-events-step') emitted.push(event_name); };
      const on_running = listener('running');
      const on_retrying = listener('retrying');
      events.on(Workflow.event_names.step.STEP_RUNNING, on_running);
      events.on(Workflow.event_names.step.STEP_RETRYING, on_retrying);

      let callCount = 0;
      const step = new Step({
        name: 'retry-events-step',
        max_retries: 2,
        callable: async () => {
          callCount++;
          if (callCount < 3) throw new Error('fail');
          return 'ok';
        },
      });

      await step.execute();

      events.off(Workflow.event_names.step.STEP_RUNNING, on_running);
      events.off(Workflow.event_names.step.STEP_RETRYING, on_retrying);

      expect(emitted).toEqual(['running', 'retrying', 'retrying']);
    });

    it('should not retry when max_retries is 0', async () => {
      let callCount = 0;
      const step = new Step({
        name: 'no-retry',
        max_retries: 0,
        callable: async () => {
          callCount++;
          throw new Error('fail');
        },
      });

      await step.execute();

      expect(callCount).toBe(1);
      expect(step.errors).toHaveLength(1);
    });

    it('should rethrow on final retry when exit_on_error is true', async () => {
      const step = new Step({
        name: 'rethrow-after-retry',
        max_retries: 1,
        callable: async () => {
          throw new Error('fatal');
        },
      });
      step.setState('exit_on_error', true);

      await expect(step.execute()).rejects.toThrow('fatal');
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
      workflow.addStep(step);

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
      workflow.addStep(step);

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

    it('should set parent_workflow_id on nested Step', () => {
      const outerStep = new Step({ name: 'outer' });
      outerStep.parent_workflow_id = 'test-workflow-id';

      const innerStep = new Step({ name: 'inner' });
      outerStep.callable = innerStep;

      expect(innerStep.parent_workflow_id).toBe('test-workflow-id');
    });

    it('should set parent_workflow_id to null on nested Step when outer has no parent', () => {
      const outerStep = new Step({ name: 'outer' });
      const innerStep = new Step({ name: 'inner' });
      outerStep.callable = innerStep;

      expect(innerStep.parent_workflow_id).toBeNull();
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
      const step = new Step({
        name: 'state-access',
        callable: async function() {
          const data = this.getState('testData');
          return data.value * 2;
        }
      });
      step.setState('testData', { value: 42 });

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

      expect(step.getState('modifiedValue')).toBe('set by step');
      expect(step.prepareForSerialization().result).toBe('done');
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

  describe('static getCallableType', () => {
    it('should return "function" for a function', () => {
      expect(Step.getCallableType(async () => {})).toBe('function');
    });

    it('should return "step" for a Step instance', () => {
      expect(Step.getCallableType(new Step({ name: 'inner' }))).toBe('step');
    });

    it('should return "workflow" for a Workflow instance', () => {
      expect(Step.getCallableType(new Workflow({ name: 'wf' }))).toBe('workflow');
    });

    it('should throw for an invalid callable', () => {
      expect(() => Step.getCallableType({ foo: 'bar' })).toThrow('Invalid callable type');
    });
  });

  describe('step class registry', () => {
    it('should register Step under its step_name', () => {
      expect(Step.resolveStepClass('step')).toBe(Step);
    });

    it('should fall back to Step for an unknown class_name', () => {
      expect(Step.resolveStepClass('totally-unknown-step-type')).toBe(Step);
    });

    it('should fall back to Step for an undefined class_name', () => {
      expect(Step.resolveStepClass(undefined)).toBe(Step);
    });

    it('hydrateAny should dispatch to the resolved class\'s hydrate method', () => {
      const step = new Step({ name: 'to-hydrate', callable: async function fn() {} });
      const registry = new CallableRegistry();
      registry.register('fn', step._callable);

      const hydrated = Step.hydrateAny(step.prepareForSerialization(), registry);

      expect(hydrated).toBeInstanceOf(Step);
      expect(hydrated.id).toBe(step.id);
    });
  });

  describe('serializeCallableField / hydrateCallableField', () => {
    it('should serialize null/undefined callables to null', () => {
      expect(Step.serializeCallableField(null)).toBeNull();
      expect(Step.serializeCallableField(undefined)).toBeNull();
    });

    it('should serialize the default Step.noop callable to null', () => {
      expect(Step.serializeCallableField(Step.noop)).toBeNull();
    });

    it('should serialize a function to a { type, value } descriptor keyed by name', () => {
      async function namedFn() {}

      expect(Step.serializeCallableField(namedFn)).toEqual({
        type: 'function',
        value: 'namedFn',
      });
    });

    it('should serialize a Step to a { type, value } descriptor with the nested serialized step', () => {
      const inner = new Step({ name: 'inner-step' });

      expect(Step.serializeCallableField(inner)).toEqual({
        type: 'step',
        value: inner.prepareForSerialization(),
      });
    });

    it('should serialize a Workflow to a { type, value } descriptor with the nested serialized workflow', () => {
      const workflow = new Workflow({ name: 'inner-workflow' });

      expect(Step.serializeCallableField(workflow)).toEqual({
        type: 'workflow',
        value: workflow.prepareForSerialization(),
      });
    });

    it('should hydrate a null/undefined descriptor to undefined', () => {
      expect(Step.hydrateCallableField(null)).toBeUndefined();
      expect(Step.hydrateCallableField(undefined)).toBeUndefined();
    });

    it('should hydrate a function descriptor by looking it up in the registry', () => {
      const fn = async () => 'value';
      const registry = new CallableRegistry();
      registry.register('myFn', fn);

      const hydrated = Step.hydrateCallableField({ type: 'function', value: 'myFn' }, registry);

      expect(hydrated).toBe(fn);
    });

    it('should throw when hydrating a function descriptor with no registry provided', () => {
      expect(() => Step.hydrateCallableField({ type: 'function', value: 'myFn' })).toThrow(
        'Callable registry key "myFn" not found in registry or registry not provided.'
      );
    });

    it('should throw when hydrating a function descriptor missing from the registry', () => {
      const registry = new CallableRegistry();

      expect(() => Step.hydrateCallableField({ type: 'function', value: 'missingFn' }, registry)).toThrow(
        'Callable registry key "missingFn" not found in registry or registry not provided.'
      );
    });

    it('should hydrate a step descriptor back into a Step instance', () => {
      const registry = new CallableRegistry();
      registry.register('innerCallable', async function innerCallable() {});
      const inner = new Step({ name: 'inner-step', callable: async function innerCallable() {} });
      const descriptor = Step.serializeCallableField(inner);

      const hydrated = Step.hydrateCallableField(descriptor, registry);

      expect(hydrated).toBeInstanceOf(Step);
      expect(hydrated.id).toBe(inner.id);
      expect(hydrated.name).toBe('inner-step');
    });

    it('should hydrate a workflow descriptor back into a Workflow instance', () => {
      const workflow = new Workflow({ name: 'inner-workflow' });
      const descriptor = Step.serializeCallableField(workflow);

      const hydrated = Step.hydrateCallableField(descriptor);

      expect(hydrated).toBeInstanceOf(Workflow);
      expect(hydrated.id).toBe(workflow.id);
    });

    it('should pass through an already-hydrated function unchanged', () => {
      const fn = async () => {};

      expect(Step.hydrateCallableField(fn)).toBe(fn);
    });

    it('should pass through an already-hydrated Step unchanged', () => {
      const step = new Step({ name: 'already-hydrated' });

      expect(Step.hydrateCallableField(step)).toBe(step);
    });

    it('should pass through an already-hydrated Workflow unchanged', () => {
      const workflow = new Workflow({ name: 'already-hydrated' });

      expect(Step.hydrateCallableField(workflow)).toBe(workflow);
    });

    it('should throw for a descriptor with an unknown type', () => {
      expect(() => Step.hydrateCallableField({ type: 'bogus', value: 'x' })).toThrow(
        'Unknown callable type "bogus" encountered during hydration.'
      );
    });
  });

  describe('prepareForSerialization', () => {
    it('should include class_name matching the constructor\'s step_name', () => {
      const step = new Step({ name: 'test-step' });

      expect(step.prepareForSerialization().class_name).toBe('step');
    });

    it('should serialize a function callable by name when no registry key is set', () => {
      async function myCallable() {}
      const step = new Step({ name: 'fn-step', callable: myCallable });

      expect(step.prepareForSerialization().callable).toEqual({
        type: 'function',
        value: 'myCallable',
      });
    });

    it('should serialize the callable_registry_key when one is set, ignoring the callable\'s own name', () => {
      async function myCallable() {}
      const step = new Step({
        name: 'fn-step',
        callable: myCallable,
        callable_registry_key: 'registeredName',
      });

      expect(step.prepareForSerialization().callable).toEqual({
        type: 'function',
        value: 'registeredName',
      });
    });

    it('should serialize a Step callable as a nested step descriptor', () => {
      const inner = new Step({ name: 'inner' });
      const outer = new Step({ name: 'outer', callable: inner });

      expect(outer.prepareForSerialization().callable).toEqual({
        type: 'step',
        value: inner.prepareForSerialization(),
      });
    });

    it('should serialize a Workflow callable as a nested workflow descriptor', () => {
      const innerWorkflow = new Workflow({ name: 'inner-wf' });
      const outer = new Step({ name: 'outer', callable: innerWorkflow });

      expect(outer.prepareForSerialization().callable).toEqual({
        type: 'workflow',
        value: innerWorkflow.prepareForSerialization(),
      });
    });

    it('should include core metadata fields', () => {
      const step = new Step({ name: 'meta-step', max_retries: 2, max_timeout_ms: 1000 });
      const serialized = step.prepareForSerialization();

      expect(serialized).toMatchObject({
        id: step.id,
        name: 'meta-step',
        callable_type: 'function',
        step_type: step_types.ACTION,
        sub_step_type: null,
        max_retries: 2,
        max_timeout_ms: 1000,
        retry_count: 0,
        retry_results: [],
        errors: [],
        result: null,
        parent_workflow_id: undefined,
      });
    });

    it('should be JSON-safe (round-trippable through JSON.stringify/parse)', () => {
      const step = new Step({ name: 'json-step', callable: async function namedFn() {} });

      expect(() => JSON.parse(JSON.stringify(step.prepareForSerialization()))).not.toThrow();
    });
  });

  describe('serialize / toJSON', () => {
    it('should return a JSON string matching prepareForSerialization', () => {
      const step = new Step({ name: 'serialize-step' });

      expect(JSON.parse(step.serialize())).toEqual(step.prepareForSerialization());
    });

    it('toJSON should return the same shape as prepareForSerialization', () => {
      const step = new Step({ name: 'json-step' });

      expect(step.toJSON()).toEqual(step.prepareForSerialization());
    });

    it('should be used automatically by JSON.stringify', () => {
      const step = new Step({ name: 'auto-json-step' });

      expect(JSON.parse(JSON.stringify(step))).toEqual(step.prepareForSerialization());
    });
  });

  describe('hydrate / hydrateSerialized', () => {
    it('should round-trip a step with the default callable without a registry', async () => {
      const original = new Step({ name: 'defaults' });

      expect(JSON.parse(original.serialize()).callable).toBeNull();

      const hydrated = Step.hydrateSerialized(original.serialize());

      expect(hydrated.callable_type).toBe('function');
      await hydrated.execute();
      expect(hydrated.status).toBe(Workflow.statuses.step.COMPLETE);
    });

    it('should round-trip a step with a registered function callable', async () => {
      const registry = new CallableRegistry();
      registry.register('greet', async function greet() {
        return `hello, ${this.name}`;
      });

      const original = new Step({ name: 'greeter', callable: registry.get('greet'), callable_registry_key: 'greet' });
      const serialized = original.serialize();

      const hydrated = Step.hydrateSerialized(serialized, registry);

      expect(hydrated).toBeInstanceOf(Step);
      expect(hydrated.id).toBe(original.id);
      expect(hydrated.name).toBe('greeter');

      const result = await hydrated.execute();
      expect(result.result).toBe('hello, greeter');
    });

    it('should preserve execution metadata across hydration', () => {
      const registry = new CallableRegistry();
      registry.register('callable', async () => {});

      const original = new Step({ name: 'meta-step' });
      original.retry_count = 2;
      original.retry_results = [{ retry_count: 1, result: 'x' }];
      original.errors = [new Error('boom')];
      original.result = 'final-result';
      original.status = State.get('statuses.step').FAILED;
      original.parent_workflow_id = 'workflow-123';

      const hydrated = Step.hydrate(original.prepareForSerialization(), registry);

      expect(hydrated.retry_count).toBe(2);
      expect(hydrated.retry_results).toEqual([{ retry_count: 1, result: 'x' }]);
      expect(hydrated.errors).toHaveLength(1);
      expect(hydrated.result).toBe('final-result');
      expect(hydrated.status).toBe(State.get('statuses.step').FAILED);
      expect(hydrated.parent_workflow_id).toBe('workflow-123');
    });

    it('should throw when a function callable\'s registry key cannot be resolved', () => {
      const original = new Step({
        name: 'unregistered-fn-step',
        callable: async function myFn() {},
      });

      expect(() => Step.hydrate(original.prepareForSerialization())).toThrow(
        /not found in registry or registry not provided/
      );
    });

    it('should hydrate a Step callable back into a nested Step instance', async () => {
      const registry = new CallableRegistry();
      registry.register('callable', async () => 'inner-result');

      const inner = new Step({ name: 'inner', callable: async () => 'inner-result' });
      const outer = new Step({ name: 'outer', callable: inner });

      const hydrated = Step.hydrate(outer.prepareForSerialization(), registry);
      const result = await hydrated.execute();

      expect(result).toBeInstanceOf(Step);
      expect(result.result).toBe('inner-result');
    });

    it('should hydrate a Workflow callable back into a nested Workflow instance', async () => {
      const registry = new CallableRegistry();
      registry.register('callable', async () => 'wf-result');

      const innerWorkflow = new Workflow({
        name: 'inner-wf',
        steps: [new Step({ name: 'wf-step', callable: async () => 'wf-result' })],
      });
      const outer = new Step({ name: 'outer', callable: innerWorkflow });

      const hydrated = Step.hydrate(outer.prepareForSerialization(), registry);
      const result = await hydrated.execute();

      expect(result.status).toBe(State.get('statuses.workflow').COMPLETE);
    });

    it('should throw when hydrateSerialized is given a non-string', () => {
      expect(() => Step.hydrateSerialized({ not: 'a string' })).toThrow(
        'Invalid serialized step. Must be a string.'
      );
    });

    it('hydrateSerialized should dispatch through hydrateAny using class_name', () => {
      const registry = new CallableRegistry();
      registry.register('callable', async () => {});

      const step = new Step({ name: 'dispatch-step' });

      const hydrated = Step.hydrateSerialized(step.serialize(), registry);

      expect(hydrated.constructor).toBe(Step);
    });
  });
});
