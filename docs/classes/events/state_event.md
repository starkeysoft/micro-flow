# StateEvent

Coordinate and react to state-specific mutations. `StateEvent` extends the base `Event` class to provide specialized triggers whenever state operations (set, delete, merge) occur.

Extends: [Event](event.md)

## Constructor

### `new StateEvent()`

Initializes a new StateEvent instance and registers all standard state triggers.

## Available Events

The StateEvent class automatically registers triggers for:
- `set` - Emitted when a property is created or updated.
- `deleted` - Emitted when a property is removed.
- `merge` - Emitted when an object is merged into the state.
- `reset` - Emitted when the state is restored to defaults.
- `frozen` - Emitted when the state becomes immutable.

## Common Patterns

### Monitor State Changes
```javascript
const stateEvents = State.get('events.state');

stateEvents.on('set', (data) => {
  console.log('State updated:', data.state);
});
```

### Persistence (Browser)
Save the global state to `localStorage` automatically whenever a mutation occurs:

```javascript
State.get('events.state').on('set', (data) => {
  localStorage.setItem('app_state', JSON.stringify(data.state));
});
```
