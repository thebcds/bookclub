import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { BookOpen, Globe, MessageCircle, Trophy, Users, Vote, Calendar, ArrowRight } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663326243662/JtwK2AToo98P6Ad64BKFob/boox-logo-transparent-dZxnjsPjNpHQaCKCVpKKLE.png";

const features = [
  {
    icon: Trophy,
    title: "Book Selection Events",
    description: "Create events with multiple voting schemes — simple majority, ranked choice, or tournament brackets.",
  },
  {
    icon: Vote,
    title: "Democratic Voting",
    description: "Every member gets a voice. Submit book suggestions and vote to decide what the group reads next.",
  },
  {
    icon: MessageCircle,
    title: "Group Chat",
    description: "Discuss books, share thoughts, and stay connected with your group in real-time chat.",
  },
  {
    icon: Calendar,
    title: "Calendar & Scheduling",
    description: "Plan meetings, set reading deadlines, and track upcoming events on a shared calendar.",
  },
  {
    icon: BookOpen,
    title: "Book Library",
    description: "Build a shared library of books your group has read, with ratings and Open Library integration.",
  },
  {
    icon: Globe,
    title: "Public & Private Groups",
    description: "Keep your group private with invite links, or make it public for anyone to discover and join.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container max-w-6xl flex items-center justify-between h-16">
          <img src={LOGO_URL} alt="boox" className="h-10" />
          <Button onClick={() => { window.location.href = getLoginUrl(); }}>
            Sign in
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container max-w-6xl">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              The modern book club platform
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight leading-tight">
              Your book club,{" "}
              <span className="text-primary">organized</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Create groups, submit book suggestions, vote on what to read next, and keep your reading community engaged — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button
                size="lg"
                onClick={() => { window.location.href = getLoginUrl(); }}
                className="shadow-lg hover:shadow-xl transition-all text-base px-8"
              >
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold tracking-tight">
              Everything your book club needs
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              From picking the next book to discussing it together, boox has you covered.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold tracking-tight">
              How it works
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Create a group", desc: "Start your book club and invite members with a shareable link." },
              { step: "2", title: "Submit & vote", desc: "Members suggest books and vote using your preferred voting method." },
              { step: "3", title: "Read & discuss", desc: "Track your reading, schedule meetings, and chat with your group." },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary/5">
        <div className="container max-w-6xl text-center space-y-6">
          <h2 className="text-3xl font-serif font-bold tracking-tight">
            Ready to start reading together?
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Create your book club in seconds. It's free to use.
          </p>
          <Button
            size="lg"
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="shadow-lg hover:shadow-xl transition-all text-base px-8"
          >
            Create Your Book Club
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container max-w-6xl flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="boox" className="h-6 opacity-60" />
          </div>
          <p>&copy; {new Date().getFullYear()} boox. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
