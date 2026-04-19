import { useLanguage, LANGUAGES, type Language } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

const LanguageSelector = ({ compact = false, className }: LanguageSelectorProps) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!compact && <Globe size={16} className="text-muted-foreground" />}
      <Select
        value={language}
        onValueChange={(v) => {
          if (LANGUAGES.some((l) => l.code === v)) {
            setLanguage(v as Language);
          }
        }}
      >
        <SelectTrigger className={cn("h-8 text-xs", compact ? "w-[110px]" : "w-[140px]")}>
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
