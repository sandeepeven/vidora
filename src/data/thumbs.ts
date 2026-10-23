import AsyncStorage from '@react-native-async-storage/async-storage';
import * as VideoThumbnails from 'expo-video-thumbnails';
import type { Video } from '../types';

const KEY = 'vidora:thumbs:v1';
const MAX_PARALLEL = 3;

let cache: Record<string, string> = {};
let loadPromise: Promise<void> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function preloadThumbCache(): Promise<void> {
  if (loadPromise) return loadPromise;
  const p = AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw) cache = JSON.parse(raw);
    })
    .catch(() => undefined);
  loadPromise = p;
  return p;
}

export function peekThumb(id: string): string | null {
  return cache[id] ?? null;
}

export async function clearThumbCache() {
  cache = {};
  await AsyncStorage.removeItem(KEY);
}

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(cache)).catch(() => undefined);
  }, 800);
}

let active = 0;
const queue: (() => void)[] = [];
function limited<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--;
          queue.shift()?.();
        });
    };
    if (active < MAX_PARALLEL) run();
    else queue.push(run);
  });
}

const inflight = new Map<string, Promise<string | null>>();

/** Returns a cached frame for the video, generating one on first use. */
export async function getThumb(v: Video, force = false): Promise<string | null> {
  await preloadThumbCache();
  if (!force && cache[v.id]) return cache[v.id];
  const pending = inflight.get(v.id);
  if (pending) return pending;

  const p = limited(async () => {
    try {
      const time = Math.max(0, Math.min(4000, Math.floor(v.duration * 1000 * 0.2)));
      const res = await VideoThumbnails.getThumbnailAsync(v.uri, { time, quality: 0.6 });
      cache[v.id] = res.uri;
      persist();
      return res.uri;
    } catch {
      return null;
    }
  }).finally(() => inflight.delete(v.id));

  inflight.set(v.id, p);
  return p;
}
