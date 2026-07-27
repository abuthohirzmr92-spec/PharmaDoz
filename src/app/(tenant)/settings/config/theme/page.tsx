// Staged migration: thin re-export. Implementation lives at
// settings/account/theme (source of truth for this sprint).
// A future migration sprint may invert this dependency.
export { default } from "@/app/(tenant)/settings/account/theme/page";
