/**
 * Provides a registry for callable functions to be used with persistence mode.
 * This class allows you to register, retrieve, check for, and deregister callable functions by name.
 */
export default class CallableRegistry {
  #registry;

  /**
   * Registry for callable functions to be used with persistence mode.
   */
  constructor() {
    this.clear();
  }

  /**
   * Clears all callable entries from the registry.
   */
  clear() {
    this.#registry = {};
  }

  /**
   * Removes a callable from the registry.
   * @param {string} name - The name of the callable to remove.
   * @throws Will throw an error if no callable is registered under the given name.
   */
  deregister(name) {
    if (!this.has(name)) {
      throw new Error(`No callable registered under the name "${name}".`);
    }

    delete this.#registry[name];
  }

  /**
   * Retrieves a callable from the registry.
   * @param {string} name - The name of the callable to retrieve.
   * @returns {Function} The callable function registered under the given name.
   * @throws Will throw an error if no callable is registered under the given name.
   */
  get(name) {
    if (!this.has(name)) {
      throw new Error(`No callable registered under the name "${name}".`);
    }

    return this.#registry[name];
  }

  /**
   * Checks if a callable is registered under the given name.
   * @param {string} name - The name of the callable to check.
   * @returns {boolean} True if a callable is registered under the given name, false otherwise.
   */
  has(name) {
    return Object.hasOwn(this.#registry, name);
  }

  /**
   * Registers a callable function under a given name.
   * @param {string} name - The name to register the callable under.
   * @param {Function} callable - The function to register as a callable.
   * @throws Will throw an error if the provided callable is not a function.
   */
  register(name, callable) {
    if (typeof callable !== 'function') {
      throw new Error('Only functions can be registered as callables.');
    }

    this.#registry[name] = callable;
  }

  /**
   * Registers multiple callables from an object mapping names to functions.
   * @param {Object} callables - An object where keys are names and values are functions to register.
   * @throws Will throw an error if any of the provided callables is not a function.
   */
  registerMany(callables) {
    for (const [name, callable] of Object.entries(callables)) {
      this.register(name, callable);
    }
  }
}
