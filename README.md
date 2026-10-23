# Vidora — offline video player with a YouTube-style UI

React Native (Expo, TypeScript) Android app that plays the videos already stored on your phone. No network, no accounts. Likes, comments, history, Watch later and subscriptions are saved locally with AsyncStorage.

## Features

| Area | What it does |
|---|---|
| **Home** | Dark feed of full-width cards (thumbnail, duration badge, red resume bar, channel avatar, views · time ago, ⋮ menu). Filter chips: All, New to you, Watched, Long videos, plus one chip per folder. A **Shorts** shelf is inserted after the second card. Pull to rescan. |
| **Watch** | `expo-video` player with native controls, fullscreen and picture-in-picture. Resumes where you left off. Title + "...more" file details, channel row with Subscribe, Like/Dislike pill, Share (shares the actual file), Save, Downloaded, Clip. Comments card → bottom sheet. **Up next** list with an Autoplay switch. |
| **Comments** | Add, reply (one level, like YouTube), like/dislike, delete, Top/Newest sort. Stored per video. |
| **Shorts** | Vertical swipe feed for videos ≤ 60 s or portrait. Tap to pause, side rail (like, dislike, comments, share, more), progress bar, Subscribe. |
| **Subscriptions** | **Dummy**: the button only toggles a local flag. Subscribed channels show as an avatar row and filtered feed; with none, a list of channels to subscribe to. |
| **You** | Editable display name (used on comments), stats, History shelf, History / Watch later / Liked / Downloads lists with "Play all", Autoplay toggle, Rescan, Clear history, Reset app data. |
| **Search** | Recent searches (removable), live suggestions, results across title, folder and filename. |
| **Channel** | Every folder on the phone is a channel: banner, avatar, video count, Subscribe, Latest / Popular / Oldest. |

The **+** tab and the cast / bell icons are placeholders that show a short message.

## Run it

`expo-media-library` needs a development build on Android, so **Expo Go won't work**. Use one of these:

```bash
npm install
npx expo install --fix        # aligns every package with your Expo SDK

# A) Build and install on a USB-connected phone or emulator (needs Android Studio / SDK)
npx expo run:android

# B) Cloud APK, no Android Studio needed
npm i -g eas-cli
eas build -p android --profile preview    # download the .apk from the link and install it
```

On first launch, allow **Photos and videos** access. Put test videos anywhere MediaStore indexes them (Movies, Download, DCIM, WhatsApp/Media…). To add files to an emulator: `adb push clip.mp4 /sdcard/Movies/` then pull down on Home to rescan.

## Project layout

```
App.tsx                      navigation (bottom tabs + stack), providers
src/data/media.ts            MediaStore scan; folder → channel
src/data/thumbs.ts           thumbnail generation, 3 at a time, cached
src/state/LibraryContext.tsx permission + video list
src/state/UserDataContext.tsx all local data (likes, comments, history…) persisted to AsyncStorage
src/components/              cards, header, sheets, comments, toast, subscribe button
src/screens/                 Home, Watch, Shorts, Subscriptions, You, Search, Channel, Playlist
```

## Notes

- **Views** are your own local play counts.
- A video counts as a **Short** if it is ≤ 60 seconds or taller than it is wide (`isShort` in `src/types.ts`).
- Package versions target Expo SDK 54. On a newer SDK, run `npx expo install --fix`; if the API of `expo-video` or `expo-media-library` changed, the places to look are `WatchScreen.tsx`, `ShortsScreen.tsx` and `src/data/media.ts`.
- The name and logo are original; swap them in `app.json` and `src/components/AppHeader.tsx`.
