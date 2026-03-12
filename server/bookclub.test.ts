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
vi.mock("./db", () => {
  // Pre-seed group 1 with admin (id:99) and regular user (id:1) as members
  const groups: any[] = [{ id: 1, name: "Test Book Club", description: "A test group", createdBy: 99, createdAt: new Date() }];
  const groupMembers: any[] = [
    { id: 1, groupId: 1, userId: 99, role: "admin", joinedAt: new Date() },
    { id: 2, groupId: 1, userId: 1, role: "member", joinedAt: new Date() },
  ];
  const books: any[] = [];
  const events: any[] = [];
  const submissions: any[] = [];
  const invitations: any[] = [];
  const calendarEvents: any[] = [];
  const chatMessages: any[] = [];
  const brackets: any[] = [];
  const votes: any[] = [];
  const submissionHistory: any[] = [];
  let nextId = 100;

  return {
    getDb: vi.fn().mockResolvedValue({
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    }),
    // Group functions
    createGroup: vi.fn().mockImplementation(async (data) => {
      const id = nextId++;
      groups.push({ id, ...data, createdAt: new Date() });
      // Auto-add creator as admin
      groupMembers.push({ id: nextId++, groupId: id, userId: data.createdBy, role: "admin", joinedAt: new Date() });
      return id;
    }),
    getGroupById: vi.fn().mockImplementation(async (id) => groups.find((g) => g.id === id) ?? null),
    getUserGroups: vi.fn().mockImplementation(async (userId) => {
      const memberOf = groupMembers.filter((gm) => gm.userId === userId);
      return memberOf.map((gm) => {
        const group = groups.find((g) => g.id === gm.groupId);
        return { ...group, role: gm.role, memberCount: groupMembers.filter((m) => m.groupId === gm.groupId).length };
      }).filter(Boolean);
    }),
    updateGroup: vi.fn().mockResolvedValue(undefined),
    getGroupMembers: vi.fn().mockImplementation(async (groupId) => {
      return groupMembers.filter((gm) => gm.groupId === groupId).map((gm) => ({
        id: gm.userId, name: "Test User", email: "test@example.com", role: gm.role, joinedAt: gm.joinedAt, siteRole: "user",
      }));
    }),
    getGroupMembership: vi.fn().mockImplementation(async (groupId, userId) => {
      return groupMembers.find((gm) => gm.groupId === groupId && gm.userId === userId) ?? null;
    }),
    updateGroupMemberRole: vi.fn().mockResolvedValue(undefined),
    addGroupMember: vi.fn().mockImplementation(async (groupId, userId, role) => {
      groupMembers.push({ id: nextId++, groupId, userId, role, joinedAt: new Date() });
    }),
    // Invitation functions
    createInvitation: vi.fn().mockImplementation(async (token, groupId, invitedBy, email, role, expiresAt) => {
      invitations.push({ id: nextId++, token, groupId, invitedBy, email, role, status: "pending", expiresAt, createdAt: new Date(), groupName: "Test Group" });
    }),
    getInvitationByToken: vi.fn().mockImplementation(async (token) => invitations.find((i) => i.token === token)),
    acceptInvitation: vi.fn().mockResolvedValue(undefined),
    getPendingInvitations: vi.fn().mockResolvedValue([]),
    revokeInvitation: vi.fn().mockImplementation(async (invitationId: number, groupId: number) => {
      const idx = invitations.findIndex((i: any) => i.id === invitationId && i.groupId === groupId && i.status === "pending");
      if (idx >= 0) invitations.splice(idx, 1);
    }),
    getInvitationHistory: vi.fn().mockImplementation(async (groupId: number) => {
      return invitations.filter((i: any) => i.groupId === groupId && i.status === "accepted").map((i: any) => ({
        id: i.id, email: i.email, role: i.role, status: i.status, createdAt: i.createdAt, expiresAt: i.expiresAt,
        invitedByName: "Admin", acceptedByName: "Test User",
      }));
    }),
    // Book functions
    createBook: vi.fn().mockImplementation(async (data) => {
      const id = nextId++;
      books.push({ id, ...data, hasBeenRead: false, createdAt: new Date() });
      return id;
    }),
    getBookById: vi.fn().mockImplementation(async (id) => books.find((b) => b.id === id)),
    getAllBooks: vi.fn().mockImplementation(async (groupId) => books.filter((b) => b.groupId === groupId)),
    markBookAsRead: vi.fn().mockResolvedValue(undefined),
    searchBooks: vi.fn().mockResolvedValue([]),
    getReadBooks: vi.fn().mockResolvedValue([]),
    // Event functions
    createEvent: vi.fn().mockImplementation(async (data) => {
      const id = nextId++;
      events.push({ id, ...data, status: "submissions_open", winningBookId: null, createdAt: new Date(), updatedAt: new Date() });
      return id;
    }),
    getEventById: vi.fn().mockImplementation(async (id) => events.find((e) => e.id === id)),
    getAllEvents: vi.fn().mockImplementation(async (groupId) => events.filter((e) => e.groupId === groupId)),
    getActiveEvents: vi.fn().mockResolvedValue([]),
    getCompletedEvents: vi.fn().mockResolvedValue([]),
    updateEventStatus: vi.fn().mockImplementation(async (id, status) => {
      const event = events.find((e) => e.id === id);
      if (event) event.status = status;
    }),
    setEventWinner: vi.fn().mockResolvedValue(undefined),
    // Submission functions
    createSubmission: vi.fn().mockImplementation(async (data) => {
      const id = nextId++;
      submissions.push({ id, ...data, createdAt: new Date() });
      return id;
    }),
    getEventSubmissions: vi.fn().mockImplementation(async (eventId) => {
      return submissions.filter((s) => s.eventId === eventId).map((s) => {
        const book = books.find((b) => b.id === s.bookId);
        return { ...s, bookTitle: book?.title ?? "Unknown", bookAuthor: book?.author ?? "Unknown", bookGenre: book?.genre, bookPageCount: book?.pageCount, bookRating: book?.rating, bookCoverUrl: null, submitterName: "Test User" };
      });
    }),
    getUserSubmissionForEvent: vi.fn().mockImplementation(async (eventId, userId) => submissions.find((s) => s.eventId === eventId && s.submittedBy === userId)),
    recordSubmissionHistory: vi.fn().mockResolvedValue(undefined),
    getBookSubmissionCount: vi.fn().mockResolvedValue(0),
    getBookSubmissionCounts: vi.fn().mockResolvedValue(new Map()),
    // Bracket functions
    createBracketMatch: vi.fn().mockImplementation(async (data) => {
      const id = nextId++;
      brackets.push({ id, ...data, winnerId: null, status: "pending", createdAt: new Date() });
      return id;
    }),
    getEventBrackets: vi.fn().mockImplementation(async (eventId) => brackets.filter((b) => b.eventId === eventId)),
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
    // Vote functions
    castVote: vi.fn().mockImplementation(async (data) => {
      votes.push({ id: nextId++, ...data, createdAt: new Date() });
    }),
    getUserVoteForBracket: vi.fn().mockImplementation(async (bracketId, userId) => votes.find((v) => v.bracketId === bracketId && v.userId === userId)),
    getUserVoteForEvent: vi.fn().mockImplementation(async (eventId, userId) => votes.find((v) => v.eventId === eventId && !v.bracketId && v.userId === userId)),
    getBracketVotes: vi.fn().mockImplementation(async (bracketId) => votes.filter((v) => v.bracketId === bracketId)),
    getEventVotes: vi.fn().mockImplementation(async (eventId) => votes.filter((v) => v.eventId === eventId && !v.bracketId)),
    // Calendar functions
    createCalendarEvent: vi.fn().mockImplementation(async () => nextId++),
    getCalendarEvents: vi.fn().mockResolvedValue([]),
    getUpcomingCalendarEvents: vi.fn().mockResolvedValue([]),
    deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
    // Chat functions
    createChatMessage: vi.fn().mockImplementation(async () => nextId++),
    getChatMessages: vi.fn().mockResolvedValue([]),
    // Milestone functions
    createMilestone: vi.fn().mockImplementation(async () => nextId++),
    getEventMilestones: vi.fn().mockResolvedValue([]),
    // Reading progress functions
    upsertReadingProgress: vi.fn().mockImplementation(async () => nextId++),
    getEventReadingProgress: vi.fn().mockResolvedValue([]),
    getMyReadingProgress: vi.fn().mockResolvedValue(null),
    // Book review functions
    createBookReview: vi.fn().mockImplementation(async () => nextId++),
    getBookReviews: vi.fn().mockResolvedValue([]),
    getBookAverageRating: vi.fn().mockResolvedValue(null),
    // Public groups
    getPublicGroups: vi.fn().mockImplementation(async (excludeUserId?: number) => {
      const publicGroups = groups.filter((g: any) => g.isPublic);
      if (excludeUserId) {
        const memberGroupIds = new Set(groupMembers.filter((gm: any) => gm.userId === excludeUserId).map((gm: any) => gm.groupId));
        return publicGroups.filter((g: any) => !memberGroupIds.has(g.id)).map((g: any) => ({ ...g, memberCount: groupMembers.filter((gm: any) => gm.groupId === g.id).length }));
      }
      return publicGroups.map((g: any) => ({ ...g, memberCount: groupMembers.filter((gm: any) => gm.groupId === g.id).length }));
    }),
    getUserSubmissionsForEvent: vi.fn().mockImplementation(async (eventId: number, userId: number) => {
      return submissions.filter((s: any) => s.eventId === eventId && s.submittedBy === userId);
    }),
    updateEvent: vi.fn().mockResolvedValue(undefined),
    // Group settings functions
    deleteGroup: vi.fn().mockResolvedValue(undefined),
    removeGroupMember: vi.fn().mockResolvedValue(undefined),
    transferGroupOwnership: vi.fn().mockResolvedValue(undefined),
  };
});

