import { describe, it, expect, beforeEach } from 'vitest';
import State from '../src/classes/state.js';

describe('State', () => {
  let state;

  beforeEach(() => {
    state = new State();
  });

  it('should initialize with default state', () => {
    expect(state.get('id')).toBe(null);
    expect(state.get('name')).toBe(null);
    expect(state.get('exit_on_failure')).toBe(true);
    expect(state.get('should_break')).toBe(false);
    expect(state.get('steps')).toEqual([]);
  });

  it('should allow setting and getting state properties', () => {
    state.set('id', '12345');
    state.set('name', 'test-workflow');
    
    expect(state.get('id')).toBe('12345');
    expect(state.get('name')).toBe('test-workflow');
  });

  it('should merge new state with existing state', () => {
    state.set('id', 'original-id');
    state.set('name', 'original-name');
    
    state.merge({ 
      name: 'updated-name', 
      custom_field: 'new-value' 
    });
    
    expect(state.get('id')).toBe('original-id');
    expect(state.get('name')).toBe('updated-name');
    expect(state.get('custom_field')).toBe('new-value');
  });

  it('should return a deep clone of state', () => {
    state.set('steps', [{ name: 'step1' }]);
    const clone = state.getStateClone();
    
    // Modify clone
    clone.steps.push({ name: 'step2' });
    
    // Original should be unchanged
    expect(state.get('steps')).toHaveLength(1);
    expect(clone.steps).toHaveLength(2);
  });

  it('should freeze state and calculate execution time', () => {
    const startTime = Date.now();
    state.set('id', 'test-id');
    
    state.prepare(startTime);
    
    expect(state.get('execution_time_ms')).toBeGreaterThanOrEqual(0);
    
    // State should be frozen
    expect(() => {
      state.set('id', 'new-id');
    }).toThrow();
  });

  it('should return the entire state object with getState', () => {
    state.set('id', '123');
    state.set('name', 'test');
    
    const stateObj = state.getState();
    
    expect(stateObj).toHaveProperty('id', '123');
    expect(stateObj).toHaveProperty('name', 'test');
    expect(stateObj).toHaveProperty('exit_on_failure', true);
  });

  it('should handle setting undefined and null values', () => {
    state.set('custom_field', undefined);
    state.set('another_field', null);
    
    expect(state.get('custom_field')).toBe(undefined);
    expect(state.get('another_field')).toBe(null);
  });

  it('should initialize with custom initial state', () => {
    const customState = new State({ 
      id: 'custom-id', 
      name: 'custom-workflow',
      custom_prop: 'custom-value'
    });
    
    expect(customState.get('id')).toBe('custom-id');
    expect(customState.get('name')).toBe('custom-workflow');
    expect(customState.get('custom_prop')).toBe('custom-value');
    // Default values should still be present
    expect(customState.get('exit_on_failure')).toBe(true);
  });

  it('should not modify original when modifying cloned state', () => {
    const nestedObj = { nested: { value: 'original' } };
    state.set('data', nestedObj);
    
    const clone = state.getStateClone();
    clone.data.nested.value = 'modified';
    
    expect(state.get('data').nested.value).toBe('original');
  });

  it('should freeze state making it immutable', () => {
    state.set('value', 'original');
    state.freeze();
    
    expect(() => {
      state.set('value', 'modified');
    }).toThrow();
  });
});
