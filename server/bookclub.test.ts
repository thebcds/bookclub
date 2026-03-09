import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-1",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function createAdminUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return createMockUser({ id: 99, openId: "admin-user", name: "Admin", role: "admin", ...overrides });
}

function createCtx(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Mock DB layer ──────────────────────────────────────────────────
// We mock the db module to avoid needing a real database connection in tests
vi.mock("./db", () => {
  const members: any[] = [];
  const books: any[] = [];
  const events: any[] = [];
  const submissions: any[] = [];
  const invitations: any[] = [];
  const calendarEvents: any[] = [];
  const chatMessages: any[] = [];
  const brackets: any[] = [];
  const votes: any[] = [];
  const submissionHistory: any[] = [];
  let nextId = 1;

  return {
    getDb: vi.fn().mockResolvedValue({
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    }),
    getAllMembers: vi.fn().mockResolvedValue(members),
    createInvitation: vi.fn().mockImplementation(async (token, invitedBy, email, role, expiresAt) => {
      invitations.push({ id: nextId++, token, invitedBy, email, role, status: "pending", expiresAt, createdAt: new Date() });
    }),
    getInvitationByToken: vi.fn().mockImplementation(async (token) => {
      return invitations.find((i) => i.token === token);
    }),
    acceptInvitation: vi.fn().mockResolvedValue(undefined),
    getPendingInvitations: vi.fn().mockResolvedValue([]),
    createBook: vi.fn().mockImplementation(async (data) => {
      const id = nextId++;
      books.push({ id, ...data, hasBeenRead: false, createdAt: new Date() });
      return id;
    }),
    getBookById: vi.fn().mockImplementation(async (id) => {
      return books.find((b) => b.id === id);
    }),
    getAllBooks: vi.fn().mockResolvedValue(books),
    markBookAsRead: vi.fn().mockResolvedValue(undefined),
    searchBooks: vi.fn().mockResolvedValue([]),
    getReadBooks: vi.fn().mockResolvedValue([]),
    createEvent: vi.fn().mockImplementation(async (data) => {
      const id = nextId++;
      events.push({
        id,
        ...data,
        status: "submissions_open",
        winningBookId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return id;
    }),
    getEventById: vi.fn().mockImplementation(async (id) => {
      return events.find((e) => e.id === id);
    }),
    getAllEvents: vi.fn().mockResolvedValue(events),
    getActiveEvents: vi.fn().mockResolvedValue([]),
    getCompletedEvents: vi.fn().mockResolvedValue([]),
    updateEventStatus: vi.fn().mockImplementation(async (id, status) => {
      const event = events.find((e) => e.id === id);
      if (event) event.status = status;
    }),
    setEventWinner: vi.fn().mockResolvedValue(undefined),
    createSubmission: vi.fn().mockImplementation(async (data) => {
      const id = nextId++;
      submissions.push({ id, ...data, createdAt: new Date() });
      return id;
    }),
    getEventSubmissions: vi.fn().mockImplementation(async (eventId) => {
      return submissions
        .filter((s) => s.eventId === eventId)
        .map((s) => {
          const book = books.find((b) => b.id === s.bookId);
          return {
            ...s,
            bookTitle: book?.title ?? "Unknown",
            bookAuthor: book?.author ?? "Unknown",
            bookGenre: book?.genre,
            bookPageCount: book?.pageCount,
            bookRating: book?.rating,
            bookCoverUrl: null,
            submitterName: "Test User",
          };
        });
    }),
    getUserSubmissionForEvent: vi.fn().mockImplementation(async (eventId, userId) => {
      return submissions.find((s) => s.eventId === eventId && s.submittedBy === userId);
    }),
    recordSubmissionHistory: vi.fn().mockResolvedValue(undefined),
    getBookSubmissionCount: vi.fn().mockResolvedValue(0),
    getBookSubmissionCounts: vi.fn().mockResolvedValue(new Map()),
    createBracketMatch: vi.fn().mockImplementation(async (data) => {
      const id = nextId++;
      brackets.push({ id, ...data, winnerId: null, status: "pending", createdAt: new Date() });
      return id;
    }),
    getEventBrackets: vi.fn().mockImplementation(async (eventId) => {
      return brackets.filter((b) => b.eventId === eventId);
    }),
    updateBracketWinner: vi.fn().mockImplementation(async (bracketId, winnerId) => {
      const b = brackets.find((br) => br.id === bracketId);
      if (b) { b.winnerId = winnerId; b.status = "completed"; }
    }),
    updateBracketStatus: vi.fn().mockImplementation(async (bracketId, status) => {
      const b = brackets.find((br) => br.id === bracketId);
      if (b) b.status = status;
    }),
    updateBracketBooks: vi.fn().mockImplementation(async (bracketId, data) => {
      const b = brackets.find((br) => br.id === bracketId);
      if (b) Object.assign(b, data);
    }),
    castVote: vi.fn().mockImplementation(async (data) => {
      votes.push({ id: nextId++, ...data, createdAt: new Date() });
    }),
    getUserVoteForBracket: vi.fn().mockImplementation(async (bracketId, userId) => {
      return votes.find((v) => v.bracketId === bracketId && v.userId === userId);
    }),
    getUserVoteForEvent: vi.fn().mockImplementation(async (eventId, userId) => {
      return votes.find((v) => v.eventId === eventId && !v.bracketId && v.userId === userId);
    }),
    getBracketVotes: vi.fn().mockImplementation(async (bracketId) => {
      return votes.filter((v) => v.bracketId === bracketId);
    }),
    getEventVotes: vi.fn().mockImplementation(async (eventId) => {
      return votes.filter((v) => v.eventId === eventId && !v.bracketId);
    }),
    createCalendarEvent: vi.fn().mockImplementation(async () => nextId++),
    getCalendarEvents: vi.fn().mockResolvedValue([]),
    getUpcomingCalendarEvents: vi.fn().mockResolvedValue([]),
    deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
    createChatMessage: vi.fn().mockImplementation(async () => nextId++),
    getChatMessages: vi.fn().mockResolvedValue([]),
    createMilestone: vi.fn().mockImplementation(async () => nextId++),
    getEventMilestones: vi.fn().mockResolvedValue([]),
  };
});

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user data for authenticated user", async () => {
    const user = createMockUser();
    const caller = appRouter.createCaller(createCtx(user));
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("Test User");
  });
});

