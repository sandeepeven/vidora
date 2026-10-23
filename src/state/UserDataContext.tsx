import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Comment, Reaction, UserData } from '../types';
import { uid } from '../utils/format';

const KEY = 'vidora:userdata:v1';

const initial: UserData = {
  profileName: 'You',
  reactions: {},
  views: {},
  comments: {},
  history: [],
  watchLater: [],
  subscriptions: [],
  positions: {},
  searches: [],
  autoplay: true,
};

type Actions = {
  setReaction: (videoId: string, r: Reaction | null) => void;
  addView: (videoId: string) => void;
  addHistory: (videoId: string) => void;
  removeHistory: (videoId: string) => void;
  clearHistory: () => void;
  toggleWatchLater: (videoId: string) => boolean;
  toggleSubscribe: (channelId: string) => boolean;
  savePosition: (videoId: string, seconds: number, duration: number) => void;
  addComment: (videoId: string, text: string, parentId?: string) => void;
  deleteComment: (videoId: string, commentId: string) => void;
  setCommentReaction: (videoId: string, commentId: string, r: Reaction | null) => void;
  addSearch: (q: string) => void;
  removeSearch: (q: string) => void;
  setProfileName: (name: string) => void;
  setAutoplay: (on: boolean) => void;
  resetAll: () => void;
};

type Ctx = { data: UserData; loaded: boolean } & Actions;

const UserDataCtx = createContext<Ctx | null>(null);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<UserData>(initial);
  const [loaded, setLoaded] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setData({ ...initial, ...JSON.parse(raw) });
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [data, loaded]);

  const actions = useMemo<Actions>(() => {
    const update = (fn: (d: UserData) => UserData) => setData((d) => fn(d));
    const mapComments = (d: UserData, videoId: string, fn: (list: Comment[]) => Comment[]): UserData => ({
      ...d,
      comments: { ...d.comments, [videoId]: fn(d.comments[videoId] ?? []) },
    });

    return {
      setReaction: (videoId, r) =>
        update((d) => {
          const reactions = { ...d.reactions };
          if (r) reactions[videoId] = r;
          else delete reactions[videoId];
          return { ...d, reactions };
        }),
      addView: (videoId) =>
        update((d) => ({ ...d, views: { ...d.views, [videoId]: (d.views[videoId] ?? 0) + 1 } })),
      addHistory: (videoId) =>
        update((d) => ({
          ...d,
          history: [{ id: videoId, at: Date.now() }, ...d.history.filter((h) => h.id !== videoId)].slice(0, 500),
        })),
      removeHistory: (videoId) =>
        update((d) => ({ ...d, history: d.history.filter((h) => h.id !== videoId) })),
      clearHistory: () => update((d) => ({ ...d, history: [], positions: {} })),
      toggleWatchLater: (videoId) => {
        const has = dataRef.current.watchLater.includes(videoId);
        update((d) => ({
          ...d,
          watchLater: has ? d.watchLater.filter((x) => x !== videoId) : [videoId, ...d.watchLater],
        }));
        return !has;
      },
      toggleSubscribe: (channelId) => {
        const has = dataRef.current.subscriptions.includes(channelId);
        update((d) => ({
          ...d,
          subscriptions: has ? d.subscriptions.filter((x) => x !== channelId) : [channelId, ...d.subscriptions],
        }));
        return !has;
      },
      savePosition: (videoId, seconds, duration) =>
        update((d) => {
          const positions = { ...d.positions };
          if (seconds < 3 || (duration > 0 && seconds > duration - 5)) delete positions[videoId];
          else positions[videoId] = Math.floor(seconds);
          return { ...d, positions };
        }),
      addComment: (videoId, text, parentId) =>
        update((d) =>
          mapComments(d, videoId, (list) => [
            { id: uid(), videoId, parentId, author: d.profileName, text: text.trim(), createdAt: Date.now() },
            ...list,
          ]),
        ),
      deleteComment: (videoId, commentId) =>
        update((d) => mapComments(d, videoId, (list) => list.filter((c) => c.id !== commentId && c.parentId !== commentId))),
      setCommentReaction: (videoId, commentId, r) =>
        update((d) =>
          mapComments(d, videoId, (list) => list.map((c) => (c.id === commentId ? { ...c, reaction: r ?? undefined } : c))),
        ),
      addSearch: (q) =>
        update((d) => {
          const t = q.trim();
          if (!t) return d;
          return { ...d, searches: [t, ...d.searches.filter((s) => s.toLowerCase() !== t.toLowerCase())].slice(0, 20) };
        }),
      removeSearch: (q) => update((d) => ({ ...d, searches: d.searches.filter((s) => s !== q) })),
      setProfileName: (name) => update((d) => ({ ...d, profileName: name.trim() || 'You' })),
      setAutoplay: (on) => update((d) => ({ ...d, autoplay: on })),
      resetAll: () => setData(initial),
    };
  }, []);

  const value = useMemo<Ctx>(() => ({ data, loaded, ...actions }), [data, loaded, actions]);
  return <UserDataCtx.Provider value={value}>{children}</UserDataCtx.Provider>;
}

export function useUserData() {
  const v = useContext(UserDataCtx);
  if (!v) throw new Error('useUserData outside UserDataProvider');
  return v;
}
