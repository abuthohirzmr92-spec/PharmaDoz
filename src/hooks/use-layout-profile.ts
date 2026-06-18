"use client";

import { useState, useEffect } from "react";
import { LayoutProfile, getLayoutProfile } from "@/lib/device/layout-profile";

/**
 * Returns the current LayoutProfile, updated on window resize.
 * Foundation hook — NOT YET WIRED.
 */
export function useLayoutProfile(): LayoutProfile {
  const [profile, setProfile] = useState<LayoutProfile>(() =>
    typeof window !== "undefined" ? getLayoutProfile() : LayoutProfile.DESKTOP,
  );

  useEffect(() => {
    const handler = () => setProfile(getLayoutProfile());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return profile;
}
