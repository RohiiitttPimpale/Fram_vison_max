import { useEffect, useState } from "react";

export type SyncStatus = "online" | "syncing" | "offline";

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      window.setTimeout(() => {
        setIsSyncing(false);
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const status: SyncStatus = !isOnline ? "offline" : isSyncing ? "syncing" : "online";

  return {
    isOnline,
    isSyncing,
    status,
  };
};
