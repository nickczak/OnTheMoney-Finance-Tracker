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
    │   └── Account detail (app/account/[id].tsx)
    │       └── Transaction detail (FlatList)
    └── Accounts (app/(tabs)/two.tsx)           — tab "Accounts"
        └── Account detail (app/account/[id].tsx)
            └── Transaction detail (FlatList)
```

## Data fetching

All HTTP goes through [`lib/api.ts`](lib/api.ts), a thin typed wrapper over `fetch` with one function per endpoint:

```ts
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
```

- Screen components fetch in `useEffect` / `useFocusEffect` and hold the data in `useState` (e.g. `(tabs)/index.tsx` re-fetches whenever the tab regains focus).
- Response types in `types/` mirror the backend JSON exactly — see the **JSON Protocol** section of the root `README.md`.
- `EXPO_PUBLIC_*` variables are inlined into the JS bundle when Metro builds it, so after changing `EXPO_PUBLIC_API_URL` you must restart the dev server (a refresh alone is not enough).
