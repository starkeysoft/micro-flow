import { describe, it, expect, beforeEach, vi } from 'vitest';
import Event from '../src/classes/events/event.js';

describe('Event', () => {
  let event;

  beforeEach(() => {
    event = new Event();
  });

  describe('constructor', () => {
    it('should create an Event instance', () => {
      expect(event).toBeInstanceOf(Event);
    });

    it('should extend EventTarget', () => {
      expect(event).toBeInstanceOf(EventTarget);
    });

    it('should initialize empty events object', () => {
      expect(event.events).toEqual({});
    });

    it('should initialize empty listener map', () => {
      expect(event._listener_map).toBeInstanceOf(Map);
      expect(event._listener_map.size).toBe(0);
    });
  });

  describe('registerEvents()', () => {
    it('should register events from an object of event names', () => {
      const eventNames = {
        START: 'start',
        STOP: 'stop',
        PAUSE: 'pause',
      };

      event.registerEvents(eventNames);

      expect(event.events.start).toBeInstanceOf(Event);
      expect(event.events.stop).toBeInstanceOf(Event);
      expect(event.events.pause).toBeInstanceOf(Event);
    });

    it('should create separate Event instances for each event name', () => {
      const eventNames = { A: 'a', B: 'b' };
      event.registerEvents(eventNames);

      expect(event.events.a).not.toBe(event.events.b);
    });

    it('should handle empty event names object', () => {
      event.registerEvents({});
      expect(event.events).toEqual({});
    });
  });

  describe('on()', () => {
    it('should add an event listener', () => {
      const handler = vi.fn();
      event.on('test', handler);

      event.emit('test', { value: 42 });

      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should return this for chaining', () => {
      const result = event.on('test', () => {});
      expect(result).toBe(event);
    });

    it('should store listener in _listener_map', () => {
      const handler = vi.fn();
      event.on('test', handler);

      expect(event._listener_map.has(handler)).toBe(true);
    });

    it('should allow multiple listeners for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      event.on('test', handler1);
      event.on('test', handler2);

      event.emit('test', { value: 1 });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should call listener multiple times on multiple emits', () => {
      const handler = vi.fn();
      event.on('test', handler);

      event.emit('test', { n: 1 });
      event.emit('test', { n: 2 });
      event.emit('test', { n: 3 });

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should support chaining multiple on() calls', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      event
        .on('event1', handler1)
        .on('event2', handler2);

      event.emit('event1', {});
      event.emit('event2', {});

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('once()', () => {
    it('should add a one-time event listener', () => {
      const handler = vi.fn();
      event.once('test', handler);

      event.emit('test', { value: 1 });
      event.emit('test', { value: 2 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ value: 1 });
    });

    it('should return this for chaining', () => {
      const result = event.once('test', () => {});
      expect(result).toBe(event);
    });

    it('should pass event detail to listener', () => {
      const handler = vi.fn();
      event.once('test', handler);

      event.emit('test', { key: 'value' });

      expect(handler).toHaveBeenCalledWith({ key: 'value' });
    });
  });

  describe('off()', () => {
    it('should remove an event listener', () => {
      const handler = vi.fn();
      event.on('test', handler);
      event.off('test', handler);

      event.emit('test', {});

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return this for chaining', () => {
      const handler = vi.fn();
      event.on('test', handler);
      const result = event.off('test', handler);
      expect(result).toBe(event);
    });

    it('should remove listener from _listener_map', () => {
      const handler = vi.fn();
      event.on('test', handler);
      event.off('test', handler);

      expect(event._listener_map.has(handler)).toBe(false);
    });

    it('should not throw if listener was never added', () => {
      const handler = vi.fn();
      expect(() => event.off('test', handler)).not.toThrow();
    });

    it('should only remove the specified listener', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      event.on('test', handler1);
      event.on('test', handler2);
      event.off('test', handler1);

      event.emit('test', {});

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle case when _listener_map is undefined', () => {
      event._listener_map = undefined;
      expect(() => event.off('test', () => {})).not.toThrow();
    });
  });

  describe('removeListener()', () => {
    it('should be an alias for off()', () => {
      const handler = vi.fn();
      event.on('test', handler);
      event.removeListener('test', handler);

      event.emit('test', {});

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return this for chaining', () => {
      const handler = vi.fn();
      event.on('test', handler);
      const result = event.removeListener('test', handler);
      expect(result).toBe(event);
    });
  });

  describe('emit()', () => {
    it('should emit an event with data', () => {
      const handler = vi.fn();
      event.on('test', handler);

      event.emit('test', { message: 'hello' });

      expect(handler).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('should return true if event was not cancelled', () => {
      const result = event.emit('test', {});
      expect(result).toBe(true);
    });

    it('should deep clone the data', () => {
      const handler = vi.fn();
      event.on('test', handler);

      const originalData = { nested: { value: 1 } };
      event.emit('test', originalData);

      const receivedData = handler.mock.calls[0][0];
      expect(receivedData).toEqual(originalData);
      expect(receivedData).not.toBe(originalData);
      expect(receivedData.nested).not.toBe(originalData.nested);
    });

    it('should emit with bubbles=false by default', () => {
      let capturedEvent;
      event.addEventListener('test', (e) => {
        capturedEvent = e;
      });

      event.emit('test', {});

      expect(capturedEvent.bubbles).toBe(false);
    });

    it('should emit with cancelable=true by default', () => {
      let capturedEvent;
      event.addEventListener('test', (e) => {
        capturedEvent = e;
      });

      event.emit('test', {});

      expect(capturedEvent.cancelable).toBe(true);
    });

    it('should respect bubbles parameter', () => {
      let capturedEvent;
      event.addEventListener('test', (e) => {
        capturedEvent = e;
      });

      event.emit('test', {}, true);

      expect(capturedEvent.bubbles).toBe(true);
    });

    it('should respect cancelable parameter', () => {
      let capturedEvent;
      event.addEventListener('test', (e) => {
        capturedEvent = e;
      });

      event.emit('test', {}, false, false);

      expect(capturedEvent.cancelable).toBe(false);
    });

    it('should handle broadcast failure gracefully', () => {
      // Broadcast might fail in test environment, but emit should still work
      const handler = vi.fn();
      event.on('test', handler);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      event.emit('test', { value: 1 });

      expect(handler).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should emit to multiple listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      event.on('test', handler1);
      event.on('test', handler2);
      event.on('test', handler3);

      event.emit('test', { x: 1 });

      expect(handler1).toHaveBeenCalledWith({ x: 1 });
      expect(handler2).toHaveBeenCalledWith({ x: 1 });
      expect(handler3).toHaveBeenCalledWith({ x: 1 });
    });
  });

  describe('onBroadcast()', () => {
    it('should return a Broadcast instance', () => {
      const broadcast = event.onBroadcast('test-channel', () => {});
      
      expect(broadcast).toBeDefined();
      expect(typeof broadcast.send).toBe('function');
      expect(typeof broadcast.destroy).toBe('function');
      
      broadcast.destroy();
    });

    it('should set up receive handler on broadcast channel', () => {
      const handler = vi.fn();
      const broadcast = event.onBroadcast('test-channel', handler);

      expect(broadcast.onmessage).toBeDefined();
      
      broadcast.destroy();
    });
  });

  describe('onAny()', () => {
    it('should return an object with event and broadcast properties', () => {
      const result = event.onAny('test-event', () => {});

      expect(result).toHaveProperty('event');
      expect(result).toHaveProperty('broadcast');
      expect(result.event).toBe(event);
      
      result.broadcast.destroy();
    });

    it('should set up local event listener', () => {
      const handler = vi.fn();
      const result = event.onAny('test-event', handler);

      event.emit('test-event', { value: 123 });

      expect(handler).toHaveBeenCalledWith({ value: 123 });
      
      result.broadcast.destroy();
    });

    it('should set up broadcast listener', () => {
      const handler = vi.fn();
      const result = event.onAny('test-event', handler);

      expect(result.broadcast.onmessage).toBeDefined();
      
      result.broadcast.destroy();
    });
  });

  describe('integration', () => {
    it('should support full lifecycle: on, emit, off', () => {
      const handler = vi.fn();

      event.on('lifecycle', handler);
      event.emit('lifecycle', { step: 1 });
      expect(handler).toHaveBeenCalledTimes(1);

      event.emit('lifecycle', { step: 2 });
      expect(handler).toHaveBeenCalledTimes(2);

      event.off('lifecycle', handler);
      event.emit('lifecycle', { step: 3 });
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple event types independently', () => {
      const startHandler = vi.fn();
      const stopHandler = vi.fn();

      event.on('start', startHandler);
      event.on('stop', stopHandler);

      event.emit('start', {});
      expect(startHandler).toHaveBeenCalledTimes(1);
      expect(stopHandler).toHaveBeenCalledTimes(0);

      event.emit('stop', {});
      expect(startHandler).toHaveBeenCalledTimes(1);
      expect(stopHandler).toHaveBeenCalledTimes(1);
    });

    it('should work with registered sub-events', () => {
      event.registerEvents({ TEST: 'test' });
      
      const handler = vi.fn();
      event.events.test.on('sub-event', handler);
      event.events.test.emit('sub-event', { nested: true });

      expect(handler).toHaveBeenCalledWith({ nested: true });
    });
  });
});
