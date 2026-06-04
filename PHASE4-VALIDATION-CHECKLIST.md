# Phase 4 — Validation Checklist

**Date:** 2026-05-23
**App:** `npm run dev` → http://localhost:3000
**Existing tenants:** "Apotek Utama", "Fina Pharma"

---

## V3 — Branch CRUD

**Precondition:** Login sebagai tenant_owner (Apotek Utama atau Fina Pharma)

| # | Step | Expected Result | Status |
|---|------|----------------|--------|
| 3.1 | Buka `/branches` | Halaman daftar cabang tampil (mungkin kosong) | |
| 3.2 | Klik "Tambah" | Form create tampil | |
| 3.3 | Isi form: Nama=`Cabang Validasi`, Alamat=`Jl. Test 1`, Telepon=`08111`, Email=`test@val.id` lalu Simpan | Redirect ke list, toast hijau "Cabang berhasil dibuat" | |
| 3.4 | Verifikasi cabang muncul di list | Card dengan nama "Cabang Validasi", kode `BR-xxxxxx`, status hijau | |
| 3.5 | Klik "Edit" → ubah nama jadi `Cabang Validasi Edited` → Simpan | Redirect, toast sukses, nama berubah di list | |
| 3.6 | Klik "Edit" lagi → klik "Nonaktifkan" → konfirmasi | Toast sukses, cabang hilang dari list | |

**Report format V3:**
```
V3.1: [OK/FAIL] — note
V3.2: [OK/FAIL] — note
V3.3: [OK/FAIL] — note
V3.4: [OK/FAIL] — note
V3.5: [OK/FAIL] — note
V3.6: [OK/FAIL] — note
```

---

## V4 — Invitation Token Creation

**Precondition:** Login sebagai tenant_owner

| # | Step | Expected Result | Status |
|---|------|----------------|--------|
| 4.1 | Buka `/users` | Halaman daftar pengguna tampil dengan tombol "Undang" | |
| 4.2 | Klik "Undang" | Form undangan tampil (email + peran + cabang) | |
| 4.3 | Isi: email=`test-staff@example.com`, peran=`Staf` → klik "Buat Undangan" | Sukses, muncul link undangan + tombol "Salin" | |
| 4.4 | Klik "Salin" | Toast "Link disalin ke clipboard" | |
| 4.5 | Simpan link (paste di notepad) | Link mengandung `?token=xxxx-xxxx-xxxx` | |

**Report format V4:**
```
V4.1: [OK/FAIL] — note
V4.3: [OK/FAIL] — note
V4.5: [token diterima: YES/NO]
```

---

## V5 — Invitation Acceptance Flow

**Precondition:** Link undangan dari V4.5

| # | Step | Expected Result | Status |
|---|------|----------------|--------|
| 5.1 | Buka link undangan di tab baru (atau incognito) | Halaman "Terima Undangan" tampil, tampilkan email + peran | |
| 5.2 | Isi: Nama=`Test Staff`, Password=`123456`, Konfirmasi=`123456` → klik "Terima Undangan" | Sukses, tampil "Undangan Diterima!" + tombol "Lanjut ke Login" | |
| 5.3 | Klik "Lanjut ke Login" → login dengan `test-staff@example.com` / `123456` | Login berhasil, dashboard tampil | |
| 5.4 | Cek halaman `/users` (sebagai staf) | Tidak bisa akses — atau hanya tampil info sendiri (bukan daftar user lain) | |

**Report format V5:**
```
V5.1: [OK/FAIL] — note
V5.2: [OK/FAIL] — note
V5.3: [OK/FAIL] — note
V5.4: [OK/FAIL] — apa yang terjadi?
```

---

## V6 — Onboarding Lifecycle

**Precondition:** Login sebagai tenant_owner yang BELUM menyelesaikan onboarding

| # | Step | Expected Result | Status |
|---|------|----------------|--------|
| 6.1 | Buka `/dashboard` | Banner kuning/orange "Selesaikan Pengaturan Awal" tampil | |
| 6.2 | Klik "Lanjutkan" di banner | Redirect ke `/onboarding/welcome` | |
| 6.3 | Klik "Mulai Pengaturan" | Redirect ke `/onboarding/profile` | |
| 6.4 | Isi form profil apotek (nama, alamat, telepon) → Simpan | Redirect ke `/onboarding/branch` | |
| 6.5 | Verifikasi branch utama tampil dengan badge hijau "Utama" | Card branch utama verified | |
| 6.6 | Klik "Lanjut" | Redirect ke `/onboarding/products` | |
| 6.7 | Klik "Lewati" | Redirect ke `/onboarding/team` | |
| 6.8 | Klik "Lewati" | Redirect ke `/onboarding/done` | |
| 6.9 | Klik "Mulai Operasi" | Redirect ke `/dashboard`, banner onboarding HILANG | |
| 6.10 | Buka `/onboarding/welcome` lagi | Harusnya redirect ke dashboard (isCompleted=true) | |

