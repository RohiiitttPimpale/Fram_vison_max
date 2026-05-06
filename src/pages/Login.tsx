import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout } from "lucide-react";
import { toast } from "sonner";
import LanguageSelector from "@/components/LanguageSelector";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { login, error } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(identifier, password);
    if (success) {
      toast.success(t("welcome_back"));
      navigate("/");
    } else {
      toast.error(error || t("invalid_credentials"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="agri-card w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Sprout className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("app_name")}</h1>
              <p className="text-sm text-muted-foreground">{t("tagline")}</p>
            </div>
          </div>
          <LanguageSelector />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or Phone Number</Label>
            <Input id="identifier" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="farmer@example.com or +91 9876543210" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full agri-btn-press">{t("sign_in")}</Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("no_account")}{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">{t("create_one")}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
