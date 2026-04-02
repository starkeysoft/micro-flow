import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LoopStep from '../src/classes/steps/loop_step.js';
import Step from '../src/classes/steps/step.js';
import Workflow from '../src/classes/workflow.js';
import State from '../src/classes/state.js';
import { loop_types, step_types } from '../src/enums/index.js';

describe('LoopStep', () => {
  beforeEach(() => {
    State.reset();
    State.set('log_suppress', true);
  });

  afterEach(() => {
    State.reset();
  });

  describe('constructor', () => {
    it('should create a loop step with default options', () => {
      const step = new LoopStep({
        iterable: [1, 2, 3]
      });

      expect(step.id).toBeDefined();
      expect(step.name).toBeDefined();
      expect(step.loop_type).toBe(loop_types.FOR_EACH);
      expect(step.iterations).toBe(0);
      expect(step.max_iterations).toBe(1000);
      expect(step.results).toEqual([]);
      expect(step.current_item).toBeNull();
    });

    it('should create a loop step with a custom name', () => {
      const step = new LoopStep({
        name: 'my-loop',
        iterable: [1, 2, 3]
      });

      expect(step.name).toBe('my-loop');
    });

    it('should set loop_type', () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR,
        iterations: 5
      });

      expect(step.loop_type).toBe('for');
    });

    it('should set iterations for FOR loops', () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR,
        iterations: 10
      });

      expect(step.iterations).toBe(10);
    });

    it('should cap iterations at max_iterations', () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR,
        iterations: 2000,
        max_iterations: 100
      });

      expect(step.iterations).toBe(100);
    });

    it('should set custom max_iterations', () => {
      const step = new LoopStep({
        iterable: [],
        max_iterations: 50
      });

      expect(step.max_iterations).toBe(50);
    });

    it('should bind callable to instance', () => {
      const callable = async function() {
        return this.current_item;
      };

      const step = new LoopStep({
        iterable: [1],
        callable
      });

      expect(step._callable).toBeDefined();
    });

    it('should have static step_name property', () => {
      expect(LoopStep.step_name).toBe(step_types.LOOP);
    });
  });

  describe('FOR loop', () => {
    it('should execute callable for specified iterations', async () => {
      let count = 0;
      const step = new LoopStep({
        name: 'for-loop',
        loop_type: loop_types.FOR,
        iterations: 5,
        callable: async () => ++count
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([1, 2, 3, 4, 5]);
      expect(result.result.message).toContain('5 iterations');
    });

    it('should execute zero times when iterations is 0', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR,
        iterations: 0,
        callable: async () => 'should not run'
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([]);
      expect(result.result.message).toContain('0 iterations');
    });

    it('should have access to state in callable', async () => {
      State.set('multiplier', 2);

      const step = new LoopStep({
        loop_type: loop_types.FOR,
        iterations: 3,
        callable: async function() {
          return this.getState('multiplier') * this.results.length;
        }
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([0, 2, 4]);
    });
  });

  describe('FOR_EACH loop', () => {
    it('should iterate over array', async () => {
      const step = new LoopStep({
        name: 'for-each-loop',
        loop_type: loop_types.FOR_EACH,
        iterable: ['a', 'b', 'c'],
        callable: async function() {
          return this.current_item.toUpperCase();
        }
      });

      const result = await step.execute();

      expect(result.result.result).toEqual(['A', 'B', 'C']);
      expect(result.result.message).toContain('3 iterations');
    });

    it('should iterate over Set', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR_EACH,
        iterable: new Set([1, 2, 3]),
        callable: async function() {
          return this.current_item * 2;
        }
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([2, 4, 6]);
    });

    it('should iterate over Map', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR_EACH,
        iterable: new Map([['a', 1], ['b', 2]]),
        callable: async function() {
          const [key, value] = this.current_item;
          return `${key}=${value}`;
        }
      });

      const result = await step.execute();

      expect(result.result.result).toEqual(['a=1', 'b=2']);
    });

    it('should accept function that returns iterable', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR_EACH,
        iterable: () => [10, 20, 30],
        callable: async function() {
          return this.current_item / 10;
        }
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([1, 2, 3]);
    });

    it('should throw error when iterable is not provided', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR_EACH,
        callable: async () => 'result'
      });

      const result = await step.execute();
      expect(result.status).toBe('failed');
      expect(result.errors[0].message).toBe('Iterable is required for for_each loops');
    });

    it('should set current_item for each iteration', async () => {
      const items = [];

      const step = new LoopStep({
        loop_type: loop_types.FOR_EACH,
        iterable: ['x', 'y', 'z'],
        callable: async function() {
          items.push(this.current_item);
          return this.current_item;
        }
      });

      await step.execute();

      expect(items).toEqual(['x', 'y', 'z']);
    });

    it('should handle empty iterable', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR_EACH,
        iterable: [],
        callable: async () => 'should not run'
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([]);
      expect(result.result.message).toContain('0 iterations');
    });
  });

  describe('WHILE loop', () => {
    it('should execute while condition is true', async () => {
      let counter = 0;

      const step = new LoopStep({
        name: 'while-loop',
        loop_type: loop_types.WHILE,
        conditional: {
          subject: true,
          operator: 'custom_function',
          value: () => counter < 5
        },
        callable: async () => ++counter
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([1, 2, 3, 4, 5]);
      expect(result.result.message).toContain('5 iterations');
    });

    it('should not execute when condition is initially false', async () => {
      const step = new LoopStep({
        loop_type: loop_types.WHILE,
        conditional: {
          subject: 0,
          operator: '>',
          value: 10
        },
        callable: async () => 'should not run'
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([]);
      expect(result.result.message).toContain('0 iterations');
    });

    it('should throw error when conditional is invalid', async () => {
      const step = new LoopStep({
        loop_type: loop_types.WHILE,
        conditional: {
          subject: null,
          operator: null,
          value: null
        },
        callable: async () => 'result'
      });

      const result = await step.execute();
      expect(result.status).toBe('failed');
      expect(result.errors[0].message).toBe('Valid conditional is required for while loops');
    });

    it('should respect max_iterations limit', async () => {
      const step = new LoopStep({
        loop_type: loop_types.WHILE,
        max_iterations: 3,
        conditional: {
          subject: true,
          operator: '===',
          value: true
        },
        callable: async function() {
          return this.results.length + 1;
        }
      });

      const result = await step.execute();

      expect(result.result.result).toHaveLength(3);
    });

    it('should work with numeric comparison', async () => {
      let value = 10;

      const step = new LoopStep({
        loop_type: loop_types.WHILE,
        conditional: {
          subject: true,
          operator: 'custom_function',
          value: () => value > 0
        },
        callable: async () => value--
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    });
  });

  describe('GENERATOR loop', () => {
    it('should iterate over generator function', async () => {
      function* numberGenerator() {
        yield 1;
        yield 2;
        yield 3;
      }

      const step = new LoopStep({
        name: 'generator-loop',
        loop_type: loop_types.GENERATOR,
        callable: numberGenerator
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([1, 2, 3]);
      expect(result.result.message).toContain('3 iterations');
    });

    it('should iterate over async generator function', async () => {
      async function* asyncNumberGenerator() {
        yield await Promise.resolve(10);
        yield await Promise.resolve(20);
        yield await Promise.resolve(30);
      }

      const step = new LoopStep({
        loop_type: loop_types.GENERATOR,
        callable: asyncNumberGenerator
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([10, 20, 30]);
    });

    it('should respect max_iterations for generators', async () => {
      function* infiniteGenerator() {
        let i = 0;
        while (true) {
          yield i++;
        }
      }

      const step = new LoopStep({
        loop_type: loop_types.GENERATOR,
        max_iterations: 5,
        callable: infiniteGenerator
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([0, 1, 2, 3, 4]);
    });

    it('should throw error for non-generator callable', async () => {
      const step = new LoopStep({
        loop_type: loop_types.GENERATOR,
        callable: async () => 'not a generator'
      });

      const result = await step.execute();
      expect(result.status).toBe('failed');
      expect(result.errors[0].message).toContain('Iterable must be a generator function');
    });
  });

  describe('integration with Workflow', () => {
    it('should work as a step in a workflow', async () => {
      const workflow = new Workflow({
        name: 'loop-workflow',
        steps: [
          new LoopStep({
            name: 'process-items',
            loop_type: loop_types.FOR_EACH,
            iterable: [1, 2, 3],
            callable: async function() {
              return this.current_item * 10;
            }
          })
        ]
      });

      const result = await workflow.execute();

      expect(result.results[0].data.result.result).toEqual([10, 20, 30]);
    });

    it('should work with state modifications', async () => {
      const workflow = new Workflow({
        name: 'state-loop-workflow',
        steps: [
          new Step({
            callable: async function() {
              this.setState('items', []);
              return 'initialized';
            }
          }),
          new LoopStep({
            loop_type: loop_types.FOR,
            iterations: 3,
            callable: async function() {
              const items = this.getState('items');
              items.push(items.length + 1);
              this.setState('items', items);
              return items.length;
            }
          })
        ]
      });

      await workflow.execute();

      expect(State.get('items')).toEqual([1, 2, 3]);
    });

    it('should work with Step as callable', async () => {
      const innerStep = new Step({
        callable: async () => 'from step'
      });

      const loopStep = new LoopStep({
        loop_type: loop_types.FOR,
        iterations: 2,
        callable: innerStep
      });

      const result = await loopStep.execute();

      // When callable is a Step, it returns the step's result
      expect(result.result.result[0].result).toBe('from step');
      expect(result.result.result[1].result).toBe('from step');
    });
  });

  describe('results accumulation', () => {
    it('should accumulate results in order', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR_EACH,
        iterable: ['first', 'second', 'third'],
        callable: async function() {
          return `processed: ${this.current_item}`;
        }
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([
        'processed: first',
        'processed: second',
        'processed: third'
      ]);
    });

    it('should include async results', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR,
        iterations: 3,
        callable: async function() {
          await new Promise(resolve => setTimeout(resolve, 5));
          return this.results.length + 1;
        }
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([1, 2, 3]);
    });
  });

  describe('edge cases', () => {
    it('should handle large iterations efficiently', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR,
        iterations: 100,
        callable: async function() {
          return this.results.length;
        }
      });

      const startTime = Date.now();
      const result = await step.execute();
      const duration = Date.now() - startTime;

      expect(result.result.result).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete quickly
    });

    it('should handle objects in iterable', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR_EACH,
        iterable: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ],
        callable: async function() {
          return `${this.current_item.id}: ${this.current_item.name}`;
        }
      });

      const result = await step.execute();

      expect(result.result.result).toEqual(['1: Alice', '2: Bob']);
    });

    it('should handle string as iterable', async () => {
      const step = new LoopStep({
        loop_type: loop_types.FOR_EACH,
        iterable: 'abc',
        callable: async function() {
          return this.current_item.charCodeAt(0);
        }
      });

      const result = await step.execute();

      expect(result.result.result).toEqual([97, 98, 99]);
    });
  });
});
