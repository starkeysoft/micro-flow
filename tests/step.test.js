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
});
