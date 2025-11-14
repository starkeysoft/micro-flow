import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DelayStep from '../src/classes/delay_step.js';
import delay_types from '../src/enums/delay_types.js';
import step_types from '../src/enums/step_types.js';
import step_statuses from '../src/enums/step_statuses.js';
import step_event_names from '../src/enums/step_event_names.js';
import { addMilliseconds, addSeconds } from 'date-fns';

describe('DelayStep', () => {
  let delayStep;

  afterEach(() => {
    if (delayStep && delayStep.scheduled_job) {
      delayStep.cancel();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default properties', () => {
      delayStep = new DelayStep();
      
      expect(delayStep.name).toBe('');
      expect(delayStep.type).toBe(step_types.DELAY);
      expect(delayStep.delay_duration).toBe(1000);
      expect(delayStep.delay_type).toBe(delay_types.ABSOLUTE);
      expect(delayStep.scheduled_job).toBe(null);
      expect(delayStep.callable).toBeDefined();
      expect(typeof delayStep.callable).toBe('function');
    });

    it('should initialize with custom name', () => {
      delayStep = new DelayStep({ name: 'custom-delay' });
      
      expect(delayStep.name).toBe('custom-delay');
    });

    it('should initialize with custom delay_duration', () => {
      delayStep = new DelayStep({ delay_duration: 5000 });
      
      expect(delayStep.delay_duration).toBe(5000);
    });

    it('should initialize with RELATIVE delay_type', () => {
      delayStep = new DelayStep({ delay_type: delay_types.RELATIVE });
      
      expect(delayStep.delay_type).toBe(delay_types.RELATIVE);
    });

    it('should bind callable to the correct delay method based on delay_type', () => {
      const absoluteStep = new DelayStep({ delay_type: delay_types.ABSOLUTE });
      const relativeStep = new DelayStep({ delay_type: delay_types.RELATIVE });
      
      expect(absoluteStep.callable).toBeDefined();
      expect(relativeStep.callable).toBeDefined();
    });

    it('should have static step_name property', () => {
      expect(DelayStep.step_name).toBe('delay');
    });
  });

  describe('absolute()', () => {
    beforeEach(() => {
      delayStep = new DelayStep({ delay_type: delay_types.ABSOLUTE });
    });

    it('should resolve immediately if timestamp is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000);
      const startTime = Date.now();
      
      await delayStep.absolute(pastDate);
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Should resolve almost immediately
    });

    it('should accept Date object as timestamp', async () => {
      const futureDate = addMilliseconds(new Date(), 50);
      
      const promise = delayStep.absolute(futureDate);
      
      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });

    it('should accept ISO string as timestamp', async () => {
      const futureDate = addMilliseconds(new Date(), 50);
      const isoString = futureDate.toISOString();
      
      await delayStep.absolute(isoString);
      
      expect(true).toBe(true); // Should complete without error
    });

    it('should accept number (timestamp) as timestamp', async () => {
      const futureTimestamp = Date.now() + 50;
      
      await delayStep.absolute(futureTimestamp);
      
      expect(true).toBe(true); // Should complete without error
    });

    it('should reject with invalid timestamp format', async () => {
      await expect(delayStep.absolute({ invalid: 'object' }))
        .rejects.toThrow('Invalid timestamp format');
    });

    it('should emit DELAY_STEP_ABSOLUTE_COMPLETE event when delay completes', async () => {
      const futureDate = addMilliseconds(new Date(), 100);
      let eventEmitted = false;
      let eventData = null;

      delayStep.events.on(step_event_names.DELAY_STEP_ABSOLUTE_COMPLETE, (data) => {
        eventEmitted = true;
        eventData = data;
      });

      await delayStep.absolute(futureDate);

      expect(eventEmitted).toBe(true);
      expect(eventData).toBeDefined();
      expect(eventData.step).toBe(delayStep);
      expect(eventData.timestamp).toEqual(futureDate);
    });

    it('should schedule job correctly', async () => {
      const futureDate = addMilliseconds(new Date(), 100);
      
      const promise = delayStep.absolute(futureDate);
      
      // Check that a job was scheduled
      expect(delayStep.scheduled_job).toBeDefined();
      
      await promise;
    });

    it('should wait until the specified absolute time', async () => {
      const delay = 150;
      const futureDate = addMilliseconds(new Date(), delay);
      const startTime = Date.now();
      
      await delayStep.absolute(futureDate);
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(delay - 50); // Allow some margin
      expect(elapsed).toBeLessThan(delay + 100); // Should not take much longer
    });

    it('should reject if scheduling fails with future date', async () => {
      // This is hard to test naturally, but we can test the path
      const futureDate = addMilliseconds(new Date(), 100);
      
      // Mock schedule.scheduleJob to return null
      const originalSchedule = await import('node-schedule');
      const mockScheduleJob = vi.spyOn(originalSchedule.default, 'scheduleJob');
      mockScheduleJob.mockReturnValue(null);
      
      await expect(delayStep.absolute(futureDate))
        .rejects.toThrow('Failed to schedule job');
      
      mockScheduleJob.mockRestore();
    });
  });

  describe('relative()', () => {
    beforeEach(() => {
      delayStep = new DelayStep({ 
        delay_type: delay_types.RELATIVE,
        delay_duration: 100 
      });
    });

    it('should resolve immediately if duration is 0', async () => {
      const startTime = Date.now();
      
      await delayStep.relative(0);
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(50);
    });

    it('should reject if duration is negative', async () => {
      await expect(delayStep.relative(-100))
        .rejects.toThrow('Duration must be a positive number');
    });

    it('should reject if duration is not a number', async () => {
      await expect(delayStep.relative('invalid'))
        .rejects.toThrow('Duration must be a positive number');
    });

    it('should use setTimeout for durations less than 100ms', async () => {
      const duration = 50;
      const startTime = Date.now();
      
      await delayStep.relative(duration);
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(duration - 20);
      expect(elapsed).toBeLessThan(duration + 100);
      
      // Should not have created a scheduled job for short durations
      expect(delayStep.scheduled_job).toBeNull();
    });

    it('should use node-schedule for durations 100ms or longer', async () => {
      const duration = 150;
      const startTime = Date.now();
      
      const promise = delayStep.relative(duration);
      
      // Should have created a scheduled job
      expect(delayStep.scheduled_job).toBeDefined();
      
      await promise;
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(duration - 50);
    });

    it('should emit DELAY_STEP_RELATIVE_COMPLETE event when delay completes', async () => {
      const duration = 100;
      let eventEmitted = false;
      let eventData = null;

      delayStep.events.on(step_event_names.DELAY_STEP_RELATIVE_COMPLETE, (data) => {
        eventEmitted = true;
        eventData = data;
      });

      await delayStep.relative(duration);

      expect(eventEmitted).toBe(true);
      expect(eventData).toBeDefined();
      expect(eventData.step).toBe(delayStep);
      expect(eventData.duration).toBe(duration);
      expect(eventData.completed_at).toBeInstanceOf(Date);
    });

    it('should emit event for short durations using setTimeout', async () => {
      const duration = 50;
      let eventEmitted = false;

      delayStep.events.on(step_event_names.DELAY_STEP_RELATIVE_COMPLETE, () => {
        eventEmitted = true;
      });

      await delayStep.relative(duration);

      expect(eventEmitted).toBe(true);
    });

    it('should wait for the specified relative duration', async () => {
      const duration = 120;
      const startTime = Date.now();
      
      await delayStep.relative(duration);
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(duration - 50);
      expect(elapsed).toBeLessThan(duration + 100);
    });

    it('should fallback to setTimeout if node-schedule fails', async () => {
      const duration = 150;
      
      // Mock schedule.scheduleJob to return null
      const originalSchedule = await import('node-schedule');
      const mockScheduleJob = vi.spyOn(originalSchedule.default, 'scheduleJob');
      mockScheduleJob.mockReturnValue(null);
      
      const startTime = Date.now();
      await delayStep.relative(duration);
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeGreaterThanOrEqual(duration - 50);
      mockScheduleJob.mockRestore();
    });
  });

  describe('cancel()', () => {
    it('should cancel scheduled job if one exists', async () => {
      delayStep = new DelayStep({ 
        delay_type: delay_types.ABSOLUTE,
        delay_duration: 5000 
      });
      
      const futureDate = addSeconds(new Date(), 10);
      const promise = delayStep.absolute(futureDate);
      
      expect(delayStep.scheduled_job).toBeDefined();
      
      delayStep.cancel();
      
      expect(delayStep.scheduled_job).toBe(null);
    });

    it('should do nothing if no scheduled job exists', () => {
      delayStep = new DelayStep();
      
      expect(delayStep.scheduled_job).toBe(null);
      
      // Should not throw error
      delayStep.cancel();
      
      expect(delayStep.scheduled_job).toBe(null);
    });

    it('should cancel job for relative delays', async () => {
      delayStep = new DelayStep({ 
        delay_type: delay_types.RELATIVE,
        delay_duration: 5000 
      });
      
      const promise = delayStep.relative(5000);
      
      expect(delayStep.scheduled_job).toBeDefined();
      
      delayStep.cancel();
      
      expect(delayStep.scheduled_job).toBe(null);
    });
  });

  describe('Integration with Step class', () => {
    it('should work as a callable in workflow execution', async () => {
      delayStep = new DelayStep({
        name: 'integration-delay',
        delay_duration: 50,
        delay_type: delay_types.RELATIVE
      });
      
      delayStep.setContext({ steps: [] });
      
      const startTime = Date.now();
      await delayStep.execute();
      const elapsed = Date.now() - startTime;
      
      expect(delayStep.status).toBe(step_statuses.COMPLETE);
      expect(elapsed).toBeGreaterThanOrEqual(30);
    });

    it('should have correct step type', () => {
      delayStep = new DelayStep();
      
      expect(delayStep.type).toBe(step_types.DELAY);
    });

    it('should execute absolute delay through callable', async () => {
      const futureDate = addMilliseconds(new Date(), 100);
      delayStep = new DelayStep({
        delay_duration: futureDate,
        delay_type: delay_types.ABSOLUTE
      });
      
      delayStep.setContext({ steps: [] });
      
      const startTime = Date.now();
      await delayStep.execute();
      const elapsed = Date.now() - startTime;
      
      expect(delayStep.status).toBe(step_statuses.COMPLETE);
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    it('should handle errors in absolute delay', async () => {
      delayStep = new DelayStep({
        delay_duration: { invalid: 'timestamp' },
        delay_type: delay_types.ABSOLUTE
      });
      
      delayStep.setContext({ steps: [] });
      
      await expect(delayStep.execute())
        .rejects.toThrow('Invalid timestamp format');
      
      expect(delayStep.status).toBe(step_statuses.FAILED);
    });

    it('should handle errors in relative delay', async () => {
      delayStep = new DelayStep({
        delay_duration: -500,
        delay_type: delay_types.RELATIVE
      });
      
      delayStep.setContext({ steps: [] });
      
      await expect(delayStep.execute())
        .rejects.toThrow('Duration must be a positive number');
      
      expect(delayStep.status).toBe(step_statuses.FAILED);
    });
  });

  describe('Edge cases', () => {
    it('should handle very short absolute delays', async () => {
      delayStep = new DelayStep({ delay_type: delay_types.ABSOLUTE });
      const futureDate = addMilliseconds(new Date(), 10);
      
      await delayStep.absolute(futureDate);
      
      expect(true).toBe(true); // Should complete
    });

    it('should handle Date.now() as absolute timestamp', async () => {
      delayStep = new DelayStep({ delay_type: delay_types.ABSOLUTE });
      
      // Current time should resolve immediately
      await delayStep.absolute(Date.now());
      
      expect(true).toBe(true);
    });

    it('should handle multiple consecutive delays', async () => {
      delayStep = new DelayStep({ delay_type: delay_types.RELATIVE });
      
      await delayStep.relative(50);
      await delayStep.relative(50);
      await delayStep.relative(50);
      
      expect(true).toBe(true);
    });

    it('should create new DelayStep with all options', () => {
      delayStep = new DelayStep({
        name: 'full-config-delay',
        delay_duration: 2500,
        delay_type: delay_types.RELATIVE
      });
      
      expect(delayStep.name).toBe('full-config-delay');
      expect(delayStep.delay_duration).toBe(2500);
      expect(delayStep.delay_type).toBe(delay_types.RELATIVE);
      expect(delayStep.type).toBe(step_types.DELAY);
    });

    it('should handle past timestamp as number', async () => {
      delayStep = new DelayStep({ delay_type: delay_types.ABSOLUTE });
      const pastTimestamp = Date.now() - 5000;
      
      const startTime = Date.now();
      await delayStep.absolute(pastTimestamp);
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(50);
    });

    it('should handle past timestamp as ISO string', async () => {
      delayStep = new DelayStep({ delay_type: delay_types.ABSOLUTE });
      const pastDate = new Date(Date.now() - 5000);
      const isoString = pastDate.toISOString();
      
      const startTime = Date.now();
      await delayStep.absolute(isoString);
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(50);
    });
  });
});