describe("books", () => {
  it("creates a book", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.books.create({
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      genre: "Classic",
      pageCount: 180,
      rating: 85,
    });
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it("rejects unauthenticated book creation", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.books.create({ title: "Test", author: "Test" })
    ).rejects.toThrow();
  });

  it("validates book creation input", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.books.create({ title: "", author: "Test" })
    ).rejects.toThrow();
  });
});

describe("events", () => {
  it("admin can create an event", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.events.create({
      title: "March Selection",
      votingScheme: "tournament",
      maxSubmissions: 8,
    });
    expect(result.id).toBeDefined();
  });

  it("non-admin cannot create an event", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.events.create({
        title: "March Selection",
        votingScheme: "tournament",
      })
    ).rejects.toThrow();
  });

  it("creates event with all voting schemes", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));

    const tournament = await caller.events.create({
      title: "Tournament Event",
      votingScheme: "tournament",
    });
    expect(tournament.id).toBeDefined();

    const majority = await caller.events.create({
      title: "Majority Event",
      votingScheme: "simple_majority",
    });
    expect(majority.id).toBeDefined();

    const ranked = await caller.events.create({
      title: "Ranked Event",
      votingScheme: "ranked_choice",
    });
    expect(ranked.id).toBeDefined();
  });

  it("creates event with submission criteria", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.events.create({
      title: "Strict Event",
      votingScheme: "simple_majority",
      maxPageCount: 300,
      allowPreviouslyRead: false,
      allowedGenres: ["Fiction", "Sci-Fi"],
      minRating: 70,
      anonymousSubmissions: true,
      maxSubmissions: 6,
    });
    expect(result.id).toBeDefined();
  });
});

describe("invitations", () => {
  it("admin can create an invitation", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.invitations.create({
      email: "newmember@example.com",
      role: "user",
    });
    expect(result.token).toBeDefined();
    expect(result.token.length).toBeGreaterThan(10);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("non-admin cannot create invitation", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.invitations.create({ role: "user" })
    ).rejects.toThrow();
  });
});

