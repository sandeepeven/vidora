import type { BufferOptions } from 'expo-video';

/**
 * expo-video's Android default lets each player buffer up to ~128 MB on the Java heap.
 * High-bitrate phone recordings hit that fast, and Shorts keeps several players alive,
 * so the app runs out of memory. Files are local, so a few seconds of buffer is plenty.
 */
export const LOCAL_BUFFER: BufferOptions = {
  preferredForwardBufferDuration: 5,
  minBufferForPlayback: 1,
  maxBufferBytes: 16 * 1024 * 1024,
};
