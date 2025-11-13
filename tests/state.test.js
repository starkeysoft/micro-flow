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
});
