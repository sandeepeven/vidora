export type Video = {
  id: string;
  uri: string;
  path: string;
  filename: string;
  title: string;
  /** seconds */
  duration: number;
  width: number;
  height: number;
  /** ms epoch */
  createdAt: number;
  channelId: string;
  channelName: string;
  folderPath: string;
};

export type Channel = {
  id: string;
  name: string;
  folderPath: string;
  videoCount: number;
  latest: number;
};

export type Reaction = 'like' | 'dislike';

export type Comment = {
  id: string;
  videoId: string;
  parentId?: string;
  author: string;
  text: string;
  createdAt: number;
  reaction?: Reaction;
};

export type HistoryEntry = { id: string; at: number };

export type UserData = {
  profileName: string;
  reactions: Record<string, Reaction>;
  views: Record<string, number>;
  comments: Record<string, Comment[]>;
  history: HistoryEntry[];
  watchLater: string[];
  subscriptions: string[];
  /** last playback position in seconds */
  positions: Record<string, number>;
  searches: string[];
  autoplay: boolean;
};

export const isShort = (v: Video) => v.duration <= 60 || v.height > v.width;
