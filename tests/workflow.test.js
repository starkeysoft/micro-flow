import { describe, it, expect, beforeEach, vi } from 'vitest';
import Workflow from '../src/classes/workflow.js';
import Step from '../src/classes/step.js';
import step_types from '../src/enums/step_types.js';

describe('Workflow', () => {
  let workflow;

  beforeEach(() => {
    workflow = new Workflow([], 'test-workflow');
  });

  it('should initialize with correct properties', () => {
    expect(workflow.state.get('name')).toBe('test-workflow');
    expect(workflow.state.get('steps')).toEqual([]);
    expect(workflow.state.get('exit_on_failure')).toBe(true);
    expect(workflow.state.get('id')).toBeDefined();
  });

  it('should add steps to the workflow', () => {
    const step1 = new Step({
      name: 'step-1',
      type: step_types.ACTION,
      callable: async () => 'result1',
    });

    const step2 = new Step({
      name: 'step-2',
      type: step_types.ACTION,
      callable: async () => 'result2',
    });

    workflow.pushStep(step1);
    workflow.pushSteps([step2]);

    expect(workflow.getSteps()).toHaveLength(2);
    expect(workflow.getSteps()[0].name).toBe('step-1');
    expect(workflow.getSteps()[1].name).toBe('step-2');
  });

  it('should execute steps in sequence', async () => {
    const step1 = new Step({
      name: 'step-1',
      type: step_types.ACTION,
      callable: async () => {
        return 'result1';
      },
    });

    const step2 = new Step({
      name: 'step-2',
      type: step_types.ACTION,
      callable: async () => {
        return 'result2';
      },
    });

    workflow.pushSteps([step1, step2]);

    const result = await workflow.execute();

    expect(result.get('output_data')).toEqual(['result1', 'result2']);
  });

  it('should handle step failures with exit_on_failure', async () => {
    const step1 = new Step({
      name: 'failing-step',
      type: step_types.ACTION,
      callable: async () => {
        throw new Error('Step failed');
      },
    });

    const step2 = new Step({
      name: 'unreached-step',
      type: step_types.ACTION,
      callable: async () => 'should not execute',
    });

    workflow.pushSteps([step1, step2]);

    const result = await workflow.execute();

    // Workflow should stop after failure
    expect(result.get('output_data')).toHaveLength(0);
  });

  it('should emit workflow events', () => {
    const startedListener = vi.fn();
    const completedListener = vi.fn();

    workflow.events.on(workflow.events.event_names.WORKFLOW_STARTED, startedListener);
    workflow.events.on(workflow.events.event_names.WORKFLOW_COMPLETED, completedListener);

    const step = new Step({
      name: 'simple-step',
      type: step_types.ACTION,
      callable: async () => 'done',
    });

    workflow.pushStep(step);

    workflow.execute();

    expect(startedListener).toHaveBeenCalled();
  });

  it('should check if workflow is empty', () => {
    expect(workflow.isEmpty()).toBe(true);

    workflow.pushStep(new Step({
      name: 'step-1',
      type: step_types.ACTION,
      callable: async () => { },
    }));

    expect(workflow.isEmpty()).toBe(false);
  });

  it('should clear all steps', () => {
    workflow.pushSteps([
      new Step({ name: 'step-1', type: step_types.ACTION }),
      new Step({ name: 'step-2', type: step_types.ACTION }),
    ]);

    expect(workflow.getSteps()).toHaveLength(2);

    workflow.clearSteps();

    expect(workflow.getSteps()).toHaveLength(0);
    expect(workflow.isEmpty()).toBe(true);
  });
});
