import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { buildChannels, hasPermission, requestPermission, scanVideos } from '../data/media';
import { preloadThumbCache } from '../data/thumbs';
import type { Channel, Video } from '../types';

type Status = 'checking' | 'denied' | 'loading' | 'ready';

type LibraryState = {
  status: Status;
  canAskAgain: boolean;
  videos: Video[];
  channels: Channel[];
  byId: Map<string, Video>;
  channelById: Map<string, Channel>;
  refreshing: boolean;
  refresh: () => Promise<void>;
  requestAccess: () => Promise<void>;
};

const Ctx = createContext<LibraryState | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  const scan = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    await preloadThumbCache();
    const list = await scanVideos();
    setVideos(list);
    setStatus('ready');
  }, []);

  const requestAccess = useCallback(async () => {
    try {
      const ok = await requestPermission();
      if (!ok) {
        const p = await hasPermission();
        setCanAskAgain(p.canAskAgain);
        setStatus('denied');
        return;
      }
      await scan();
    } catch {
      setStatus('denied');
    }
  }, [scan]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const p = await hasPermission();
      if (p.granted) await scan();
      else setStatus('denied');
    } finally {
      setRefreshing(false);
    }
  }, [scan]);

  useEffect(() => {
    requestAccess();
  }, [requestAccess]);

  // When the user comes back from system settings, try again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && statusRef.current === 'denied') {
        hasPermission().then((p) => p.granted && scan());
      }
    });
    return () => sub.remove();
  }, [scan]);

  const value = useMemo<LibraryState>(() => {
    const channels = buildChannels(videos);
    return {
      status,
      canAskAgain,
      videos,
      channels,
      byId: new Map(videos.map((v) => [v.id, v])),
      channelById: new Map(channels.map((c) => [c.id, c])),
      refreshing,
      refresh,
      requestAccess,
    };
  }, [status, canAskAgain, videos, refreshing, refresh, requestAccess]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLibrary outside LibraryProvider');
  return v;
}
