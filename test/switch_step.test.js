import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Case from '../src/classes/steps/case.js';
import SwitchStep from '../src/classes/steps/switch_step.js';
import Step from '../src/classes/steps/step.js';
import Workflow from '../src/classes/workflow.js';
import CallableRegistry from '../src/classes/callable_registry.js';
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

      expect(caseStep.getConditionalSubject()).toBe('expected');
      expect(caseStep.checkCondition()).toBe(true);
      // The switch subject is transient - it must not leak into the (serialized) config.
      expect(caseStep.conditional_config.subject).toBeUndefined();
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

      expect(caseStep.getConditionalSubject()).toBe('original');
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

      expect(caseStep.getConditionalSubject()).toBe('new');
      expect(caseStep.conditional_config.subject).toBe('original');
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

      expect(caseStep.getConditionalSubject()).toBe('existing');
    });

    it('should not mutate the conditional object passed to the constructor', () => {
      const conditional = { operator: '===', value: 'x' };
      const caseStep = new Case({ conditional });

      caseStep.switch_subject = 'x';

      expect(conditional.subject).toBeUndefined();
    });

    it('should not persist the switch subject through serialization', async () => {
      const caseStep = new Case({
        conditional: { operator: '===', value: 'a' },
        callable: async () => 'matched',
      });
      const switchStep = new SwitchStep({ subject: 'a', cases: [caseStep] });

      await switchStep.execute();

      const serialized = switchStep.prepareForSerialization();
      expect(serialized.cases[0].conditional.subject).toBeUndefined();
      expect(serialized.subject).toBe('a');
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
      caseStep.setState('case.value', 42);

      const result = await caseStep.execute();

      expect(result.result).toBe(42);
    });
  });

  describe('prepareForSerialization', () => {
    it('should include class_name "case"', () => {
      const caseStep = new Case({
        conditional: { subject: 'a', operator: '===', value: 'a' },
      });

      expect(caseStep.prepareForSerialization().class_name).toBe('case');
    });

    it('should include force_subject_override and is_matched', () => {
      const caseStep = new Case({
        conditional: { subject: 'a', operator: '===', value: 'a' },
        force_subject_override: true,
      });

      const serialized = caseStep.prepareForSerialization();

      expect(serialized.force_subject_override).toBe(true);
      expect(serialized.is_matched).toBe(false);
    });
  });

  describe('hydrate / hydrateSerialized', () => {
    it('should round-trip a Case, preserving force_subject_override and is_matched', () => {
      const registry = new CallableRegistry();
      registry.register('caseCallable', async function caseCallable() { return 'matched'; });

      const original = new Case({
        conditional: { subject: 'a', operator: '===', value: 'a' },
        force_subject_override: true,
        callable: registry.get('caseCallable'),
      });
      original.is_matched = true;

      const hydrated = Case.hydrate(original.prepareForSerialization(), registry);

      expect(hydrated).toBeInstanceOf(Case);
      expect(hydrated.force_subject_override).toBe(true);
      expect(hydrated.is_matched).toBe(true);
    });

    it('should dispatch through Step.hydrateAny to a Case instance, not a plain LogicStep', () => {
      const registry = new CallableRegistry();
      registry.register('caseCallable', async function caseCallable() {});

      const original = new Case({
        conditional: { subject: 'a', operator: '===', value: 'a' },
        callable: registry.get('caseCallable'),
      });

      const hydrated = Step.hydrateAny(original.prepareForSerialization(), registry);

      expect(hydrated.constructor).toBe(Case);
    });

    it('should serialize and hydrate by callable_registry_key when set, ignoring the callable\'s own name', async () => {
      const registry = new CallableRegistry();
      registry.register('caseKey', async function actualName() { return 'case ran'; });

      const original = new Case({
        conditional: { subject: 'a', operator: '===', value: 'a' },
        callable: registry.get('caseKey'),
        callable_registry_key: 'caseKey',
      });

      const serialized = original.prepareForSerialization();
      expect(serialized.callable).toEqual({ type: 'function', value: 'caseKey' });

      const hydrated = Case.hydrate(serialized, registry);
      const result = await hydrated.execute();

      expect(result.result).toBe('case ran');
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
      const workflow = new Workflow({
        name: 'state-switch-workflow',
        steps: [
          new SwitchStep({
            name: 'user-type-switch',
            subject: 'admin',
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

    it('should share the parent workflow\'s state with a matched Case callable', async () => {
      const workflow = new Workflow({
        name: 'switch-case-shared-state',
        steps: [
          new SwitchStep({
            subject: 'a',
            cases: [
              new Case({
                conditional: { operator: '===', value: 'a' },
                callable: async function () {
                  this.setState('switch.touched', 'yes');
                },
              }),
            ],
          }),
        ],
      });

      await workflow.execute();

      expect(workflow.getState('switch.touched')).toBe('yes');
    });

    it('should share the parent workflow\'s state with a Step default_callable', async () => {
      const defaultStep = new Step({
        name: 'default-step',
        callable: async function () {
          this.setState('default.touched', 'yes');
        },
      });
      const workflow = new Workflow({
        name: 'switch-default-shared-state',
        steps: [
          new SwitchStep({
            subject: 'no-match',
            cases: [
              new Case({ conditional: { operator: '===', value: 'a' }, callable: async () => 'a' }),
            ],
            default_callable: defaultStep,
          }),
        ],
      });

      await workflow.execute();

      expect(workflow.getState('default.touched')).toBe('yes');
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

  describe('prepareForSerialization', () => {
    it('should include class_name "switch"', () => {
      const switchStep = new SwitchStep({});

      expect(switchStep.prepareForSerialization().class_name).toBe('switch');
    });

    it('should serialize the base callable as null, since it is internal wiring', () => {
      const switchStep = new SwitchStep({});

      expect(switchStep.prepareForSerialization().callable).toBeNull();
    });

    it('should serialize each case via its own prepareForSerialization', () => {
      const caseA = new Case({
        conditional: { operator: '===', value: 'a' },
        callable: async () => 'a-result',
      });
      const switchStep = new SwitchStep({ cases: [caseA] });

      expect(switchStep.prepareForSerialization().cases).toEqual([caseA.prepareForSerialization()]);
    });

    it('should serialize default_callable by name when it is a plain function', () => {
      async function defaultBranch() {}
      const switchStep = new SwitchStep({ default_callable: defaultBranch });

      expect(switchStep.prepareForSerialization().default_callable).toEqual({
        type: 'function',
        value: 'defaultBranch',
      });
    });

    it('should serialize a plain subject value, but null out a function subject', () => {
      const staticSwitch = new SwitchStep({ subject: 'static-value' });
      const dynamicSwitch = new SwitchStep({ subject: () => 'dynamic-value' });

      expect(staticSwitch.prepareForSerialization().subject).toBe('static-value');
      expect(dynamicSwitch.prepareForSerialization().subject).toBeNull();
    });
  });

  describe('hydrate / hydrateSerialized', () => {
    it('should round-trip a function-valued subject through the registry', async () => {
      const registry = new CallableRegistry();
      registry.register('getSubject', function getSubject() { return 'b'; });
      registry.register('caseB', async function caseB() { return 'B'; });
      registry.register('fallback', async function fallback() { return 'default'; });

      const original = new SwitchStep({
        subject: registry.get('getSubject'),
        default_callable: registry.get('fallback'),
        cases: [new Case({ conditional: { operator: '===', value: 'b' }, callable: registry.get('caseB') })],
      });

      const serialized = JSON.parse(original.serialize());
      expect(serialized.subject).toBeNull();
      expect(serialized.subject_callable).toEqual({ type: 'function', value: 'getSubject' });

      const hydrated = SwitchStep.hydrate(serialized, registry);
      expect(hydrated.subject).toBe(registry.get('getSubject'));

      await hydrated.execute();
      expect(hydrated.result).toBe('B');
    });

    it('should round-trip and execute the matching case after hydration', async () => {
      const registry = new CallableRegistry();
      registry.register('adminCase', async function adminCase() { return 'admin matched'; });
      registry.register('defaultBranch', async function defaultBranch() { return 'default matched'; });

      const original = new SwitchStep({
        subject: 'admin',
        cases: [
          new Case({
            conditional: { operator: 'array_includes', value: 'admin' },
            callable: registry.get('adminCase'),
          }),
        ],
        default_callable: registry.get('defaultBranch'),
      });

      const hydrated = SwitchStep.hydrate(original.prepareForSerialization(), registry);

      expect(hydrated).toBeInstanceOf(SwitchStep);
      expect(hydrated.id).toBe(original.id);
      expect(hydrated.cases[0]).toBeInstanceOf(Case);

      const result = await hydrated.execute();
      expect(result.result).toBe('admin matched');
    });

    it('should fall through to the default_callable after hydration when no case matches', async () => {
      const registry = new CallableRegistry();
      registry.register('adminCase', async function adminCase() { return 'admin matched'; });
      registry.register('defaultBranch', async function defaultBranch() { return 'default matched'; });

      const original = new SwitchStep({
        subject: 'guest',
        cases: [
          new Case({
            conditional: { operator: 'array_includes', value: 'admin' },
            callable: registry.get('adminCase'),
          }),
        ],
        default_callable: registry.get('defaultBranch'),
      });

      const hydrated = SwitchStep.hydrate(original.prepareForSerialization(), registry);
      const result = await hydrated.execute();

      expect(result.result).toBe('default matched');
    });

    it('should dispatch through Step.hydrateAny to a SwitchStep instance, not a plain Step', () => {
      const registry = new CallableRegistry();
      registry.register('defaultBranch', async function defaultBranch() {});

      const original = new SwitchStep({ default_callable: registry.get('defaultBranch') });

      const hydrated = Step.hydrateAny(original.prepareForSerialization(), registry);

      expect(hydrated.constructor).toBe(SwitchStep);
    });

    it('should throw when the default_callable function is missing from the registry', () => {
      const original = new SwitchStep({
        default_callable: async function unregisteredDefault() {},
      });

      expect(() => SwitchStep.hydrate(original.prepareForSerialization())).toThrow(
        /not found in registry or registry not provided/
      );
    });

    it('should serialize by default_callable_registry_key when set, ignoring the callable\'s own name', async () => {
      const registry = new CallableRegistry();
      registry.register('defaultKey', async function actualName() { return 'default ran'; });

      const original = new SwitchStep({
        default_callable: registry.get('defaultKey'),
        default_callable_registry_key: 'defaultKey',
      });

      const serialized = original.prepareForSerialization();
      expect(serialized.default_callable).toEqual({ type: 'function', value: 'defaultKey' });

      const hydrated = SwitchStep.hydrate(serialized, registry);
      const result = await hydrated.execute();

      expect(result.result).toBe('default ran');
    });
  });
});
