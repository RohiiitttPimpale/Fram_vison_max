import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { extractLocation } from "@/lib/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout } from "lucide-react";
import { toast } from "sonner";
import LanguageSelector from "@/components/LanguageSelector";

const Signup = () => {
  const [form, setForm] = useState({ name: "", email: "", location: "", farmSize: "" });
  const [password, setPassword] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const { signup, error } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleExtractLocation = async () => {
    try {
      setIsLocating(true);
      const location = await extractLocation();
      setForm(prev => ({ ...prev, location }));
      toast.success("Location detected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to detect location";
      toast.error(message);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signup({
      name: form.name,
      email: form.email,
      location: form.location,
      farm_size: form.farmSize,
    }, password);
    if (success) {
      toast.success(t("account_created"));
      navigate("/");
    } else {
      toast.error(error || t("account_exists"));
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
              <h1 className="text-2xl font-bold text-foreground">{t("create_account")}</h1>
              <p className="text-sm text-muted-foreground">{t("setup_farm_profile")}</p>
            </div>
          </div>
          <LanguageSelector />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("full_name")}</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>{t("email")}</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("password")}</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("min_characters")} required minLength={6} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("location")}</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required />
              <Button type="button" variant="outline" size="sm" onClick={handleExtractLocation} disabled={isLocating}>
                {isLocating ? "Detecting..." : "Use current location"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>{t("farm_size")}</Label>
              <Input value={form.farmSize} onChange={e => setForm(f => ({ ...f, farmSize: e.target.value }))} required />
            </div>
          </div>
          <Button type="submit" className="w-full agri-btn-press">{t("create_account")}</Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("already_have_account")}{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">{t("sign_in")}</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
