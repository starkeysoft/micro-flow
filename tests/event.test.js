import { describe, it, expect, beforeEach, vi } from 'vitest';
import Event from '../src/classes/event.js';

describe('Event', () => {
  let event;

  beforeEach(() => {
    event = new Event();
  });

  describe('constructor', () => {
    it('should create an Event instance', () => {
      expect(event).toBeInstanceOf(Event);
      expect(event).toBeInstanceOf(EventTarget);
    });

    it('should initialize events object', () => {
      expect(event.events).toBeDefined();
      expect(typeof event.events).toBe('object');
    });

    it('should initialize listener map', () => {
      expect(event._listener_map).toBeInstanceOf(WeakMap);
    });
  });

  describe('registerEvents()', () => {
    it('should register multiple events from an object', () => {
      const eventNames = {
        EVENT_ONE: 'event_one',
        EVENT_TWO: 'event_two',
        EVENT_THREE: 'event_three'
      };

      event.registerEvents(eventNames);

      expect(event.events.event_one).toBeInstanceOf(Event);
      expect(event.events.event_two).toBeInstanceOf(Event);
      expect(event.events.event_three).toBeInstanceOf(Event);
    });

    it('should handle empty event names object', () => {
      expect(() => event.registerEvents({})).not.toThrow();
      expect(Object.keys(event.events)).toHaveLength(0);
    });
  });

  describe('emit()', () => {
    it('should emit an event without data', () => {
      const listener = vi.fn();
      event.on('test_event', listener);
      
      const result = event.emit('test_event');
      
      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should emit an event with data', () => {
      const listener = vi.fn();
      const testData = { message: 'test', value: 42 };
      
      event.on('test_event', listener);
      event.emit('test_event', testData);
      
      expect(listener).toHaveBeenCalledWith(testData);
    });

    it('should emit events to multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();
      
      event.on('test_event', listener1);
      event.on('test_event', listener2);
      event.on('test_event', listener3);
      
      event.emit('test_event', { data: 'test' });
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should return true if event was not cancelled', () => {
      const result = event.emit('test_event');
      expect(result).toBe(true);
    });

    it('should handle bubbling parameter', () => {
      const listener = vi.fn();
      event.on('test_event', listener);
      
      event.emit('test_event', { data: 'test' }, true);
      
      expect(listener).toHaveBeenCalled();
    });

    it('should handle cancelable parameter', () => {
      const listener = vi.fn();
      event.on('test_event', listener);
      
      event.emit('test_event', { data: 'test' }, false, false);
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('on()', () => {
    it('should add an event listener', () => {
      const listener = vi.fn();
      const returnValue = event.on('test_event', listener);
      
      expect(returnValue).toBe(event);
      
      event.emit('test_event');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should allow chaining', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      event.on('event1', listener1).on('event2', listener2);
      
      event.emit('event1');
      event.emit('event2');
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should pass event data to listener', () => {
      const listener = vi.fn();
      const testData = { id: 123, name: 'test' };
      
      event.on('test_event', listener);
      event.emit('test_event', testData);
      
      expect(listener).toHaveBeenCalledWith(testData);
    });

    it('should maintain listener context', () => {
      let receivedData;
      const listener = (data) => {
        receivedData = data;
      };
      
      event.on('test_event', listener);
      event.emit('test_event', { value: 42 });
      
      expect(receivedData).toEqual({ value: 42 });
    });

    it('should handle multiple registrations of the same event', () => {
      const listener = vi.fn();
      
      event.on('test_event', listener);
      event.on('test_event', listener);
      
      event.emit('test_event');
      
      // Should be called twice since registered twice
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('once()', () => {
    it('should add a one-time event listener', () => {
      const listener = vi.fn();
      const returnValue = event.once('test_event', listener);
      
      expect(returnValue).toBe(event);
      
      event.emit('test_event');
      event.emit('test_event');
      event.emit('test_event');
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should pass data to one-time listener', () => {
      const listener = vi.fn();
      const testData = { message: 'hello' };
      
      event.once('test_event', listener);
      event.emit('test_event', testData);
      
      expect(listener).toHaveBeenCalledWith(testData);
    });

    it('should allow chaining', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      event.once('event1', listener1).once('event2', listener2);
      
      event.emit('event1');
      event.emit('event2');
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('off()', () => {
    it('should remove an event listener', () => {
      const listener = vi.fn();
      
      event.on('test_event', listener);
      event.emit('test_event');
      expect(listener).toHaveBeenCalledTimes(1);
      
      event.off('test_event', listener);
      event.emit('test_event');
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should return the event instance for chaining', () => {
      const listener = vi.fn();
      event.on('test_event', listener);
      
      const returnValue = event.off('test_event', listener);
      expect(returnValue).toBe(event);
    });

    it('should handle removing non-existent listeners gracefully', () => {
      const listener = vi.fn();
      expect(() => event.off('test_event', listener)).not.toThrow();
    });

    it('should only remove the specific listener', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      event.on('test_event', listener1);
      event.on('test_event', listener2);
      
      event.off('test_event', listener1);
      event.emit('test_event');
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should clean up listener map', () => {
      const listener = vi.fn();
      
      event.on('test_event', listener);
      expect(event._listener_map.has(listener)).toBe(true);
      
      event.off('test_event', listener);
      expect(event._listener_map.has(listener)).toBe(false);
    });
  });

  describe('removeListener()', () => {
    it('should be an alias for off()', () => {
      expect(event.removeListener).toBeDefined();
      // The method exists based on the code showing removeListener calling off
    });

    it('should remove listeners like off()', () => {
      const listener = vi.fn();
      
      event.on('test_event', listener);
      event.emit('test_event');
      expect(listener).toHaveBeenCalledTimes(1);
      
      event.removeListener('test_event', listener);
      event.emit('test_event');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex event flow', () => {
      const results = [];
      
      event.on('start', (data) => {
        results.push(`start: ${data.value}`);
      });
      
      event.on('process', (data) => {
        results.push(`process: ${data.value}`);
      });
      
      event.once('end', (data) => {
        results.push(`end: ${data.value}`);
      });
      
      event.emit('start', { value: 1 });
      event.emit('process', { value: 2 });
      event.emit('end', { value: 3 });
      event.emit('end', { value: 4 }); // Should not be added (once)
      
      expect(results).toEqual([
        'start: 1',
        'process: 2',
        'end: 3'
      ]);
    });

    it('should handle add and remove in sequence', () => {
      const listener = vi.fn();
      
      event.on('test', listener);
      event.emit('test');
      
      event.off('test', listener);
      event.emit('test');
      
      event.on('test', listener);
      event.emit('test');
      
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple event types', () => {
      const eventLog = [];
      
      event.on('create', () => eventLog.push('created'));
      event.on('update', () => eventLog.push('updated'));
      event.on('delete', () => eventLog.push('deleted'));
      
      event.emit('create');
      event.emit('update');
      event.emit('delete');
      
      expect(eventLog).toEqual(['created', 'updated', 'deleted']);
    });

    it('should support workflow-like event pattern', () => {
      const workflow_events = {
        STARTED: 'workflow_started',
        COMPLETED: 'workflow_completed',
        FAILED: 'workflow_failed'
      };
      
      event.registerEvents(workflow_events);
      
      const states = [];
      event.on('workflow_started', () => states.push('started'));
      event.on('workflow_completed', () => states.push('completed'));
      
      event.emit('workflow_started');
      event.emit('workflow_completed');
      
      expect(states).toEqual(['started', 'completed']);
    });

    it('should handle errors in listeners gracefully', () => {
      const goodListener = vi.fn();
      const badListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      
      event.on('test', goodListener);
      event.on('test', badListener);
      
      // The error will be thrown, but other listeners should still work
      expect(() => event.emit('test')).toThrow('Listener error');
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('CustomEvent compatibility', () => {
    it('should use CustomEvent for emitting', () => {
      const listener = vi.fn((data) => {
        // Data should be passed directly, not wrapped in event object
        expect(data).toEqual({ test: 'value' });
      });
      
      event.on('test', listener);
      event.emit('test', { test: 'value' });
      
      expect(listener).toHaveBeenCalled();
    });

    it('should maintain EventEmitter-like API', () => {
      // The API should feel like EventEmitter even though it uses EventTarget
      const listener = vi.fn();
      
      event.on('event', listener);
      event.emit('event', { data: 'test' });
      event.off('event', listener);
      
      expect(listener).toHaveBeenCalledWith({ data: 'test' });
    });
  });
});
