import { isAfter } from 'date-fns';
import schedule from 'node-schedule';
import Event from '../classes/event.js';

/**
 * Delays execution until a specific timestamp is reached using node-schedule.
 * Emits a 'delay_complete' event when the delay completes.
 * 
 * @async
 * @param {number|Date} fire_time - The target timestamp in milliseconds or a Date object.
 * @param {Event} [events=new Event()] - Optional Event instance for emitting events.
 * @returns {Promise<number>} A promise that resolves with the fire_time when the delay completes.
 * 
 * @example
 * const targetTime = Date.now() + 10000; // 10 seconds from now
 * await delay_cron(targetTime);
 * console.log('Delay completed');
 * 
 * @example
 * const events = new Event();
 * events.on('delay_complete', (data) => console.log('Fired at:', data.timestamp));
 * await delay_cron(Date.now() + 5000, events);
 */
const delay_cron = async (fire_time, events = new Event()) => {
  return new Promise((resolve, reject) => {
    let target_date;
    
    if (fire_time instanceof Date) {
      target_date = fire_time;
    } else if (typeof fire_time === 'number') {
      target_date = new Date(fire_time);
    } else {
      reject(new Error('Invalid fire_time format. Must be a number (timestamp) or Date object'));
      return;
    }

    if (!isAfter(target_date, new Date())) {
      events.emit('delay_complete', {
        timestamp: target_date,
        message: 'Timestamp is in the past, firing immediately'
      });
      resolve(fire_time);
      return;
    }

    const callback = () => {
      events.emit('delay_complete', {
        timestamp: target_date
      });
      resolve(fire_time);
    };

    const job = schedule.scheduleJob(target_date, callback);

    if (!job) {
      reject(new Error('Failed to schedule job'));
    }
  });
}

export default delay_cron;
