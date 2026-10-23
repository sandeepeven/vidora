import * as Sharing from 'expo-sharing';
import type { Video } from '../types';

export async function shareVideo(v: Video): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    const uri = v.uri.startsWith('file://') ? v.uri : 'file://' + v.path;
    await Sharing.shareAsync(uri, { mimeType: 'video/*', dialogTitle: v.title });
    return true;
  } catch {
    return false;
  }
}
