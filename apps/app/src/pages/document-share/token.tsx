import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Download01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Spokes } from "@travada-books/ui/components/spokes";
import { getDocumentShare } from "@/lib/queries/vault";
import LogoGreen from "@/assets/Logo-Green.svg";
import LogoLime from "@/assets/Logo-Lime.svg";
import { useTheme } from "@/components/theme-provider";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function DocumentSharePage() {
  const { token } = useParams<{ token: string }>();
  const { theme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data: share, isLoading, error } = useQuery({
    queryKey: ["document-share", token],
    queryFn: () => getDocumentShare(token!),
    enabled: !!token,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 border-b">
        <img
          src={isDark ? LogoLime : LogoGreen}
          alt="Travada Books"
          className="h-6 w-auto"
        />
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {isLoading && (
            <div className="flex items-center justify-center text-muted-foreground">
              <Spokes className="h-5 w-5" />
            </div>
          )}

          {error && (
            <div className="text-center space-y-2">
              <p className="text-base font-medium">Link not found</p>
              <p className="text-sm text-muted-foreground">
                This link may have expired or been removed.
              </p>
            </div>
          )}

          {share && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-lg font-semibold">Download File</h1>
                {share.orgName && (
                  <p className="text-sm text-muted-foreground">
                    {share.orgName} has shared a file with you
                  </p>
                )}
              </div>

              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">
                    {share.fileName ?? "File"}
                  </p>
                  {share.fileSize && (
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {formatBytes(share.fileSize)}
                    </span>
                  )}
                </div>
                {share.contentType && (
                  <p className="text-xs text-muted-foreground">{share.contentType}</p>
                )}
              </div>

              <a href={share.signedUrl} download rel="noreferrer">
                <Button className="w-full gap-2" size="lg">
                  Download
                  <Download01Icon size={16} />
                </Button>
              </a>

              <p className="text-xs text-muted-foreground text-center">
                This link expires on {formatExpiry(share.expiresAt)}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
