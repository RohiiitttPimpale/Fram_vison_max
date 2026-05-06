import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { extractLocation } from "@/lib/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User } from "lucide-react";
import { MapLocationPicker } from "@/components/ui/map-location-picker";

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    username: user?.username || "",
    seller_phone: user?.seller_phone || "",
    location: user?.location || "",
    lat: user?.latitude || 20.5937,
    lng: user?.longitude || 78.9629,
  });

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      username: user?.username || "",
      seller_phone: user?.seller_phone || "",
      location: user?.location || "",
      lat: user?.latitude || 20.5937,
      lng: user?.longitude || 78.9629,
    });
  }, [user]);

  useEffect(() => {
    if (form.location) return;

    const prefillLocation = async () => {
      try {
        const location = await extractLocation();
        setForm((prev) => ({ ...prev, location }));
      } catch {
        // Keep manual input path when geolocation is unavailable.
      }
    };

    void prefillLocation();
  }, [form.location]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile({
      name: form.name,
      username: form.username,
      location: form.location,
      latitude: form.lat,
      longitude: form.lng,
      seller_phone: form.seller_phone,
    });

    if (success) {
      toast.success(t("profile_updated"));
    }
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
              <p className="text-sm text-muted-foreground">@{form.username || "user"}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("full_name")}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("email")}</Label>
                <Input type="email" value={form.email} disabled className="opacity-60" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={form.seller_phone} onChange={e => setForm(f => ({ ...f, seller_phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("location")}</Label>
              <MapLocationPicker 
                onLocationSelect={(location, lat, lng) => {
                  setForm(f => ({ ...f, location, lat, lng }));
                }}
                initialLocation={form.location}
                initialLat={form.lat}
                initialLng={form.lng}
              />
            </div>
            <Button type="submit" className="w-full agri-btn-press">{t("save_changes")}</Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
