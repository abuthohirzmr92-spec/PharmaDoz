"use client";

import { useState, useEffect } from "react";
import { DeviceProfile, getDeviceProfile } from "@/theme/device-profile";

/**
 * Returns the current DeviceProfile, updated on window resize.
 * Foundation hook — NOT YET WIRED to any component.
 */
export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(() =>
    typeof window !== "undefined" ? getDeviceProfile() : DeviceProfile.DESKTOP,
  );

  useEffect(() => {
    const handler = () => setProfile(getDeviceProfile());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return profile;
}
