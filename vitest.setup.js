import { v4 as uuidv4 } from 'uuid';

// Polyfill crypto.randomUUID for happy-dom environment
if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}

if (typeof global.crypto.randomUUID === 'undefined') {
  global.crypto.randomUUID = uuidv4;
}
