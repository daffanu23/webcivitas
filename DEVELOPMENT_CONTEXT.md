# WebCivitas — Konteks Pengembangan

> Dokumen ini berisi ringkasan arsitektur, bug history, dan status pengembangan agar setiap sesi AI bisa langsung memahami konteks tanpa perlu dijelaskan ulang.
> 
> **Terakhir diperbarui**: 7 September 2026

---

## 1. Gambaran Umum Proyek

**WebCivitas** (MEDIACIVITAS) adalah platform media/berita kampus berbasis web. Fitur utama:
- Portal berita dengan kategori
- Sistem terbitan/majalah digital
- Dashboard admin & redaksi
- Autentikasi via Google OAuth

## 2. Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | **Astro 5.x** (SSR mode, `output: 'server'`) |
| Frontend Islands | **React 19** (via `@astrojs/react`) |
| Auth & Database | **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) |
| Deployment | **Vercel** (`@astrojs/vercel` adapter) |
| Styling | Vanilla CSS, Google Fonts (Poppins) |
| Editor | TipTap (rich text), `@uiw/react-md-editor` (markdown) |
| Icons | `lucide-react` |
| View Transitions | Astro `ClientRouter` (enabled globally di `Layout.astro`) |

## 3. Struktur Direktori Kunci

```
src/
├── components/
│   ├── Navbar.astro          — Navigasi utama + auth UI + FAB (+)
│   ├── HeroSlider.astro      — Carousel berita utama
│   ├── MagazinePromo.astro   — Promo majalah
│   ├── CategoryNav.astro     — Filter kategori berita
│   ├── AdminDashboard.jsx    — Dashboard admin (React island)
│   ├── MagazineManager.jsx   — Kelola majalah (React island)
│   ├── ProfileDashboard.jsx  — Dashboard profil user
│   └── ...
├── layouts/
│   └── Layout.astro          — Layout utama (Navbar + Footer + ClientRouter)
├── lib/
│   └── supabase.ts           — Browser client + Server client factory
├── pages/
│   ├── index.astro           — Halaman utama (beranda)
│   ├── login.astro           — Halaman login (Google OAuth)
│   ├── auth-callback.ts      — Server-side OAuth callback (exchange code → session)
│   ├── arsip.astro           — Arsip berita
│   ├── terbitan.astro        — Daftar terbitan majalah
│   ├── profile.astro         — Halaman profil user
│   ├── api/auth/logout.ts    — API route logout
│   ├── api/admin/            — API admin
│   ├── redaksi/              — Halaman redaksi (tulis berita)
│   └── admin/                — Halaman admin
└── styles/
    └── global.css            — CSS global + variabel tema
```

## 4. Auth Flow

### Login
1. User klik "Lanjutkan dengan Google" di `/login`
2. Browser client (`supabase.auth.signInWithOAuth`) redirect ke Google
3. Google redirect balik ke `/auth-callback?code=xxx`
4. Server di `auth-callback.ts` exchange code → session token, simpan ke **cookies**
5. Redirect ke `/` (homepage)

### Logout
1. User klik tombol logout (form GET ke `/api/auth/logout`)
2. Server call `supabase.auth.signOut()` → hapus cookies
3. Redirect ke `/`

### Auth State di Navbar
- Server-side: `getSupabaseServer(Astro.cookies)` → `supabase.auth.getUser()` → render avatar/login button
- Client-side: `syncAuthState()` script mendeteksi mismatch antara rendered UID vs actual session, lalu reload jika beda

### User Roles
- `admin` — Akses dashboard admin + upload majalah + tulis berita + FAB (+)
- `redaksi` — Tulis berita + FAB (+)
- User biasa — Hanya baca + koleksi

## 5. Bug History

### Bug #1: Auth State Stale Setelah Login/Logout *(7 Sep 2026)*

**Status**: ✅ Selesai

**Gejala**:
- Setelah login, Navbar masih menampilkan tombol login (seolah belum login)
- Klik login lagi → **looping**
- Pindah halaman (arsip, terbitan) → langsung normal
- Menunggu beberapa menit → homepage akhirnya normal
- Logout juga nyangkut — avatar/FAB masih muncul sampai ganti halaman

**Bukti user sudah login**:
- Cookies Supabase ada
- Di halaman selain homepage, avatar & FAB muncul normal
- Di halaman login, profile photo & FAB terlihat

**Root Cause**:
1. **`Cache-Control: public, max-age=60, s-maxage=300`** di `index.astro` — CDN/browser menyajikan halaman cached yang di-render sebelum login/logout
2. **`syncAuthState()` menggunakan `getSession()`** — hanya baca localStorage, bukan network call. Session server-side (dari auth-callback) belum tentu ter-sync ke browser client
3. **Guard `sessionStorage`** — mencegah retry reload jika reload pertama masih mendapat cached page

**Fix yang diterapkan**:
- Hapus `Cache-Control` public di `index.astro` → `no-cache, no-store, must-revalidate`
- Ganti `getSession()` → `getUser()` di syncAuthState
- Hapus session-storage guard, gunakan `window.location.replace()`
- Fix import browser client di `arsip.astro` → ganti ke server client

---

## 6. Catatan Penting untuk AI Selanjutnya

- Proyek ini menggunakan **Astro View Transitions** (`ClientRouter`). Ini berarti navigasi antar halaman TIDAK melakukan full page reload — DOM di-swap via JavaScript. Script yang perlu jalan ulang harus listen `astro:page-load`.
- **Navbar** di-render **server-side** di setiap halaman (via `Layout.astro`). Auth state di Navbar bergantung pada cookies yang dibaca server.
- **Dua Supabase client**: Browser client (`supabase` dari `lib/supabase.ts`) untuk client-side ops, Server client (`getSupabaseServer(cookies)`) untuk SSR. **Jangan** gunakan browser client di frontmatter Astro (server-side).
- Deployment di **Vercel** dengan `output: 'server'` — setiap halaman adalah serverless function.
