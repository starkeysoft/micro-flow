import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Step from '../src/classes/step.js';
import Workflow from '../src/classes/workflow.js';
import state from '../src/classes/state.js';
import step_statuses from '../src/enums/step_statuses.js';
import step_types from '../src/enums/step_types.js';

describe('Step', () => {
  let step;
  let workflow;

  beforeEach(() => {
    // Reset the global state before each test and set up a valid workflow context
    state.state = {
      workflows: {
        test_workflow_id: {
          steps: [],
          output_data: [],
          current_step: null,
          status: null,
        }
      },
      active_workflow_id: 'test_workflow_id',
      workflow_stack: ['test_workflow_id'],
      steps: [],
      output_data: [],
      current_step: null,
      status: null,
      current_step_index: 0,
    };
  });

  afterEach(() => {
    // Clean up
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a step with required parameters', () => {
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });

      expect(step.name).toBe('test-step');
      expect(step.type).toBe(step_types.ACTION);
      expect(step.status).toBe(step_statuses.WAITING);
    });

    it('should use default callable if not provided', () => {
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });

      expect(typeof step.callable).toBe('function');
    });

    it('should accept a custom callable function', () => {
      const customCallable = async () => ({ result: 'test' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION,
        callable: customCallable
      });

      expect(step.callable).toBe(customCallable);
    });

    it('should initialize events', () => {
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });

      expect(step.events).toBeDefined();
      expect(step.events.event_names).toBeDefined();
    });

    it('should set current_step_index to null', () => {
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });

      expect(step.current_step_index).toBeNull();
    });
  });

  describe('execute()', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
    });

    it('should execute a callable function', async () => {
      const callable = vi.fn(async () => ({ result: 'success' }));
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION,
        callable
      });

      workflow.pushStep(step);
      state.set('current_step_index', 0);

      const result = await step.execute();

      expect(callable).toHaveBeenCalled();
      expect(result.result).toEqual({ result: 'success' });
    });

    it('should pass workflow and step context to callable', async () => {
      let receivedContext;
      const callable = async (context) => {
        receivedContext = context;
        return { test: 'data' };
      };

      step = new Step({
        name: 'test-step',
        type: step_types.ACTION,
        callable
      });

      workflow.pushStep(step);
      state.set('current_step_index', 0);

      await step.execute();

      expect(receivedContext).toBeDefined();
      expect(receivedContext.workflow).toBe(state);
      expect(receivedContext.step).toBe(step);
    });

    it('should execute a Step as callable', async () => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async () => ({ inner: 'result' })
      });

      step = new Step({
        name: 'outer-step',
        type: step_types.ACTION,
        callable: innerStep
      });

      workflow.pushStep(step);
      state.set('current_step_index', 0);

      const result = await step.execute();

      expect(result.result).toBeDefined();
    });

    it('should execute a Workflow as callable', async () => {
      const innerWorkflow = new Workflow({
        name: 'inner-workflow',
        steps: [
          new Step({
            name: 'inner-step',
            type: step_types.ACTION,
            callable: async () => ({ inner: 'workflow-result' })
          })
        ]
      });

      step = new Step({
        name: 'outer-step',
        type: step_types.ACTION,
        callable: innerWorkflow
      });

      workflow.pushStep(step);
      state.set('current_step_index', 0);

      const result = await step.execute();

      expect(result.result).toBeDefined();
    });

    it('should handle errors in callable', async () => {
      const errorMessage = 'Test error';
      const callable = async () => {
        throw new Error(errorMessage);
      };

      step = new Step({
        name: 'test-step',
        type: step_types.ACTION,
        callable
      });

      workflow.pushStep(step);
      state.set('current_step_index', 0);

      const result = await step.execute();

      expect(result.result.error).toBeDefined();
      expect(result.result.error.message).toBe(errorMessage);
      expect(step.getStepStateValue('status')).toBe(step_statuses.FAILED);
    });

    it('should initialize step state before execution', async () => {
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION,
        callable: async () => ({ test: 'result' })
      });

      workflow.pushStep(step);
      state.set('current_step_index', 0);

      await step.execute();

      expect(step.getStepStateValue('name')).toBe('test-step');
      expect(step.getStepStateValue('type')).toBe(step_types.ACTION);
      expect(step.getStepStateValue('id')).toBeDefined();
    });

    it('should track execution time', async () => {
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION,
        callable: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { test: 'result' };
        }
      });

      workflow.pushStep(step);
      state.set('current_step_index', 0);

      await step.execute();

      const executionTime = step.getStepStateValue('execution_time_ms');
      expect(executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('markAsComplete()', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });
      workflow.pushStep(step);
      state.set('current_step_index', 0);
    });

    it('should set status to complete', () => {
      step.setStepStateValue('start_time', Date.now());
      step.markAsComplete();

      expect(step.getStepStateValue('status')).toBe(step_statuses.COMPLETE);
    });

    it('should set end time', () => {
      step.setStepStateValue('start_time', Date.now());
      step.markAsComplete();

      expect(step.getStepStateValue('end_time')).toBeDefined();
    });

    it('should calculate execution time', () => {
      step.setStepStateValue('start_time', Date.now() - 100);
      step.markAsComplete();

      const executionTime = step.getStepStateValue('execution_time_ms');
      expect(executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('markAsFailed()', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });
      workflow.pushStep(step);
      state.set('current_step_index', 0);
    });

    it('should set status to failed', () => {
      step.setStepStateValue('start_time', Date.now());
      const error = new Error('Test error');
      step.markAsFailed(error);

      expect(step.getStepStateValue('status')).toBe(step_statuses.FAILED);
    });

    it('should set end time', () => {
      step.setStepStateValue('start_time', Date.now());
      const error = new Error('Test error');
      step.markAsFailed(error);

      expect(step.getStepStateValue('end_time')).toBeDefined();
    });
  });

  describe('markAsWaiting()', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });
      workflow.pushStep(step);
      state.set('current_step_index', 0);
    });

    it('should set status to waiting', () => {
      step.markAsWaiting();
      expect(step.getStepStateValue('status')).toBe(step_statuses.WAITING);
    });
  });

  describe('markAsPending()', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });
      workflow.pushStep(step);
      state.set('current_step_index', 0);
    });

    it('should set status to pending', () => {
      step.markAsPending();
      expect(step.getStepStateValue('status')).toBe(step_statuses.PENDING);
    });
  });

  describe('markAsRunning()', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });
      workflow.pushStep(step);
      state.set('current_step_index', 0);
    });

    it('should set status to running', () => {
      step.markAsRunning();
      expect(step.getStepStateValue('status')).toBe(step_statuses.RUNNING);
    });

    it('should set start time', () => {
      step.markAsRunning();
      expect(step.getStepStateValue('start_time')).toBeDefined();
    });
  });

  describe('setCallable()', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });
      workflow.pushStep(step);
      state.set('current_step_index', 0);
    });

    it('should set a new callable function', () => {
      const newCallable = async () => ({ new: 'result' });
      step.setCallable(newCallable);

      expect(step.getStepStateValue('callable')).toBe(newCallable);
    });

    it('should allow setting a Step as callable', () => {
      const newStep = new Step({
        name: 'new-step',
        type: step_types.ACTION
      });
      step.setCallable(newStep);

      expect(step.getStepStateValue('callable')).toBe(newStep);
    });

    it('should allow setting a Workflow as callable', () => {
      const newWorkflow = new Workflow({ name: 'new-workflow' });
      step.setCallable(newWorkflow);

      expect(step.getStepStateValue('callable')).toBe(newWorkflow);
    });
  });

  describe('initializeStepState()', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });
      workflow.pushStep(step);
      state.set('current_step_index', 0);
    });

    it('should initialize all step state properties', () => {
      const callable = async () => {};
      step.initializeStepState('test-name', step_types.ACTION, callable);

      expect(step.getStepStateValue('name')).toBe('test-name');
      expect(step.getStepStateValue('type')).toBe(step_types.ACTION);
      expect(step.getStepStateValue('callable')).toBe(callable);
      expect(step.getStepStateValue('id')).toBeDefined();
      expect(step.getStepStateValue('start_time')).toBeNull();
      expect(step.getStepStateValue('end_time')).toBeNull();
      expect(step.getStepStateValue('execution_time_ms')).toBe(0);
    });
  });

  describe('getStepStateValue() and setStepStateValue()', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });
      workflow.pushStep(step);
      state.set('current_step_index', 0);
    });

    it('should set and get step state values', () => {
      step.setStepStateValue('custom_field', 'custom_value');
      expect(step.getStepStateValue('custom_field')).toBe('custom_value');
    });

    it('should return default value if key does not exist', () => {
      expect(step.getStepStateValue('nonexistent', 'default')).toBe('default');
    });

    it('should handle nested values', () => {
      step.setStepStateValue('nested.value', 'test');
      expect(step.getStepStateValue('nested.value')).toBe('test');
    });
  });

  describe('prepareReturnData()', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION
      });
      workflow.pushStep(step);
      state.set('current_step_index', 0);
      step.initializeStepState('test', step_types.ACTION, async () => {});
    });

    it('should return result and state', () => {
      const result = { data: 'test' };
      const returnData = step.prepareReturnData(result);

      expect(returnData.result).toEqual(result);
      expect(returnData.state).toBeDefined();
    });

    it('should include step state in return data', () => {
      step.setStepStateValue('custom', 'value');
      const returnData = step.prepareReturnData({ test: 'result' });

      expect(returnData.state).toBeDefined();
    });
  });

  describe('event emission', () => {
    beforeEach(() => {
      workflow = new Workflow({ name: 'test-workflow' });
      step = new Step({
        name: 'test-step',
        type: step_types.ACTION,
        callable: async () => ({ result: 'test' })
      });
      workflow.pushStep(step);
      state.set('current_step_index', 0);
    });

    it('should emit STEP_RUNNING event when marked as running', () => {
      const listener = vi.fn();
      step.events.on(step.events.event_names.STEP_RUNNING, listener);

      step.markAsRunning();

      expect(listener).toHaveBeenCalled();
    });

    it('should emit STEP_COMPLETED event when marked as complete', () => {
      const listener = vi.fn();
      step.events.on(step.events.event_names.STEP_COMPLETED, listener);

      step.setStepStateValue('start_time', Date.now());
      step.markAsComplete();

      expect(listener).toHaveBeenCalled();
    });

    it('should emit STEP_FAILED event when marked as failed', () => {
      const listener = vi.fn();
      step.events.on(step.events.event_names.STEP_FAILED, listener);

      step.setStepStateValue('start_time', Date.now());
      step.markAsFailed(new Error('Test error'));

      expect(listener).toHaveBeenCalled();
    });

    it('should emit STEP_WAITING event when marked as waiting', () => {
      const listener = vi.fn();
      step.events.on(step.events.event_names.STEP_WAITING, listener);

      step.markAsWaiting();

      expect(listener).toHaveBeenCalled();
    });

    it('should emit STEP_PENDING event when marked as pending', () => {
      const listener = vi.fn();
      step.events.on(step.events.event_names.STEP_PENDING, listener);

      step.markAsPending();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('integration with workflow', () => {
    it('should work within a workflow execution', async () => {
      const results = [];

      const step1 = new Step({
        name: 'step1',
        type: step_types.ACTION,
        callable: async () => {
          results.push('step1');
          return { step: 1 };
        }
      });

      const step2 = new Step({
        name: 'step2',
        type: step_types.ACTION,
        callable: async () => {
          results.push('step2');
          return { step: 2 };
        }
      });

      workflow = new Workflow({
        name: 'integration-test',
        steps: [step1, step2]
      });

      await workflow.execute();

      expect(results).toEqual(['step1', 'step2']);
    });
  });
});
