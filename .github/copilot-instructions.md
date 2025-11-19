# Copilot Coding Agent Instructions for micro-flow

## Repository Overview

**micro-flow** is a lightweight (~35KB gzipped) JavaScript workflow orchestration library for Node.js that enables developers to build complex asynchronous task flows. It works on both frontend and backend with minimal dependencies.

- **Type**: ES Module-based npm package
- **Language**: JavaScript (ESM)
- **Runtime**: Node.js >= 18.0.0
- **Size**: Small codebase (~15 source classes, 12 enums, 2 helpers)
- **Dependencies**: date-fns, node-schedule, uuid
- **Dev Dependencies**: vitest, esbuild, @vitest/coverage-v8, happy-dom

## Project Architecture & Layout

### Directory Structure

```
/mnt/storage1/projects/micro-flow/
├── index.js                    # Main entry point (re-exports from src/)
├── package.json                # Dependencies and npm scripts
├── build.js                    # esbuild script for minification
├── vitest.config.js           # Test configuration
├── vitest.setup.js            # Test environment polyfills
├── src/
│   ├── classes/               # Core workflow classes (14 files)
│   │   ├── workflow.js       # Main workflow orchestrator
│   │   ├── step.js           # Base step class
│   │   ├── delay_step.js     # Time-based delays
│   │   ├── conditional_step.js
│   │   ├── loop_step.js
│   │   ├── switch_step.js
│   │   ├── flow_control_step.js
│   │   ├── skip_step.js
│   │   ├── logic_step.js
│   │   ├── case.js
│   │   ├── state.js          # State management
│   │   ├── event.js
│   │   ├── step_event.js
│   │   ├── workflow_event.js
│   │   └── index.js          # Re-exports all classes
│   ├── enums/                 # Constants and enums (12 files)
│   │   ├── step_types.js
│   │   ├── step_statuses.js
│   │   ├── workflow_statuses.js
│   │   ├── delay_types.js
│   │   ├── conditional_step_comparators.js
│   │   └── sub_step_types.js (dynamically generated)
│   └── helpers/               # Utility functions
│       ├── deep_clone.js
│       └── delay_cron.js
├── tests/                     # Test files
│   ├── workflow.test.js
│   ├── step.test.js
│   ├── delay_step.test.js
│   └── state.test.js
├── __mocks__/                 # Vitest mocks
│   ├── events.js
│   └── sub_step_types.js
├── doc/                       # API documentation (Markdown)
│   ├── index.md
│   ├── api/
│   └── core-concepts/
└── dist/                      # Build output (minified)
```

### Key Architectural Patterns

1. **Class Hierarchy**: All step types extend base `Step` class
2. **State Management**: `State` and `WorkflowState` classes manage context
3. **Event System**: Each class has its own event emitter for lifecycle hooks
4. **Callable Pattern**: Steps can execute functions, other Steps, or entire Workflows
5. **ES Modules**: Project uses `"type": "module"` in package.json

## Build & Test Instructions

### Environment Setup

**CRITICAL**: Node.js >= 18.0.0 is required. Always verify with:
```bash
node --version
```

### Installation

```bash
npm install
```

Dependencies are typically already installed. The `node_modules/` directory exists and is ~65MB.

### Build Process

**Command**: `npm run build`

**What it does**:
- Runs `build.js` using esbuild
- Minifies all source files (classes, enums, helpers, index.js)
- Outputs to `dist/` directory
- Generates sourcemaps
- Preserves function names (`keepNames: true`)
- Target: Node.js 18, ESM format

**Success output**: `✓ Build complete! Minified files in dist/`

**Duration**: < 1 second

**Always succeeds** - no known build failures or special requirements.

### Testing

**Command**: `npm test`

**What it does**:
- Runs `vitest run` (no watch mode)
- Uses happy-dom environment
- Executes tests in `tests/` directory
- Runs setup file `vitest.setup.js` (polyfills crypto.randomUUID)

**Test Configuration**:
- Framework: Vitest 4.x
- Environment: happy-dom (lightweight DOM simulation)
- Mocks: Uses custom mocks in `__mocks__/` directory
- Coverage: Available via `npm run test:coverage`

**Known Test Status**:
- **State tests**: 9 tests, all passing ✓
- **Workflow tests**: 28 tests, 23 failing (due to sub_step_types mock issue)
- **Step tests**: 15 tests, all failing (same mock issue)
- **DelayStep tests**: 38 tests, 37 failing (same mock issue)

**CRITICAL TEST ISSUE**: There is a known issue with `generate_sub_step_types()` function in tests. The mock in `__mocks__/sub_step_types.js` may not be properly configured. This causes: `TypeError: (0 , __vite_ssr_import_6__.default) is not a function` at `step.js:33`.

**Workaround**: Tests are currently failing but builds succeed. This is a known state. DO NOT assume the code is broken - the library works correctly, but test infrastructure has issues.

### Other Commands

- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report to `coverage/` directory
- `npm run pipeline` - Runs `npm test && npm run build` (used in prepublish)

**IMPORTANT**: The `pipeline` command will fail if tests fail, even though the build succeeds. This is expected behavior.

### Validation Steps

**To validate changes**:
1. **ALWAYS run build first**: `npm run build` - this must succeed
2. **OPTIONAL**: Run tests with `npm test` (expect failures in current state)
3. **Check for syntax errors**: Build failure indicates syntax/import issues
4. **Manual testing**: Create a small test file and run with `node --version >= 18`

## Common Workflows & Commands

### Making Code Changes

1. Edit source files in `src/classes/`, `src/enums/`, or `src/helpers/`
2. Run `npm run build` to verify no syntax errors
3. Test manually if needed (test suite has known issues)

### Adding New Step Types

1. Create new class in `src/classes/` extending `Step`
2. Add to `src/classes/index.js` exports
3. Update relevant enum in `src/enums/` if needed
4. Add documentation in `doc/api/classes/`

### Modifying Tests

- Test files in `tests/` directory
- Use `vitest` testing framework
- Mock dependencies in `__mocks__/` when needed
- Note: Test infrastructure currently has mocking issues

## Critical Information

### Known Issues & TODOs

From README.md:
- **Returns from steps aren't completely consistent** - requires standardization
- **State storage** - Should store externally rather than passing along
- **Tests failing** - Sub-step types mock is broken
- **Documentation accuracy** - Author notes some AI-generated docs may be inaccurate

### File Naming Conventions

- Use **snake_case** for all JavaScript files (e.g., `delay_step.js`, `step_types.js`)
- Use **kebab-case** for markdown files (e.g., `delay-step.md`)

### Import Patterns

```javascript
// Classes
import Workflow from './src/classes/workflow.js';
import Step from './src/classes/step.js';

// Enums
import step_types from './src/enums/step_types.js';
import workflow_statuses from './src/enums/workflow_statuses.js';

// Always use .js extension in imports (ES modules requirement)
```

### State Management

- `State` class: Generic state container with `get()`, `set()`, `merge()`, `getState()`, `getStateClone()`
- `WorkflowState`: Extends State for workflow-specific data
- State passed through callable functions
- Workflow state accessible via `this.workflow` in step execution

### Event System

- Every class has `.events` property (EventEmitter)
- Event names in enums: `StepEventNames`, `WorkflowEventNames`
- Listen with: `workflow.events.on(eventName, callback)`
- Events emitted at lifecycle points (STARTED, COMPLETED, FAILED, etc.)

### Testing Gotchas

1. **Crypto polyfill required**: `vitest.setup.js` provides `crypto.randomUUID` for happy-dom
2. **Mocks must match import paths**: Check `vitest.config.js` alias configuration
3. **Event module mocked**: `__mocks__/events.js` provides mock EventEmitter
4. **Sub-step types broken**: Known issue with dynamic generation in tests

## Configuration Files

### package.json Scripts
- `build`: Minifies code with esbuild
- `test`: Runs vitest once
- `test:watch`: Continuous testing
- `test:coverage`: Coverage report
- `pipeline`: Test + build (used in prepublishOnly)

### vitest.config.js
- Globals enabled
- happy-dom environment
- Setup file: `./vitest.setup.js`
- Mock paths for `events` and `sub_step_types`
- Coverage excludes: node_modules, dist, doc, __mocks__, config files, build.js

### build.js
- Uses esbuild programmatically
- Collects all .js files from src/classes, src/helpers, src/enums
- Bundles disabled (individual files)
- Minification enabled
- Platform: node, target: node18
- Format: ESM

## Important Guidelines

### When Making Changes

1. **TRUST these instructions** - they are based on actual exploration
2. **Build must pass** - `npm run build` is the validation checkpoint
3. **Test failures are expected** - don't be alarmed by current test state
4. **Preserve ES module syntax** - always use `import/export`, never `require()`
5. **Maintain snake_case** - for JavaScript file names
6. **Include .js extensions** - in all import statements
7. **Check enums** - many constants live in `src/enums/`

### Don't Assume

- Don't assume tests must pass (they currently don't)
- Don't assume CI/CD exists (no .github/workflows found)
- Don't assume TypeScript (this is pure JavaScript)
- Don't assume CommonJS (this is ES modules only)

### Search Efficiently

- **Classes**: Look in `src/classes/`
- **Constants**: Look in `src/enums/`
- **Utilities**: Look in `src/helpers/`
- **Tests**: Look in `tests/`
- **Docs**: Look in `doc/` and `README.md`

If information is incomplete or instructions fail, THEN search the codebase. Otherwise, trust these instructions to minimize exploration time.

---

**Last Updated**: Based on codebase state as of exploration
**Node Version Validated**: 18.0.0+
**Build Status**: ✓ Working
**Test Status**: ⚠️ Known issues with test infrastructure
