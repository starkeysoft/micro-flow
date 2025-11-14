import { describe, it, expect, beforeEach, vi } from 'vitest';
import ActionStep from '../src/classes/action_step.js';
import Step from '../src/classes/step.js';
import Workflow from '../src/classes/workflow.js';
import step_types from '../src/enums/step_types.js';
import step_statuses from '../src/enums/step_statuses.js';

describe('ActionStep', () => {
  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const actionStep = new ActionStep();

      expect(actionStep.name).toBe('');
      expect(actionStep.type).toBe(step_types.ACTION);
      expect(actionStep.callable).toBeInstanceOf(Function);
    });

    it('should initialize with custom name', () => {
      const actionStep = new ActionStep({ name: 'custom-action' });

      expect(actionStep.name).toBe('custom-action');
      expect(actionStep.type).toBe(step_types.ACTION);
    });

    it('should initialize with custom callable function', () => {
      const customCallable = async () => 'custom-result';
      const actionStep = new ActionStep({ 
        name: 'test-action',
        callable: customCallable 
      });

      expect(actionStep.callable).toBe(customCallable);
    });

    it('should have static step_name property', () => {
      expect(ActionStep.step_name).toBe('action');
    });

    it('should inherit from Step class', () => {
      const actionStep = new ActionStep({ name: 'test' });

      expect(actionStep).toBeInstanceOf(Step);
      expect(actionStep).toBeInstanceOf(ActionStep);
    });

    it('should have correct step type', () => {
      const actionStep = new ActionStep();

      expect(actionStep.type).toBe(step_types.ACTION);
    });
  });

  describe('setCallable()', () => {
    let actionStep;

    beforeEach(() => {
      actionStep = new ActionStep({ name: 'test-action' });
    });

    it('should set new callable function', () => {
      const newCallable = async () => 'new-result';
      
      actionStep.setCallable(newCallable);

      expect(actionStep.callable).toBe(newCallable);
    });

    it('should replace existing callable', () => {
      const firstCallable = async () => 'first';
      const secondCallable = async () => 'second';
      
      actionStep.setCallable(firstCallable);
      expect(actionStep.callable).toBe(firstCallable);
      
      actionStep.setCallable(secondCallable);
      expect(actionStep.callable).toBe(secondCallable);
    });

    it('should allow setting a Step as callable', () => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async () => 'inner-result',
      });

      actionStep.setCallable(innerStep);

      expect(actionStep.callable).toBe(innerStep);
    });

    it('should allow setting a Workflow as callable', () => {
      const workflow = new Workflow([
        new Step({
          name: 'workflow-step',
          type: step_types.ACTION,
          callable: async () => 'workflow-result',
        }),
      ], 'test-workflow');

      actionStep.setCallable(workflow);

      expect(actionStep.callable).toBe(workflow);
    });
  });

  describe('execute()', () => {
    it('should execute callable function', async () => {
      const actionStep = new ActionStep({
        name: 'test-action',
        callable: async () => 'test-result',
      });

      const result = await actionStep.execute();

      expect(result).toBe('test-result');
      expect(actionStep.status).toBe(step_statuses.COMPLETE);
    });

    it('should pass context to callable', async () => {
      const mockCallable = vi.fn(async (context) => context.value);
      const actionStep = new ActionStep({
        name: 'context-action',
        callable: mockCallable,
      });

      actionStep.setContext({ value: 42, steps: [] });
      const result = await actionStep.execute();

      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({ value: 42 }));
      expect(result).toBe(42);
    });

    it('should handle async callable', async () => {
      const actionStep = new ActionStep({
        name: 'async-action',
        callable: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async-result';
        },
      });

      const result = await actionStep.execute();

      expect(result).toBe('async-result');
      expect(actionStep.status).toBe(step_statuses.COMPLETE);
    });

    it('should handle errors in callable', async () => {
      const actionStep = new ActionStep({
        name: 'error-action',
        callable: async () => {
          throw new Error('Action failed');
        },
      });

      await expect(actionStep.execute()).rejects.toThrow('Action failed');
      expect(actionStep.status).toBe(step_statuses.FAILED);
    });

    it('should execute Step as callable', async () => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async () => 'inner-result',
      });

      const actionStep = new ActionStep({
        name: 'outer-action',
        callable: innerStep,
      });

      const result = await actionStep.execute();

      expect(result).toBe('inner-result');
      expect(actionStep.status).toBe(step_statuses.COMPLETE);
    });

    it('should execute Workflow as callable', async () => {
      const workflow = new Workflow([
        new Step({
          name: 'workflow-step',
          type: step_types.ACTION,
          callable: async () => 'workflow-result',
        }),
      ], 'test-workflow');

      const actionStep = new ActionStep({
        name: 'workflow-action',
        callable: workflow,
      });

      const result = await actionStep.execute();

      expect(result).toBeDefined();
      expect(result.get('output_data')).toContain('workflow-result');
      expect(actionStep.status).toBe(step_statuses.COMPLETE);
    });
  });

  describe('Integration with Step class', () => {
    it('should have correct id generated', () => {
      const actionStep = new ActionStep({ name: 'id-test' });

      expect(actionStep.id).toBeDefined();
      expect(typeof actionStep.id).toBe('string');
      expect(actionStep.id.length).toBeGreaterThan(0);
    });

    it('should support log_suppress option', async () => {
      const actionStep = new ActionStep({
        name: 'log-test',
        callable: async () => 'result',
      });
      actionStep.log_suppress = true;

      const consoleLogSpy = vi.spyOn(console, 'log');

      await actionStep.execute();

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('log-test')
      );

      consoleLogSpy.mockRestore();
    });

    it('should emit step events', async () => {
      const actionStep = new ActionStep({
        name: 'event-test',
        callable: async () => 'result',
      });

      const runningHandler = vi.fn();
      const completeHandler = vi.fn();

      actionStep.events.on(actionStep.events.event_names.STEP_RUNNING, runningHandler);
      actionStep.events.on(actionStep.events.event_names.STEP_COMPLETED, completeHandler);

      await actionStep.execute();

      expect(runningHandler).toHaveBeenCalled();
      expect(completeHandler).toHaveBeenCalled();
    });

    it('should handle context properly', async () => {
      const actionStep = new ActionStep({
        name: 'context-test',
        callable: async (ctx) => ctx.data,
      });

      actionStep.setContext({ data: 'test-data', steps: [] });

      const result = await actionStep.execute();

      expect(result).toBe('test-data');
      expect(actionStep.context.data).toBe('test-data');
    });
  });

  describe('Integration with Workflow', () => {
    it('should work as a step in a workflow', async () => {
      const actionStep = new ActionStep({
        name: 'workflow-action',
        callable: async () => 'action-result',
      });

      const workflow = new Workflow([actionStep], 'test-workflow');
      const result = await workflow.execute();

      expect(result.get('output_data')).toContain('action-result');
    });

    it('should execute multiple action steps in sequence', async () => {
      const action1 = new ActionStep({
        name: 'action-1',
        callable: async () => 'result-1',
      });

      const action2 = new ActionStep({
        name: 'action-2',
        callable: async () => 'result-2',
      });

      const workflow = new Workflow([action1, action2], 'multi-action');
      const result = await workflow.execute();

      expect(result.get('output_data')).toEqual(['result-1', 'result-2']);
    });

    it('should pass workflow context to action step', async () => {
      const actionStep = new ActionStep({
        name: 'context-action',
        callable: async (ctx) => ctx.customValue,
      });

      const workflow = new Workflow([actionStep], 'context-workflow');
      const result = await workflow.execute({ customValue: 'passed-value' });

      expect(result.get('output_data')).toContain('passed-value');
    });

    it('should handle action step failure in workflow', async () => {
      const failingAction = new ActionStep({
        name: 'failing-action',
        callable: async () => {
          throw new Error('Action error');
        },
      });

      const workflow = new Workflow([failingAction], 'error-workflow');
      const result = await workflow.execute();

      expect(result.get('current_step').status).toBe(step_statuses.FAILED);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined callable in constructor', () => {
      const actionStep = new ActionStep({ name: 'no-callable' });

      expect(actionStep.callable).toBeInstanceOf(Function);
      expect(actionStep.name).toBe('no-callable');
    });

    it('should handle empty constructor call', () => {
      const actionStep = new ActionStep();

      expect(actionStep).toBeInstanceOf(ActionStep);
      expect(actionStep.type).toBe(step_types.ACTION);
      expect(actionStep.callable).toBeInstanceOf(Function);
    });

    it('should execute default callable without errors', async () => {
      const actionStep = new ActionStep({ name: 'default' });

      await expect(actionStep.execute()).resolves.toBeUndefined();
      expect(actionStep.status).toBe(step_statuses.COMPLETE);
    });

    it('should allow setCallable to be called multiple times', () => {
      const actionStep = new ActionStep({ name: 'multi-set' });
      
      const callable1 = async () => '1';
      const callable2 = async () => '2';
      const callable3 = async () => '3';

      actionStep.setCallable(callable1);
      actionStep.setCallable(callable2);
      actionStep.setCallable(callable3);

      expect(actionStep.callable).toBe(callable3);
    });

    it('should handle callable that returns undefined', async () => {
      const actionStep = new ActionStep({
        name: 'undefined-return',
        callable: async () => undefined,
      });

      const result = await actionStep.execute();

      expect(result).toBeUndefined();
      expect(actionStep.status).toBe(step_statuses.COMPLETE);
    });

    it('should handle callable that returns null', async () => {
      const actionStep = new ActionStep({
        name: 'null-return',
        callable: async () => null,
      });

      const result = await actionStep.execute();

      expect(result).toBeNull();
      expect(actionStep.status).toBe(step_statuses.COMPLETE);
    });

    it('should handle callable with complex return value', async () => {
      const complexObject = {
        data: [1, 2, 3],
        nested: { value: 'test' },
        fn: () => 'function',
      };

      const actionStep = new ActionStep({
        name: 'complex-return',
        callable: async () => complexObject,
      });

      const result = await actionStep.execute();

      expect(result).toEqual(complexObject);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.nested.value).toBe('test');
    });

    it('should maintain proper status transitions', async () => {
      const actionStep = new ActionStep({
        name: 'status-test',
        callable: async () => 'result',
      });

      // Initial status is waiting (set by constructor)
      expect(actionStep.status).toBe(step_statuses.WAITING);

      // Execute the step
      await actionStep.execute();

      // Final status should be complete
      expect(actionStep.status).toBe(step_statuses.COMPLETE);
    });
  });

  describe('setCallable() with execution', () => {
    it('should execute newly set callable', async () => {
      const actionStep = new ActionStep({ name: 'dynamic' });
      
      const newCallable = async () => 'dynamic-result';
      actionStep.setCallable(newCallable);

      const result = await actionStep.execute();

      expect(result).toBe('dynamic-result');
      expect(actionStep.status).toBe(step_statuses.COMPLETE);
    });

    it('should execute different callables sequentially', async () => {
      const actionStep = new ActionStep({ name: 'sequential' });
      
      const callable1 = async () => 'first';
      actionStep.setCallable(callable1);
      const result1 = await actionStep.execute();
      expect(result1).toBe('first');

      // Reset status for next execution
      actionStep.status = undefined;
      
      const callable2 = async () => 'second';
      actionStep.setCallable(callable2);
      const result2 = await actionStep.execute();
      expect(result2).toBe('second');
    });
  });
});
