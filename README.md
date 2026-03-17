# PathFinder (Expo / React Native)

PathFinder is a mobile app that tracks your movement in real time, draws your route on a map, saves activities locally, and lets you review past activities with a detail map view.

## How to run

1. Install dependencies:

```bash
npm install
```

2. Add your MapTiler key:

- Open `app.json`
- Set `expo.extra.mapTilerKey` to your MapTiler API key (replace `PUT_YOUR_MAPTILER_KEY_HERE`)

3. Start the app:

```bash
npx expo start
```

Then open in Expo Go / emulator / device as usual.

## What’s implemented

- **Real-time tracking**: foreground location permission, live GPS tracking, route polyline, duration, and distance estimate (Haversine).
- **Background tracking (optional upgrade)**: uses `expo-task-manager` + `expo-location` background updates to keep recording when the app is minimized (requires background permission).
- **Persistence**: saved activities (date, duration, distance, coordinate array) in AsyncStorage.
- **History + detail**: list of recordings + detail screen that re-renders the saved polyline on a static map.
- **Map provider**: MapTiler tiles rendered via `UrlTile` in `react-native-maps`.
- **Styling**: `styled-components` for a polished, consistent UI on Map/History/Detail screens.

## AI tools used (and how)

- **Cursor (AI-assisted editing)**: refactors across screens, TypeScript fixes (timers + interval typing), and quick iteration on UI polish.
- **ChatGPT-style prompting**: used to reason about Expo Router edge cases, map tile integration patterns, and permission handling flows.

## Biggest challenge during “vibe coding”

Getting the types + runtime behavior consistent across environments (React Native vs Node timer typings, and map tile/provider behavior) while still keeping the UI fluid and the codebase clean.

