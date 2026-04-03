import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Case from '../src/classes/steps/case.js';
import SwitchStep from '../src/classes/steps/switch_step.js';
import Step from '../src/classes/steps/step.js';
import Workflow from '../src/classes/workflow.js';
import State from '../src/classes/state.js';
import { conditional_step_comparators, step_types } from '../src/enums/index.js';

describe('Case', () => {
  beforeEach(() => {
    State.reset();
    State.set('log_suppress', true);
  });

  afterEach(() => {
    State.reset();
  });

  describe('constructor', () => {
    it('should create a case with default options', () => {
      const caseStep = new Case({});

      expect(caseStep.id).toBeDefined();
      expect(caseStep.name).toBeDefined();
      expect(caseStep.conditional_config).toEqual({ subject: null, operator: null, value: null });
      expect(caseStep.force_subject_override).toBe(false);
      expect(caseStep.is_matched).toBe(false);
    });

    it('should create a case with a custom name', () => {
      const caseStep = new Case({ name: 'my-case' });

      expect(caseStep.name).toBe('my-case');
    });

    it('should set conditional configuration', () => {
      const caseStep = new Case({
        conditional: {
          subject: 'test',
          operator: '===',
          value: 'test'
        }
      });

      expect(caseStep.conditional_config.subject).toBe('test');
      expect(caseStep.conditional_config.operator).toBe('===');
      expect(caseStep.conditional_config.value).toBe('test');
    });

    it('should set force_subject_override', () => {
      const caseStep = new Case({
        force_subject_override: true
      });

      expect(caseStep.force_subject_override).toBe(true);
    });

    it('should set callable', () => {
      const callable = async () => 'result';
      const caseStep = new Case({ callable });

      expect(caseStep._callable).toBeDefined();
    });

    it('should have static step_name property', () => {
      expect(Case.step_name).toBe('case');
    });
  });

  describe('switch_subject setter', () => {
    it('should set subject when no existing subject', () => {
      const caseStep = new Case({
        conditional: {
          operator: '===',
          value: 'expected'
        }
      });

      caseStep.switch_subject = 'expected';

      expect(caseStep.conditional_config.subject).toBe('expected');
    });

    it('should not override existing subject by default', () => {
      const caseStep = new Case({
        conditional: {
          subject: 'original',
          operator: '===',
          value: 'original'
        }
      });

      caseStep.switch_subject = 'new';

      expect(caseStep.conditional_config.subject).toBe('original');
    });

    it('should override existing subject when force_subject_override is true', () => {
      const caseStep = new Case({
        conditional: {
          subject: 'original',
          operator: '===',
          value: 'new'
        },
        force_subject_override: true
      });

      caseStep.switch_subject = 'new';

      expect(caseStep.conditional_config.subject).toBe('new');
    });

    it('should throw error when no subject provided and no existing subject', () => {
      const caseStep = new Case({
        conditional: {
          operator: '===',
          value: 'test'
        }
      });

      expect(() => {
        caseStep.switch_subject = null;
      }).toThrow('No subject set for case step');
    });

    it('should throw error when conditional is invalid after setting subject', () => {
      const caseStep = new Case({
        conditional: {
          operator: null,  // null operator makes it invalid
          value: 'test'
        }
      });

      expect(() => {
        caseStep.switch_subject = 'test';
      }).toThrow('Invalid conditional configuration');
    });

    it('should use existing subject when provided subject is null', () => {
      const caseStep = new Case({
        conditional: {
          subject: 'existing',
          operator: '===',
          value: 'existing'
        }
      });

      // Should not throw because existing subject is valid
      caseStep.switch_subject = null;

      expect(caseStep.conditional_config.subject).toBe('existing');
    });
  });

  describe('checkCondition', () => {
    it('should return true when condition matches', () => {
      const caseStep = new Case({
        conditional: {
          subject: 'hello',
          operator: '===',
          value: 'hello'
        }
      });

      expect(caseStep.checkCondition()).toBe(true);
    });

    it('should return false when condition does not match', () => {
      const caseStep = new Case({
        conditional: {
          subject: 'hello',
          operator: '===',
          value: 'world'
        }
      });

      expect(caseStep.checkCondition()).toBe(false);
    });

    it('should work with different operators', () => {
      const caseStep = new Case({
        conditional: {
          subject: 10,
          operator: '>',
          value: 5
        }
      });

      expect(caseStep.checkCondition()).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute the callable and return result', async () => {
      const caseStep = new Case({
        conditional: {
          subject: 'test',
          operator: '===',
          value: 'test'
        },
        callable: async () => 'case result'
      });

      const result = await caseStep.execute();

      expect(result.result).toBe('case result');
    });

    it('should have access to state in callable', async () => {
      State.set('case.value', 42);

      const caseStep = new Case({
        conditional: {
          subject: true,
          operator: '===',
          value: true
        },
        callable: async function() {
          return this.getState('case.value');
        }
      });

      const result = await caseStep.execute();

      expect(result.result).toBe(42);
    });
  });
});

