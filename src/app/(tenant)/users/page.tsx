import dynamic from "next/dynamic";

const UsersPageContent = dynamic(
  () => import("@/components/users/users-page-content").then((m) => m.UsersPageContent),
  {
    loading: () => (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <span className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Pengguna
              </h1>
              <p className="text-xs text-neutral-500">
                Kelola anggota tim di tenant ini
              </p>
            </div>
          </div>
        </div>
        <div className="h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
      </div>
    ),
  },
);

export default function UsersPage() {
  return <UsersPageContent />;
}
