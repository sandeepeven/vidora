import * as MediaLibrary from 'expo-media-library';
import type { Channel, Video } from '../types';

export async function hasPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  const p = await MediaLibrary.getPermissionsAsync(false, ['video']);
  return { granted: p.granted, canAskAgain: p.canAskAgain };
}

export async function requestPermission(): Promise<boolean> {
  const cur = await MediaLibrary.getPermissionsAsync(false, ['video']);
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const res = await MediaLibrary.requestPermissionsAsync(false, ['video']);
  return res.granted;
}

function parsePath(uri: string) {
  let path = uri.replace(/^file:\/\//, '');
  try {
    path = decodeURIComponent(path);
  } catch {
    // keep raw path
  }
  const parts = path.split('/').filter(Boolean);
  const folderParts = parts.slice(0, -1);
  const folder = folderParts[folderParts.length - 1] || 'Videos';
  return { path, folder, folderPath: '/' + folderParts.join('/') };
}

function prettyTitle(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base || filename;
}

function prettyChannel(folder: string): string {
  if (/^0$|^emulated$/i.test(folder)) return 'Internal storage';
  return folder.replace(/[_]+/g, ' ');
}

/** Scans every video MediaStore knows about. Each folder becomes a "channel". */
export async function scanVideos(): Promise<Video[]> {
  const out: Video[] = [];
  let after: string | undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.video,
      first: 500,
      after,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    for (const a of page.assets) {
      const { path, folder, folderPath } = parsePath(a.uri);
      out.push({
        id: a.id,
        uri: a.uri,
        path,
        filename: a.filename,
        title: prettyTitle(a.filename),
        duration: a.duration || 0,
        width: a.width || 0,
        height: a.height || 0,
        createdAt: a.creationTime || a.modificationTime || Date.now(),
        channelId: 'ch:' + folderPath,
        channelName: prettyChannel(folder),
        folderPath,
      });
    }
    if (!page.hasNextPage) break;
    after = page.endCursor;
  }
  return out;
}

export function buildChannels(videos: Video[]): Channel[] {
  const map = new Map<string, Channel>();
  for (const v of videos) {
    const c = map.get(v.channelId);
    if (c) {
      c.videoCount++;
      c.latest = Math.max(c.latest, v.createdAt);
    } else {
      map.set(v.channelId, {
        id: v.channelId,
        name: v.channelName,
        folderPath: v.folderPath,
        videoCount: 1,
        latest: v.createdAt,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.latest - a.latest);
}
