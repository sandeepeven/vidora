import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type PlaylistKind = 'history' | 'watchLater' | 'liked' | 'all';

export type RootStackParamList = {
  Tabs: undefined;
  Search: undefined;
  Channel: { id: string };
  Playlist: { kind: PlaylistKind };
};

export function useNav() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}