describe('SwitchStep', () => {
  beforeEach(() => {
    State.reset();
    State.set('log_suppress', true);
  });

  afterEach(() => {
    State.reset();
  });

  describe('constructor', () => {
    it('should create a switch step with default options', () => {
      const switchStep = new SwitchStep({});

      expect(switchStep.id).toBeDefined();
      expect(switchStep.name).toBeDefined();
      expect(switchStep.cases).toEqual([]);
      expect(switchStep.subject).toBeNull();
    });

    it('should create a switch step with a custom name', () => {
      const switchStep = new SwitchStep({ name: 'my-switch' });

      expect(switchStep.name).toBe('my-switch');
    });

    it('should set cases array', () => {
      const case1 = new Case({
        conditional: { operator: '===', value: 1 }
      });
      const case2 = new Case({
        conditional: { operator: '===', value: 2 }
      });

      const switchStep = new SwitchStep({
        cases: [case1, case2]
      });

      expect(switchStep.cases).toHaveLength(2);
    });

    it('should set subject', () => {
      const switchStep = new SwitchStep({
        subject: 'test-subject'
      });

      expect(switchStep.subject).toBe('test-subject');
    });

    it('should bind function default_callable', () => {
      const defaultFn = async () => 'default';
      const switchStep = new SwitchStep({
        default_callable: defaultFn
      });

      expect(switchStep.default_callable).toBeDefined();
    });

    it('should bind Step default_callable', () => {
      const defaultStep = new Step({
        callable: async () => 'default step'
      });
      const switchStep = new SwitchStep({
        default_callable: defaultStep
      });

      expect(switchStep.default_callable).toBeDefined();
    });

    it('should have static step_name property', () => {
      expect(SwitchStep.step_name).toBe('switch');
    });
  });

  describe('execute', () => {
    it('should execute first matching case', async () => {
      const switchStep = new SwitchStep({
        subject: 'B',
        cases: [
          new Case({
            name: 'case-a',
            conditional: { operator: '===', value: 'A' },
            callable: async () => 'Result A'
          }),
          new Case({
            name: 'case-b',
            conditional: { operator: '===', value: 'B' },
            callable: async () => 'Result B'
          }),
          new Case({
            name: 'case-c',
            conditional: { operator: '===', value: 'C' },
            callable: async () => 'Result C'
          })
        ]
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('Result B');
    });

    it('should execute default_callable when no case matches', async () => {
      const switchStep = new SwitchStep({
        subject: 'X',
        cases: [
          new Case({
            conditional: { operator: '===', value: 'A' },
            callable: async () => 'Result A'
          }),
          new Case({
            conditional: { operator: '===', value: 'B' },
            callable: async () => 'Result B'
          })
        ],
        default_callable: async () => 'Default Result'
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('Default Result');
    });

    it('should stop at first matching case', async () => {
      const callOrder = [];

      const switchStep = new SwitchStep({
        subject: 5,
        cases: [
          new Case({
            conditional: { operator: '>', value: 10 },
            callable: async () => {
              callOrder.push('case1');
              return 'Greater than 10';
            }
          }),
          new Case({
            conditional: { operator: '>', value: 3 },
            callable: async () => {
              callOrder.push('case2');
              return 'Greater than 3';
            }
          }),
          new Case({
            conditional: { operator: '>', value: 0 },
            callable: async () => {
              callOrder.push('case3');
              return 'Greater than 0';
            }
          })
        ]
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('Greater than 3');
      expect(callOrder).toEqual(['case2']);
    });

    it('should emit SWITCH_CASE_MATCHED event when case matches', async () => {
      const eventSpy = vi.fn();
      const stepEvents = State.get('events.step');
      stepEvents.on('switch_case_matched', eventSpy);

      const switchStep = new SwitchStep({
        subject: 'match',
        cases: [
          new Case({
            conditional: { operator: '===', value: 'match' },
            callable: async () => 'matched'
          })
        ]
      });

      await switchStep.execute();

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should work with numeric comparisons', async () => {
      const switchStep = new SwitchStep({
        subject: 75,
        cases: [
          new Case({
            conditional: { operator: '>=', value: 90 },
            callable: async () => 'A'
          }),
          new Case({
            conditional: { operator: '>=', value: 80 },
            callable: async () => 'B'
          }),
          new Case({
            conditional: { operator: '>=', value: 70 },
            callable: async () => 'C'
          }),
          new Case({
            conditional: { operator: '>=', value: 60 },
            callable: async () => 'D'
          })
        ],
        default_callable: async () => 'F'
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('C');
    });

    it('should work with string contains operator', async () => {
      const switchStep = new SwitchStep({
        subject: 'hello world',
        cases: [
          new Case({
            conditional: { operator: 'string_contains', value: 'foo' },
            callable: async () => 'contains foo'
          }),
          new Case({
            conditional: { operator: 'string_contains', value: 'world' },
            callable: async () => 'contains world'
          })
        ],
        default_callable: async () => 'no match'
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('contains world');
    });

    it('should work with Step as case callable', async () => {
      const innerStep = new Step({
        name: 'inner',
        callable: async () => 'from inner step'
      });

      const switchStep = new SwitchStep({
        subject: 'match',
        cases: [
          new Case({
            conditional: { operator: '===', value: 'match' },
            callable: innerStep
          })
        ]
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('from inner step');
    });

    it('should work with Step as default_callable', async () => {
      const defaultStep = new Step({
        name: 'default-step',
        callable: async () => 'default step result'
      });

      const switchStep = new SwitchStep({
        subject: 'no-match',
        cases: [
          new Case({
            conditional: { operator: '===', value: 'match' },
            callable: async () => 'matched'
          })
        ],
        default_callable: defaultStep
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('default step result');
    });

    it('should handle empty cases array', async () => {
      const switchStep = new SwitchStep({
        subject: 'anything',
        cases: [],
        default_callable: async () => 'always default'
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('always default');
    });
  });

  describe('integration with Workflow', () => {
    it('should work as a step in a workflow', async () => {
      const workflow = new Workflow({
        name: 'switch-workflow',
        steps: [
          new SwitchStep({
            name: 'grade-switch',
            subject: 85,
            cases: [
              new Case({
                conditional: { operator: '>=', value: 90 },
                callable: async () => 'A'
              }),
              new Case({
                conditional: { operator: '>=', value: 80 },
                callable: async () => 'B'
              })
            ],
            default_callable: async () => 'C or below'
          })
        ]
      });

      const result = await workflow.execute();

      expect(result.results[0].data.result).toBe('B');
    });

    it('should work with state in switch', async () => {
      State.set('user.type', 'admin');

      const workflow = new Workflow({
        name: 'state-switch-workflow',
        steps: [
          new SwitchStep({
            name: 'user-type-switch',
            subject: State.get('user.type'),
            cases: [
              new Case({
                conditional: { operator: '===', value: 'admin' },
                callable: async () => 'admin dashboard'
              }),
              new Case({
                conditional: { operator: '===', value: 'user' },
                callable: async () => 'user dashboard'
              })
            ],
            default_callable: async () => 'guest page'
          })
        ]
      });

      const result = await workflow.execute();

      expect(result.results[0].data.result).toBe('admin dashboard');
    });
  });

  describe('case with existing subject', () => {
    it('should use case subject when switch subject is null', async () => {
      const switchStep = new SwitchStep({
        subject: null,
        cases: [
          new Case({
            conditional: {
              subject: 'self-provided',
              operator: '===',
              value: 'self-provided'
            },
            callable: async () => 'matched with self subject'
          })
        ],
        default_callable: async () => 'no match'
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('matched with self subject');
    });

    it('should override case subject when force_subject_override is true', async () => {
      const switchStep = new SwitchStep({
        subject: 'switch-provided',
        cases: [
          new Case({
            conditional: {
              subject: 'case-provided',
              operator: '===',
              value: 'switch-provided'
            },
            force_subject_override: true,
            callable: async () => 'matched with switch subject'
          })
        ],
        default_callable: async () => 'no match'
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('matched with switch subject');
    });
  });

  describe('complex conditions', () => {
    it('should work with regex matching', async () => {
      const switchStep = new SwitchStep({
        subject: 'user@example.com',
        cases: [
          new Case({
            conditional: {
              operator: 'regex_match',
              value: '^admin@'
            },
            callable: async () => 'admin email'
          }),
          new Case({
            conditional: {
              operator: 'regex_match',
              value: '@example\\.com$'
            },
            callable: async () => 'example.com email'
          })
        ],
        default_callable: async () => 'other email'
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('example.com email');
    });

    it('should work with custom function comparator', async () => {
      const switchStep = new SwitchStep({
        subject: { status: 'active', role: 'admin' },
        cases: [
          new Case({
            conditional: {
              operator: 'custom_function',
              value: (subject) => subject.status === 'active' && subject.role === 'admin'
            },
            callable: async () => 'active admin'
          }),
          new Case({
            conditional: {
              operator: 'custom_function',
              value: (subject) => subject.status === 'active'
            },
            callable: async () => 'active user'
          })
        ],
        default_callable: async () => 'inactive'
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('active admin');
    });

    it('should work with array contains', async () => {
      const switchStep = new SwitchStep({
        subject: ['read', 'write', 'delete'],
        cases: [
          new Case({
            conditional: {
              operator: 'array_contains',
              value: 'admin'
            },
            callable: async () => 'has admin permission'
          }),
          new Case({
            conditional: {
              operator: 'array_contains',
              value: 'delete'
            },
            callable: async () => 'has delete permission'
          })
        ],
        default_callable: async () => 'basic permissions'
      });

      const result = await switchStep.execute();

      expect(result.result).toBe('has delete permission');
    });
  });
});