// ─── Auth Tests ─────────────────────────────────────────────────────
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

// ─── Group Tests ────────────────────────────────────────────────────
describe("groups", () => {
  it("creates a group", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.groups.create({ name: "Sci-Fi Book Club", description: "We read sci-fi" });
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it("lists user groups", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const groups = await caller.groups.myGroups();
    expect(Array.isArray(groups)).toBe(true);
  });

  it("rejects unauthenticated group creation", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(caller.groups.create({ name: "Test" })).rejects.toThrow();
  });

  it("validates group name is not empty", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(caller.groups.create({ name: "" })).rejects.toThrow();
  });
});

// ─── Book Tests (group-scoped) ──────────────────────────────────────
describe("books", () => {
  it("creates a book with groupId", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.books.create({
      groupId: 1,
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      genre: "Classic",
      pageCount: 180,
      rating: 85,
    });
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it("creates a book with cover URL", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.books.create({
      groupId: 1,
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
      groupId: 1,
      title: "1984",
      author: "George Orwell",
    });
    expect(result.id).toBeDefined();
  });

  it("rejects unauthenticated book creation", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.books.create({ groupId: 1, title: "Test", author: "Test" })
    ).rejects.toThrow();
  });

  it("validates book creation input", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.books.create({ groupId: 1, title: "", author: "Test" })
    ).rejects.toThrow();
  });
});

