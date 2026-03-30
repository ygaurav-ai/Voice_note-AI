# Thoughts

A personal note-taking and task management app for iOS, built with React Native and Expo.

Capture thoughts, organise notes by tag, and track daily tasks — all in a clean, warm parchment-toned UI with smooth spring animations and frosted glass surfaces.

---

## Screenshots

> Coming soon

---

## Features

- **Home screen** — Today's notes in a horizontal swipeable card list with animated dot indicator
- **Notes screen** — Full grid of all notes, filterable by tag (Work, Reading, Personal, Ideas)
- **Todo screen** — Task list with priority levels, due dates, and local notifications
- **Spring animations** — FAB and Record button scale with Reanimated spring physics on press
- **Glass surfaces** — BlurView frosted background on todo rows (iOS), solid fallback on Android
- **Persistent storage** — All data saved locally with MMKV (no account required)
- **Offline-first** — Everything works without a network connection

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | [Expo](https://expo.dev) ~55 / React Native 0.83 |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Storage | [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) v4 |
| Animations | [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) 4.2 |
| Blur | expo-blur |
| Notifications | expo-notifications |
| JS Engine | Hermes |
| Testing | Jest + jest-expo + @testing-library/react-native |

---

## Project Structure

```
Thoughts/
├── app/                    # Screen components (Expo Router style)
│   ├── home.tsx            # Home screen — today's notes + FAB
│   ├── notes.tsx           # Notes grid with tag filter
│   ├── note-detail.tsx     # Full note view
│   ├── todo.tsx            # Task list screen
│   └── index.tsx           # Navigation root
├── components/             # Reusable UI components
│   ├── FAB.tsx             # Floating action button with spring animation
│   ├── RecordButton.tsx    # Voice memo button (spring animation)
│   ├── NoteCard.tsx        # Swipeable note card
│   ├── NoteGridCard.tsx    # Grid-style note card
│   ├── TodoItem.tsx        # Task row with BlurView glass surface
│   ├── NoteCreateSheet.tsx # Bottom sheet for creating notes
│   ├── TodoCreateSheet.tsx # Bottom sheet for creating tasks
│   ├── BottomNav.tsx       # Custom bottom tab bar
│   ├── TagChip.tsx         # Coloured tag pill
│   └── UserAvatar.tsx      # Avatar initials component
├── store/
│   ├── notesStore.ts       # Zustand store for notes
│   └── todoStore.ts        # Zustand store for todos + notifications
├── constants/
│   ├── colors.ts           # Warm parchment palette
│   ├── spacing.ts          # Spacing & radius tokens
│   └── typography.ts       # Font size & weight tokens
├── types/
│   ├── index.ts            # Note, Todo, NoteTag types + factory fns
│   └── navigation.ts       # React Navigation type definitions
├── utils/
│   ├── date.ts             # Date formatting helpers
│   ├── id.ts               # UUID generator
│   └── notifications.ts    # Notification scheduling helpers
├── storage/
│   └── storage.ts          # MMKV instance
├── __tests__/              # 364 tests across 6 phases
└── ios/                    # Native iOS project (Expo prebuild)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Xcode 16+ (for iOS builds)
- CocoaPods
- An iOS device or simulator

### Install

```bash
git clone https://github.com/ygaurav-ai/Voice_note-AI.git
cd Voice_note-AI
npm install
```

### Run on iOS Simulator

```bash
# Install native dependencies
cd ios && LANG=en_US.UTF-8 pod install && cd ..

# Build and launch
npx expo run:ios --port 8082
```

### Run on a Physical Device

1. Update your Mac's local IP in `ios/Thoughts/AppDelegate.swift`:
   ```swift
   RCTBundleURLProvider.sharedSettings().jsLocation = "YOUR_MAC_IP:8082"
   ```
   Find your IP with: `ipconfig getifaddr en0`

2. Build and install:
   ```bash
   xcodebuild \
     -workspace ios/Thoughts.xcworkspace \
     -configuration Debug \
     -scheme Thoughts \
     -destination "id=YOUR_DEVICE_UDID" \
     DEVELOPMENT_TEAM=YOUR_TEAM_ID \
     CODE_SIGN_STYLE=Automatic \
     -allowProvisioningUpdates
   ```

3. Start Metro:
   ```bash
   npx expo start --port 8082 --host lan
   ```

4. On first launch: **Settings → General → VPN & Device Management → Trust your developer certificate**

### Run Tests

```bash
npm test
```

364 tests across 6 phases — all passing.

---

## Build Phases

The app was built in 6 incremental phases, each with a full test suite:

| Phase | What was built |
|---|---|
| 1 — Foundation | Types, storage, constants, utility functions |
| 2 — Navigation | React Navigation stack, bottom tabs, screen scaffolding |
| 3 — Core screens | Home, Notes, Todo screens + Zustand stores |
| 4 — Components | NoteCard, TodoItem, create sheets, tag chips |
| 5 — Notifications | Due date scheduling, overdue highlighting, MMKV persistence |
| 6 — Polish | Spring animations on FAB/RecordButton, BlurView glass, animated dot indicator |

---

## Known Limitations

- Voice recording is not yet implemented (button is a placeholder)
- The app uses a personal development certificate — requires trust on first install
- If your Mac's IP changes, update `jsLocation` in `AppDelegate.swift` and rebuild

---

## License

MIT
