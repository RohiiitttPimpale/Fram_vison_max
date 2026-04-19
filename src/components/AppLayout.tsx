import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme, type ThemePreference } from "@/contexts/ThemeContext";
import LanguageSelector from "@/components/LanguageSelector";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LayoutDashboard, TrendingUp, Bug, Lightbulb, User, LogOut, Sprout, CalendarDays, Newspaper, MoreHorizontal, Sun, Moon, Contrast, Store, ShieldCheck } from "lucide-react";

const links = [
  { to: "/", labelKey: "nav_dashboard", icon: LayoutDashboard },
  { to: "/predict", labelKey: "nav_predict", icon: TrendingUp },
  { to: "/disease", labelKey: "nav_disease", icon: Bug },
  { to: "/recommendations", labelKey: "nav_recommendations", icon: Lightbulb },
  { to: "/planner", labelKey: "nav_planner", icon: CalendarDays },
  { to: "/news", labelKey: "nav_news", icon: Newspaper },
  { to: "/marketplace/buy", labelKey: "nav_marketplace", icon: Store },
  { to: "/profile", labelKey: "nav_profile", icon: User },
];

const mobileBottomLinks = [
  { to: "/", labelKey: "nav_dashboard", icon: LayoutDashboard },
  { to: "/predict", labelKey: "nav_predict", icon: TrendingUp },
  { to: "/disease", labelKey: "nav_disease", icon: Bug },
  { to: "/planner", labelKey: "nav_planner", icon: CalendarDays },
  { to: "/profile", labelKey: "nav_profile", icon: User },
];

const mobileMoreLinks = [
  { to: "/recommendations", labelKey: "nav_recommendations", icon: Lightbulb },
  { to: "/news", labelKey: "nav_news", icon: Newspaper },
  { to: "/marketplace/buy", labelKey: "nav_marketplace", icon: Store },
];

const marketplaceAdminEmails = (import.meta.env.VITE_MARKETPLACE_ADMIN_EMAILS || "")
  .split(",")
  .map((item: string) => item.trim().toLowerCase())
  .filter(Boolean);

const themeOptions: { key: ThemePreference; label: string; icon: typeof Sun }[] = [
  { key: "system", label: "Theme: System", icon: Contrast },
  { key: "light", label: "Theme: Light", icon: Sun },
  { key: "dark", label: "Theme: Dark", icon: Moon },
  { key: "high-contrast", label: "Theme: High Contrast", icon: Contrast },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();

  const isAdmin = Boolean(user?.email && marketplaceAdminEmails.includes(user.email.toLowerCase()));
  const adminLink = { to: "/marketplace/moderation", labelKey: "nav_marketplace_moderation", icon: ShieldCheck };
  const renderedLinks = isAdmin ? [...links.slice(0, links.length - 1), adminLink, links[links.length - 1]] : links;
  const renderedMobileMoreLinks = isAdmin ? [...mobileMoreLinks, adminLink] : mobileMoreLinks;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:flex-row bg-background md:overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:h-screen md:shrink-0 flex-col w-60 border-r border-border bg-card/80 p-4">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sprout className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">{t("app_name")}</span>
        </div>
        <div className="px-2 mb-6">
          <LanguageSelector />
          <div className="mt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-full h-8 px-2 rounded-md border border-border text-xs text-left text-muted-foreground"
                >
                  {themeOptions.find((option) => option.key === preference)?.label || "Theme"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {themeOptions.map((option) => (
                  <DropdownMenuItem key={option.key} onSelect={() => setPreference(option.key)}>
                    <option.icon size={16} className="mr-2" />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {renderedLinks.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              <l.icon className="h-4.5 w-4.5" size={18} />
              {t(l.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border pt-4 mt-4">
          <p className="text-xs text-muted-foreground px-3 mb-2 truncate">{user?.name}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut size={18} />
            {t("sign_out")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 overflow-auto md:overflow-y-auto md:overflow-x-hidden md:h-screen">
        <div className="md:hidden sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-md bg-primary/10">
              <Sprout className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground truncate">{t("app_name")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <SyncStatusBadge />
            <LanguageSelector compact />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More menu"
                  className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground"
                >
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {renderedMobileMoreLinks.map((link) => (
                  <DropdownMenuItem key={link.to} onSelect={() => navigate(link.to)}>
                    <link.icon size={16} className="mr-2" />
                    {t(link.labelKey)}
                  </DropdownMenuItem>
                ))}
                {themeOptions.map((option) => (
                  <DropdownMenuItem key={option.key} onSelect={() => setPreference(option.key)}>
                    <option.icon size={16} className="mr-2" />
                    {option.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut size={16} className="mr-2" />
                  {t("sign_out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-1.5 z-50">
        {mobileBottomLinks.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1.5 py-1 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <l.icon size={18} />
            {t(l.labelKey).split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
