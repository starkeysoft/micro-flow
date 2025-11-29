import { describe, it, expect, beforeEach } from 'vitest';
import state from '../src/classes/state.js';
import deep_clone from '../src/helpers/deep_clone.js';

describe('State', () => {
  beforeEach(() => {
    // Reset the singleton state instance for each test
    state.state = {
      id: null,
      name: null,
      exit_on_failure: true,
      current_step: null,
      steps: [],
      events: null,
      should_break: false,
      should_continue: false,
    };
  });

  describe('singleton instance', () => {
    it('should have default values after reset', () => {
      expect(state.state).toBeDefined();
      expect(state.state.id).toBeNull();
      expect(state.state.name).toBeNull();
      expect(state.state.steps).toEqual([]);
    });

    it('should allow setting custom fields', () => {
      state.set('id', '123');
      state.set('custom_field', 'value');
      expect(state.get('id')).toBe('123');
      expect(state.get('custom_field')).toBe('value');
      expect(state.get('steps')).toEqual([]);
    });
  });

  describe('get()', () => {
    beforeEach(() => {
      state.state = {
        id: 'test-id',
        name: 'test-name',
        user: {
          profile: {
            name: 'John',
            age: 30
          }
        },
        items: [1, 2, 3]
      };
    });

    it('should get a top-level property', () => {
      expect(state.get('id')).toBe('test-id');
      expect(state.get('name')).toBe('test-name');
    });

    it('should get a nested property using dot notation', () => {
      expect(state.get('user.profile.name')).toBe('John');
      expect(state.get('user.profile.age')).toBe(30);
    });

    it('should return default value for non-existent property', () => {
      expect(state.get('nonexistent')).toBeNull();
      expect(state.get('nonexistent', 'default')).toBe('default');
      expect(state.get('user.profile.email', 'no-email')).toBe('no-email');
    });

    it('should return entire state when path is falsy, "*", or ""', () => {
      expect(state.get()).toEqual(state.state);
      expect(state.get('*')).toEqual(state.state);
      expect(state.get('')).toEqual(state.state);
      expect(state.get(null)).toEqual(state.state);
    });

    it('should handle array access', () => {
      expect(state.get('items')).toEqual([1, 2, 3]);
    });
  });

  describe('set()', () => {
    it('should set a top-level property', () => {
      state.set('id', 'new-id');
      expect(state.get('id')).toBe('new-id');
    });

    it('should set a nested property using dot notation', () => {
      state.set('user.profile.name', 'Jane');
      expect(state.get('user.profile.name')).toBe('Jane');
    });

    it('should create nested objects if they do not exist', () => {
      state.set('deeply.nested.value', 42);
      expect(state.get('deeply.nested.value')).toBe(42);
    });

    it('should throw error when path is empty', () => {
      expect(() => state.set('', 'value')).toThrow();
      expect(() => state.set(null, 'value')).toThrow();
    });

    it('should handle setting complex objects', () => {
      const complexObject = { a: 1, b: { c: 2 } };
      state.set('complex', complexObject);
      expect(state.get('complex')).toEqual(complexObject);
    });
  });

  describe('delete()', () => {
    beforeEach(() => {
      state.state = {
        id: 'test-id',
        user: {
          profile: {
            name: 'John',
            age: 30
          }
        }
      };
    });

    it('should delete a top-level property', () => {
      state.delete('id');
      expect(state.get('id')).toBeNull();
    });

    it('should delete a nested property', () => {
      state.delete('user.profile.name');
      expect(state.get('user.profile.name')).toBeNull();
      expect(state.get('user.profile.age')).toBe(30);
    });

    it('should handle deleting non-existent properties gracefully', () => {
      expect(() => state.delete('nonexistent')).not.toThrow();
      expect(() => state.delete('user.nonexistent.path')).not.toThrow();
    });

    it('should throw error when path is empty', () => {
      expect(() => state.delete('')).toThrow();
      expect(() => state.delete(null)).toThrow();
    });
  });

  describe('merge()', () => {
    beforeEach(() => {
      state.state = {
        id: 'original-id',
        name: 'original-name',
        existing: 'value'
      };
    });

    it('should merge new properties into state', () => {
      state.merge({ new_property: 'new-value' });
      expect(state.get('new_property')).toBe('new-value');
      expect(state.get('existing')).toBe('value');
    });

    it('should overwrite existing properties', () => {
      state.merge({ id: 'new-id', name: 'new-name' });
      expect(state.get('id')).toBe('new-id');
      expect(state.get('name')).toBe('new-name');
    });

    it('should handle merging empty objects', () => {
      const originalState = { ...state.state };
      state.merge({});
      expect(state.state).toEqual(originalState);
    });
  });

  describe('getState()', () => {
    it('should return the entire state object', () => {
      state.state = { id: '123', name: 'test' };
      const result = state.getState();
      expect(result).toEqual({ id: '123', name: 'test' });
    });

    it('should return a reference to the actual state', () => {
      const result = state.getState();
      result.modified = true;
      expect(state.state.modified).toBe(true);
    });
  });

  describe('getStateClone()', () => {
    it('should return a deep clone of the state', () => {
      state.state = {
        id: '123',
        nested: { value: 'original' }
      };
      const clone = state.getStateClone();
      
      expect(clone).toEqual(state.state);
      expect(clone).not.toBe(state.state);
    });

    it('should not affect original state when clone is modified', () => {
      state.state = {
        id: '123',
        nested: { value: 'original' }
      };
      const clone = state.getStateClone();
      
      clone.nested.value = 'modified';
      expect(state.state.nested.value).toBe('original');
    });
  });

  describe('freeze()', () => {
    it('should freeze the state object', () => {
      state.state = { id: '123', name: 'test' };
      state.freeze();
      
      expect(() => {
        state.state.id = 'new-id';
      }).toThrow();
    });

    it('should prevent adding new properties', () => {
      state.freeze();
      
      expect(() => {
        state.state.newProp = 'value';
      }).toThrow();
    });
  });

  describe('getFromPropertyPath()', () => {
    beforeEach(() => {
      state.state = {
        level1: {
          level2: {
            level3: 'deep-value'
          }
        }
      };
    });

    it('should resolve simple paths', () => {
      expect(state.getFromPropertyPath('level1')).toEqual({
        level2: { level3: 'deep-value' }
      });
    });

    it('should resolve deeply nested paths', () => {
      expect(state.getFromPropertyPath('level1.level2.level3')).toBe('deep-value');
    });

    it('should return undefined for non-existent paths', () => {
      expect(state.getFromPropertyPath('nonexistent')).toBeUndefined();
      expect(state.getFromPropertyPath('level1.nonexistent')).toBeUndefined();
    });
  });

  describe('setToPropertyPath()', () => {
    it('should set simple paths', () => {
      state.setToPropertyPath('simple', 'value');
      expect(state.state.simple).toBe('value');
    });

    it('should set deeply nested paths', () => {
      state.setToPropertyPath('a.b.c.d', 'deep');
      expect(state.state.a.b.c.d).toBe('deep');
    });

    it('should create intermediate objects as needed', () => {
      state.state = {};
      state.setToPropertyPath('new.nested.path', 'value');
      expect(state.state.new.nested.path).toBe('value');
    });

    it('should overwrite existing values', () => {
      state.state = { existing: { value: 'old' } };
      state.setToPropertyPath('existing.value', 'new');
      expect(state.state.existing.value).toBe('new');
    });
  });

  describe('defaultState', () => {
    it('should have expected default properties', () => {
      // Access the State class through the constructor property
      const defaults = state.constructor.defaultState;
      expect(defaults.id).toBeNull();
      expect(defaults.name).toBeNull();
      expect(defaults.exit_on_failure).toBe(true);
      expect(defaults.current_step).toBeNull();
      expect(defaults.steps).toEqual([]);
      expect(defaults.should_break).toBe(false);
      expect(defaults.should_continue).toBe(false);
    });
  });

  describe('complex scenarios', () => {
    it('should handle workflow-like state structure', () => {
      state.set('id', 'workflow-123');
      state.set('name', 'test-workflow');
      state.set('steps', [
        { id: 'step1', name: 'first' },
        { id: 'step2', name: 'second' }
      ]);
      state.set('current_step_index', 0);

      expect(state.get('steps')).toHaveLength(2);
      expect(state.get('steps.0.name')).toBe('first');
      expect(state.get('steps.1.id')).toBe('step2');
    });

    it('should handle array operations in state', () => {
      state.set('items', []);
      const items = state.get('items');
      items.push('item1');
      items.push('item2');
      
      expect(state.get('items')).toEqual(['item1', 'item2']);
    });

    it('should handle chained operations', () => {
      state.set('data.users', []);
      const users = state.get('data.users');
      users.push({ id: 1, name: 'User1' });
      
      state.set('data.count', users.length);
      expect(state.get('data.count')).toBe(1);
    });
  });
});