// ─── Event Tests (group-scoped) ─────────────────────────────────────
describe("events", () => {
  it("group admin can create an event", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.events.create({
      groupId: 1,
      title: "March Selection",
      votingScheme: "tournament",
      maxSubmissions: 8,
    });
    expect(result.id).toBeDefined();
  });

  it("creates event with all voting schemes", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));

    const tournament = await caller.events.create({
      groupId: 1,
      title: "Tournament Event",
      votingScheme: "tournament",
    });
    expect(tournament.id).toBeDefined();

    const majority = await caller.events.create({
      groupId: 1,
      title: "Majority Event",
      votingScheme: "simple_majority",
    });
    expect(majority.id).toBeDefined();

    const ranked = await caller.events.create({
      groupId: 1,
      title: "Ranked Event",
      votingScheme: "ranked_choice",
    });
    expect(ranked.id).toBeDefined();
  });

  it("creates event with submission criteria", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.events.create({
      groupId: 1,
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

// ─── Invitation Tests (group-scoped) ────────────────────────────────
describe("invitations", () => {
  it("group admin can create an invitation", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.invitations.create({
      groupId: 1,
      email: "newmember@example.com",
      role: "member",
    });
    expect(result.token).toBeDefined();
    expect(result.token.length).toBeGreaterThan(10);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("creates link-only invitation (no email)", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.invitations.create({
      groupId: 1,
      role: "member",
    });
    expect(result.token).toBeDefined();
  });

  it("rejects unauthenticated invitation creation", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.invitations.create({ groupId: 1, role: "member" })
    ).rejects.toThrow();
  });
});

// ─── Calendar Tests (group-scoped) ──────────────────────────────────
describe("calendar", () => {
  it("creates a calendar event", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.calendar.create({
      groupId: 1,
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
        groupId: 1,
        title: `Test ${eventType}`,
        eventType,
        startDate: new Date("2026-04-01T18:00:00Z"),
      });
      expect(result.id).toBeDefined();
    }
  });
});

// ─── Chat Tests (group-scoped) ──────────────────────────────────────
describe("chat", () => {
  it("sends a chat message", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.chat.send({
      groupId: 1,
      content: "Hello book club!",
    });
    expect(result.id).toBeDefined();
  });

  it("rejects empty messages", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(caller.chat.send({ groupId: 1, content: "" })).rejects.toThrow();
  });

  it("rejects messages over 2000 chars", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.chat.send({ groupId: 1, content: "x".repeat(2001) })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated messages", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.chat.send({ groupId: 1, content: "Hello" })
    ).rejects.toThrow();
  });
});

