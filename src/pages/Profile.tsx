import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { extractLocation } from "@/lib/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User } from "lucide-react";

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [isLocating, setIsLocating] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    location: user?.location || "",
    farmSize: user?.farmSize || "",
  });

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(form);
    toast.success(t("profile_updated"));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">{t("profile")}</h1>
      <p className="text-muted-foreground mb-8">{t("manage_profile")}</p>

      <div className="max-w-lg">
        <div className="agri-card">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-primary/10">
              <User size={32} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{form.name || t("farmer")}</p>
              <p className="text-sm text-muted-foreground">{form.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("full_name")}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("email")}</Label>
                <Input type="email" value={form.email} disabled className="opacity-60" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("location")}</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                <Button type="button" variant="outline" size="sm" onClick={handleExtractLocation} disabled={isLocating}>
                  {isLocating ? "Detecting..." : "Use current location"}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>{t("farm_size")}</Label>
                <Input value={form.farmSize} onChange={e => setForm(f => ({ ...f, farmSize: e.target.value }))} />
              </div>
            </div>
            <Button type="submit" className="w-full agri-btn-press">{t("save_changes")}</Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
