import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import State from '../src/classes/state.js';

describe('State', () => {
  beforeEach(() => {
    State.set('log_suppress', true);
    State.reset();
  });

  afterEach(() => {
    State.reset();
  });

  describe('default state', () => {
    it('should have messages with errors and warnings', () => {
      const messages = State.get('messages');
      expect(messages).toBeDefined();
      expect(messages.errors).toBeDefined();
      expect(messages.warnings).toBeDefined();
    });

    it('should have statuses for workflow and step', () => {
      const statuses = State.get('statuses');
      expect(statuses).toBeDefined();
      expect(statuses.workflow).toBeDefined();
      expect(statuses.step).toBeDefined();
    });

    it('should have event_names for workflow, step, and state', () => {
      const event_names = State.get('event_names');
      expect(event_names).toBeDefined();
      expect(event_names.workflow).toBeDefined();
      expect(event_names.step).toBeDefined();
      expect(event_names.state).toBeDefined();
    });

    it('should have events for workflow, step, and state', () => {
      const events = State.get('events');
      expect(events).toBeDefined();
      expect(events.workflow).toBeDefined();
      expect(events.step).toBeDefined();
      expect(events.state).toBeDefined();
    });

    it('should have types with base_types, step_types, and sub_step_types', () => {
      const types = State.get('types');
      expect(types).toBeDefined();
      expect(types.base_types).toBeDefined();
      expect(types.step_types).toBeDefined();
      expect(types.sub_step_types).toBeDefined();
    });

    it('should have empty workflows object', () => {
      const workflows = State.get('workflows');
      expect(workflows).toEqual({});
    });

    it('should have conditional_step_comparators', () => {
      const comparators = State.get('conditional_step_comparators');
      expect(comparators).toBeDefined();
    });
  });

  describe('get()', () => {
    it('should return entire state when path is falsy', () => {
      const fullState = State.get(null);
      expect(fullState).toBeDefined();
      expect(fullState.statuses).toBeDefined();
    });

    it('should return entire state when path is empty string', () => {
      const fullState = State.get('');
      expect(fullState).toBeDefined();
      expect(fullState.statuses).toBeDefined();
    });

    it('should return entire state when path is "*"', () => {
      const fullState = State.get('*');
      expect(fullState).toBeDefined();
      expect(fullState.statuses).toBeDefined();
    });

    it('should return value at dot-notation path', () => {
      State.set('user.name', 'John');
      expect(State.get('user.name')).toBe('John');
    });

    it('should return value at bracket-notation path', () => {
      State.set('users', [{ name: 'Alice' }, { name: 'Bob' }]);
      expect(State.get('users[0].name')).toBe('Alice');
      expect(State.get('users[1].name')).toBe('Bob');
    });

    it('should return default value when path does not exist', () => {
      expect(State.get('nonexistent.path', 'default')).toBe('default');
    });

    it('should return null when path does not exist and no default provided', () => {
      expect(State.get('nonexistent.path')).toBeNull();
    });

    it('should convert value to string type', () => {
      State.set('count', 42);
      expect(State.get('count', null, 'string')).toBe('42');
    });

    it('should convert value to number type', () => {
      State.set('count', '42');
      expect(State.get('count', null, 'number')).toBe(42);
    });

    it('should convert value to boolean type', () => {
      State.set('active', 1);
      expect(State.get('active', null, 'boolean')).toBe(true);
      
      State.set('inactive', 0);
      expect(State.get('inactive', null, 'boolean')).toBe(false);
    });

    it('should handle unknown type conversion gracefully', () => {
      State.set('value', 'test');
      // Unknown type should leave value unchanged
      expect(State.get('value', null, 'unknown')).toBe('test');
    });

    it('should return default value when value is null after get', () => {
      State.set('nullValue', null);
      expect(State.get('nullValue', 'default')).toBe('default');
    });
  });

  describe('set()', () => {
    it('should set a simple path', () => {
      State.set('myKey', 'myValue');
      expect(State.get('myKey')).toBe('myValue');
    });

    it('should set a nested path with dot notation', () => {
      State.set('a.b.c', 'deep');
      expect(State.get('a.b.c')).toBe('deep');
    });

    it('should set a nested path with bracket notation', () => {
      State.set('items[0]', 'first');
      expect(State.get('items[0]')).toBe('first');
    });

    it('should create intermediate objects automatically', () => {
      State.set('deep.nested.path', 'value');
      expect(State.get('deep')).toEqual({ nested: { path: 'value' } });
    });

    it('should create intermediate arrays for numeric indices', () => {
      State.set('list[0].name', 'Item 0');
      const list = State.get('list');
      expect(Array.isArray(list)).toBe(true);
      expect(list[0].name).toBe('Item 0');
    });

    it('should throw error when path is empty', () => {
      expect(() => State.set('', 'value')).toThrow();
    });

    it('should throw error when path is null', () => {
      expect(() => State.set(null, 'value')).toThrow();
    });

    it('should throw error when path is undefined', () => {
      expect(() => State.set(undefined, 'value')).toThrow();
    });

    it('should overwrite existing values', () => {
      State.set('key', 'original');
      State.set('key', 'updated');
      expect(State.get('key')).toBe('updated');
    });

    it('should handle mixed notation paths', () => {
      State.set('users[0].profile.name', 'Alice');
      expect(State.get('users[0].profile.name')).toBe('Alice');
    });
  });

  describe('delete()', () => {
    it('should delete a simple path', () => {
      State.set('toDelete', 'value');
      State.delete('toDelete');
      expect(State.get('toDelete')).toBeNull();
    });

    it('should delete a nested path', () => {
      State.set('parent.child', 'value');
      State.delete('parent.child');
      expect(State.get('parent.child')).toBeNull();
      expect(State.get('parent')).toEqual({});
    });

    it('should throw error when path is empty', () => {
      expect(() => State.delete('')).toThrow();
    });

    it('should throw error when path is null', () => {
      expect(() => State.delete(null)).toThrow();
    });

    it('should not throw when deleting non-existent path', () => {
      expect(() => State.delete('does.not.exist')).not.toThrow();
    });

    it('should handle bracket notation', () => {
      State.set('items', ['a', 'b', 'c']);
      State.delete('items[1]');
      const items = State.get('items');
      expect(items[1]).toBeUndefined();
    });

    it('should not throw when intermediate path does not exist', () => {
      expect(() => State.delete('nonexistent.path.deep')).not.toThrow();
    });

    it('should not throw when intermediate path is not an object', () => {
      State.set('scalar', 'string value');
      expect(() => State.delete('scalar.nested.path')).not.toThrow();
    });
  });

  describe('merge()', () => {
    it('should merge new properties into state', () => {
      State.merge({ newProp: 'newValue' });
      expect(State.get('newProp')).toBe('newValue');
    });

    it('should overwrite existing properties', () => {
      State.set('existing', 'old');
      State.merge({ existing: 'new' });
      expect(State.get('existing')).toBe('new');
    });

    it('should preserve other existing properties', () => {
      State.set('preserved', 'value');
      State.merge({ added: 'new' });
      expect(State.get('preserved')).toBe('value');
      expect(State.get('added')).toBe('new');
    });

    it('should return the merged state', () => {
      const result = State.merge({ merged: true });
      expect(result.merged).toBe(true);
    });

    it('should handle nested objects (shallow merge)', () => {
      State.set('obj', { a: 1, b: 2 });
      State.merge({ obj: { c: 3 } });
      // Shallow merge replaces the object
      expect(State.get('obj')).toEqual({ c: 3 });
    });
  });

  describe('reset()', () => {
    it('should reset state to default values', () => {
      State.set('custom', 'value');
      State.reset();
      expect(State.get('custom')).toBeNull();
    });

    it('should restore default statuses', () => {
      State.reset();
      const statuses = State.get('statuses');
      expect(statuses.workflow).toBeDefined();
      expect(statuses.step).toBeDefined();
    });

    it('should restore empty workflows object', () => {
      State.set('workflows.test', { id: 'test' });
      State.reset();
      expect(State.get('workflows')).toEqual({});
    });

    it('should return the reset state', () => {
      const result = State.reset();
      expect(result.workflows).toEqual({});
    });
  });

  describe('freeze()', () => {
    it('should freeze the state object', () => {
      const frozen = State.freeze();
      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('should return the frozen state', () => {
      const frozen = State.freeze();
      expect(frozen.statuses).toBeDefined();
    });
  });

  describe('getState()', () => {
    it('should return the entire state object', () => {
      const fullState = State.getState();
      expect(fullState).toBeDefined();
      expect(fullState.statuses).toBeDefined();
      expect(fullState.events).toBeDefined();
    });
  });

  describe('parsePath()', () => {
    it('should parse simple dot notation', () => {
      expect(State.parsePath('a.b.c')).toEqual(['a', 'b', 'c']);
    });

    it('should parse bracket notation with numbers', () => {
      expect(State.parsePath('items[0]')).toEqual(['items', '0']);
    });

    it('should parse bracket notation with strings', () => {
      expect(State.parsePath("data['key']")).toEqual(['data', 'key']);
      expect(State.parsePath('data["key"]')).toEqual(['data', 'key']);
    });

    it('should parse mixed notation', () => {
      expect(State.parsePath('users[0].profile.name')).toEqual(['users', '0', 'profile', 'name']);
    });

    it('should return empty array for invalid path', () => {
      // Edge case: path that doesn't match the regex
      expect(State.parsePath('')).toEqual([]);
    });

    it('should handle complex bracket notation', () => {
      expect(State.parsePath("obj['key-with-dash']")).toEqual(['obj', 'key-with-dash']);
    });
  });

  describe('getFromPropertyPath()', () => {
    it('should return value at property path', () => {
      State.set('nested.value', 'found');
      expect(State.getFromPropertyPath('nested.value')).toBe('found');
    });

    it('should return undefined for non-existent path', () => {
      expect(State.getFromPropertyPath('does.not.exist')).toBeUndefined();
    });

    it('should emit event when emit=true', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.GET_FROM_PROPERTY_PATH, handler);
      
      State.set('test', 'value');
      State.getFromPropertyPath('test', true);
      
      expect(handler).toHaveBeenCalled();
      events.off(eventNames.GET_FROM_PROPERTY_PATH, handler);
    });

    it('should not emit event when emit=false', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.GET_FROM_PROPERTY_PATH, handler);
      
      State.set('test', 'value');
      State.getFromPropertyPath('test', false);
      
      expect(handler).not.toHaveBeenCalled();
      events.off(eventNames.GET_FROM_PROPERTY_PATH, handler);
    });
  });

  describe('setToPropertyPath()', () => {
    it('should set value at property path', () => {
      State.setToPropertyPath('new.path', 'value');
      expect(State.get('new.path')).toBe('value');
    });

    it('should emit event when emit=true', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.SET_TO_PROPERTY_PATH, handler);
      
      State.setToPropertyPath('test', 'value', true);
      
      expect(handler).toHaveBeenCalled();
      events.off(eventNames.SET_TO_PROPERTY_PATH, handler);
    });

    it('should not emit event when emit=false', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.SET_TO_PROPERTY_PATH, handler);
      
      State.setToPropertyPath('test', 'value', false);
      
      expect(handler).not.toHaveBeenCalled();
      events.off(eventNames.SET_TO_PROPERTY_PATH, handler);
    });

    it('should create arrays for numeric indices', () => {
      State.setToPropertyPath('arr[0]', 'first');
      const arr = State.get('arr');
      expect(Array.isArray(arr)).toBe(true);
    });

    it('should create objects for non-numeric keys', () => {
      State.setToPropertyPath('obj.key', 'value');
      const obj = State.get('obj');
      expect(typeof obj).toBe('object');
      expect(Array.isArray(obj)).toBe(false);
    });

    it('should overwrite non-object intermediate values', () => {
      State.set('scalar', 'string');
      State.setToPropertyPath('scalar.nested', 'value');
      expect(State.get('scalar.nested')).toBe('value');
    });
  });

  describe('each()', () => {
    it('should iterate over array', async () => {
      State.set('items', ['a', 'b', 'c']);
      const results = [];
      
      await State.each('items', (item, index) => {
        results.push({ item, index });
      });
      
      expect(results).toEqual([
        { item: 'a', index: 0 },
        { item: 'b', index: 1 },
        { item: 'c', index: 2 },
      ]);
    });

    it('should iterate over object', async () => {
      State.set('obj', { a: 1, b: 2, c: 3 });
      const results = [];
      
      await State.each('obj', (value, key) => {
        results.push({ key, value });
      });
      
      expect(results).toContainEqual({ key: 'a', value: 1 });
      expect(results).toContainEqual({ key: 'b', value: 2 });
      expect(results).toContainEqual({ key: 'c', value: 3 });
    });

    it('should handle async callbacks', async () => {
      State.set('items', [1, 2, 3]);
      const results = [];
      
      await State.each('items', async (item) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(item * 2);
      });
      
      expect(results).toEqual([2, 4, 6]);
    });

    it('should throw error for non-iterable value', async () => {
      State.set('notIterable', 'string');
      
      await expect(State.each('notIterable', () => {})).rejects.toThrow();
    });

    it('should throw error for null value', async () => {
      State.set('nullValue', null);
      
      await expect(State.each('nullValue', () => {})).rejects.toThrow();
    });

    it('should throw error for number value', async () => {
      State.set('numberValue', 42);
      
      await expect(State.each('numberValue', () => {})).rejects.toThrow();
    });

    it('should emit EACH event for each iteration', async () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.EACH, handler);
      
      State.set('items', [1, 2, 3]);
      await State.each('items', () => {});
      
      expect(handler).toHaveBeenCalledTimes(3);
      events.off(eventNames.EACH, handler);
    });
  });

  describe('event emissions', () => {
    it('should emit GET event on get()', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.GET, handler);
      
      State.set('key', 'value');
      State.get('key');
      
      // Called twice: once from set triggering events, and once from get
      expect(handler).toHaveBeenCalled();
      events.off(eventNames.GET, handler);
    });

    it('should emit SET event on set()', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.SET, handler);
      
      State.set('key', 'value');
      
      expect(handler).toHaveBeenCalled();
      events.off(eventNames.SET, handler);
    });

    it('should emit DELETED event on delete()', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.DELETED, handler);
      
      State.set('key', 'value');
      State.delete('key');
      
      expect(handler).toHaveBeenCalled();
      events.off(eventNames.DELETED, handler);
    });

    it('should emit MERGE event on merge()', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.MERGE, handler);
      
      State.merge({ key: 'value' });
      
      expect(handler).toHaveBeenCalled();
      events.off(eventNames.MERGE, handler);
    });

    it('should emit RESET event on reset()', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.RESET, handler);
      
      State.reset();
      
      expect(handler).toHaveBeenCalled();
      events.off(eventNames.RESET, handler);
    });

    it('should emit FROZEN event on freeze()', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.FROZEN, handler);
      
      State.freeze();
      
      expect(handler).toHaveBeenCalled();
      events.off(eventNames.FROZEN, handler);
    });

    it('should emit GET_STATE event on getState()', () => {
      const events = State.get('events.state');
      const eventNames = State.get('event_names.state');
      const handler = vi.fn();
      events.on(eventNames.GET_STATE, handler);
      
      State.getState();
      
      expect(handler).toHaveBeenCalled();
      events.off(eventNames.GET_STATE, handler);
    });
  });

  describe('edge cases', () => {
    it('should handle setting and getting complex objects', () => {
      const complex = {
        nested: {
          array: [1, 2, { deep: 'value' }],
          date: new Date('2024-01-01'),
        },
      };
      State.set('complex', complex);
      expect(State.get('complex.nested.array[2].deep')).toBe('value');
    });

    it('should handle empty object as value', () => {
      State.set('empty', {});
      expect(State.get('empty')).toEqual({});
    });

    it('should handle empty array as value', () => {
      State.set('emptyArr', []);
      expect(State.get('emptyArr')).toEqual([]);
    });

    it('should handle boolean false as value', () => {
      State.set('falsy', false);
      expect(State.get('falsy')).toBe(false);
    });

    it('should handle zero as value', () => {
      State.set('zero', 0);
      expect(State.get('zero')).toBe(0);
    });

    it('should handle undefined returned from getFromPropertyPath with default', () => {
      // When path doesn't exist, get() should return defaultValue
      expect(State.get('missing', 'default')).toBe('default');
    });

    it('should handle type conversion for null values', () => {
      State.set('nullVal', null);
      // String conversion of null
      expect(State.get('nullVal', null, 'string')).toBe('null');
    });
  });
});
