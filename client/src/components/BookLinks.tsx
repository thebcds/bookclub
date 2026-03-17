import { trpc } from "@/lib/trpc";
import { ExternalLink, Library, ShoppingCart } from "lucide-react";

type BookLinksProps = {
  title: string;
  author: string;
  isbn?: string | null;
  /** "compact" = inline row of small icons; "full" = labeled link list */
  variant?: "compact" | "full";
  /** Whether this book is the event winner — shows emphasized styling */
  isWinner?: boolean;
};

function buildLinks(title: string, author: string, isbn?: string | null, preferredLibrary?: string | null) {
  const q = encodeURIComponent(`${title} ${author}`);
  const isbnClean = isbn?.replace(/[-\s]/g, "");

  const amazon = isbnClean
    ? `https://www.amazon.com/dp/${isbnClean}`
    : `https://www.amazon.com/s?k=${q}&i=stripbooks`;

  const barnesNoble = isbnClean
    ? `https://www.barnesandnoble.com/w/?ean=${isbnClean}`
    : `https://www.barnesandnoble.com/s/${q}`;

  const bookshop = `https://bookshop.org/search?keywords=${q}`;

  const googleBooks = isbnClean
    ? `https://books.google.com/books?vid=ISBN${isbnClean}`
    : `https://books.google.com/books?q=${q}`;

  const openLibrary = isbnClean
    ? `https://openlibrary.org/isbn/${isbnClean}`
    : `https://openlibrary.org/search?q=${q}`;

  const worldcat = isbnClean
    ? `https://www.worldcat.org/isbn/${isbnClean}`
    : `https://www.worldcat.org/search?q=${encodeURIComponent(title)}`;

  // If user has a preferred library, build a search URL for it
  // preferredLibrary is stored as "name|url" format, e.g. "Seattle Public Library|https://seattle.bibliocommons.com"
  let libraryUrl: string | null = null;
  let libraryName: string | null = null;
  if (preferredLibrary) {
    const parts = preferredLibrary.split("|");
    if (parts.length === 2 && parts[1]) {
      libraryName = parts[0];
      const baseUrl = parts[1].replace(/\/$/, "");
      libraryUrl = isbnClean
        ? `${baseUrl}/search?q=${isbnClean}`
        : `${baseUrl}/search?q=${q}`;
    }
  }

  return { amazon, barnesNoble, bookshop, googleBooks, openLibrary, worldcat, libraryUrl, libraryName };
}

export default function BookLinks({ title, author, isbn, variant = "compact", isWinner }: BookLinksProps) {
  const { data: profile } = trpc.profile.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const preferredLibrary = profile?.preferredLibrary ?? null;
  const links = buildLinks(title, author, isbn, preferredLibrary);

  if (variant === "full") {
    return (
      <div className={`space-y-2 ${isWinner ? "p-3 rounded-lg border-2 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700" : ""}`}>
        {isWinner && (
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
            Get the winning book:
          </p>
        )}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <ShoppingCart className="h-3 w-3" /> Buy
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkPill href={links.amazon} label="Amazon" />
            <LinkPill href={links.barnesNoble} label="B&N" />
            <LinkPill href={links.bookshop} label="Bookshop.org" />
            <LinkPill href={links.googleBooks} label="Google Books" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Library className="h-3 w-3" /> Borrow
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkPill href={links.openLibrary} label="Open Library" />
            <LinkPill href={links.worldcat} label="WorldCat" />
            {links.libraryUrl && links.libraryName && (
              <LinkPill href={links.libraryUrl} label={links.libraryName} highlight />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact variant: small inline icons
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <CompactLink href={links.amazon} label="Amazon" emoji="🛒" />
      <CompactLink href={links.barnesNoble} label="Barnes & Noble" emoji="📕" />
      <CompactLink href={links.bookshop} label="Bookshop.org" emoji="📚" />
      <CompactLink href={links.googleBooks} label="Google Books" emoji="📖" />
      <span className="text-muted-foreground/40">|</span>
      <CompactLink href={links.openLibrary} label="Open Library" emoji="🏛️" />
      <CompactLink href={links.worldcat} label="WorldCat Libraries" emoji="🌐" />
      {links.libraryUrl && links.libraryName && (
        <CompactLink href={links.libraryUrl} label={links.libraryName} emoji="📍" highlight />
      )}
    </div>
  );
}

function LinkPill({ href, label, highlight }: { href: string; label: string; highlight?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors hover:bg-accent ${
        highlight
          ? "border-primary/40 bg-primary/5 text-primary font-medium"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {label}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

function CompactLink({ href, label, emoji, highlight }: { href: string; label: string; emoji: string; highlight?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center text-[10px] hover:underline transition-colors ${
        highlight ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
      }`}
      title={label}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="mr-0.5">{emoji}</span>
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}

/** Minimal export for use in bracket matchup cards where space is very tight */
export function BookLinksMinimal({ title, author, isbn }: { title: string; author: string; isbn?: string | null }) {
  const { data: profile } = trpc.profile.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const preferredLibrary = profile?.preferredLibrary ?? null;
  const links = buildLinks(title, author, isbn, preferredLibrary);

  return (
    <div className="flex items-center gap-1.5">
      <a href={links.amazon} target="_blank" rel="noopener noreferrer" className="text-[9px] text-muted-foreground hover:text-foreground" title="Amazon" onClick={(e) => e.stopPropagation()}>
        Buy
      </a>
      <span className="text-muted-foreground/30 text-[9px]">·</span>
      <a href={links.openLibrary} target="_blank" rel="noopener noreferrer" className="text-[9px] text-muted-foreground hover:text-foreground" title="Open Library" onClick={(e) => e.stopPropagation()}>
        Borrow
      </a>
      {links.libraryUrl && (
        <>
          <span className="text-muted-foreground/30 text-[9px]">·</span>
          <a href={links.libraryUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline" title={links.libraryName ?? "Library"} onClick={(e) => e.stopPropagation()}>
            Library
          </a>
        </>
      )}
    </div>
  );
}
