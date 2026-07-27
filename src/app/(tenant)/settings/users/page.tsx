// Thin page — reuses the existing Users implementation as the single
// source of truth. No duplicated logic; /users route remains alive for
// backward compatibility during this stabilization sprint.
import { UsersPageContent } from "@/components/users/users-page-content";

export default function SettingsUsersPage() {
  return <UsersPageContent />;
}
