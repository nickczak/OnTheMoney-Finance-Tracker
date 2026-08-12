# iOS App (Expo / React Native)

The mobile client for OnTheMoney. Built with **Expo 57**, **React Native 0.86**, **TypeScript**, and **expo-router** for file-based navigation. It talks to the Spring Boot API over HTTP and never touches the database or the C++ engine directly.

## Stack

- [Expo 57](https://docs.expo.dev) + React Native 0.86 (managed workflow)
- expo-router (typed routes) — screens live in `app/`
- React Navigation under the hood (bottom tabs + stack)
- Jest + `@testing-library/react-native` for unit tests
- TypeScript (`tsc --noEmit`), ESLint (`expo lint`), Prettier

## Project structure

```
ios/
├── app/                    # expo-router screens
│   ├── _layout.tsx         # root stack layout
│   ├── (tabs)/
│   │   ├── _layout.tsx     # bottom tabs: Portfolio + Accounts
│   │   ├── index.tsx       # Portfolio — net worth chart, history, mix, credit score
│   │   └── two.tsx         # Accounts — list, add account dialog
│   ├── account/
│   │   └── [id].tsx        # Account detail — rename, edit balance, delete
│   ├── +not-found.tsx      # 404 screen
│   └── +html.tsx           # web-only HTML shell
├── components/             # shared UI
│   ├── AccountCard.tsx     # account row (icon, type, balance, % of assets)
│   ├── TransactionCard.tsx
│   ├── Themed.tsx          # themed <Text> / <View>
│   ├── useColorScheme.ts   # light/dark hook
│   └── useClientOnlyValue.ts
├── constants/
│   └── Colors.ts           # palette + `serif` font family
├── lib/
│   └── api.ts              # all REST calls to the backend
├── types/                  # TS types mirroring the backend entities
│   ├── Account.ts
│   ├── Transaction.ts
│   └── NetWorth.ts
├── app.json                # Expo config (name, slug, bundle id, plugins)
└── ios/                    # GENERATED native Xcode project — do not edit
```

## Screens & navigation

```
Root stack (app/_layout.tsx)
└── Tabs (app/(tabs)/_layout.tsx)
    ├── Portfolio (app/(tabs)/index.tsx)        — tab "Portfolio"
    │   └── (pushes) Account detail (app/account/[id].tsx)
    └── Accounts (app/(tabs)/two.tsx)           — tab "Accounts"
        └── (pushes) Account detail (app/account/[id].tsx)
```

- **Portfolio** — current net worth, daily change, 1M/1Y trend cards, a net worth history list with selectable ranges (`1W`, `1M`, `3M`, `1Y`, `YTD`, `ALL`), asset/liability mix, debt, investment projection accounts, and a credit score card (tap to edit).
- **Accounts** — all accounts grouped by type with a "new account" dialog.
- **Account detail** — per-account balance, transactions, and edit/delete actions.

## Data fetching

All HTTP goes through [`lib/api.ts`](lib/api.ts), a thin typed wrapper over `fetch` with one function per endpoint:

```ts
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
```

- Screen components fetch in `useEffect` / `useFocusEffect` and hold the data in `useState` (e.g. `(tabs)/index.tsx` re-fetches whenever the tab regains focus).
- Response types in `types/` mirror the backend JSON exactly — see the **JSON Protocol** section of the root `README.md`.
- `EXPO_PUBLIC_*` variables are inlined into the JS bundle when Metro builds it, so after changing `EXPO_PUBLIC_API_URL` you must restart the dev server (a refresh alone is not enough).

## Configuration

| Env var               | Default                 | Purpose                                                                                       |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | `http://localhost:8080` | Base URL of the Spring Boot API. Use your machine's LAN IP when running on a physical device. |

No other runtime config is required.

## Running

Prerequisites: Node + npm, and the backend running on port 8080 (see the root `README.md`). From this directory:

```bash
npm install
npm start            # start Metro; press i for the iOS simulator
npm run web          # run in a browser (react-native-web)
```

### Running on a physical iPhone

On a device, `localhost` points at the phone itself, so the API URL must be your Mac's LAN IP, e.g. `http://192.168.1.10:8080`.

The native Xcode project is **generated** by Expo (CNG) and gitignored. Two options:

**Option A — Expo CLI (recommended):**

```bash
EXPO_PUBLIC_API_URL=http://<your-mac-IP>:8080 npx expo run:ios --device
```

Builds with Xcode under the hood, installs on your connected iPhone, starts Metro, and launches the app pointed at your Mac.

**Option B — Xcode GUI:**

```bash
npx expo prebuild --platform ios     # generate/refresh the native project
open ios/OnTheMoney.xcworkspace      # open the WORKSPACE, not the .xcodeproj
```

- In Xcode, set your **Signing Team** (a free personal Apple ID works) under _Signing & Capabilities_.
- Select your iPhone as the run destination and press Run.
- Start Metro separately:

  ```bash
  EXPO_PUBLIC_API_URL=http://<your-mac-IP>:8080 npx expo start
  ```

**First launch on the phone:** _Settings → General → VPN & Device Management_ → trust your developer certificate. The Debug build loads its JS from Metro over your LAN — if Metro isn't running (or the IP is wrong) the app shows `unsanitizedScriptURLString = (null)`.

### Regenerating the native project

`ios/` (inside this folder) is generated and gitignored. To regenerate from a clean slate:

```bash
npx expo prebuild --clean
```

## Scripts

| Command                           | What it does                                                     |
| --------------------------------- | ---------------------------------------------------------------- |
| `npm start`                       | `expo start` — Metro dev server                                  |
| `npm run ios`                     | `expo run:ios` — build + install on a connected device/simulator |
| `npm run android`                 | `expo run:android`                                               |
| `npm run web`                     | `expo start --web`                                               |
| `npm test`                        | Jest unit tests (`jest-expo` preset)                             |
| `npm run typecheck`               | `tsc --noEmit`                                                   |
| `npm run lint`                    | `expo lint` (ESLint)                                             |
| `npm run format` / `format:check` | Prettier write / check                                           |

## Testing

Tests live next to the code (`lib/__tests__`, `components/__tests__`) using Jest + `@testing-library/react-native` with the `jest-expo` preset. Backend API behavior is mocked at the `fetch` boundary:

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
```
