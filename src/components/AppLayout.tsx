import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import { LayoutDashboard, TrendingUp, Bug, Lightbulb, User, LogOut, Sprout, CalendarDays, Newspaper } from "lucide-react";

const links = [
  { to: "/", labelKey: "nav_dashboard", icon: LayoutDashboard },
  { to: "/predict", labelKey: "nav_predict", icon: TrendingUp },
  { to: "/disease", labelKey: "nav_disease", icon: Bug },
  { to: "/recommendations", labelKey: "nav_recommendations", icon: Lightbulb },
  { to: "/planner", labelKey: "nav_planner", icon: CalendarDays },
  { to: "/news", labelKey: "nav_news", icon: Newspaper },
  { to: "/profile", labelKey: "nav_profile", icon: User },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card/80 p-4">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sprout className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">{t("app_name")}</span>
        </div>
        <div className="px-2 mb-6">
          <LanguageSelector />
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(l => (
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
      <main className="flex-1 pb-20 md:pb-0 overflow-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <l.icon size={20} />
            {t(l.labelKey).split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
