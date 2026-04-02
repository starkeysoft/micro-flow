import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DelayStep from '../src/classes/steps/delay_step.js';
import Step from '../src/classes/steps/step.js';
import Workflow from '../src/classes/workflow.js';
import State from '../src/classes/state.js';
import { delay_types, step_types } from '../src/enums/index.js';

describe('DelayStep', () => {
  beforeEach(() => {
    State.reset();
    State.set('log_suppress', true);
  });

  afterEach(() => {
    State.reset();
  });

  describe('constructor', () => {
    it('should create a delay step with default options', () => {
      const step = new DelayStep({});

      expect(step.id).toBeDefined();
      expect(step.name).toBeDefined();
      expect(step.step_type).toBe(step_types.DELAY);
      expect(step.delay_type).toBe(delay_types.RELATIVE);
      expect(step.relative_delay_ms).toBe(0);
      expect(step.absolute_timestamp).toBeInstanceOf(Date);
    });

    it('should create a delay step with a custom name', () => {
      const step = new DelayStep({ name: 'my-delay' });

      expect(step.name).toBe('my-delay');
    });

    it('should set delay_type to absolute', () => {
      const futureDate = new Date(Date.now() + 1000);
      const step = new DelayStep({
        delay_type: delay_types.ABSOLUTE,
        absolute_timestamp: futureDate
      });

      expect(step.delay_type).toBe(delay_types.ABSOLUTE);
      expect(step.absolute_timestamp.getTime()).toBe(futureDate.getTime());
    });

    it('should set delay_type to relative', () => {
      const step = new DelayStep({
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: 100
      });

      expect(step.delay_type).toBe(delay_types.RELATIVE);
      expect(step.relative_delay_ms).toBe(100);
    });

    it('should parse string timestamps', () => {
      const dateString = '2030-01-01T00:00:00.000Z';
      const step = new DelayStep({
        delay_type: delay_types.ABSOLUTE,
        absolute_timestamp: dateString
      });

      expect(step.absolute_timestamp.toISOString()).toBe(dateString);
    });

    it('should have static step_name property', () => {
      expect(DelayStep.step_name).toBe('delay');
    });
  });

  describe('relative delay', () => {
    it('should complete immediately when relative_delay_ms is 0', async () => {
      const step = new DelayStep({
        name: 'zero-delay',
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: 0
      });

      const startTime = Date.now();
      const result = await step.execute();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
      expect(result.result.delayed).toBe(false);
      expect(result.result.delay_type).toBe(delay_types.RELATIVE);
    });

    it('should complete immediately when relative_delay_ms is negative', async () => {
      const step = new DelayStep({
        name: 'negative-delay',
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: -1000
      });

      const startTime = Date.now();
      const result = await step.execute();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
      expect(result.result.delayed).toBe(false);
    });

    it('should delay for the specified duration', async () => {
      const delayMs = 50;
      const step = new DelayStep({
        name: 'short-delay',
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: delayMs
      });

      const startTime = Date.now();
      const result = await step.execute();
      const duration = Date.now() - startTime;

      // Allow some tolerance for timing
      expect(duration).toBeGreaterThanOrEqual(delayMs - 10);
      expect(duration).toBeLessThan(delayMs + 100);
      expect(result.result.delayed).toBe(true);
    });

    it('should emit DELAY_STEP_RELATIVE_COMPLETE event when no delay needed', async () => {
      const eventSpy = vi.fn();
      const stepEvents = State.get('events.step');
      stepEvents.on('delay_step_relative_complete', eventSpy);

      const step = new DelayStep({
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: 0
      });

      await step.execute();

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should emit scheduled and complete events for actual delay', async () => {
      const scheduledSpy = vi.fn();
      const completeSpy = vi.fn();
      const stepEvents = State.get('events.step');
      stepEvents.on('delay_step_relative_scheduled', scheduledSpy);
      stepEvents.on('delay_step_relative_complete', completeSpy);

      const step = new DelayStep({
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: 30
      });

      await step.execute();

      expect(scheduledSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('absolute delay', () => {
    it('should complete immediately when timestamp is in the past', async () => {
      const pastDate = new Date(Date.now() - 10000);
      const step = new DelayStep({
        name: 'past-delay',
        delay_type: delay_types.ABSOLUTE,
        absolute_timestamp: pastDate
      });

      const startTime = Date.now();
      const result = await step.execute();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
      expect(result.result.delayed).toBe(false);
      expect(result.result.delay_type).toBe(delay_types.ABSOLUTE);
    });

    it('should complete immediately when timestamp is now', async () => {
      const step = new DelayStep({
        name: 'now-delay',
        delay_type: delay_types.ABSOLUTE,
        absolute_timestamp: new Date()
      });

      const startTime = Date.now();
      const result = await step.execute();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
      expect(result.result.delayed).toBe(false);
    });

    it('should delay until the specified timestamp', async () => {
      const delayMs = 50;
      const futureDate = new Date(Date.now() + delayMs);
      const step = new DelayStep({
        name: 'future-delay',
        delay_type: delay_types.ABSOLUTE,
        absolute_timestamp: futureDate
      });

      const startTime = Date.now();
      const result = await step.execute();
      const duration = Date.now() - startTime;

      // Allow some tolerance for timing
      expect(duration).toBeGreaterThanOrEqual(delayMs - 15);
      expect(duration).toBeLessThan(delayMs + 100);
      expect(result.result.delayed).toBe(true);
    });

    it('should emit DELAY_STEP_ABSOLUTE_COMPLETE event when no delay needed', async () => {
      const eventSpy = vi.fn();
      const stepEvents = State.get('events.step');
      stepEvents.on('delay_step_absolute_complete', eventSpy);

      const pastDate = new Date(Date.now() - 1000);
      const step = new DelayStep({
        delay_type: delay_types.ABSOLUTE,
        absolute_timestamp: pastDate
      });

      await step.execute();

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should emit scheduled and complete events for actual delay', async () => {
      const scheduledSpy = vi.fn();
      const completeSpy = vi.fn();
      const stepEvents = State.get('events.step');
      stepEvents.on('delay_step_absolute_scheduled', scheduledSpy);
      stepEvents.on('delay_step_absolute_complete', completeSpy);

      const futureDate = new Date(Date.now() + 30);
      const step = new DelayStep({
        delay_type: delay_types.ABSOLUTE,
        absolute_timestamp: futureDate
      });

      await step.execute();

      expect(scheduledSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('scheduled_job', () => {
    it('should store the scheduled job reference for relative delays', async () => {
      const step = new DelayStep({
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: 30
      });

      const executePromise = step.execute();

      // Give it a moment to schedule
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(step.scheduled_job).toBeDefined();

      await executePromise;
    });

    it('should store the scheduled job reference for absolute delays', async () => {
      const futureDate = new Date(Date.now() + 30);
      const step = new DelayStep({
        delay_type: delay_types.ABSOLUTE,
        absolute_timestamp: futureDate
      });

      const executePromise = step.execute();

      // Give it a moment to schedule
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(step.scheduled_job).toBeDefined();

      await executePromise;
    });

    it('should not set scheduled_job when no delay is needed', async () => {
      const step = new DelayStep({
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: 0
      });

      await step.execute();

      expect(step.scheduled_job).toBeUndefined();
    });
  });

  describe('integration with Workflow', () => {
    it('should work as a step in a workflow', async () => {
      const results = [];

      const workflow = new Workflow({
        name: 'delay-workflow',
        steps: [
          new DelayStep({
            name: 'delay-step',
            delay_type: delay_types.RELATIVE,
            relative_delay_ms: 20
          })
        ]
      });

      const startTime = Date.now();
      const result = await workflow.execute();
      const duration = Date.now() - startTime;

      expect(result.results).toHaveLength(1);
      expect(duration).toBeGreaterThanOrEqual(15);
    });

    it('should sequence with other steps correctly', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        name: 'sequenced-workflow',
        steps: [
          new Step({
            name: 'before',
            callable: async () => {
              executionOrder.push('before');
              return 'before';
            }
          }),
          new DelayStep({
            name: 'delay',
            delay_type: delay_types.RELATIVE,
            relative_delay_ms: 20
          }),
          new Step({
            name: 'after',
            callable: async () => {
              executionOrder.push('after');
              return 'after';
            }
          })
        ]
      });

      await workflow.execute();

      expect(executionOrder).toEqual(['before', 'after']);
    });
  });

  describe('delay method', () => {
    it('should return delay info when delay completes', async () => {
      const step = new DelayStep({
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: 20
      });

      const delayUntil = new Date(Date.now() + 20);
      const result = await step.delay(delayUntil);

      expect(result.delayed).toBe(true);
      expect(result.delay_type).toBe(delay_types.RELATIVE);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('state access', () => {
    it('should have access to getState method', async () => {
      State.set('test.value', 'hello');

      const step = new DelayStep({
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: 0
      });

      expect(step.getState('test.value')).toBe('hello');
    });

    it('should have access to setState method', async () => {
      const step = new DelayStep({
        delay_type: delay_types.RELATIVE,
        relative_delay_ms: 0
      });

      step.setState('delay.completed', true);

      expect(State.get('delay.completed')).toBe(true);
    });
  });
});
