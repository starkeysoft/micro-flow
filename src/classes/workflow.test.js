import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Workflow from './workflow.js';
import Step from './steps/step.js';
import State from './state.js';
import { step_types, base_types } from '../enums/index.js';

describe('Workflow', () => {
  let workflow;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Suppress console output during tests
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create a workflow with default options', () => {
      workflow = new Workflow({});
      
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toMatch(/workflow-/);
      expect(workflow.base_type).toBe(base_types.WORKFLOW);
      expect(workflow.exit_on_error).toBe(false);
      expect(workflow.throw_on_empty).toBe(false);
      expect(workflow._steps).toEqual([]);
      expect(workflow.results).toEqual([]);
      expect(workflow.current_step).toBeNull();
    });

    it('should create a workflow with custom name', () => {
      workflow = new Workflow({ name: 'Custom Workflow' });
      
      expect(workflow.name).toBe('Custom Workflow');
    });

    it('should create a workflow with exit_on_error enabled', () => {
      workflow = new Workflow({ exit_on_error: true });
      
      expect(workflow.exit_on_error).toBe(true);
    });

    it('should create a workflow with throw_on_empty enabled', () => {
      workflow = new Workflow({ throw_on_empty: true });
      
      expect(workflow.throw_on_empty).toBe(true);
    });

    it('should initialize with provided steps', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow = new Workflow({ steps: [step1, step2] });
      
      expect(workflow._steps.length).toBe(2);
      expect(workflow._steps[0]).toBe(step1);
      expect(workflow._steps[1]).toBe(step2);
    });

    it('should set timing.create_time', () => {
      const before = new Date();
      workflow = new Workflow({});
      const after = new Date();
      
      expect(workflow.timing.create_time).toBeInstanceOf(Date);
      expect(workflow.timing.create_time.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(workflow.timing.create_time.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('addStep', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should add a step to the workflow', () => {
      const step = new Step({ name: 'Test Step', callable: async () => 'result' });
      
      workflow.addStep(step);
      
      expect(workflow._steps.length).toBe(1);
      expect(workflow._steps[0]).toBe(step);
      expect(workflow.steps_by_id[step.id]).toBe(step);
    });

    it('should set parentWorkflowId on the step', () => {
      const step = new Step({ name: 'Test Step', callable: async () => 'result' });
      
      workflow.addStep(step);
      
      expect(step.parentWorkflowId).toBe(workflow.id);
    });

    it('should throw error if step is not a valid Step instance', () => {
      const invalidStep = { name: 'Invalid' };
      
      expect(() => workflow.addStep(invalidStep)).toThrow('Invalid step type. Must be an instance of Step.');
    });

    it('should handle multiple steps', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow.addStep(step1);
      workflow.addStep(step2);
      
      expect(workflow._steps.length).toBe(2);
      expect(workflow._steps[0]).toBe(step1);
      expect(workflow._steps[1]).toBe(step2);
    });
  });

  describe('addSteps', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should add multiple steps at once', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      const step3 = new Step({ name: 'Step 3', callable: async () => 'result3' });
      
      workflow.addSteps([step1, step2, step3]);
      
      expect(workflow._steps.length).toBe(3);
      expect(workflow._steps[0]).toBe(step1);
      expect(workflow._steps[1]).toBe(step2);
      expect(workflow._steps[2]).toBe(step3);
    });

    it('should handle empty array', () => {
      workflow.addSteps([]);
      
      expect(workflow._steps.length).toBe(0);
    });
  });

  describe('addStepAtIndex', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should insert step at specified index', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      const step3 = new Step({ name: 'Step 3', callable: async () => 'result3' });
      
      workflow.addStep(step1);
      workflow.addStep(step3);
      workflow.addStepAtIndex(step2, 1);
      
      expect(workflow._steps.length).toBe(3);
      expect(workflow._steps[0]).toBe(step1);
      expect(workflow._steps[1]).toBe(step2);
      expect(workflow._steps[2]).toBe(step3);
    });

    it('should set parentWorkflowId on the step', () => {
      const step = new Step({ name: 'Test Step', callable: async () => 'result' });
      
      workflow.addStepAtIndex(step, 0);
      
      expect(step.parentWorkflowId).toBe(workflow.id);
    });
  });

  describe('pushStep', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should add step to the end of workflow', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow.pushStep(step1);
      workflow.pushStep(step2);
      
      expect(workflow._steps.length).toBe(2);
      expect(workflow._steps[1]).toBe(step2);
    });
  });

  describe('pushSteps', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should add multiple steps to the end of workflow', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      const step3 = new Step({ name: 'Step 3', callable: async () => 'result3' });
      
      workflow.pushStep(step1);
      workflow.pushSteps([step2, step3]);
      
      expect(workflow._steps.length).toBe(3);
      expect(workflow._steps[2]).toBe(step3);
    });
  });

  describe('unshiftStep', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should add step to the beginning of workflow', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow.addStep(step1);
      workflow.unshiftStep(step2);
      
      expect(workflow._steps.length).toBe(2);
      expect(workflow._steps[0]).toBe(step2);
      expect(workflow._steps[1]).toBe(step1);
    });

    it('should set parentWorkflowId on the step', () => {
      const step = new Step({ name: 'Test Step', callable: async () => 'result' });
      
      workflow.unshiftStep(step);
      
      expect(step.parentWorkflowId).toBe(workflow.id);
    });

    it('should throw error if step is not a valid Step instance', () => {
      const invalidStep = { name: 'Invalid' };
      
      expect(() => workflow.unshiftStep(invalidStep)).toThrow('Invalid step type. Must be an instance of Step.');
    });
  });

  describe('popStep', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should remove and return the last step', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow.addSteps([step1, step2]);
      const popped = workflow.popStep();
      
      expect(popped).toBe(step2);
      expect(workflow._steps.length).toBe(1);
      expect(workflow._steps[0]).toBe(step1);
    });

    it('should return undefined when workflow is empty', () => {
      const popped = workflow.popStep();
      
      expect(popped).toBeUndefined();
    });
  });

  describe('shiftStep', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should remove and return the first step', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow.addSteps([step1, step2]);
      const shifted = workflow.shiftStep();
      
      expect(shifted).toBe(step1);
      expect(workflow._steps.length).toBe(1);
      expect(workflow._steps[0]).toBe(step2);
    });

    it('should return undefined when workflow is empty', () => {
      const shifted = workflow.shiftStep();
      
      expect(shifted).toBeUndefined();
    });
  });

  describe('deleteStep', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should delete step by ID', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow.addSteps([step1, step2]);
      workflow.deleteStep(step1.id);
      
      expect(workflow._steps.length).toBe(1);
      expect(workflow._steps[0]).toBe(step2);
    });

    it('should do nothing if step ID not found', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      
      workflow.addStep(step1);
      workflow.deleteStep('non-existent-id');
      
      expect(workflow._steps.length).toBe(1);
    });
  });

  describe('deleteStepByIndex', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should delete step at specified index', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      const step3 = new Step({ name: 'Step 3', callable: async () => 'result3' });
      
      workflow.addSteps([step1, step2, step3]);
      workflow.deleteStepByIndex(1);
      
      expect(workflow._steps.length).toBe(2);
      expect(workflow._steps[0]).toBe(step1);
      expect(workflow._steps[1]).toBe(step3);
    });
  });

  describe('moveStep', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should move step from one index to another', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      const step3 = new Step({ name: 'Step 3', callable: async () => 'result3' });
      
      workflow.addSteps([step1, step2, step3]);
      workflow.moveStep(0, 2);
      
      expect(workflow._steps[0]).toBe(step2);
      expect(workflow._steps[1]).toBe(step3);
      expect(workflow._steps[2]).toBe(step1);
    });
  });

  describe('clearSteps', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should remove all steps from workflow', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow.addSteps([step1, step2]);
      workflow.clearSteps();
      
      expect(workflow._steps).toEqual([]);
    });
  });

  describe('isEmpty', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should return true for empty workflow', () => {
      expect(workflow.isEmpty()).toBe(true);
    });

    it('should return false for workflow with steps', () => {
      const step = new Step({ name: 'Test Step', callable: async () => 'result' });
      workflow.addStep(step);
      
      expect(workflow.isEmpty()).toBe(false);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should execute all steps in sequence', async () => {
      const results = [];
      const step1 = new Step({ name: 'Step 1', callable: async () => { results.push(1); return 'result1'; } });
      const step2 = new Step({ name: 'Step 2', callable: async () => { results.push(2); return 'result2'; } });
      const step3 = new Step({ name: 'Step 3', callable: async () => { results.push(3); return 'result3'; } });
      
      workflow.addSteps([step1, step2, step3]);
      await workflow.execute();
      
      expect(results).toEqual([1, 2, 3]);
      expect(workflow.results.length).toBeGreaterThan(0);
    });

    it('should mark workflow as complete after execution', async () => {
      const step = new Step({ name: 'Test Step', callable: async () => 'result' });
      workflow.addStep(step);
      
      await workflow.execute();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').COMPLETE);
    });

    it('should throw error if empty and throw_on_empty is true', async () => {
      workflow = new Workflow({ throw_on_empty: true });
      
      await expect(workflow.execute()).rejects.toThrow('Cannot execute an empty workflow');
    });

    it('should not throw error if empty and throw_on_empty is false', async () => {
      workflow = new Workflow({ throw_on_empty: false });
      
      await workflow.execute();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').COMPLETE);
    });

    it('should continue execution if step fails and exit_on_error is false', async () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => { throw new Error('Step 1 error'); } });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow = new Workflow({ exit_on_error: false });
      workflow.addSteps([step1, step2]);
      
      await workflow.execute();
      
      expect(workflow._steps.length).toBe(2);
    });

    it('should stop execution if step fails and exit_on_error is true', async () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => { throw new Error('Step 1 error'); } });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow = new Workflow({ exit_on_error: true });
      workflow.addSteps([step1, step2]);
      
      await workflow.execute();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').FAILED);
    });

    it('should pause execution when should_pause is set', async () => {
      let executed = 0;
      const step1 = new Step({ 
        name: 'Step 1', 
        callable: async () => { 
          executed++; 
          workflow.pause();
          return 'result1'; 
        } 
      });
      const step2 = new Step({ name: 'Step 2', callable: async () => { executed++; return 'result2'; } });
      
      workflow.addSteps([step1, step2]);
      await workflow.execute();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').PAUSED);
      expect(executed).toBe(1);
    });

    it('should skip step when should_skip is set', async () => {
      let executed = 0;
      const step1 = new Step({ 
        name: 'Step 1', 
        callable: async () => { 
          executed++; 
          workflow.setState('should_skip', true);
          return 'result1'; 
        } 
      });
      const step2 = new Step({ name: 'Step 2', callable: async () => { executed++; return 'result2'; } });
      const step3 = new Step({ name: 'Step 3', callable: async () => { executed++; return 'result3'; } });
      
      workflow.addSteps([step1, step2, step3]);
      await workflow.execute();
      
      expect(executed).toBe(2); // step1 and step3, step2 skipped
    });

    it('should break execution when should_break is set', async () => {
      let executed = 0;
      const step1 = new Step({ 
        name: 'Step 1', 
        callable: async () => { 
          executed++; 
          workflow.setState('should_break', true);
          return 'result1'; 
        } 
      });
      const step2 = new Step({ name: 'Step 2', callable: async () => { executed++; return 'result2'; } });
      
      workflow.addSteps([step1, step2]);
      await workflow.execute();
      
      expect(executed).toBe(1);
      expect(workflow.status).toBe(State.get('statuses.workflow').COMPLETE);
    });
  });

  describe('resume', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should resume a paused workflow', async () => {
      let executed = 0;
      const step1 = new Step({ 
        name: 'Step 1', 
        callable: async () => { 
          executed++; 
          workflow.pause();
          return 'result1'; 
        } 
      });
      const step2 = new Step({ name: 'Step 2', callable: async () => { executed++; return 'result2'; } });
      
      workflow.addSteps([step1, step2]);
      await workflow.execute();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').PAUSED);
      expect(executed).toBe(1);
      
      await workflow.resume();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').COMPLETE);
      expect(executed).toBe(2);
    });

    it('should set resume_time when resuming', async () => {
      const step = new Step({ 
        name: 'Step 1', 
        callable: async () => { 
          workflow.pause();
          return 'result'; 
        } 
      });
      
      workflow.addStep(step);
      await workflow.execute();
      
      const before = new Date();
      await workflow.resume();
      const after = new Date();
      
      expect(workflow.timing.resume_time).toBeInstanceOf(Date);
      expect(workflow.timing.resume_time.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(workflow.timing.resume_time.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('pause', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should set should_pause flag', () => {
      workflow.pause();
      
      expect(workflow.should_pause).toBe(true);
    });

    it('should set pause_time', () => {
      const before = new Date();
      workflow.pause();
      const after = new Date();
      
      expect(workflow.timing.pause_time).toBeInstanceOf(Date);
      expect(workflow.timing.pause_time.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(workflow.timing.pause_time.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('prepareResult', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should add result object to results array', () => {
      workflow.prepareResult('Test message', { data: 'test' });
      
      expect(workflow.results.length).toBe(1);
      expect(workflow.results[0]).toEqual({
        message: 'Test message',
        data: { data: 'test' }
      });
    });

    it('should handle multiple results', () => {
      workflow.prepareResult('Message 1', 'data1');
      workflow.prepareResult('Message 2', 'data2');
      
      expect(workflow.results.length).toBe(2);
      expect(workflow.results[0].message).toBe('Message 1');
      expect(workflow.results[1].message).toBe('Message 2');
    });
  });

  describe('steps getter/setter', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should get steps array', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow.addSteps([step1, step2]);
      
      const steps = workflow.steps;
      expect(steps.length).toBe(2);
      expect(steps[0]).toBe(step1);
      expect(steps[1]).toBe(step2);
    });

    it('should set steps using setter', () => {
      const step1 = new Step({ name: 'Step 1', callable: async () => 'result1' });
      const step2 = new Step({ name: 'Step 2', callable: async () => 'result2' });
      
      workflow.steps = [step1, step2];
      
      expect(workflow._steps.length).toBe(2);
      expect(workflow._steps[0]).toBe(step1);
      expect(workflow._steps[1]).toBe(step2);
    });
  });

  describe('status transitions', () => {
    beforeEach(() => {
      workflow = new Workflow({});
    });

    it('should mark as created', () => {
      const status = workflow.markAsCreated();
      
      expect(workflow.timing.create_time).toBeInstanceOf(Date);
      expect(status).toBe(State.get('statuses.workflow').CREATED);
    });

    it('should mark as paused', () => {
      workflow.markAsPaused();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').PAUSED);
      expect(workflow.timing.pause_time).toBeInstanceOf(Date);
    });

    it('should mark as resumed', () => {
      workflow.markAsResumed();
      
      expect(workflow.status).toBe(State.get('statuses.workflow').RUNNING);
      expect(workflow.timing.resume_time).toBeInstanceOf(Date);
    });
  });

  describe('integration tests', () => {
    it('should execute a complex workflow with nested steps', async () => {
      const results = [];
      
      const step1 = new Step({ 
        name: 'Data Fetch', 
        callable: async () => { 
          results.push('fetched');
          return { data: [1, 2, 3] }; 
        } 
      });
      
      const step2 = new Step({ 
        name: 'Data Process', 
        callable: async () => { 
          results.push('processed');
          return { data: [2, 4, 6] }; 
        } 
      });
      
      const step3 = new Step({ 
        name: 'Data Save', 
        callable: async () => { 
          results.push('saved');
          return { success: true }; 
        } 
      });
      
      workflow = new Workflow({ 
        name: 'Data Pipeline',
        steps: [step1, step2, step3]
      });
      
      await workflow.execute();
      
      expect(results).toEqual(['fetched', 'processed', 'saved']);
      expect(workflow.status).toBe(State.get('statuses.workflow').COMPLETE);
      expect(workflow.results.length).toBeGreaterThan(0);
    });

    it('should handle workflow with conditional execution', async () => {
      let shouldExecuteStep2 = false;
      
      const step1 = new Step({ 
        name: 'Check Condition', 
        callable: async () => { 
          shouldExecuteStep2 = true;
          return { shouldContinue: true }; 
        } 
      });
      
      const step2 = new Step({ 
        name: 'Conditional Step', 
        callable: async () => { 
          if (!shouldExecuteStep2) {
            workflow.setState('should_skip', true);
          }
          return { executed: shouldExecuteStep2 }; 
        } 
      });
      
      workflow = new Workflow({ steps: [step1, step2] });
      await workflow.execute();
      
      expect(shouldExecuteStep2).toBe(true);
      expect(workflow.status).toBe(State.get('statuses.workflow').COMPLETE);
    });
  });
});
