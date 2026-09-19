import { describe, it, expect, beforeEach } from 'vitest';
import CallableRegistry from '../src/classes/callable_registry.js';

describe('CallableRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new CallableRegistry();
  });

  describe('constructor', () => {
    it('should start with an empty registry', () => {
      expect(registry.has('anything')).toBe(false);
    });
  });

  describe('register', () => {
    it('should register a function under a name', () => {
      const fn = async () => 'result';
      registry.register('myFn', fn);

      expect(registry.has('myFn')).toBe(true);
      expect(registry.get('myFn')).toBe(fn);
    });

    it('should throw when registering a non-function value', () => {
      expect(() => registry.register('notAFn', 'a string')).toThrow(
        'Only functions can be registered as callables.'
      );
    });

    it('should throw when registering null', () => {
      expect(() => registry.register('nullFn', null)).toThrow(
        'Only functions can be registered as callables.'
      );
    });

    it('should overwrite an existing entry registered under the same name', () => {
      const first = async () => 'first';
      const second = async () => 'second';

      registry.register('dupe', first);
      registry.register('dupe', second);

      expect(registry.get('dupe')).toBe(second);
    });

    it('should register synchronous functions as well as async ones', () => {
      const fn = () => 'sync result';
      registry.register('syncFn', fn);

      expect(registry.get('syncFn')).toBe(fn);
    });
  });

  describe('registerMany', () => {
    it('should register every function in the provided object', () => {
      const fnA = async () => 'a';
      const fnB = async () => 'b';

      registry.registerMany({ fnA, fnB });

      expect(registry.get('fnA')).toBe(fnA);
      expect(registry.get('fnB')).toBe(fnB);
    });

    it('should throw if any value in the object is not a function', () => {
      const fnA = async () => 'a';

      expect(() => registry.registerMany({ fnA, notAFn: 42 })).toThrow(
        'Only functions can be registered as callables.'
      );
    });

    it('should register entries up to the point of failure', () => {
      const fnA = async () => 'a';

      try {
        registry.registerMany({ fnA, notAFn: 42 });
      } catch {
        // expected
      }

      expect(registry.has('fnA')).toBe(true);
      expect(registry.has('notAFn')).toBe(false);
    });

    it('should handle an empty object without error', () => {
      expect(() => registry.registerMany({})).not.toThrow();
    });
  });

  describe('has', () => {
    it('should return false for an unregistered name', () => {
      expect(registry.has('nope')).toBe(false);
    });

    it('should return true only for own properties, not inherited ones', () => {
      expect(registry.has('toString')).toBe(false);
      expect(registry.has('constructor')).toBe(false);
    });
  });

  describe('get', () => {
    it('should retrieve a previously registered callable', () => {
      const fn = async () => 'value';
      registry.register('key', fn);

      expect(registry.get('key')).toBe(fn);
    });

    it('should throw when retrieving an unregistered name', () => {
      expect(() => registry.get('missing')).toThrow(
        'No callable registered under the name "missing".'
      );
    });
  });

  describe('deregister', () => {
    it('should remove a registered callable', () => {
      registry.register('temp', async () => 'temp');
      registry.deregister('temp');

      expect(registry.has('temp')).toBe(false);
    });

    it('should throw when deregistering a name that was never registered', () => {
      expect(() => registry.deregister('ghost')).toThrow(
        'No callable registered under the name "ghost".'
      );
    });

    it('should throw when deregistering a name that was already deregistered', () => {
      registry.register('once', async () => {});
      registry.deregister('once');

      expect(() => registry.deregister('once')).toThrow(
        'No callable registered under the name "once".'
      );
    });
  });

  describe('clear', () => {
    it('should remove all registered callables', () => {
      registry.registerMany({
        fnA: async () => 'a',
        fnB: async () => 'b',
      });

      registry.clear();

      expect(registry.has('fnA')).toBe(false);
      expect(registry.has('fnB')).toBe(false);
    });

    it('should leave the registry usable after clearing', () => {
      registry.register('fnA', async () => 'a');
      registry.clear();

      const fn = async () => 'new';
      registry.register('fnA', fn);

      expect(registry.get('fnA')).toBe(fn);
    });
  });
});
