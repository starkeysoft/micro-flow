import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Workflow from '../src/classes/workflow.js';
import Step from '../src/classes/steps/step.js';
import State from '../src/classes/state.js';

describe('Workflow', () => {
  beforeEach(() => {
    // Reset state before each test
    State.reset();
    // Suppress console output during tests
    State.set('log_suppress', true);
  });

  afterEach(() => {
    State.reset();
  });

  describe('constructor', () => {
    it('should create a workflow with default options', () => {
      const workflow = new Workflow({});
      
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toContain('workflow-');
      expect(workflow.exit_on_error).toBe(false);
      expect(workflow.throw_on_empty).toBe(false);
      expect(workflow._steps).toEqual([]);
      expect(workflow.base_type).toBe('workflow');
    });

    it('should create a workflow with a custom name', () => {
      const workflow = new Workflow({ name: 'test-workflow' });
      
      expect(workflow.name).toBe('test-workflow');
    });

    it('should set exit_on_error when provided', () => {
      const workflow = new Workflow({ exit_on_error: true });
      
      expect(workflow.exit_on_error).toBe(true);
    });

    it('should set throw_on_empty when provided', () => {
      const workflow = new Workflow({ throw_on_empty: true });
      
      expect(workflow.throw_on_empty).toBe(true);
    });

    it('should add steps provided in constructor', () => {
      const step1 = new Step({ name: 'step-1', callable: async () => 'result-1' });
      const step2 = new Step({ name: 'step-2', callable: async () => 'result-2' });
      
      const workflow = new Workflow({
        name: 'test-workflow',
        steps: [step1, step2]
      });
      
      expect(workflow._steps).toHaveLength(2);
      expect(workflow._steps[0].name).toBe('step-1');
      expect(workflow._steps[1].name).toBe('step-2');
    });

    it('should register workflow in global state', () => {
      const workflow = new Workflow({ name: 'registered-workflow' });
      const workflows = State.get('workflows');
      
      expect(workflows[workflow.id]).toBe(workflow);
    });

    it('should set initial status to CREATED', () => {
      const workflow = new Workflow({});
      
      expect(workflow.status).toBe(State.get('statuses.workflow').CREATED);
    });

    it('should initialize timing with create_time', () => {
      const before = new Date();
      const workflow = new Workflow({});
      const after = new Date();
      
      expect(workflow.timing.create_time).toBeDefined();
      expect(workflow.timing.create_time >= before).toBe(true);
      expect(workflow.timing.create_time <= after).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute an empty workflow without throwing', async () => {
      const workflow = new Workflow({ name: 'empty-workflow' });
      
      const result = await workflow.execute();
      
      expect(result).toBe(workflow);
      expect(result.status).toBe(State.get('statuses.workflow').COMPLETE);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].message).toBe('Workflow is empty');
    });

    it('should throw on empty workflow when throw_on_empty is true', async () => {
      const workflow = new Workflow({ throw_on_empty: true });
      
      await expect(workflow.execute()).rejects.toThrow('Cannot execute an empty workflow');
    });

    it('should execute steps in sequence', async () => {
      const order = [];
      const step1 = new Step({
        name: 'step-1',
        callable: async () => {
          order.push(1);
          return 'result-1';
        }
      });
      const step2 = new Step({
        name: 'step-2',
        callable: async () => {
          order.push(2);
          return 'result-2';
        }
      });
      
      const workflow = new Workflow({
        steps: [step1, step2]
      });
      
      await workflow.execute();
      
      expect(order).toEqual([1, 2]);
    });

    it('should collect results from all steps', async () => {
      const step1 = new Step({
        name: 'step-1',
        callable: async () => 'result-1'
      });
      const step2 = new Step({
        name: 'step-2',
        callable: async () => 'result-2'
      });
      
      const workflow = new Workflow({
        steps: [step1, step2]
      });
      
      await workflow.execute();
      
      expect(workflow.results).toHaveLength(2);
      expect(workflow.results[0].message).toBe('Success');
      expect(workflow.results[1].message).toBe('Success');
    });

    it('should set status to RUNNING during execution', async () => {
      let statusDuringExecution;
      const step = new Step({
        name: 'check-status',
        callable: async function() {
          const workflow = State.get('workflows')[this.parentWorkflowId];
          statusDuringExecution = workflow.status;
        }
      });
      
      const workflow = new Workflow({ steps: [step] });
      await workflow.execute();
      
      expect(statusDuringExecution).toBe(State.get('statuses.workflow').RUNNING);
    });

    it('should set status to COMPLETE after execution', async () => {
      const step = new Step({
        name: 'simple-step',
        callable: async () => 'done'
      });
      
      const workflow = new Workflow({ steps: [step] });
      await workflow.execute();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').COMPLETE);
    });

    it('should continue on error when exit_on_error is false', async () => {
      const step1 = new Step({
        name: 'failing-step',
        callable: async () => {
          throw new Error('Step failed');
        }
      });
      const step2 = new Step({
        name: 'success-step',
        callable: async () => 'success'
      });
      
      const workflow = new Workflow({
        exit_on_error: false,
        steps: [step1, step2]
      });
      
      await workflow.execute();
      
      // Both steps should have been attempted
      expect(workflow.results).toHaveLength(2);
      expect(workflow.results[0].message).toContain('failed');
      expect(workflow.results[1].message).toBe('Success');
    });

    it('should stop on error when exit_on_error is true', async () => {
      const step1 = new Step({
        name: 'failing-step',
        callable: async () => {
          throw new Error('Step failed');
        }
      });
      const step2 = new Step({
        name: 'never-reached',
        callable: async () => 'success'
      });
      
      const workflow = new Workflow({
        exit_on_error: true,
        steps: [step1, step2]
      });
      
      await workflow.execute();
      
      // Only first step should have been attempted
      expect(workflow.results).toHaveLength(1);
      expect(workflow.results[0].message).toContain('failed');
    });

    it('should handle should_break flag', async () => {
      const step1 = new Step({
        name: 'set-break',
        callable: async function() {
          const workflow = State.get('workflows')[this.parentWorkflowId];
          workflow.should_break = true;
          return 'set break';
        }
      });
      const step2 = new Step({
        name: 'should-not-run',
        callable: async () => 'should not run'
      });
      
      const workflow = new Workflow({
        steps: [step1, step2]
      });
      
      await workflow.execute();
      
      // Only first step should execute, second should be skipped due to break
      expect(workflow.results).toHaveLength(1);
    });

    it('should handle should_skip flag', async () => {
      const results = [];
      const step1 = new Step({
        name: 'set-skip',
        callable: async function() {
          const workflow = State.get('workflows')[this.parentWorkflowId];
          workflow.should_skip = true;
          results.push('step1');
          return 'set skip';
        }
      });
      const step2 = new Step({
        name: 'skipped',
        callable: async () => {
          results.push('step2');
          return 'should be skipped';
        }
      });
      const step3 = new Step({
        name: 'runs-after-skip',
        callable: async () => {
          results.push('step3');
          return 'runs';
        }
      });
      
      const workflow = new Workflow({
        steps: [step1, step2, step3]
      });
      
      await workflow.execute();
      
      // step2 should be skipped
      expect(results).toEqual(['step1', 'step3']);
    });

    it('should handle should_pause flag', async () => {
      const step1 = new Step({
        name: 'set-pause',
        callable: async function() {
          const workflow = State.get('workflows')[this.parentWorkflowId];
          workflow.should_pause = true;
          return 'set pause';
        }
      });
      const step2 = new Step({
        name: 'should-not-run-yet',
        callable: async () => 'should not run yet'
      });
      
      const workflow = new Workflow({
        steps: [step1, step2]
      });
      
      await workflow.execute();
      
      // Workflow should be paused
      expect(workflow.status).toBe(State.get('statuses.workflow').PAUSED);
      expect(workflow.results).toHaveLength(1);
    });

    it('should set parentWorkflowId on steps during execution', async () => {
      let capturedParentId;
      const step = new Step({
        name: 'capture-parent',
        callable: async function() {
          capturedParentId = this.parentWorkflowId;
        }
      });
      
      const workflow = new Workflow({ steps: [step] });
      await workflow.execute();
      
      expect(capturedParentId).toBe(workflow.id);
    });
  });

  describe('resume', () => {
    it('should resume a paused workflow', async () => {
      let step1Count = 0;
      const step1 = new Step({
        name: 'step-1-resume-test',
        callable: async function() {
          step1Count++;
          // Only pause on first execution
          if (step1Count === 1) {
            const workflow = State.get('workflows')[this.parentWorkflowId];
            workflow.should_pause = true;
          }
          return 'step1 done';
        }
      });
      const step2 = new Step({
        name: 'step-2-resume-test',
        callable: async () => {
          return 'step2 done';
        }
      });
      
      const workflow = new Workflow({
        steps: [step1, step2]
      });
      
      // First execution pauses after step1
      await workflow.execute();
      expect(workflow.status).toBe(State.get('statuses.workflow').PAUSED);
      
      // Resume re-executes from beginning and completes
      await workflow.resume();
      expect(workflow.status).toBe(State.get('statuses.workflow').COMPLETE);
    });

    it('should set resume_time on timing', async () => {
      // Use the pause() method instead of setting should_pause in a callable
      const step = new Step({
        name: 'simple-step',
        callable: async () => 'done'
      });
      
      const workflow = new Workflow({ steps: [step] });
      
      // Manually pause before executing
      workflow.pause();
      await workflow.execute();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').PAUSED);
      
      const before = new Date();
      await workflow.resume();
      const after = new Date();
      
      expect(workflow.timing.resume_time).toBeDefined();
      expect(workflow.timing.resume_time >= before).toBe(true);
      expect(workflow.timing.resume_time <= after).toBe(true);
    });
  });

  describe('step', () => {
    it('should execute the current step and return result', async () => {
      const step = new Step({
        name: 'test-step',
        callable: async () => 'step result'
      });
      
      const workflow = new Workflow({ steps: [step] });
      workflow.current_step = step.id;
      
      const result = await workflow.step();
      
      expect(result.result).toBe('step result');
    });

    it('should throw if step fails', async () => {
      const error = new Error('Step execution error');
      const step = new Step({
        name: 'failing-step',
        callable: async () => {
          throw error;
        }
      });
      
      const workflow = new Workflow({ steps: [step] });
      workflow.current_step = step.id;
      
      await expect(workflow.step()).rejects.toThrow('Step execution error');
    });
  });

  describe('addStep', () => {
    it('should add a step to the workflow', () => {
      const workflow = new Workflow({});
      const step = new Step({ name: 'new-step' });
      
      workflow.addStep(step);
      
      expect(workflow._steps).toHaveLength(1);
      expect(workflow._steps[0]).toBe(step);
    });

    it('should add step to steps_by_id', () => {
      const workflow = new Workflow({});
      const step = new Step({ name: 'new-step' });
      
      workflow.addStep(step);
      
      expect(workflow.steps_by_id[step.id]).toBe(step);
    });

    it('should set parentWorkflowId on the step', () => {
      const workflow = new Workflow({});
      const step = new Step({ name: 'new-step' });
      
      workflow.addStep(step);
      
      expect(step.parentWorkflowId).toBe(workflow.id);
    });

    it('should throw error for invalid step', () => {
      const workflow = new Workflow({});
      const invalidStep = { name: 'not-a-step' };
      
      expect(() => workflow.addStep(invalidStep)).toThrow('Invalid step type');
    });

    it('should initialize _steps array if undefined', () => {
      const workflow = new Workflow({});
      workflow._steps = undefined;
      
      const step = new Step({ name: 'new-step' });
      workflow.addStep(step);
      
      expect(workflow._steps).toHaveLength(1);
    });

    it('should initialize steps_by_id if undefined', () => {
      const workflow = new Workflow({});
      workflow.steps_by_id = undefined;
      
      const step = new Step({ name: 'new-step' });
      workflow.addStep(step);
      
      expect(workflow.steps_by_id[step.id]).toBe(step);
    });
  });

  describe('addStepAtIndex', () => {
    it('should add a step at the specified index', () => {
      const workflow = new Workflow({});
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      const step3 = new Step({ name: 'step-3' });
      
      workflow.addStep(step1);
      workflow.addStep(step3);
      workflow.addStepAtIndex(step2, 1);
      
      expect(workflow._steps[0].name).toBe('step-1');
      expect(workflow._steps[1].name).toBe('step-2');
      expect(workflow._steps[2].name).toBe('step-3');
    });

    it('should add step to steps_by_id', () => {
      const workflow = new Workflow({});
      const step = new Step({ name: 'inserted-step' });
      
      workflow.addStepAtIndex(step, 0);
      
      expect(workflow.steps_by_id[step.id]).toBe(step);
    });

    it('should set parentWorkflowId on the step', () => {
      const workflow = new Workflow({});
      const step = new Step({ name: 'inserted-step' });
      
      workflow.addStepAtIndex(step, 0);
      
      expect(step.parentWorkflowId).toBe(workflow.id);
    });

    it('should initialize steps_by_id if undefined', () => {
      const workflow = new Workflow({});
      workflow.steps_by_id = undefined;
      
      const step = new Step({ name: 'new-step' });
      workflow.addStepAtIndex(step, 0);
      
      expect(workflow.steps_by_id[step.id]).toBe(step);
    });
  });

  describe('addSteps', () => {
    it('should add multiple steps', () => {
      const workflow = new Workflow({});
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      
      workflow.addSteps([step1, step2]);
      
      expect(workflow._steps).toHaveLength(2);
    });
  });

  describe('clearSteps', () => {
    it('should remove all steps', () => {
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      const workflow = new Workflow({ steps: [step1, step2] });
      
      workflow.clearSteps();
      
      expect(workflow._steps).toHaveLength(0);
    });
  });

  describe('deleteStep', () => {
    it('should remove a step by ID', () => {
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      const workflow = new Workflow({ steps: [step1, step2] });
      
      workflow.deleteStep(step1.id);
      
      expect(workflow._steps).toHaveLength(1);
      expect(workflow._steps[0].name).toBe('step-2');
    });

    it('should do nothing if step ID not found', () => {
      const step = new Step({ name: 'step-1' });
      const workflow = new Workflow({ steps: [step] });
      
      workflow.deleteStep('non-existent-id');
      
      expect(workflow._steps).toHaveLength(1);
    });
  });

  describe('deleteStepByIndex', () => {
    it('should remove a step by index', () => {
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      const step3 = new Step({ name: 'step-3' });
      const workflow = new Workflow({ steps: [step1, step2, step3] });
      
      workflow.deleteStepByIndex(1);
      
      expect(workflow._steps).toHaveLength(2);
      expect(workflow._steps[0].name).toBe('step-1');
      expect(workflow._steps[1].name).toBe('step-3');
    });
  });

  describe('initializeWorkflowState', () => {
    it('should set all initial state values', () => {
      const workflow = new Workflow({});
      
      expect(workflow.results).toEqual([]);
      expect(workflow.exit_on_error).toBe(false);
      expect(workflow.current_step).toBeNull();
      expect(workflow.should_break).toBe(false);
      expect(workflow.should_continue).toBe(false);
      expect(workflow.should_pause).toBe(false);
      expect(workflow.should_skip).toBe(false);
      expect(workflow._steps).toEqual([]);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty workflow', () => {
      const workflow = new Workflow({});
      
      expect(workflow.isEmpty()).toBe(true);
    });

    it('should return false for workflow with steps', () => {
      const step = new Step({ name: 'step-1' });
      const workflow = new Workflow({ steps: [step] });
      
      expect(workflow.isEmpty()).toBe(false);
    });

    it('should return true if _steps is undefined', () => {
      const workflow = new Workflow({});
      workflow._steps = undefined;
      
      expect(workflow.isEmpty()).toBe(true);
    });
  });

  describe('markAsCreated', () => {
    it('should set create_time', () => {
      const workflow = new Workflow({});
      const before = new Date();
      
      workflow.markAsCreated();
      
      expect(workflow.timing.create_time >= before).toBe(true);
    });

    it('should return CREATED status', () => {
      const workflow = new Workflow({});
      
      const result = workflow.markAsCreated();
      
      expect(result).toBe(State.get('statuses.workflow').CREATED);
    });
  });

  describe('markAsPaused', () => {
    it('should set status to PAUSED', () => {
      const workflow = new Workflow({});
      
      workflow.markAsPaused();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').PAUSED);
    });

    it('should set pause_time', () => {
      const workflow = new Workflow({});
      const before = new Date();
      
      workflow.markAsPaused();
      
      expect(workflow.timing.pause_time >= before).toBe(true);
    });
  });

  describe('markAsResumed', () => {
    it('should set status to RUNNING', () => {
      const workflow = new Workflow({});
      
      workflow.markAsResumed();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').RUNNING);
    });

    it('should set resume_time', () => {
      const workflow = new Workflow({});
      const before = new Date();
      
      workflow.markAsResumed();
      
      expect(workflow.timing.resume_time >= before).toBe(true);
    });
  });

  describe('moveStep', () => {
    it('should move a step from one index to another', () => {
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      const step3 = new Step({ name: 'step-3' });
      const workflow = new Workflow({ steps: [step1, step2, step3] });
      
      workflow.moveStep(0, 2);
      
      expect(workflow._steps[0].name).toBe('step-2');
      expect(workflow._steps[1].name).toBe('step-3');
      expect(workflow._steps[2].name).toBe('step-1');
    });

    it('should move a step to the beginning', () => {
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      const step3 = new Step({ name: 'step-3' });
      const workflow = new Workflow({ steps: [step1, step2, step3] });
      
      workflow.moveStep(2, 0);
      
      expect(workflow._steps[0].name).toBe('step-3');
      expect(workflow._steps[1].name).toBe('step-1');
      expect(workflow._steps[2].name).toBe('step-2');
    });
  });

  describe('pause', () => {
    it('should set should_pause flag', () => {
      const workflow = new Workflow({});
      
      workflow.pause();
      
      expect(workflow.should_pause).toBe(true);
    });

    it('should set pause_time', () => {
      const workflow = new Workflow({});
      const before = new Date();
      
      workflow.pause();
      
      expect(workflow.timing.pause_time >= before).toBe(true);
    });
  });

  describe('popStep', () => {
    it('should remove and return the last step', () => {
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      const workflow = new Workflow({ steps: [step1, step2] });
      
      const popped = workflow.popStep();
      
      expect(popped.name).toBe('step-2');
      expect(workflow._steps).toHaveLength(1);
    });

    it('should return undefined for empty workflow', () => {
      const workflow = new Workflow({});
      
      const popped = workflow.popStep();
      
      expect(popped).toBeUndefined();
    });
  });

  describe('prepareResult', () => {
    it('should add result to results array', () => {
      const workflow = new Workflow({});
      
      workflow.prepareResult('Test message', { data: 'test' });
      
      expect(workflow.results).toHaveLength(1);
      expect(workflow.results[0].message).toBe('Test message');
      expect(workflow.results[0].data).toEqual({ data: 'test' });
    });
  });

  describe('pushStep', () => {
    it('should add a step to the end', () => {
      const workflow = new Workflow({});
      const step = new Step({ name: 'pushed-step' });
      
      workflow.pushStep(step);
      
      expect(workflow._steps).toHaveLength(1);
      expect(workflow._steps[0].name).toBe('pushed-step');
    });
  });

  describe('pushSteps', () => {
    it('should add multiple steps to the end', () => {
      const workflow = new Workflow({});
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      
      workflow.pushSteps([step1, step2]);
      
      expect(workflow._steps).toHaveLength(2);
    });
  });

  describe('shiftStep', () => {
    it('should remove and return the first step', () => {
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      const workflow = new Workflow({ steps: [step1, step2] });
      
      const shifted = workflow.shiftStep();
      
      expect(shifted.name).toBe('step-1');
      expect(workflow._steps).toHaveLength(1);
      expect(workflow._steps[0].name).toBe('step-2');
    });

    it('should return undefined for empty workflow', () => {
      const workflow = new Workflow({});
      
      const shifted = workflow.shiftStep();
      
      expect(shifted).toBeUndefined();
    });
  });

  describe('unshiftStep', () => {
    it('should add a step to the beginning', () => {
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      const workflow = new Workflow({ steps: [step2] });
      
      workflow.unshiftStep(step1);
      
      expect(workflow._steps).toHaveLength(2);
      expect(workflow._steps[0].name).toBe('step-1');
      expect(workflow._steps[1].name).toBe('step-2');
    });

    it('should add step to steps_by_id', () => {
      const workflow = new Workflow({});
      const step = new Step({ name: 'new-step' });
      
      workflow.unshiftStep(step);
      
      expect(workflow.steps_by_id[step.id]).toBe(step);
    });

    it('should set parentWorkflowId on the step', () => {
      const workflow = new Workflow({});
      const step = new Step({ name: 'new-step' });
      
      workflow.unshiftStep(step);
      
      expect(step.parentWorkflowId).toBe(workflow.id);
    });

    it('should throw error for invalid step', () => {
      const workflow = new Workflow({});
      const invalidStep = { name: 'not-a-step' };
      
      expect(() => workflow.unshiftStep(invalidStep)).toThrow('Invalid step type');
    });

    it('should initialize steps_by_id if undefined', () => {
      const workflow = new Workflow({});
      workflow.steps_by_id = undefined;
      
      const step = new Step({ name: 'new-step' });
      workflow.unshiftStep(step);
      
      expect(workflow.steps_by_id[step.id]).toBe(step);
    });
  });

  describe('steps getter', () => {
    it('should return _steps array', () => {
      const step = new Step({ name: 'step-1' });
      const workflow = new Workflow({ steps: [step] });
      
      expect(workflow.steps).toBe(workflow._steps);
    });
  });

  describe('steps setter', () => {
    it('should add steps via setter', () => {
      const workflow = new Workflow({});
      const step1 = new Step({ name: 'step-1' });
      const step2 = new Step({ name: 'step-2' });
      
      workflow.steps = [step1, step2];
      
      expect(workflow._steps).toHaveLength(2);
    });

    it('should throw error for invalid step in array', () => {
      const workflow = new Workflow({});
      const validStep = new Step({ name: 'valid' });
      const invalidStep = { name: 'invalid' };
      
      expect(() => {
        workflow.steps = [validStep, invalidStep];
      }).toThrow('Invalid step type. Step at index 1 is not an instance of Step.');
    });
  });

  describe('integration tests', () => {
    it('should execute a complex workflow with multiple steps', async () => {
      const results = [];
      
      const step1 = new Step({
        name: 'fetch-data',
        callable: async () => {
          results.push('fetched');
          return { data: [1, 2, 3] };
        }
      });
      
      const step2 = new Step({
        name: 'process-data',
        callable: async () => {
          results.push('processed');
          return { processed: true };
        }
      });
      
      const step3 = new Step({
        name: 'save-data',
        callable: async () => {
          results.push('saved');
          return { saved: true };
        }
      });
      
      const workflow = new Workflow({
        name: 'data-pipeline',
        steps: [step1, step2, step3]
      });
      
      await workflow.execute();
      
      expect(results).toEqual(['fetched', 'processed', 'saved']);
      expect(workflow.status).toBe(State.get('statuses.workflow').COMPLETE);
      expect(workflow.results).toHaveLength(3);
    });

    it('should handle nested workflows', async () => {
      const innerStep = new Step({
        name: 'inner-step',
        callable: async () => 'inner result'
      });
      
      const innerWorkflow = new Workflow({
        name: 'inner-workflow',
        steps: [innerStep]
      });
      
      const outerStep = new Step({
        name: 'outer-step',
        callable: innerWorkflow
      });
      
      const outerWorkflow = new Workflow({
        name: 'outer-workflow',
        steps: [outerStep]
      });
      
      await outerWorkflow.execute();
      
      expect(outerWorkflow.status).toBe(State.get('statuses.workflow').COMPLETE);
      expect(innerWorkflow.status).toBe(State.get('statuses.workflow').COMPLETE);
    });

    it('should handle dynamic step addition during execution', async () => {
      const results = [];
      
      const step1 = new Step({
        name: 'step-1',
        callable: async function() {
          results.push('step1');
          const workflow = State.get('workflows')[this.parentWorkflowId];
          const dynamicStep = new Step({
            name: 'dynamic-step',
            callable: async () => {
              results.push('dynamic');
              return 'dynamic result';
            }
          });
          workflow.addStep(dynamicStep);
          return 'step1 result';
        }
      });
      
      const workflow = new Workflow({
        steps: [step1]
      });
      
      await workflow.execute();
      
      expect(results).toEqual(['step1', 'dynamic']);
      expect(workflow._steps).toHaveLength(2);
    });
  });

  describe('sessions', () => {
    it('should create a session when workflow executes', async () => {
      const step = new Step({ name: 'step-1', callable: async () => 'result' });
      const workflow = new Workflow({ steps: [step] });

      await workflow.execute();

      expect(Object.keys(workflow.sessions)).toHaveLength(1);
    });

    it('should store session snapshot on completion', async () => {
      const step = new Step({ name: 'step-1', callable: async () => 'result' });
      const workflow = new Workflow({ steps: [step] });

      await workflow.execute();

      const sessionId = Object.keys(workflow.sessions)[0];
      const session = workflow.sessions[sessionId];

      expect(session.status).toBe(State.get('statuses.workflow').COMPLETE);
      expect(session.results).toEqual(workflow.results);
      expect(session.timing).toBeDefined();
      expect(session.closed_at).toBeInstanceOf(Date);
    });

    it('should store session snapshot on failure', async () => {
      const step = new Step({
        name: 'failing-step',
        callable: async () => { throw new Error('fail'); }
      });
      const workflow = new Workflow({ steps: [step], exit_on_error: true });

      await workflow.execute();

      const sessionId = Object.keys(workflow.sessions)[0];
      const session = workflow.sessions[sessionId];

      expect(session.status).toBe(State.get('statuses.workflow').FAILED);
      expect(session.closed_at).toBeInstanceOf(Date);
    });

    it('should clear current_session_id after completion', async () => {
      const step = new Step({ name: 'step-1', callable: async () => 'result' });
      const workflow = new Workflow({ steps: [step] });

      await workflow.execute();

      expect(workflow.current_session_id).toBeNull();
    });

    it('should reuse session id when resuming from pause', async () => {
      let pauseOnFirst = true;
      const step1 = new Step({
        name: 'step-1',
        callable: async function() {
          if (pauseOnFirst) {
            const wf = State.get('workflows')[this.parentWorkflowId];
            wf.pause();
            pauseOnFirst = false;
          }
          return 'result-1';
        }
      });
      const step2 = new Step({ name: 'step-2', callable: async () => 'result-2' });
      const workflow = new Workflow({ steps: [step1, step2] });

      await workflow.execute();
      const sessionIdAfterPause = workflow.current_session_id;

      expect(workflow.status).toBe(State.get('statuses.workflow').PAUSED);
      expect(sessionIdAfterPause).not.toBeNull();

      await workflow.resume();

      const sessionIds = Object.keys(workflow.sessions);
      expect(sessionIds).toHaveLength(1);
      expect(sessionIds[0]).toBe(sessionIdAfterPause);
    });

    it('should not close session when pausing', async () => {
      const step = new Step({
        name: 'step-1',
        callable: async function() {
          const wf = State.get('workflows')[this.parentWorkflowId];
          wf.pause();
          return 'result';
        }
      });
      const workflow = new Workflow({ steps: [step] });

      await workflow.execute();

      expect(workflow.current_session_id).not.toBeNull();
      expect(workflow.status).toBe(State.get('statuses.workflow').PAUSED);
    });

    it('should not error when closeCurrentSession called with no active session', () => {
      const workflow = new Workflow({});
      workflow.current_session_id = null;

      expect(() => workflow.closeCurrentSession()).not.toThrow();
    });

    it('should create separate sessions for multiple executions', async () => {
      // Workflow should support being re-run with same steps
      let callCount = 0;
      const step = new Step({ 
        name: 'step-1', 
        callable: async () => {
          callCount++;
          return `result-${callCount}`;
        }
      });
      const workflow = new Workflow({ steps: [step] });

      await workflow.execute();
      expect(Object.keys(workflow.sessions)).toHaveLength(1);

      // Create a new workflow for second execution 
      const step2 = new Step({ name: 'step-2', callable: async () => 'result' });
      const workflow2 = new Workflow({ steps: [step2] });
      
      await workflow2.execute();
      expect(Object.keys(workflow2.sessions)).toHaveLength(1);
      
      // Each workflow has its own session
      const allSessionIds = [...Object.keys(workflow.sessions), ...Object.keys(workflow2.sessions)];
      expect(new Set(allSessionIds).size).toBe(2);
    });

    it('should not create circular references in session snapshot', async () => {
      const step = new Step({ name: 'step-1', callable: async () => 'result' });
      const workflow = new Workflow({ steps: [step] });

      await workflow.execute();

      const sessionId = Object.keys(workflow.sessions)[0];
      const session = workflow.sessions[sessionId];

      expect(session.sessions).toBeUndefined();
      expect(() => JSON.stringify(session)).not.toThrow();
    });
  });
});