describe("calendar", () => {
  it("creates a calendar event", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.calendar.create({
      title: "Book Discussion",
      eventType: "meeting",
      startDate: new Date("2026-04-01T18:00:00Z"),
    });
    expect(result.id).toBeDefined();
  });

  it("creates calendar event with all types", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const types = [
      "submission_deadline",
      "voting_deadline",
      "reading_milestone",
      "meeting",
      "custom",
    ] as const;

    for (const eventType of types) {
      const result = await caller.calendar.create({
        title: `Test ${eventType}`,
        eventType,
        startDate: new Date("2026-04-01T18:00:00Z"),
      });
      expect(result.id).toBeDefined();
    }
  });
});

describe("chat", () => {
  it("sends a chat message", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.chat.send({
      content: "Hello book club!",
    });
    expect(result.id).toBeDefined();
  });

  it("rejects empty messages", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(caller.chat.send({ content: "" })).rejects.toThrow();
  });

  it("rejects messages over 2000 chars", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.chat.send({ content: "x".repeat(2001) })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated messages", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.chat.send({ content: "Hello" })
    ).rejects.toThrow();
  });
});

describe("milestones", () => {
  it("admin can create a milestone", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.milestones.create({
      eventId: 1,
      title: "Read chapters 1-5",
      targetDate: new Date("2026-04-15T00:00:00Z"),
      targetPage: 100,
    });
    expect(result.id).toBeDefined();
  });

  it("non-admin cannot create milestone", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.milestones.create({
        eventId: 1,
        title: "Test",
        targetDate: new Date(),
      })
    ).rejects.toThrow();
  });
});

describe("voting", () => {
  it("casts a simple majority vote", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser({ id: 50, openId: "voter-1" })));
    const result = await caller.voting.castSimple({
      eventId: 999,
      bookId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("casts a ranked choice vote", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser({ id: 51, openId: "voter-2" })));
    const result = await caller.voting.castRanked({
      eventId: 998,
      rankings: [3, 1, 2],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty rankings", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.voting.castRanked({ eventId: 1, rankings: [] })
    ).rejects.toThrow();
  });
});

describe("members", () => {
  it("authenticated user can list members", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.members.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("unauthenticated user cannot list members", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(caller.members.list()).rejects.toThrow();
  });

  it("admin can update member role", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.members.updateRole({
      userId: 1,
      role: "admin",
    });
    expect(result.success).toBe(true);
  });
});

describe("openLibrary", () => {
  it("searches Open Library for books", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const results = await caller.openLibrary.search({ query: "The Great Gatsby" });
    expect(Array.isArray(results)).toBe(true);
    // Results come from the real Open Library API
    if (results.length > 0) {
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("author");
      expect(results[0]).toHaveProperty("coverUrl");
    }
  });

  it("rejects empty search query", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.openLibrary.search({ query: "" })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.openLibrary.search({ query: "test" })
    ).rejects.toThrow();
  });
});

describe("notifications", () => {
  it("admin can send voting notification", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.notifications.notifyVotingOpen({
      eventId: 1,
      eventTitle: "March Selection",
    });
    expect(result.success).toBe(true);
  });

  it("admin can send deadline notification", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.notifications.notifyDeadline({
      eventTitle: "March Selection",
      deadlineType: "submission",
      deadline: "2026-04-01",
    });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot send voting notification", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.notifications.notifyVotingOpen({ eventId: 1, eventTitle: "Test" })
    ).rejects.toThrow();
  });

  it("authenticated user can send chat notification", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.notifications.notifyNewChat({
      senderName: "Test User",
      preview: "Check out this book!",
    });
    expect(result.success).toBe(true);
  });
});

describe("books with cover URL", () => {
  it("creates a book with cover URL", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.books.create({
      title: "Dune",
      author: "Frank Herbert",
      coverUrl: "https://covers.openlibrary.org/b/id/12345-L.jpg",
      pageCount: 412,
      genre: "Science Fiction",
    });
    expect(result.id).toBeDefined();
  });

  it("creates a book without cover URL", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.books.create({
      title: "1984",
      author: "George Orwell",
    });
    expect(result.id).toBeDefined();
  });
});
