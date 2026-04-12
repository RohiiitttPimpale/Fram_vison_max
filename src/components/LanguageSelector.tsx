import { useLanguage, LANGUAGES, type Language } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

const LanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe size={16} className="text-muted-foreground" />
      <Select
        value={language}
        onValueChange={(v) => {
          if (LANGUAGES.some((l) => l.code === v)) {
            setLanguage(v as Language);
          }
        }}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.nativeLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
