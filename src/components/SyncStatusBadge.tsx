import { Cloud } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

const statusStyles = {
  online: {
    dot: "bg-emerald-500",
    cloud: "text-emerald-600",
    label: "Cloud Sync: Online",
  },
  syncing: {
    dot: "bg-amber-500",
    cloud: "text-amber-600",
    label: "Cloud Sync: Syncing",
  },
  offline: {
    dot: "bg-red-500",
    cloud: "text-red-600",
    label: "Cloud Sync: Offline",
  },
};

const SyncStatusBadge = () => {
  const { status } = useOnlineStatus();
  const style = statusStyles[status];

  return (
    <div
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card"
      title={style.label}
      aria-label={style.label}
    >
      <div className="relative">
        <Cloud size={16} className={style.cloud} />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-card ${style.dot}`}
        />
      </div>
    </div>
  );
};

export default SyncStatusBadge;
