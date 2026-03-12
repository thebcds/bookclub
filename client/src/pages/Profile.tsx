import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Camera, Loader2, Save, User, BookOpen, Users, MessageSquare, Vote, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const GENRE_OPTIONS = [
  "Sci-Fi", "Fantasy", "Mystery", "Romance", "Horror", "Thriller",
  "Literary Fiction", "Non-Fiction", "Biography", "History",
  "Philosophy", "Science", "Self-Help", "Poetry", "Classics",
  "Young Adult", "Graphic Novels", "True Crime", "Humor", "Travel",
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

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? "");
      try {
        const parsed = typeof profile.favoriteGenres === "string" ? JSON.parse(profile.favoriteGenres) : profile.favoriteGenres;
        setSelectedGenres(Array.isArray(parsed) ? parsed : []);
      } catch { setSelectedGenres([]); }
      setAvatarPreview(profile.avatarUrl ?? null);
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
            onClick={() => updateProfile.mutate({ bio, favoriteGenres: selectedGenres })}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