**Report format V6:**
```
V6.1: [OK/FAIL]
V6.2: [OK/FAIL]
V6.3: [OK/FAIL]
V6.4: [OK/FAIL]
V6.5: [OK/FAIL]
V6.6: [OK/FAIL]
V6.7: [OK/FAIL]
V6.8: [OK/FAIL]
V6.9: [OK/FAIL]
V6.10: [OK/FAIL]
```

---

## V7 — Branch-Scoped RBAC

**Precondition:**
- Branch A (misal: "Cabang Utama") dan Branch B (misal: "Cabang Kedua") sudah ada
- Staff user diundang dengan `assigned_branch_id` = Branch A

| # | Step | Expected Result | Status |
|---|------|----------------|--------|
| 7.1 | Login sebagai tenant_owner → buka `/users` → klik "Detail" pada staf | Halaman detail tampil, ada dropdown "Penugasan Cabang" | |
| 7.2 | Pilih "Cabang Kedua" → klik "Simpan Cabang" | Toast sukses, assignment berubah | |
| 7.3 | Login sebagai staf user | Hanya bisa melihat data cabang yang ditugaskan | |
| 7.4 | Cek branch switcher | Hanya branch yang ditugaskan yang muncul | |

**Report format V7:**
```
V7.1: [OK/FAIL]
V7.2: [OK/FAIL]
V7.3: [OK/FAIL] — apa yang terlihat?
```

---

## V8 — Cross-Tenant Isolation

**Precondition:** Dua tenant (Apotek Utama + Fina Pharma), masing-masing punya branch/user

| # | Step | Expected Result | Status |
|---|------|----------------|--------|
| 8.1 | Login tenant A → buka `/branches` | Hanya cabang tenant A yang tampil | |
| 8.2 | Login tenant A → buka `/users` | Hanya pengguna tenant A yang tampil | |
| 8.3 | Login tenant B → buka `/branches` | Hanya cabang tenant B yang tampil | |

**Report format V8:**
```
V8.1: [OK/FAIL] — berapa cabang tampil?
V8.2: [OK/FAIL] — berapa user tampil?
V8.3: [OK/FAIL] — berapa cabang tampil?
```

---

## V9 — Dashboard Onboarding Gate

**Precondition:** Tenant dengan onboarding BELUM selesai

| # | Step | Expected Result | Status |
|---|------|----------------|--------|
| 9.1 | Login sebagai tenant_owner yang BELUM selesai onboarding → buka `/dashboard` | Banner onboarding muncul di atas dashboard | |
| 9.2 | Buka halaman lain (misal `/inventory`) | Banner kecil di halaman lain (tidak redirect paksa) | |
| 9.3 | Buka `/settings` | Tidak ada redirect paksa — banner opsional | |

**Report format V9:**
```
V9.1: [OK/FAIL]
V9.2: [OK/FAIL] — banner muncul atau tidak?
V9.3: [OK/FAIL]
```

---

## V10 — End-to-End Tenant Operational Flow

| # | Step | Expected Result | Status |
|---|------|----------------|--------|
| 10.1 | Tenant owner login → onboarding complete → dashboard accessible | Full flow tanpa error | |
| 10.2 | Tenant owner creates 2 branches | Keduanya tampil di list | |
| 10.3 | Tenant owner invites 2 users (1 admin, 1 staf) | Kedua invite link berfungsi | |
| 10.4 | Kedua user accept invitation + login | Masuk dashboard tanpa error | |
| 10.5 | Admin bisa invite user lain | Form undangan berfungsi | |
| 10.6 | Staf tidak bisa invite user | Tidak ada tombol "Undang" atau error permission | |
| 10.7 | Staf tidak bisa ganti role user lain | Halaman `/users/[id]` terbatas | |

**Report format V10:**
```
V10.1: [OK/FAIL]
V10.2: [OK/FAIL]
V10.3: [OK/FAIL]
V10.4: [OK/FAIL]
V10.5: [OK/FAIL]
V10.6: [OK/FAIL]
V10.7: [OK/FAIL]
```

---

## Summary

Jalankan V3 → V10 secara berurutan. Setiap selesai satu section, laporkan hasilnya dengan format di atas ke Claude.

Jika ada FAIL, sertakan:
- Error message yang muncul
- Screenshot error (jika memungkinkan)
- Apa yang berbeda dari expected result
