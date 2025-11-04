/**
 * Utility functions for handling media devices and streams
 */

/**
 * Get user media (camera/microphone)
 * @param {Object} constraints - Media constraints
 * @returns {Promise<MediaStream>} Media stream
 */
export const getUserMedia = async (constraints = { video: true, audio: true }) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw new Error(`Failed to access media devices: ${error.message}`);
  }
};

/**
 * Get display media (screen sharing)
 * @param {Object} constraints - Display media constraints
 * @returns {Promise<MediaStream>} Display media stream
 */
export const getDisplayMedia = async (constraints = { video: true }) => {
  try {
    // Check if display media is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Screen sharing is not supported in this browser');
    }
    
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error accessing display media:', error);
    throw new Error(`Failed to access display media: ${error.message}`);
  }
};

/**
 * Stop all tracks in a media stream
 * @param {MediaStream} stream - Media stream to stop
 */
export const stopMediaStream = (stream) => {
  if (stream && stream.getTracks) {
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        console.warn('Error stopping track:', error);
      }
    });
  }
};

/**
 * Toggle track enabled state
 * @param {MediaStream} stream - Media stream
 * @param {string} kind - Track kind ('audio' or 'video')
 * @param {boolean} enabled - Whether to enable or disable
 */
export const toggleTrack = (stream, kind, enabled) => {
  if (stream && stream.getTracks) {
    const tracks = stream.getTracks().filter(track => track.kind === kind);
    tracks.forEach(track => {
      track.enabled = enabled;
    });
  }
};

/**
 * Check if media devices are available
 * @returns {Promise<boolean>} Whether media devices are available
 */
export const areMediaDevicesAvailable = async () => {
  try {
    // Check if media devices API is available
    if (!navigator.mediaDevices) {
      return false;
    }
    
    // Check if we can enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.length > 0;
  } catch (error) {
    console.warn('Error checking media devices availability:', error);
    return false;
  }
};

/**
 * Get available media devices
 * @returns {Promise<Array>} Array of available media devices
 */
export const getAvailableDevices = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices;
  } catch (error) {
    console.warn('Error enumerating media devices:', error);
    return [];
  }
};

/**
 * Create a media stream from a video element
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {MediaStream} Media stream
 */
export const createStreamFromVideoElement = (videoElement) => {
  if (!videoElement.captureStream) {
    throw new Error('Video element captureStream not supported');
  }
  
  return videoElement.captureStream();
};