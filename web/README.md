# On The Money — Web App

React + TypeScript + Vite single-page application for the On The Money personal
finance tracker. It talks to the Spring Boot backend over REST and is delivered
as an installable PWA (progressive web app).

## Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) ~6
- [Vite](https://vitejs.dev) 8 build tooling
- [Tailwind CSS](https://tailwindcss.com) 4 (CSS-first via `@theme` in `src/index.css`)
- [React Router](https://reactrouter.com) 7 for routing
- [Lucide](https://lucide.dev) for icons
- [vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) for tests
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) for the installable PWA

## Getting started

```bash
npm install
npm run dev          # Vite dev server (http://localhost:5173)
```

The API defaults to `http://localhost:8080`. To point at a different backend:

```bash
VITE_API_URL=http://<host>:8080 npm run dev
```

## Scripts

| Command              | Description                                     |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Start the Vite dev server                       |
| `npm run build`      | `tsc -b` typecheck then `vite build` to `dist/` |
| `npm run preview`    | Preview the production build locally            |
| `npm run test`       | Run the Vitest suite once                       |
| `npm run test:watch` | Run tests in watch mode                         |
| `npm run lint`       | ESLint over `src/`                              |

## Project structure

```
src/
├── main.tsx            # App entry — mounts <App/>
├── App.tsx             # Router + ProtectedRoute + tab layout
├── index.css           # Tailwind entry + design tokens (@theme)
├── vite-env.d.ts       # Vite + PWA client types
├── components/         # Presentational UI (TabLayout, ScreenFrame,
│                       # AccountCard, TransactionCard, AuthScreen)
├── pages/              # Route screens (Dashboard, Accounts, Stocks, ...)
├── lib/                # api.ts client, session.ts, AuthContext, format, responsive
├── types/              # Domain types mirroring the backend entities
└── test/               # Vitest setup
```

### Routing (`App.tsx`)

| Path           | Screen        | Auth required |
| -------------- | ------------- | ------------- |
| `/`            | Dashboard     | yes           |
| `/accounts`    | Accounts      | yes           |
| `/stocks`      | Stocks        | yes           |
| `/profile`     | Profile       | yes           |
| `/account/:id` | AccountDetail | yes           |
| `/projection`  | Projection    | yes           |
| `*`            | NotFound      | —             |

Every screen except the auth/not-found pages is wrapped in a `ProtectedRoute`
that redirects to the auth screen when no session exists, and a `TabLayout`
that renders the floating bottom tab bar.

## API client

`src/lib/api.ts` is the single network entry point. It builds a `BASE_URL` from
`VITE_API_URL` (validated at startup) and wraps `fetch` with the session token
as an `Authorization: Bearer ...` header. Auth endpoints (signup/login/refresh)
manage their own tokens and are exempt from the backend's interceptor.

## Session & auth

`src/lib/session.ts` persists the session token and user in `localStorage`
(synchronous — a migration from the original `AsyncStorage`-based module).

`src/lib/AuthContext.tsx` provides the `AuthProvider` component and the
`useAuth()` hook used throughout the app.

## Design system

Brand colors and typography are defined as CSS custom properties in the Tailwind
`@theme` block in `src/index.css`:

| Token                   | Value               |
| ----------------------- | ------------------- |
| `--color-brand`         | `#00ff88`           |
| `--color-bg`            | `#000`              |
| `--color-surface`       | `#1c1c1e`           |
| `--color-border`        | `#2c2c2e`           |
| `--color-border-strong` | `#3a3a3c`           |
| `--color-muted`         | `#98989d`           |
| `--color-danger`        | `#ff6b6b`           |
| `--color-warning`       | `#ffcc00`           |
| `--font-serif`          | `"Times New Roman"` |

## PWA

The app is configured for offline/installable use via `vite-plugin-pwa`
(`vite.config.ts`). Icons live in `public/` (`favicon.png`, `icon-192.png`,
`icon-512.png`, `apple-touch-icon.png`). The `dist/` build emits a manifest and
service worker; the dev server runs them in preview mode.

## Testing

Tests are written with Vitest (jsdom) + Testing Library.

- API layer: `src/lib/__tests__/` mocks `fetch` and asserts request URLs,
  HTTP-error handling, and network-failure paths.
- Components: `src/components/__tests__/` render components and assert output
  and interactions.

```bash
npm test
```

## Notes on the Expo → Vite migration

This app was originally an Expo / React Native client. It was migrated to a
React + Vite PWA (Phases 1–4 in the original `MIGRATION-PLAN.md`; the plan file
was a working scratch document and is no longer tracked). Key replacements:

| Expo / React Native                   | React / Vite                       |
| ------------------------------------- | ---------------------------------- |
| `@expo/vector-icons` / `expo-symbols` | `lucide-react`                     |
| `expo-router` (`useRouter`)           | `react-router-dom` (`useNavigate`) |
| `AsyncStorage`                        | `localStorage`                     |
| `useWindowDimensions` (RN)            | custom `useResponsiveLayout` hook  |
| `EXPO_PUBLIC_API_URL`                 | `VITE_API_URL`                     |
| `npx expo export --platform web`      | `npm run build` (Vite)             |
| Jest                                  | Vitest                             |
