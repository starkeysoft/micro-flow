/**
 * Creates a deep clone of a value, handling circular references and various built-in types.
 * NOTE: Functions, WeakMaps, and WeakSets are returned by reference (not cloned).
 * 
 * @param {*} value - The value to clone. Can be any JavaScript value including primitives,
 *                    objects, arrays, and built-in types.
 * @param {WeakMap} [hash=new WeakMap()] - Internal cache for tracking circular references.
 *                                          Should not be provided by external callers.
 * 
 * @returns {*} A deep clone of the input value with the following behaviors:
 *              - Primitives and null/undefined are returned as-is
 *              - Objects and arrays are recursively cloned
 *              - Dates and RegExps are cloned with their state preserved
 *              - Maps and Sets are deeply cloned (both keys/values are cloned)
 *              - Functions, WeakMaps, and WeakSets are returned by reference (not cloned)
 *              - Circular references are handled correctly
 * 
 * @example
 * const obj = { a: 1, b: { c: 2 } };
 * const cloned = deep_clone(obj);
 * cloned.b.c = 3;
 * console.log(obj.b.c); // 2 (original unchanged)
 */
function deep_clone(value, hash = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (hash.has(value)) {
    return hash.get(value);
  }

  if (value instanceof Date) {
    return new Date(value);
  }
  if (value instanceof RegExp) {
    return new RegExp(value);
  }

  if (typeof value === 'function' || value instanceof WeakMap || value instanceof WeakSet) {
    return value;
  }

  let clone;
  if (value instanceof Map) {
    clone = new Map();
    hash.set(value, clone);
    for (const [key, val] of value.entries()) {
      clone.set(deep_clone(key, hash), deep_clone(val, hash));
    }
    return clone;
  }
  if (value instanceof Set) {
    clone = new Set();
    hash.set(value, clone);
    for (const val of value.values()) {
      clone.add(deep_clone(val, hash));
    }
    return clone;
  }

  clone = Array.isArray(value) ? [] : {};

  hash.set(value, clone);

  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      clone[key] = deep_clone(value[key], hash);
    }
  }

  return clone;
}

export default deep_clone;
