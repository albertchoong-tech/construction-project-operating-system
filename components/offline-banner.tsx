"use client";

import { useEffect, useState } from "react";

/** Fixed banner shown while the device has no network connection. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed top-14 lg:top-0 inset-x-0 lg:left-60 z-50 bg-amber-500 text-amber-950 text-sm font-medium text-center py-2 px-4 shadow"
    >
      You&apos;re offline — new entries won&apos;t save until you reconnect. Typed text is kept on
      this device.
    </div>
  );
}
