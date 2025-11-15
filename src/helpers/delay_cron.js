/**
 * Delays execution until a specific timestamp is reached using a polling mechanism.
 * Checks every second (1000ms) if the target time has been reached.
 * 
 * @async
 * @param {number} fire_time - The target timestamp in milliseconds (e.g., Date.now() + 5000).
 * @returns {Promise<number>} A promise that resolves with the fire_time when the delay completes.
 * 
 * @example
 * const targetTime = Date.now() + 10000; // 10 seconds from now
 * await delay_cron(targetTime);
 * console.log('Delay completed');
 */
const delay_cron = async (fire_time) => {
  while (Date.now() < fire_time) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return fire_time;
}

export default delay_cron;
