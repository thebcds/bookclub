import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";
import { Camera, Loader2, Save, User, BookOpen, Users, MessageSquare, Vote, X, Library, Trash2, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const GENRE_OPTIONS = [
  "Sci-Fi", "Fantasy", "Mystery", "Romance", "Horror", "Thriller",
  "Literary Fiction", "Non-Fiction", "Biography", "History",
  "Philosophy", "Science", "Self-Help", "Poetry", "Classics",
  "Young Adult", "Graphic Novels", "True Crime", "Humor", "Travel",
];

// Common library systems users might want to search
const POPULAR_LIBRARIES = [
  { name: "New York Public Library", url: "https://nypl.bibliocommons.com" },
  { name: "Los Angeles Public Library", url: "https://lapl.bibliocommons.com" },
  { name: "Chicago Public Library", url: "https://chipublib.bibliocommons.com" },
  { name: "Brooklyn Public Library", url: "https://bpl.bibliocommons.com" },
  { name: "San Francisco Public Library", url: "https://sfpl.bibliocommons.com" },
  { name: "Seattle Public Library", url: "https://seattle.bibliocommons.com" },
  { name: "Boston Public Library", url: "https://bpl.bibliocommons.com" },
  { name: "Houston Public Library", url: "https://houstonlibrary.bibliocommons.com" },
  { name: "Denver Public Library", url: "https://denver.bibliocommons.com" },
  { name: "Austin Public Library", url: "https://austin.bibliocommons.com" },
  { name: "Portland Public Library (Multnomah)", url: "https://multcolib.bibliocommons.com" },
  { name: "San Diego Public Library", url: "https://sandiego.bibliocommons.com" },
  { name: "Phoenix Public Library", url: "https://phoenix.bibliocommons.com" },
  { name: "Dallas Public Library", url: "https://dallaslibrary.bibliocommons.com" },
  { name: "Toronto Public Library", url: "https://torontopubliclibrary.bibliocommons.com" },
  { name: "Vancouver Public Library", url: "https://vpl.bibliocommons.com" },
  { name: "London Public Library (UK)", url: "https://london.bibliocommons.com" },
];

export default function Profile() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = trpc.profile.me.useQuery();
  const { data: stats } = trpc.profile.stats.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user?.id }
  );
  const utils = trpc.useUtils();

  const [bio, setBio] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [customLibraryName, setCustomLibraryName] = useState("");
  const [customLibraryUrl, setCustomLibraryUrl] = useState("");
  const [showCustomLibrary, setShowCustomLibrary] = useState(false);
  const [preferredLibrary, setPreferredLibrary] = useState<string | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? "");
      try {
        const parsed = typeof profile.favoriteGenres === "string" ? JSON.parse(profile.favoriteGenres) : profile.favoriteGenres;
        setSelectedGenres(Array.isArray(parsed) ? parsed : []);
      } catch { setSelectedGenres([]); }
      setAvatarPreview(profile.avatarUrl ?? null);
      setPreferredLibrary(profile.preferredLibrary ?? null);
      setEmailNotifications(profile.emailNotifications ?? true);
    }
  }, [profile]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : prev.length < 20 ? [...prev, genre] : prev
    );
  };

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated!");
      utils.profile.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadAvatar = trpc.profile.uploadAvatar.useMutation({
    onSuccess: (data) => {
      toast.success("Avatar updated!");
      setAvatarPreview(data.url);
      utils.profile.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadAvatar.mutate({ imageData: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const filteredLibraries = librarySearch.trim()
    ? POPULAR_LIBRARIES.filter((lib) =>
        lib.name.toLowerCase().includes(librarySearch.toLowerCase())
      )
    : POPULAR_LIBRARIES;

  const selectLibrary = (name: string, url: string) => {
    const value = `${name}|${url}`;
    setPreferredLibrary(value);
    setLibrarySearch("");
    toast.success(`Library set to ${name}`);
  };

  const clearLibrary = () => {
    setPreferredLibrary(null);
    toast.success("Library preference cleared");
  };

  const addCustomLibrary = () => {
    if (!customLibraryName.trim() || !customLibraryUrl.trim()) {
      toast.error("Please enter both a library name and catalog URL");
      return;
    }
    let url = customLibraryUrl.trim();
    if (!url.startsWith("http")) url = `https://${url}`;
    selectLibrary(customLibraryName.trim(), url);
    setCustomLibraryName("");
    setCustomLibraryUrl("");
    setShowCustomLibrary(false);
  };

  const currentLibraryName = preferredLibrary?.split("|")[0] ?? null;

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          My Profile
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and see your reading stats
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{stats?.groupsJoined ?? 0}</div>
            <div className="text-xs text-muted-foreground">Groups</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{stats?.eventsParticipated ?? 0}</div>
            <div className="text-xs text-muted-foreground">Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{stats?.reviewsWritten ?? 0}</div>
            <div className="text-xs text-muted-foreground">Reviews</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Vote className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{stats?.votesCast ?? 0}</div>
            <div className="text-xs text-muted-foreground">Votes</div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your profile visible to other group members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary border-2 border-primary/20">
                  {(user?.name ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                {uploadAvatar.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadAvatar.isPending} />
              </label>
            </div>
            <div>
              <div className="font-medium">{user?.name ?? "Unknown"}</div>
              <div className="text-sm text-muted-foreground">{user?.email ?? ""}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell other members about yourself and your reading interests..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>

          {/* Favorite Genres */}
          <div className="space-y-2">
            <Label>Favorite Genres</Label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((genre) => (
                <Badge
                  key={genre}
                  variant={selectedGenres.includes(genre) ? "default" : "outline"}
                  className="cursor-pointer text-xs transition-colors"
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                  {selectedGenres.includes(genre) && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            onClick={() => updateProfile.mutate({ bio, favoriteGenres: selectedGenres, preferredLibrary, emailNotifications })}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Control how you receive notifications about group activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="email-notif" className="text-sm font-medium cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive email alerts for voting reminders, new rounds, and winner announcements
                </p>
              </div>
            </div>
            <Switch
              id="email-notif"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 opacity-60">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">
                  In-App Notifications
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Always enabled. Check the notification bell in the sidebar for updates.
                </p>
              </div>
            </div>
            <Switch checked={true} disabled />
          </div>
          {emailNotifications !== (profile?.emailNotifications ?? true) && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Don&apos;t forget to click &quot;Save Profile&quot; above to save your notification preferences.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Library Preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Library Preference
          </CardTitle>
          <CardDescription>
            Set your preferred library system. When browsing books, you&apos;ll see a quick link to check availability at your library.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current selection */}
          {currentLibraryName ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
              <Library className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">{currentLibraryName}</p>
                <p className="text-xs text-muted-foreground">Your preferred library for book availability checks</p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={clearLibrary}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No library selected. Choose one below to see availability links when browsing books.</p>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label>Search popular libraries</Label>
            <Input
              placeholder="Type to search (e.g., Seattle, Toronto, New York...)"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
            />
          </div>

          {/* Library list */}
          <div className="grid gap-1.5 max-h-48 overflow-y-auto rounded-lg border p-2">
            {filteredLibraries.map((lib) => (
              <button
                key={lib.url}
                className={`text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent ${
                  preferredLibrary === `${lib.name}|${lib.url}` ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                }`}
                onClick={() => selectLibrary(lib.name, lib.url)}
              >
                {lib.name}
              </button>
            ))}
            {filteredLibraries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No matching libraries found</p>
            )}
          </div>

          {/* Custom library */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomLibrary(!showCustomLibrary)}
            >
              {showCustomLibrary ? "Cancel" : "Add custom library"}
            </Button>
            {showCustomLibrary && (
              <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Enter your library&apos;s name and online catalog URL. The URL should be the base address of your library&apos;s search page.
                </p>
                <Input
                  placeholder="Library name (e.g., My Local Library)"
                  value={customLibraryName}
                  onChange={(e) => setCustomLibraryName(e.target.value)}
                />
                <Input
                  placeholder="Catalog URL (e.g., https://mylibrary.bibliocommons.com)"
                  value={customLibraryUrl}
                  onChange={(e) => setCustomLibraryUrl(e.target.value)}
                />
                <Button size="sm" onClick={addCustomLibrary}>
                  Add Library
                </Button>
              </div>
            )}
          </div>

          {/* Save reminder */}
          {preferredLibrary !== (profile?.preferredLibrary ?? null) && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Don&apos;t forget to click &quot;Save Profile&quot; above to save your library preference.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
