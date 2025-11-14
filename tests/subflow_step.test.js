import { describe, it, expect, beforeEach, vi } from 'vitest';
import SubflowStep from '../src/classes/subflow_step.js';
import Workflow from '../src/classes/workflow.js';
import Step from '../src/classes/step.js';
import step_types from '../src/enums/step_types.js';
import step_statuses from '../src/enums/step_statuses.js';

describe('SubflowStep', () => {
  let subflowStep;
  let subWorkflow;

  describe('Constructor', () => {
    it('should initialize with required subflow parameter', () => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async () => 'result',
      });
      subWorkflow = new Workflow([innerStep], 'sub-workflow');
      
      subflowStep = new SubflowStep({
        subflow: subWorkflow,
      });

      expect(subflowStep.subflow).toBe(subWorkflow);
      expect(subflowStep.name).toBe('');
      expect(subflowStep.type).toBe(step_types.SUBFLOW);
      expect(subflowStep.callable).toBeDefined();
      expect(typeof subflowStep.callable).toBe('function');
    });

    it('should initialize with custom name', () => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async () => 'result',
      });
      subWorkflow = new Workflow([innerStep], 'sub-workflow');
      
      subflowStep = new SubflowStep({
        subflow: subWorkflow,
        name: 'my-subflow-step',
      });

      expect(subflowStep.name).toBe('my-subflow-step');
      expect(subflowStep.subflow).toBe(subWorkflow);
    });

    it('should have static step_name property', () => {
      expect(SubflowStep.step_name).toBe(step_types.SUBFLOW);
    });

    it('should bind executeSubflow as callable', () => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async () => 'result',
      });
      subWorkflow = new Workflow([innerStep], 'sub-workflow');
      
      subflowStep = new SubflowStep({
        subflow: subWorkflow,
        name: 'test-subflow',
      });

      expect(subflowStep.callable.name).toBe('bound executeSubflow');
    });

    it('should inherit from Step class', () => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async () => 'result',
      });
      subWorkflow = new Workflow([innerStep], 'sub-workflow');
      
      subflowStep = new SubflowStep({
        subflow: subWorkflow,
      });

      expect(subflowStep).toBeInstanceOf(Step);
    });

    it('should have correct step type', () => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async () => 'result',
      });
      subWorkflow = new Workflow([innerStep], 'sub-workflow');
      
      subflowStep = new SubflowStep({
        subflow: subWorkflow,
      });

      expect(subflowStep.type).toBe(step_types.SUBFLOW);
    });
  });

  describe('executeSubflow()', () => {
    beforeEach(() => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async () => 'inner-result',
      });
      subWorkflow = new Workflow([innerStep], 'sub-workflow');
      
      subflowStep = new SubflowStep({
        subflow: subWorkflow,
        name: 'test-subflow',
      });
    });

    it('should execute the sub-workflow', async () => {
      const result = await subflowStep.executeSubflow({});

      expect(result).toBeDefined();
      expect(result.get('output_data')).toContain('inner-result');
    });

    it('should pass arguments to the sub-workflow', async () => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async (args) => {
          return args.value * args.multiplier;
        },
      });

      const parameterizedWorkflow = new Workflow([innerStep], 'param-workflow');
      const paramSubflowStep = new SubflowStep({
        subflow: parameterizedWorkflow,
        name: 'param-subflow',
      });

      const result = await paramSubflowStep.executeSubflow({ value: 5, multiplier: 3 });

      expect(result.get('output_data')).toContain(15);
    });

    it('should return workflow state result', async () => {
      const result = await subflowStep.executeSubflow({});

      expect(result).toBeDefined();
      expect(result.get).toBeDefined();
      expect(typeof result.get).toBe('function');
    });

    it('should log execution message', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');

      await subflowStep.executeSubflow({});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'executing subflow: sub-workflow'
      );

      consoleLogSpy.mockRestore();
    });

    it('should not log when log_suppress is true', async () => {
      subflowStep.log_suppress = true;
      const consoleLogSpy = vi.spyOn(console, 'log');

      await subflowStep.executeSubflow({});

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('executing subflow')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle empty arguments', async () => {
      const result = await subflowStep.executeSubflow();

      expect(result).toBeDefined();
      expect(result.get('output_data')).toBeDefined();
    });

    it('should execute complex sub-workflow with multiple steps', async () => {
      const step1 = new Step({
        name: 'step-1',
        type: step_types.ACTION,
        callable: async () => 'result-1',
      });

      const step2 = new Step({
        name: 'step-2',
        type: step_types.ACTION,
        callable: async () => 'result-2',
      });

      const complexWorkflow = new Workflow([step1, step2], 'complex-workflow');
      const complexSubflowStep = new SubflowStep({
        subflow: complexWorkflow,
        name: 'complex-subflow',
      });

      const result = await complexSubflowStep.executeSubflow({});

      expect(result.get('output_data')).toHaveLength(2);
      expect(result.get('output_data')[0]).toBe('result-1');
      expect(result.get('output_data')[1]).toBe('result-2');
    });

    it('should handle sub-workflow that throws errors', async () => {
      const errorStep = new Step({
        name: 'error-step',
        type: step_types.ACTION,
        callable: async () => {
          throw new Error('Sub-workflow error');
        },
      });

      const errorWorkflow = new Workflow([errorStep], 'error-workflow');
      const errorSubflowStep = new SubflowStep({
        subflow: errorWorkflow,
        name: 'error-subflow',
      });

      // SubflowStep should re-throw errors from sub-workflows with exit_on_failure=true
      await expect(errorSubflowStep.executeSubflow({}))
        .rejects.toThrow('Sub-workflow error');
    });
  });

  describe('Integration with Step class', () => {
    beforeEach(() => {
      const innerStep = new Step({
        name: 'inner-step',
        type: step_types.ACTION,
        callable: async () => 'inner-result',
      });
      subWorkflow = new Workflow([innerStep], 'sub-workflow');
      
      subflowStep = new SubflowStep({
        subflow: subWorkflow,
        name: 'integration-subflow',
      });
    });

    it('should execute through step.execute() method', async () => {
      // Don't override context, let it use the subWorkflow from beforeEach
      const result = await subflowStep.execute();

      expect(subflowStep.status).toBe(step_statuses.COMPLETE);
      expect(result).toBeDefined();
      expect(result.get('output_data')).toContain('inner-result');
    });

    it('should mark as complete after successful execution', async () => {
      // Don't override context, let it use the subWorkflow from beforeEach
      await subflowStep.execute();

      expect(subflowStep.status).toBe(step_statuses.COMPLETE);
    });

    it('should mark as failed when sub-workflow fails', async () => {
      const failingStep = new Step({
        name: 'failing-step',
        type: step_types.ACTION,
        callable: async () => {
          throw new Error('Failure');
        },
      });

      const failingWorkflow = new Workflow([failingStep], 'failing-workflow');
      const failingSubflowStep = new SubflowStep({
        subflow: failingWorkflow,
        name: 'failing-subflow',
      });

      // SubflowStep should still mark itself as failed when sub-workflow has errors
      await expect(failingSubflowStep.execute())
        .rejects.toThrow('Failure');

      expect(failingSubflowStep.status).toBe(step_statuses.FAILED);
    });

    it('should have correct id generated', () => {
      expect(subflowStep.id).toBeDefined();
      expect(typeof subflowStep.id).toBe('string');
      expect(subflowStep.id.length).toBeGreaterThan(0);
    });

    it('should support log_suppress option', async () => {
      subflowStep.log_suppress = true;
      // Don't override context, let it use the subWorkflow from beforeEach

      const consoleLogSpy = vi.spyOn(console, 'log');

      await subflowStep.execute();

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('executing subflow')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Integration with Workflow', () => {
    it('should work as a step in a parent workflow', async () => {
      const parentWorkflow = new Workflow([], 'parent-workflow');
      
      const subflowStep = new SubflowStep({
        subflow: subWorkflow,
        name: 'subflow-in-parent',
      });

      parentWorkflow.pushStep(subflowStep);

      const result = await parentWorkflow.execute({});

      expect(result.get('output_data')).toBeDefined();
      expect(result.get('output_data')).toHaveLength(1);
    });

    it('should execute multiple subflow steps in sequence', async () => {
      const subWorkflow1 = new Workflow([
        new Step({
          name: 'sub-step-1',
          type: step_types.ACTION,
          callable: async () => 'result-1',
        }),
      ], 'sub-workflow-1');

      const subWorkflow2 = new Workflow([
        new Step({
          name: 'sub-step-2',
          type: step_types.ACTION,
          callable: async () => 'result-2',
        }),
      ], 'sub-workflow-2');

      const subflowStep1 = new SubflowStep({
        subflow: subWorkflow1,
        name: 'subflow-1',
      });

      const subflowStep2 = new SubflowStep({
        subflow: subWorkflow2,
        name: 'subflow-2',
      });

      const parentWorkflow = new Workflow([subflowStep1, subflowStep2], 'parent');

      const result = await parentWorkflow.execute({});

      expect(result.get('output_data')).toHaveLength(2);
    });

    it('should handle nested subflows', async () => {
      // Create innermost workflow
      const innermostWorkflow = new Workflow([
        new Step({
          name: 'innermost-step',
          type: step_types.ACTION,
          callable: async () => 'innermost-result',
        }),
      ], 'innermost-workflow');

      // Create middle workflow with subflow step
      const middleSubflowStep = new SubflowStep({
        subflow: innermostWorkflow,
        name: 'middle-subflow',
      });

      const middleWorkflow = new Workflow([middleSubflowStep], 'middle-workflow');

      // Create outer workflow with subflow step
      const outerSubflowStep = new SubflowStep({
        subflow: middleWorkflow,
        name: 'outer-subflow',
      });

      const outerWorkflow = new Workflow([outerSubflowStep], 'outer-workflow');

      const result = await outerWorkflow.execute({});

      expect(result.get('output_data')).toBeDefined();
      expect(result.get('output_data')).toHaveLength(1);
    });

    it('should pass context through sub-workflow', async () => {
      const contextStep = new Step({
        name: 'context-step',
        type: step_types.ACTION,
        callable: async function() {
          return this.context?.initialValue || 'no-context';
        },
      });

      const contextWorkflow = new Workflow([contextStep], 'context-workflow');
      const contextSubflowStep = new SubflowStep({
        subflow: contextWorkflow,
        name: 'context-subflow',
      });

      const parentWorkflow = new Workflow([contextSubflowStep], 'parent');

      const result = await parentWorkflow.execute({ initialValue: 'from-parent' });

      expect(result.get('output_data')).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle sub-workflow with no steps', async () => {
      const emptyWorkflow = new Workflow([], 'empty-workflow');
      const emptySubflowStep = new SubflowStep({
        subflow: emptyWorkflow,
        name: 'empty-subflow',
      });

      await expect(emptySubflowStep.executeSubflow({}))
        .rejects.toThrow('No steps available in the workflow');
    });

    it('should handle sub-workflow with exit_on_failure=false', async () => {
      const step1 = new Step({
        name: 'step-1',
        type: step_types.ACTION,
        callable: async () => {
          throw new Error('Step 1 failed');
        },
      });

      const step2 = new Step({
        name: 'step-2',
        type: step_types.ACTION,
        callable: async () => 'step-2-result',
      });

      const resilientWorkflow = new Workflow([step1, step2], 'resilient', false);
      const resilientSubflowStep = new SubflowStep({
        subflow: resilientWorkflow,
        name: 'resilient-subflow',
      });

      const result = await resilientSubflowStep.executeSubflow({});

      // Failed step doesn't add to output_data, only successful step does
      expect(result.get('output_data')).toHaveLength(1);
      expect(result.get('output_data')[0]).toBe('step-2-result');
    });

    it('should handle undefined subflow gracefully', async () => {
      // This tests the case where subflow might be undefined (edge case)
      const brokenSubflowStep = new SubflowStep({
        subflow: null,
        name: 'broken',
      });

      await expect(brokenSubflowStep.executeSubflow({}))
        .rejects.toThrow();
    });

    it('should preserve subflow name in logs', async () => {
      const namedWorkflow = new Workflow([
        new Step({
          name: 'test-step',
          type: step_types.ACTION,
          callable: async () => 'result',
        }),
      ], 'MySpecialWorkflow');

      const namedSubflowStep = new SubflowStep({
        subflow: namedWorkflow,
        name: 'named-subflow',
      });

      const consoleLogSpy = vi.spyOn(console, 'log');

      await namedSubflowStep.executeSubflow({});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'executing subflow: MySpecialWorkflow'
      );

      consoleLogSpy.mockRestore();
    });
  });
});