// ─── Milestone Tests (group-scoped) ─────────────────────────────────
describe("milestones", () => {
  it("group admin can create a milestone", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.milestones.create({
      groupId: 1,
      eventId: 1,
      title: "Read chapters 1-5",
      targetDate: new Date("2026-04-15T00:00:00Z"),
      targetPage: 100,
    });
    expect(result.id).toBeDefined();
  });

  it("rejects unauthenticated milestone creation", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.milestones.create({
        groupId: 1,
        eventId: 1,
        title: "Test",
        targetDate: new Date(),
      })
    ).rejects.toThrow();
  });
});

// ─── Voting Tests ───────────────────────────────────────────────────
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

// ─── Members Tests (group-scoped) ───────────────────────────────────
describe("members", () => {
  it("authenticated user can list group members", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.members.list({ groupId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("unauthenticated user cannot list members", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(caller.members.list({ groupId: 1 })).rejects.toThrow();
  });

  it("admin can update member role", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.members.updateRole({
      groupId: 1,
      userId: 1,
      role: "admin",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Open Library Tests ─────────────────────────────────────────────
describe("openLibrary", () => {
  it("searches Open Library for books", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const results = await caller.openLibrary.search({ query: "The Great Gatsby" });
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("author");
      expect(results[0]).toHaveProperty("coverUrl");
    }
  }, 15000);

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

// ─── Reading Progress Tests ────────────────────────────────────────
describe("readingProgress", () => {
  it("updates reading progress for a member", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.readingProgress.update({
      groupId: 1,
      eventId: 1,
      currentPage: 150,
      totalPages: 400,
    });
    expect(result.id).toBeDefined();
  });

  it("gets reading progress for an event", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.readingProgress.getForEvent({ eventId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets my reading progress", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.readingProgress.mine({ eventId: 1 });
    expect(result).toBeNull();
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.readingProgress.update({ groupId: 1, eventId: 1, currentPage: 50 })
    ).rejects.toThrow();
  });
});

// ─── Book Reviews Tests ────────────────────────────────────────────
describe("reviews", () => {
  it("creates a book review", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.reviews.create({
      groupId: 1,
      bookId: 100,
      rating: 4,
      reviewText: "Excellent book, highly recommend!",
    });
    expect(result.id).toBeDefined();
  });

  it("validates rating range (1-5)", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.reviews.create({ groupId: 1, bookId: 100, rating: 0 })
    ).rejects.toThrow();
    await expect(
      caller.reviews.create({ groupId: 1, bookId: 100, rating: 6 })
    ).rejects.toThrow();
  });

  it("lists reviews for a book", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.reviews.listForBook({ groupId: 1, bookId: 100 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets average rating for a book", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.reviews.averageRating({ groupId: 1, bookId: 100 });
    // null when no reviews
    expect(result).toBeNull();
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.reviews.create({ groupId: 1, bookId: 100, rating: 3 })
    ).rejects.toThrow();
  });
});

// ─── Group Settings Tests ──────────────────────────────────────────
describe("groupSettings", () => {
  it("admin can update group via groups.update", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.groups.update({
      groupId: 1,
      name: "Updated Book Club Name",
    });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot update group", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.groups.update({ groupId: 1, name: "Hacked" })
    ).rejects.toThrow();
  });

  it("creator can delete group", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.groupSettings.delete({ groupId: 1 });
    expect(result.success).toBe(true);
  });

  it("member can leave group", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.groupSettings.leave({ groupId: 1 });
    expect(result.success).toBe(true);
  });
});

