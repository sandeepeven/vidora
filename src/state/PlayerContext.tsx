import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type PlayerCtx = {
  /** Video shown in the watch overlay, or null when nothing is open. */
  videoId: string | null;
  minimized: boolean;
  /** Plays a video. `expand: false` swaps it in without changing the player size (autoplay). */
  open: (id: string, expand?: boolean) => void;
  minimize: () => void;
  expand: () => void;
  close: () => void;
};

const Ctx = createContext<PlayerCtx>({
  videoId: null,
  minimized: false,
  open: () => undefined,
  minimize: () => undefined,
  expand: () => undefined,
  close: () => undefined,
});

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const open = useCallback((id: string, expand = true) => {
    setVideoId(id);
    if (expand) setMinimized(false);
  }, []);
  const minimize = useCallback(() => setMinimized(true), []);
  const expand = useCallback(() => setMinimized(false), []);
  const close = useCallback(() => {
    setVideoId(null);
    setMinimized(false);
  }, []);

  const value = useMemo(
    () => ({ videoId, minimized, open, minimize, expand, close }),
    [videoId, minimized, open, minimize, expand, close],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePlayer = () => useContext(Ctx);
