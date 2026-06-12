import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function useIsPwaMode() {
  const [isPwa, setIsPwa] = useState(false);
  useEffect(() => {
    const sq = window.matchMedia("(display-mode: standalone)");
    const fq = window.matchMedia("(display-mode: fullscreen)");
    const update = () => {
      const ios = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsPwa(sq.matches || fq.matches || ios);
    };
    update();
    sq.addEventListener("change", update);
    fq.addEventListener("change", update);
    return () => { sq.removeEventListener("change", update); fq.removeEventListener("change", update); };
  }, []);
  return isPwa;
}

export default function InstallButton() {
  const isPwa = useIsPwaMode();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isPwa || dismissed) return null;

  const handleInstall = async () => {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setDismissed(true);
      setPrompt(null);
    } else if (isIos) {
      setShowIosHelp(true);
    }
  };

  // No prompt available and not iOS — show generic instructions
  const canInstall = !!prompt || isIos;

  if (!canInstall) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowIosHelp(!showIosHelp)}
        >
          <Download className="w-3.5 h-3.5" />
          Zainstaluj aplikację
        </Button>
        {showIosHelp && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-72 p-3 rounded-xl border border-border bg-card shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Jak zainstalować?</span>
              <button onClick={() => setShowIosHelp(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p><span className="font-medium text-foreground">Chrome (Android/PC):</span></p>
              <p>Menu ⋮ → „Zainstaluj aplikację" lub „Dodaj do ekranu głównego"</p>
              <p className="pt-1"><span className="font-medium text-foreground">Edge:</span></p>
              <p>Menu ··· → „Aplikacje" → „Zainstaluj tę witrynę jako aplikację"</p>
              <p className="pt-1"><span className="font-medium text-foreground">Safari (iOS):</span></p>
              <div className="flex items-center gap-1">
                <Share className="w-3.5 h-3.5 shrink-0" /> Udostępnij → <Plus className="w-3.5 h-3.5 shrink-0" /> „Dodaj do ekranu"
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={handleInstall}
      >
        <Download className="w-3.5 h-3.5" />
        Zainstaluj aplikację
      </Button>

      {/* iOS instructions popup */}
      {showIosHelp && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-72 p-3 rounded-xl border border-border bg-card shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Instalacja na iOS</span>
            <button onClick={() => setShowIosHelp(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p>1. Naciśnij <Share className="w-3.5 h-3.5 inline" /> <span className="font-medium text-foreground">Udostępnij</span> (dół ekranu)</p>
            <p>2. Przewiń i naciśnij <Plus className="w-3.5 h-3.5 inline" /> <span className="font-medium text-foreground">Dodaj do ekranu głównego</span></p>
            <p>3. Naciśnij <span className="font-medium text-foreground">Dodaj</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
