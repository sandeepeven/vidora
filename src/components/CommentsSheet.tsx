import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import type { Comment } from '../types';
import { handleFor, timeAgo } from '../utils/format';
import { Avatar } from './Avatar';
import { Chips } from './Common';
import { Sheet } from './Sheet';

type Sort = 'top' | 'newest';

export function CommentsSheet({ videoId, visible, onClose }: { videoId: string; visible: boolean; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const { data, addComment } = useUserData();
  const [text, setText] = useState('');
  const [sort, setSort] = useState<Sort>('top');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const input = useRef<TextInput>(null);

  const all = data.comments[videoId] ?? [];
  const { top, replies } = useMemo(() => {
    const replies = new Map<string, Comment[]>();
    const top: Comment[] = [];
    for (const c of all) {
      if (c.parentId) {
        const arr = replies.get(c.parentId) ?? [];
        arr.push(c);
        replies.set(c.parentId, arr);
      } else top.push(c);
    }
    replies.forEach((arr) => arr.sort((a, b) => a.createdAt - b.createdAt));
    top.sort((a, b) => {
      if (sort === 'newest') return b.createdAt - a.createdAt;
      const score = (c: Comment) => (c.reaction === 'like' ? 1 : 0) + (replies.get(c.id)?.length ?? 0);
      return score(b) - score(a) || b.createdAt - a.createdAt;
    });
    return { top, replies };
  }, [all, sort]);

  const submit = () => {
    if (!text.trim()) return;
    const parent = replyTo ? replyTo.parentId ?? replyTo.id : undefined;
    addComment(videoId, text, parent);
    if (parent) setExpanded((e) => ({ ...e, [parent]: true }));
    setText('');
    setReplyTo(null);
    input.current?.blur();
  };

  const startReply = (c: Comment) => {
    setReplyTo(c);
    setTimeout(() => input.current?.focus(), 50);
  };

  return (
    <Sheet visible={visible} onClose={onClose} style={{ height: height * 0.72 }}>
      <View style={styles.header}>
        <Text style={styles.heading}>Comments <Text style={styles.count}>{all.length}</Text></Text>
        <Pressable hitSlop={10} onPress={onClose}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>
      <Chips
        items={[{ key: 'top', label: 'Top' }, { key: 'newest', label: 'Newest' }]}
        value={sort}
        onChange={setSort}
      />
      <View style={styles.divider} />

      <FlatList
        data={top}
        keyExtractor={(c) => c.id}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={44} color={colors.faint} />
            <Text style={styles.emptyText}>No comments yet. Start the conversation.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const r = replies.get(item.id) ?? [];
          const open = !!expanded[item.id];
          return (
            <View>
              <CommentItem comment={item} videoId={videoId} onReply={startReply} />
              {r.length ? (
                <Pressable style={styles.repliesToggle} onPress={() => setExpanded((e) => ({ ...e, [item.id]: !open }))}>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.link} />
                  <Text style={styles.repliesText}>{r.length} {r.length === 1 ? 'reply' : 'replies'}</Text>
                </Pressable>
              ) : null}
              {open ? r.map((c) => <CommentItem key={c.id} comment={c} videoId={videoId} onReply={startReply} nested />) : null}
            </View>
          );
        }}
      />

      {replyTo ? (
        <View style={styles.replyBar}>
          <Text style={styles.replyBarText} numberOfLines={1}>Replying to {handleFor(replyTo.author)}</Text>
          <Pressable hitSlop={8} onPress={() => setReplyTo(null)}>
            <Ionicons name="close" size={18} color={colors.sub} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <Avatar name={data.profileName} size={30} />
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          placeholder={replyTo ? 'Add a reply...' : 'Add a comment...'}
          placeholderTextColor={colors.faint}
          style={styles.input}
          multiline
          maxLength={1000}
        />
        <Pressable onPress={submit} disabled={!text.trim()} hitSlop={8}>
          <Ionicons name="send" size={22} color={text.trim() ? colors.link : colors.faint} />
        </Pressable>
      </View>
    </Sheet>
  );
}

function CommentItem({
  comment,
  videoId,
  onReply,
  nested,
}: {
  comment: Comment;
  videoId: string;
  onReply: (c: Comment) => void;
  nested?: boolean;
}) {
  const { setCommentReaction, deleteComment } = useUserData();
  const liked = comment.reaction === 'like';
  const disliked = comment.reaction === 'dislike';

  const more = () =>
    Alert.alert('Comment', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteComment(videoId, comment.id),
      },
    ]);

  return (
    <View style={[styles.item, nested && styles.nested]}>
      <Avatar name={comment.author} size={nested ? 24 : 32} />
      <View style={styles.body}>
        <Text style={styles.meta}>{handleFor(comment.author)} · {timeAgo(comment.createdAt)}</Text>
        <Text style={styles.text}>{comment.text}</Text>
        <View style={styles.actions}>
          <Pressable hitSlop={8} style={styles.action} onPress={() => setCommentReaction(videoId, comment.id, liked ? null : 'like')}>
            <Ionicons name={liked ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={colors.text} />
            {liked ? <Text style={styles.actionText}>1</Text> : null}
          </Pressable>
          <Pressable hitSlop={8} style={styles.action} onPress={() => setCommentReaction(videoId, comment.id, disliked ? null : 'dislike')}>
            <Ionicons name={disliked ? 'thumbs-down' : 'thumbs-down-outline'} size={16} color={colors.text} />
          </Pressable>
          <Pressable hitSlop={8} style={styles.action} onPress={() => onReply(comment)}>
            <Ionicons name="chatbubble-outline" size={15} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <Pressable hitSlop={10} onPress={more}>
        <Ionicons name="ellipsis-vertical" size={14} color={colors.sub} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 2 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '700' },
  count: { color: colors.sub, fontSize: 15, fontWeight: '400' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.surface3 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyText: { color: colors.sub, marginTop: 12, textAlign: 'center' },
  item: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10 },
  nested: { paddingLeft: 58 },
  body: { flex: 1, marginLeft: 12 },
  meta: { color: colors.sub, fontSize: 12 },
  text: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 22 },
  action: { flexDirection: 'row', alignItems: 'center' },
  actionText: { color: colors.sub, fontSize: 12, marginLeft: 6 },
  repliesToggle: { flexDirection: 'row', alignItems: 'center', paddingLeft: 58, paddingVertical: 6 },
  repliesText: { color: colors.link, fontWeight: '600', marginLeft: 6 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.surface2,
  },
  replyBarText: { color: colors.sub, fontSize: 13, flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface3,
  },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surface2,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
});
