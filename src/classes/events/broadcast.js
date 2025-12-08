/**
 * Broadcast class provides a simplified wrapper around the BroadcastChannel API
 * for cross-context communication (e.g., between tabs, windows, workers).
 * 
 * This class allows you to send and receive messages across different browsing contexts
 * that share the same origin. It encapsulates the creation and management of a BroadcastChannel,
 * providing a simplified API for sending and receiving messages.
 * 
 * @class Broadcast
 * @extends BroadcastChannel
 */
export default class Broadcast extends BroadcastChannel {
  /**
   * Creates a new Broadcast instance for a named channel.
   * 
   * @constructor
   * @param {string} channelName - The name of the broadcast channel to create or connect to.
   * Multiple Broadcast instances with the same channel name can communicate with each other.
   */
  constructor(channelName) {
    super(channelName);
  }

  /**
   * Sends data to all other contexts listening on this channel.
   * 
   * @param {*} data - The data to broadcast. Can be any structured-cloneable value
   * (primitives, objects, arrays, etc.). Functions and DOM nodes cannot be sent.
   * @returns {void}
   */
  send(data) {
    this.postMessage(data);
  }

  /**
   * Registers a callback to handle incoming messages on this channel.
   * 
   * @param {Function} callback - Function to call when a message is received.
   * Receives the message data as its only parameter.
   * @returns {void}
   */
  onReceive(callback) {
    this.onmessage = (event) => {
      callback(event.data);
    };
  }

  /**
   * Closes the broadcast channel and releases its resources.
   * After calling this method, the Broadcast instance can no longer send or receive messages.
   * 
   * @returns {void}
   */
  destroy() {
    this.close();
  }
}
