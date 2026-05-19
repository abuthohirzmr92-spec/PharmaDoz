export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand-600">404</h1>
        <p className="mt-3 text-lg text-neutral-600">
          Halaman tidak ditemukan
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  );
}
