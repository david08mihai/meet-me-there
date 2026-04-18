# Meet Me There

A social app for discovering local events, meeting people nearby, and combating social isolation through spontaneous in-person meetups.

## Tech stack

- **Expo SDK 54** (React Native 0.81) with TypeScript
- **Expo Router** (file-based routing under `app/`)
- **Firebase** (`firebase` JS SDK v12) — Auth, Firestore, Storage
- **libphonenumber-js** — phone number validation
- **AsyncStorage** — Firebase Auth session persistence

## Getting started

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is needed because of a transitive React / React DOM version mismatch in the Expo + Firebase ecosystem.

### 2. Configure Firebase

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication → Email/Password** provider
3. Copy `.env.example` to `.env` and fill in your project's web config values:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=1:...
```

`.env` is gitignored. Never commit real credentials.

### 3. Run

```bash
npm start             # Expo dev server (press i for iOS, a for Android, w for web)
npm run ios
npm run android
npm run web
```

### 4. Verify

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm run format        # Prettier
```

## Folder structure

```
app/                          Expo Router routes (file = URL)
├── _layout.tsx              Root layout: AuthProvider + protected-route guard
├── index.tsx                Redirects to /welcome | /verify-email | /map based on auth
├── (auth)/                  Unauthenticated screens
│   ├── _layout.tsx
│   ├── welcome.tsx          "Get Started" landing
│   ├── login.tsx
│   ├── forgot-password.tsx
│   ├── verify-email.tsx
│   └── register/
│       ├── index.tsx        Account type selector
│       ├── personal.tsx     Personal account form
│       └── business.tsx     Business account form
└── (app)/                   Authenticated screens (tab nav)
    ├── _layout.tsx
    ├── map.tsx
    ├── events/
    │   ├── index.tsx        List
    │   ├── create.tsx
    │   └── [id].tsx         Details
    ├── chat.tsx
    ├── bookings.tsx
    └── profile.tsx

src/
├── contexts/
│   └── AuthContext.tsx      Firebase auth state provider (useAuth hook)
├── lib/
│   ├── firebase.ts          Firebase app + Auth initialization
│   └── validation.ts        Reusable validators (email/password/phone/etc.)
└── ui/
    ├── theme.ts             Colors, spacing, radius, font sizes
    ├── Screen.tsx           SafeArea + KeyboardAvoiding wrapper
    ├── Button.tsx           primary / secondary / ghost
    ├── Input.tsx            TextInput with focus + error states
    ├── FormField.tsx        label + children + error message
    └── Placeholder.tsx      Screen stub used by pages not yet implemented
```

## Branch workflow

- `main` — protected. Merge only via PR with ≥ 1 review.
- `setup/infrastructure` — this branch. Contains the scaffold all features build on.
- `feature/<domain>-<name>` — one per feature. Branch off `main` (after infra is merged) or directly off `setup/infrastructure`.

Examples:

```
feature/auth-register
feature/auth-login
feature/events-create
feature/map
feature/social-chat
feature/payment-ticket
```

### Team assignments (10 features, 4 people)

| Person | Scope | Features |
|---|---|---|
| P1 | Auth | `[Auth] Register`, `[Auth] Login`, `[Auth] Forgot Password` |
| P2 | Events + Map | `[Events] Create`, `[Events] See Details`, `[Map] See Map` |
| P3 | Social + Profile | `[Social] Chat`, `[Social] See Bookings`, `[Profile] See Profile` |
| P4 | Payment + Infra | `[Payment] Pay Ticket` + this setup, shared components, CI |

Every route in `app/` currently renders a `<Placeholder>` labelled with its owner. When you implement a feature, **replace the placeholder content**, don't delete the file.

## Adding a feature — checklist

1. `git checkout main && git pull`
2. `git checkout -b feature/<domain>-<name>`
3. Open the route file under `app/` (e.g. `app/(auth)/register/personal.tsx`) — it already exists as a placeholder.
4. Replace the `<Placeholder>` with your screen. Use:
   - `<Screen>` / `<FormField>` / `<Input>` / `<Button>` from `src/ui/`
   - validators from `src/lib/validation.ts`
   - `useAuth()` from `src/contexts/AuthContext` when you need the current user
   - `firebaseAuth` from `src/lib/firebase` for Firebase Auth calls
5. `npm run typecheck && npm run lint` before pushing
6. Open a PR against `main`. Tag the reviewer.

## Validators — quick reference

All live in `src/lib/validation.ts`. Each returns `string | null` (null = valid):

| Validator | Used for |
|---|---|
| `validateEmail(v)` | Email address (5–254 chars, format) |
| `validatePassword(v)` | 8–64, no spaces, upper + lower + digit + special |
| `validateConfirmPassword(v, password)` | Must match password |
| `validatePersonName(v, emptyMsg?)` | 2–100 chars |
| `validateBusinessName(v)` | 2–150 chars |
| `validatePhone(v)` | libphonenumber-js |
| `validateUrl(v, msg?)` | Optional — only validates if non-empty |
| `validateDateOfBirth(date)` | Not null, not in future |
| `validateShortDescription(v)` | Required, ≤ 500 chars |
| `validateAcceptedTerms(bool)` | Must be true |
| `validateRequiredChoice(value, msg)` | Generic for dropdowns |

Error messages match the functional spec exactly, so the forms can use them verbatim.
