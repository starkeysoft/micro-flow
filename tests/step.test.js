import { describe, it, expect, beforeEach, vi } from 'vitest';
import Step from '../src/classes/step.js';
import step_types from '../src/enums/step_types.js';
import step_statuses from '../src/enums/step_statuses.js';

describe('Step', () => {
  let step;

  beforeEach(() => {
    step = new Step({
      name: 'test-step',
      type: step_types.ACTION,
      callable: async (context) => {
        return 'success';
      },
    });
  });

  it('should initialize with correct properties', () => {
    expect(step.name).toBe('test-step');
    expect(step.type).toBe(step_types.ACTION);
    expect(step.status).toBe(step_statuses.WAITING);
    expect(step.id).toBeDefined();
  });

  it('should execute callable function and mark as complete', async () => {
    step.setContext({ steps: [] });
    
    const result = await step.execute();
    
    expect(result).toBe('success');
    expect(step.status).toBe(step_statuses.COMPLETE);
  });

  it('should handle errors and mark as failed', async () => {
    const errorStep = new Step({
      name: 'error-step',
      type: step_types.ACTION,
      callable: async () => {
        throw new Error('Test error');
      },
    });
    
    errorStep.setContext({ steps: [] });
    
    await expect(errorStep.execute()).rejects.toThrow('Test error');
    expect(errorStep.status).toBe(step_statuses.FAILED);
  });

  it('should emit events when status changes', () => {
    const listener = vi.fn();
    step.events.on(step.events.event_names.STEP_RUNNING, listener);
    
    step.markAsRunning();
    
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ step })
    );
    expect(step.status).toBe(step_statuses.RUNNING);
  });

  it('should set context with step mapping', () => {
    const mockSteps = [
      { id: 'step1', name: 'Step 1' },
      { id: 'step2', name: 'Step 2' },
    ];
    
    step.setContext({ steps: mockSteps });
    
    expect(step.context.steps).toBe(mockSteps);
    expect(step.context.steps_by_id['step1']).toBe(mockSteps[0]);
    expect(step.context.steps_by_id['step2']).toBe(mockSteps[1]);
  });

  it('should suppress logging when log_suppress is true', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    const quietStep = new Step({
      name: 'quiet-step',
      type: step_types.ACTION,
      log_suppress: true,
    });
    
    quietStep.markAsComplete();
    
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should mark step as waiting and emit event', () => {
    const listener = vi.fn();
    step.events.on(step.events.event_names.STEP_WAITING, listener);
    
    // First set to a different status
    step.markAsRunning();
    
    // Now mark as waiting
    step.markAsWaiting();
    
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ step })
    );
    expect(step.status).toBe(step_statuses.WAITING);
  });

  it('should mark step as pending and emit event', () => {
    const listener = vi.fn();
    step.events.on(step.events.event_names.STEP_PENDING, listener);
    
    step.markAsPending();
    
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ step })
    );
    expect(step.status).toBe(step_statuses.PENDING);
  });

  it('should set custom events object', () => {
    const customEvents = step.events;
    const newStep = new Step({
      name: 'new-step',
      type: step_types.ACTION,
    });
    
    newStep.setEvents(customEvents);
    
    expect(newStep.events).toBe(customEvents);
  });

  it('should throw error when setting invalid events object', () => {
    const invalidEvents = { not: 'valid' };
    
    expect(() => {
      step.setEvents(invalidEvents);
    }).toThrow('Invalid events object provided');
  });

  it('should execute a Step as callable', async () => {
    const innerStep = new Step({
      name: 'inner-step',
      type: step_types.ACTION,
      callable: async () => 'inner-result',
    });
    
    const outerStep = new Step({
      name: 'outer-step',
      type: step_types.ACTION,
      callable: innerStep,
    });
    
    outerStep.setContext({ steps: [] });
    
    const result = await outerStep.execute();
    
    expect(result).toBe('inner-result');
    expect(outerStep.status).toBe(step_statuses.COMPLETE);
  });

  it('should generate unique IDs for each step', () => {
    const step1 = new Step({
      name: 'step1',
      type: step_types.ACTION,
    });
    
    const step2 = new Step({
      name: 'step2',
      type: step_types.ACTION,
    });
    
    expect(step1.id).toBeDefined();
    expect(step2.id).toBeDefined();
    expect(step1.id).not.toBe(step2.id);
  });

  it('should have access to step_types and sub_step_types', () => {
    expect(step.step_types).toBeDefined();
    expect(step.sub_step_types).toBeDefined();
  });

  it('should create steps_by_id mapping in context', () => {
    const step1 = new Step({ name: 'step1', type: step_types.ACTION });
    const step2 = new Step({ name: 'step2', type: step_types.ACTION });
    const mockSteps = [step1, step2];
    
    step.setContext({ steps: mockSteps });
    
    expect(step.context.steps_by_id[step1.id]).toBe(step1);
    expect(step.context.steps_by_id[step2.id]).toBe(step2);
    expect(Object.keys(step.context.steps_by_id)).toHaveLength(2);
  });

  it('should execute a Workflow as callable', async () => {
    const { default: Workflow } = await import('../src/classes/workflow.js');
    
    const innerStep = new Step({
      name: 'inner-step',
      type: step_types.ACTION,
      callable: async () => 'workflow-result',
    });
    
    const innerWorkflow = new Workflow([innerStep], 'inner-workflow');
    
    // Verify the workflow has the step before executing
    expect(innerWorkflow.isEmpty()).toBe(false);
    expect(innerWorkflow.getSteps()).toHaveLength(1);
    
    const outerStep = new Step({
      name: 'outer-step',
      type: step_types.ACTION,
      callable: innerWorkflow,
    });
    
    outerStep.setContext({ steps: [] });
    
    const result = await outerStep.execute();
    
    expect(result.get('output_data')[0]).toBe('workflow-result');
    expect(outerStep.status).toBe(step_statuses.COMPLETE);
  });
});