// ─── Notification Tests (group-scoped) ──────────────────────────────
describe("notifications", () => {
  it("group admin can send voting notification", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.notifications.notifyVotingOpen({
      groupId: 1,
      eventId: 1,
      eventTitle: "March Selection",
    });
    expect(result.success).toBe(true);
  });

  it("group admin can send deadline notification", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.notifications.notifyDeadline({
      groupId: 1,
      eventTitle: "March Selection",
      deadlineType: "submission",
      deadline: "2026-04-01",
    });
    expect(result.success).toBe(true);
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

// ─── Public/Private Group Tests ────────────────────────────────────
describe("public groups", () => {
  it("creates a public group", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.groups.create({
      name: "Public Readers",
      description: "Open to everyone",
      isPublic: true,
    });
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it("creates a private group by default", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.groups.create({
      name: "Secret Club",
    });
    expect(result.id).toBeDefined();
  });

  it("lists public groups", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const publicGroups = await caller.groups.publicGroups();
    expect(Array.isArray(publicGroups)).toBe(true);
  });

  it("can join a public group", async () => {
    // First create a public group as admin
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    const group = await adminCaller.groups.create({
      name: "Open Book Club",
      description: "Join us!",
      isPublic: true,
    });

    // A different user joins the public group
    const user2 = createMockUser({ id: 50, openId: "user-50", name: "User 50" });
    const user2Caller = appRouter.createCaller(createCtx(user2));
    const result = await user2Caller.groups.joinPublic({ groupId: group.id });
    expect(result.success).toBe(true);
  });

  it("rejects joining a private group directly", async () => {
    // Group 1 is private (default)
    const user2 = createMockUser({ id: 55, openId: "user-55", name: "User 55" });
    const user2Caller = appRouter.createCaller(createCtx(user2));
    await expect(
      user2Caller.groups.joinPublic({ groupId: 1 })
    ).rejects.toThrow("private");
  });

  it("rejects unauthenticated public group listing", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(caller.groups.publicGroups()).rejects.toThrow();
  });

  it("admin can update group visibility", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.groups.update({
      groupId: 1,
      isPublic: true,
    });
    expect(result.success).toBe(true);
  });
});

// ─── Invitation Revoke & History Tests ─────────────────────────────
describe("invitation management", () => {
  it("admin can revoke a pending invitation", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    // Create an invitation first
    const inv = await adminCaller.invitations.create({
      groupId: 1,
      email: "revoke-test@example.com",
      role: "member",
    });
    expect(inv.token).toBeDefined();

    // Revoke it — we need the invitation id, use a known approach
    // Since we can't easily get the id from create, we'll use a mock invitationId
    const result = await adminCaller.invitations.revoke({
      groupId: 1,
      invitationId: 999, // mock id
    });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot revoke invitations", async () => {
    const memberCaller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      memberCaller.invitations.revoke({ groupId: 1, invitationId: 1 })
    ).rejects.toThrow();
  });

  it("admin can view invitation history", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    const history = await adminCaller.invitations.history({ groupId: 1 });
    expect(Array.isArray(history)).toBe(true);
  });

  it("non-admin cannot view invitation history", async () => {
    const memberCaller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      memberCaller.invitations.history({ groupId: 1 })
    ).rejects.toThrow();
  });

  it("unauthenticated user cannot revoke invitations", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.invitations.revoke({ groupId: 1, invitationId: 1 })
    ).rejects.toThrow();
  });
});

// ─── Bulk Invite Tests ──────────────────────────────────────────────
describe("bulk invitations", () => {
  it("admin can create bulk invitations", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    const results = await adminCaller.invitations.bulkCreate({
      groupId: 1,
      emails: ["bulk1@example.com", "bulk2@example.com", "bulk3@example.com"],
      role: "member",
    });
    expect(results).toHaveLength(3);
    expect(results[0].email).toBe("bulk1@example.com");
    expect(results[0].token).toBeDefined();
    expect(results[1].email).toBe("bulk2@example.com");
    expect(results[2].email).toBe("bulk3@example.com");
  });

  it("non-admin cannot create bulk invitations", async () => {
    const memberCaller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      memberCaller.invitations.bulkCreate({
        groupId: 1,
        emails: ["test@example.com"],
        role: "member",
      })
    ).rejects.toThrow();
  });

  it("rejects empty email list", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    await expect(
      adminCaller.invitations.bulkCreate({
        groupId: 1,
        emails: [],
        role: "member",
      })
    ).rejects.toThrow();
  });
});

// ─── Remove Member Tests ────────────────────────────────────────────
describe("remove member", () => {
  it("admin can remove a member", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await adminCaller.groupSettings.removeMember({
      groupId: 1,
      userId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("admin cannot remove themselves", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    await expect(
      adminCaller.groupSettings.removeMember({
        groupId: 1,
        userId: 99,
      })
    ).rejects.toThrow("Cannot remove yourself");
  });

  it("non-admin cannot remove members", async () => {
    const memberCaller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      memberCaller.groupSettings.removeMember({
        groupId: 1,
        userId: 99,
      })
    ).rejects.toThrow();
  });
});

// ─── Group Cover Image Tests ────────────────────────────────────────
describe("group cover image", () => {
  it("admin can update group with coverUrl", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await adminCaller.groups.update({
      groupId: 1,
      coverUrl: "https://example.com/cover.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("admin can clear coverUrl", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await adminCaller.groups.update({
      groupId: 1,
      coverUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot update cover", async () => {
    const memberCaller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      memberCaller.groups.update({
        groupId: 1,
        coverUrl: "https://example.com/cover.jpg",
      })
    ).rejects.toThrow();
  });
});
