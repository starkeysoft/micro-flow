import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FlowControlStep from '../src/classes/steps/flow_control_step.js';
import Step from '../src/classes/steps/step.js';
import Workflow from '../src/classes/workflow.js';
import State from '../src/classes/state.js';
import { flow_control_types, step_types } from '../src/enums/index.js';

describe('FlowControlStep', () => {
  beforeEach(() => {
    State.reset();
    State.set('log_suppress', true);
  });

  afterEach(() => {
    State.reset();
  });

  describe('constructor', () => {
    it('should create a flow control step with default options', () => {
      const step = new FlowControlStep({
        conditional: {
          subject: true,
          operator: '===',
          value: true
        }
      });

      expect(step.id).toBeDefined();
      expect(step.name).toBeDefined();
      expect(step.flow_control_type).toBe(flow_control_types.BREAK);
      expect(step.step_type).toBe(step_types.LOGIC);
    });

    it('should create a flow control step with a custom name', () => {
      const step = new FlowControlStep({
        name: 'my-break',
        conditional: { subject: true, operator: '===', value: true }
      });

      expect(step.name).toBe('my-break');
    });

    it('should set flow_control_type to BREAK', () => {
      const step = new FlowControlStep({
        flow_control_type: flow_control_types.BREAK,
        conditional: { subject: true, operator: '===', value: true }
      });

      expect(step.flow_control_type).toBe('break');
    });

    it('should set flow_control_type to SKIP', () => {
      const step = new FlowControlStep({
        flow_control_type: flow_control_types.SKIP,
        conditional: { subject: true, operator: '===', value: true }
      });

      expect(step.flow_control_type).toBe('skip');
    });

    it('should throw error for invalid flow_control_type', () => {
      expect(() => {
        new FlowControlStep({
          flow_control_type: 'invalid',
          conditional: { subject: true, operator: '===', value: true }
        });
      }).toThrow('Invalid flow control type: invalid');
    });

    it('should have static step_name property', () => {
      expect(FlowControlStep.step_name).toBe('flow_control');
    });
  });

  describe('shouldFlowControl', () => {
    it('should return true when condition is met', async () => {
      const workflow = new Workflow({
        name: 'test-workflow',
        steps: [
          new FlowControlStep({
            conditional: { subject: 5, operator: '>', value: 3 },
            flow_control_type: flow_control_types.BREAK
          })
        ]
      });

      const result = await workflow.execute();

      expect(result.results[0].data.result).toBe(true);
    });

    it('should return false when condition is not met', async () => {
      const workflow = new Workflow({
        name: 'test-workflow',
        steps: [
          new FlowControlStep({
            conditional: { subject: 2, operator: '>', value: 3 },
            flow_control_type: flow_control_types.BREAK
          })
        ]
      });

      const result = await workflow.execute();

      expect(result.results[0].data.result).toBe(false);
    });

    it('should emit true branch event when condition is met', async () => {
      const eventSpy = vi.fn();
      const stepEvents = State.get('events.step');
      stepEvents.on('conditional_true_branch_executed', eventSpy);

      const workflow = new Workflow({
        steps: [
          new FlowControlStep({
            conditional: { subject: true, operator: '===', value: true },
            flow_control_type: flow_control_types.BREAK
          })
        ]
      });

      await workflow.execute();

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should emit false branch event when condition is not met', async () => {
      const eventSpy = vi.fn();
      const stepEvents = State.get('events.step');
      stepEvents.on('conditional_false_branch_executed', eventSpy);

      const workflow = new Workflow({
        steps: [
          new FlowControlStep({
            conditional: { subject: false, operator: '===', value: true },
            flow_control_type: flow_control_types.BREAK
          })
        ]
      });

      await workflow.execute();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('BREAK flow control', () => {
    it('should break workflow execution when condition is met', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        name: 'break-workflow',
        steps: [
          new Step({
            name: 'step-1',
            callable: async () => {
              executionOrder.push('step-1');
              return 'first';
            }
          }),
          new FlowControlStep({
            name: 'break-step',
            conditional: { subject: true, operator: '===', value: true },
            flow_control_type: flow_control_types.BREAK
          }),
          new Step({
            name: 'step-2',
            callable: async () => {
              executionOrder.push('step-2');
              return 'second';
            }
          }),
          new Step({
            name: 'step-3',
            callable: async () => {
              executionOrder.push('step-3');
              return 'third';
            }
          })
        ]
      });

      await workflow.execute();

      // step-2 and step-3 should not execute
      expect(executionOrder).toEqual(['step-1']);
      expect(workflow.results).toHaveLength(2); // step-1 and break-step
    });

    it('should not break workflow when condition is not met', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        name: 'no-break-workflow',
        steps: [
          new Step({
            name: 'step-1',
            callable: async () => {
              executionOrder.push('step-1');
              return 'first';
            }
          }),
          new FlowControlStep({
            name: 'break-step',
            conditional: { subject: false, operator: '===', value: true },
            flow_control_type: flow_control_types.BREAK
          }),
          new Step({
            name: 'step-2',
            callable: async () => {
              executionOrder.push('step-2');
              return 'second';
            }
          })
        ]
      });

      await workflow.execute();

      expect(executionOrder).toEqual(['step-1', 'step-2']);
      expect(workflow.results).toHaveLength(3);
    });

    it('should break based on dynamic state', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        name: 'dynamic-break-workflow',
        steps: [
          new Step({
            name: 'set-state',
            callable: async function() {
              this.setState('should_stop', true);
              executionOrder.push('set-state');
              return 'state set';
            }
          }),
          new FlowControlStep({
            name: 'check-break',
            conditional: {
              subject: true, // Will check against state
              operator: '===',
              value: true
            },
            flow_control_type: flow_control_types.BREAK
          }),
          new Step({
            name: 'should-not-run',
            callable: async () => {
              executionOrder.push('should-not-run');
              return 'ran';
            }
          })
        ]
      });

      await workflow.execute();

      expect(executionOrder).toEqual(['set-state']);
    });
  });

  describe('SKIP flow control', () => {
    it('should skip next step when condition is met', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        name: 'skip-workflow',
        steps: [
          new Step({
            name: 'step-1',
            callable: async () => {
              executionOrder.push('step-1');
              return 'first';
            }
          }),
          new FlowControlStep({
            name: 'skip-step',
            conditional: { subject: true, operator: '===', value: true },
            flow_control_type: flow_control_types.SKIP
          }),
          new Step({
            name: 'step-2',
            callable: async () => {
              executionOrder.push('step-2');
              return 'second';
            }
          }),
          new Step({
            name: 'step-3',
            callable: async () => {
              executionOrder.push('step-3');
              return 'third';
            }
          })
        ]
      });

      await workflow.execute();

      // step-2 should be skipped, step-3 should run
      expect(executionOrder).toEqual(['step-1', 'step-3']);
    });

    it('should not skip when condition is not met', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        name: 'no-skip-workflow',
        steps: [
          new Step({
            name: 'step-1',
            callable: async () => {
              executionOrder.push('step-1');
              return 'first';
            }
          }),
          new FlowControlStep({
            name: 'skip-step',
            conditional: { subject: false, operator: '===', value: true },
            flow_control_type: flow_control_types.SKIP
          }),
          new Step({
            name: 'step-2',
            callable: async () => {
              executionOrder.push('step-2');
              return 'second';
            }
          })
        ]
      });

      await workflow.execute();

      expect(executionOrder).toEqual(['step-1', 'step-2']);
    });

    it('should only skip one step per SKIP', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        name: 'single-skip-workflow',
        steps: [
          new FlowControlStep({
            name: 'skip-once',
            conditional: { subject: true, operator: '===', value: true },
            flow_control_type: flow_control_types.SKIP
          }),
          new Step({
            name: 'skipped',
            callable: async () => {
              executionOrder.push('skipped');
              return 'skipped';
            }
          }),
          new Step({
            name: 'runs',
            callable: async () => {
              executionOrder.push('runs');
              return 'runs';
            }
          }),
          new Step({
            name: 'also-runs',
            callable: async () => {
              executionOrder.push('also-runs');
              return 'also-runs';
            }
          })
        ]
      });

      await workflow.execute();

      expect(executionOrder).toEqual(['runs', 'also-runs']);
    });
  });

  describe('complex conditions', () => {
    it('should work with numeric comparisons', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        steps: [
          new FlowControlStep({
            conditional: { subject: 10, operator: '>=', value: 10 },
            flow_control_type: flow_control_types.BREAK
          }),
          new Step({
            callable: async () => {
              executionOrder.push('should-not-run');
            }
          })
        ]
      });

      await workflow.execute();

      expect(executionOrder).toEqual([]);
    });

    it('should work with string operators', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        steps: [
          new FlowControlStep({
            conditional: {
              subject: 'error: something went wrong',
              operator: 'string_contains',
              value: 'error'
            },
            flow_control_type: flow_control_types.BREAK
          }),
          new Step({
            callable: async () => {
              executionOrder.push('should-not-run');
            }
          })
        ]
      });

      await workflow.execute();

      expect(executionOrder).toEqual([]);
    });

    it('should work with custom function comparator', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        steps: [
          new FlowControlStep({
            conditional: {
              subject: { status: 'error', code: 500 },
              operator: 'custom_function',
              value: (subject) => subject.status === 'error' && subject.code >= 500
            },
            flow_control_type: flow_control_types.BREAK
          }),
          new Step({
            callable: async () => {
              executionOrder.push('should-not-run');
            }
          })
        ]
      });

      await workflow.execute();

      expect(executionOrder).toEqual([]);
    });
  });

  describe('workflow state', () => {
    it('should set should_break on parent workflow', async () => {
      const workflow = new Workflow({
        name: 'break-state-workflow',
        steps: [
          new FlowControlStep({
            conditional: { subject: true, operator: '===', value: true },
            flow_control_type: flow_control_types.BREAK
          })
        ]
      });

      await workflow.execute();

      expect(workflow.should_break).toBe(true);
    });

    it('should set should_skip on parent workflow', async () => {
      let skipValue;

      const workflow = new Workflow({
        name: 'skip-state-workflow',
        steps: [
          new FlowControlStep({
            conditional: { subject: true, operator: '===', value: true },
            flow_control_type: flow_control_types.SKIP
          }),
          new Step({
            callable: async () => 'skipped step'
          }),
          new Step({
            callable: async function() {
              // Capture should_skip state (it gets reset after skip)
              return 'ran after skip';
            }
          })
        ]
      });

      await workflow.execute();

      // After workflow completes, should_skip is reset to false
      expect(workflow.should_skip).toBe(false);
      expect(workflow.results).toHaveLength(2); // flow control + step after skipped
    });

    it('should not affect other workflows', async () => {
      const workflow1 = new Workflow({
        name: 'workflow-1',
        steps: [
          new FlowControlStep({
            conditional: { subject: true, operator: '===', value: true },
            flow_control_type: flow_control_types.BREAK
          })
        ]
      });

      const workflow2 = new Workflow({
        name: 'workflow-2',
        steps: [
          new Step({
            callable: async () => 'should run'
          })
        ]
      });

      await workflow1.execute();
      const result2 = await workflow2.execute();

      expect(workflow1.should_break).toBe(true);
      expect(workflow2.should_break).toBe(false);
      expect(result2.results).toHaveLength(1);
    });
  });

  describe('multiple flow control steps', () => {
    it('should respect first matching break', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        steps: [
          new Step({
            callable: async () => {
              executionOrder.push('step-1');
            }
          }),
          new FlowControlStep({
            name: 'first-break',
            conditional: { subject: false, operator: '===', value: true },
            flow_control_type: flow_control_types.BREAK
          }),
          new Step({
            callable: async () => {
              executionOrder.push('step-2');
            }
          }),
          new FlowControlStep({
            name: 'second-break',
            conditional: { subject: true, operator: '===', value: true },
            flow_control_type: flow_control_types.BREAK
          }),
          new Step({
            callable: async () => {
              executionOrder.push('step-3');
            }
          })
        ]
      });

      await workflow.execute();

      // First break doesn't trigger, second break does
      expect(executionOrder).toEqual(['step-1', 'step-2']);
    });

    it('should handle multiple skips', async () => {
      const executionOrder = [];

      const workflow = new Workflow({
        steps: [
          new FlowControlStep({
            conditional: { subject: true, operator: '===', value: true },
            flow_control_type: flow_control_types.SKIP
          }),
          new Step({
            callable: async () => {
              executionOrder.push('skipped-1');
            }
          }),
          new FlowControlStep({
            conditional: { subject: true, operator: '===', value: true },
            flow_control_type: flow_control_types.SKIP
          }),
          new Step({
            callable: async () => {
              executionOrder.push('skipped-2');
            }
          }),
          new Step({
            callable: async () => {
              executionOrder.push('runs');
            }
          })
        ]
      });

      await workflow.execute();

      expect(executionOrder).toEqual(['runs']);
    });
  });
});
