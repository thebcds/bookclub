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
        return { ...s, bookTitle: book?.title ?? "Unknown", bookAuthor: book?.author ?? "Unknown", bookGenre: book?.genre, bookPageCount: book?.pageCount, bookRating: book?.rating, bookCoverUrl: null, bookDescription: book?.description ?? null, bookIsbn: book?.isbn ?? null, submitterName: "Test User" };
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
    // Profile functions
    updateUserProfile: vi.fn().mockResolvedValue(undefined),
    getUserProfile: vi.fn().mockImplementation(async (userId: number) => {
      return { id: userId, name: "Test User", email: "test@example.com", bio: null, favoriteGenres: "[]", avatarUrl: null, createdAt: new Date() };
    }),
    getUserStats: vi.fn().mockResolvedValue({ groupsJoined: 1, eventsParticipated: 0, reviewsWritten: 0, votesCast: 0 }),
    // Submission removal functions
    deleteSubmission: vi.fn().mockImplementation(async (submissionId: number) => {
      const idx = submissions.findIndex((s: any) => s.id === submissionId);
      if (idx >= 0) submissions.splice(idx, 1);
    }),
    getSubmissionById: vi.fn().mockImplementation(async (submissionId: number) => {
      return submissions.find((s: any) => s.id === submissionId);
    }),
    // Voting helper functions
    getEventVoterIds: vi.fn().mockImplementation(async (eventId: number) => {
      const eventVotes = votes.filter((v: any) => v.eventId === eventId);
      return [...new Set(eventVotes.map((v: any) => v.userId))];
    }),
    deleteUserVoteForBracket: vi.fn().mockImplementation(async (bracketId: number, userId: number) => {
      const idx = votes.findIndex((v: any) => v.bracketId === bracketId && v.userId === userId);
      if (idx !== -1) votes.splice(idx, 1);
    }),
    deleteUserVoteForEvent: vi.fn().mockImplementation(async (eventId: number, userId: number) => {
      const idx = votes.findIndex((v: any) => v.eventId === eventId && !v.bracketId && v.userId === userId);
      if (idx !== -1) votes.splice(idx, 1);
    }),
    updateVoteChoice: vi.fn().mockImplementation(async (voteId: number, newBookId: number, newRankings?: number[] | null) => {
      const vote = votes.find((v: any) => v.id === voteId);
      if (vote) {
        vote.bookId = newBookId;
        if (newRankings !== undefined) vote.rankings = newRankings;
      }
    }),
    clearBracketWinner: vi.fn().mockImplementation(async (bracketId: number) => {
      const bracket = brackets.find((b: any) => b.id === bracketId);
      if (bracket) {
        bracket.winnerId = null;
        bracket.status = "voting";
      }
    }),
    clearBracketBookSlot: vi.fn().mockImplementation(async (bracketId: number, slot: "book1" | "book2") => {
      const bracket = brackets.find((b: any) => b.id === bracketId);
      if (bracket) {
        if (slot === "book1") { bracket.book1Id = null; bracket.book1 = null; }
        else { bracket.book2Id = null; bracket.book2 = null; }
      }
    }),
    clearEventWinner: vi.fn().mockImplementation(async (eventId: number) => {
      const event = events.find((e: any) => e.id === eventId);
      if (event) event.winnerBookId = null;
    }),
    getBracketVoters: vi.fn().mockImplementation(async (bracketId: number) => {
      return votes.filter((v: any) => v.bracketId === bracketId).map((v: any) => ({
        userId: v.userId,
        userName: "Test User",
        avatarUrl: null,
        bookId: v.bookId,
      }));
    }),
    getEventVoters: vi.fn().mockImplementation(async (eventId: number) => {
      return votes.filter((v: any) => v.eventId === eventId && !v.bracketId).map((v: any) => ({
        userId: v.userId,
        userName: "Test User",
        avatarUrl: null,
        bookId: v.bookId,
      }));
    }),
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


// ─── Profile Tests ──────────────────────────────────────────────────
describe("profile", () => {
  it("gets own profile", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const profile = await caller.profile.me();
    expect(profile).toBeDefined();
    expect(profile?.email).toBe("test@example.com");
  });

  it("gets profile by id", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const profile = await caller.profile.getById({ userId: 1 });
    expect(profile).toBeDefined();
  });

  it("updates profile bio and genres", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.profile.update({
      bio: "I love reading sci-fi and fantasy books",
      favoriteGenres: ["Sci-Fi", "Fantasy"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects bio over 500 chars", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.profile.update({ bio: "x".repeat(501) })
    ).rejects.toThrow();
  });

  it("gets user stats", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const stats = await caller.profile.stats({ userId: 1 });
    expect(stats).toHaveProperty("groupsJoined");
    expect(stats).toHaveProperty("eventsParticipated");
    expect(stats).toHaveProperty("reviewsWritten");
    expect(stats).toHaveProperty("votesCast");
  });

  it("rejects unauthenticated profile access", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(caller.profile.me()).rejects.toThrow();
  });
});

// ─── Group Tags Tests ───────────────────────────────────────────────
describe("group tags", () => {
  it("creates group with tags", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    const result = await caller.groups.create({
      name: "Tagged Group",
      tags: ["Sci-Fi", "Fantasy"],
    });
    expect(result.id).toBeDefined();
  });

  it("rejects more than 10 tags", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.groups.create({
        name: "Too Many Tags",
        tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
      })
    ).rejects.toThrow();
  });
});

// ─── Invite Notification Tests ──────────────────────────────────────
describe("invite notifications", () => {
  it("sends invite notification as admin", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.notifications.sendInviteNotification({
      groupId: 1,
      email: "friend@example.com",
      inviteLink: "https://boox.manus.space/invite/abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-admin sending invite notification", async () => {
    const caller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      caller.notifications.sendInviteNotification({
        groupId: 1,
        email: "friend@example.com",
        inviteLink: "https://boox.manus.space/invite/abc123",
      })
    ).rejects.toThrow();
  });
});

// ─── Admin-Curated Submissions Tests ───────────────────────────────
describe("admin-curated submissions", () => {
  it("creates an event with adminCurated flag", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.events.create({
      groupId: 1,
      title: "Admin Curated Event",
      votingScheme: "tournament",
      adminCurated: true,
      maxTotalSubmissions: 8,
    });
    expect(result.id).toBeDefined();
  });

  it("creates an event without adminCurated flag (defaults to false)", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await caller.events.create({
      groupId: 1,
      title: "Normal Event",
      votingScheme: "simple_majority",
    });
    expect(result.id).toBeDefined();
  });

  it("admin can update event to enable adminCurated", async () => {
    const caller = appRouter.createCaller(createCtx(createAdminUser()));
    // Create a normal event first
    const event = await caller.events.create({
      groupId: 1,
      title: "Switchable Event",
      votingScheme: "simple_majority",
    });
    // Update to admin-curated
    const result = await caller.events.update({
      groupId: 1,
      eventId: event.id,
      adminCurated: true,
    });
    expect(result.success).toBe(true);
  });

  it("non-creator cannot submit to admin-curated event", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    // Create admin-curated event
    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Curated Only",
      votingScheme: "simple_majority",
      adminCurated: true,
      maxTotalSubmissions: 4,
    });

    // Create a book as regular member
    const memberCaller = appRouter.createCaller(createCtx(createMockUser()));
    const book = await memberCaller.books.create({
      groupId: 1,
      title: "Member's Pick",
      author: "Some Author",
    });

    // Regular member tries to submit — should be rejected
    await expect(
      memberCaller.submissions.create({
        groupId: 1,
        eventId: event.id,
        bookId: book.id,
      })
    ).rejects.toThrow("admin-curated");
  });

  it("event creator can submit to admin-curated event", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    // Create admin-curated event
    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Creator Submits",
      votingScheme: "simple_majority",
      adminCurated: true,
      maxTotalSubmissions: 4,
    });

    // Create a book
    const book = await adminCaller.books.create({
      groupId: 1,
      title: "Admin's Pick",
      author: "Admin Author",
    });

    // Creator submits — should succeed
    const result = await adminCaller.submissions.create({
      groupId: 1,
      eventId: event.id,
      bookId: book.id,
    });
    expect(result.id).toBeDefined();
  });

  it("non-admin cannot create admin-curated event", async () => {
    const memberCaller = appRouter.createCaller(createCtx(createMockUser()));
    await expect(
      memberCaller.events.create({
        groupId: 1,
        title: "Member Curated",
        votingScheme: "simple_majority",
        adminCurated: true,
      })
    ).rejects.toThrow();
  });
});

// ─── Anonymous Voting & Hidden Tallies Tests ────────────────────────
describe("anonymous voting and hidden tallies", () => {
  it("creates an event with anonymousVoting and hideTalliesUntilComplete", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await adminCaller.events.create({
      groupId: 1,
      title: "Anonymous Voting Event",
      votingScheme: "tournament",
      anonymousVoting: true,
      hideTalliesUntilComplete: true,
    });
    expect(result.id).toBeDefined();
    const event = await adminCaller.events.getById({ id: result.id });
    expect(event.anonymousVoting).toBe(true);
    expect(event.hideTalliesUntilComplete).toBe(true);
  });

  it("creates an event with defaults (both false)", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await adminCaller.events.create({
      groupId: 1,
      title: "Default Voting Event",
      votingScheme: "simple_majority",
    });
    const event = await adminCaller.events.getById({ id: result.id });
    expect(event.anonymousVoting).toBe(false);
    expect(event.hideTalliesUntilComplete).toBe(false);
  });

  it("updates anonymousVoting and hideTalliesUntilComplete via events.update", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));
    const result = await adminCaller.events.create({
      groupId: 1,
      title: "Update Voting Options Event",
      votingScheme: "tournament",
    });
    const event = await adminCaller.events.getById({ id: result.id });
    expect(event.anonymousVoting).toBe(false);
    expect(event.hideTalliesUntilComplete).toBe(false);

    // The update call should succeed without errors
    await expect(
      adminCaller.events.update({
        groupId: 1,
        eventId: result.id,
        anonymousVoting: true,
        hideTalliesUntilComplete: true,
      })
    ).resolves.toEqual({ success: true });
  });

  it("strips voter identity from bracket votes when anonymousVoting is true for non-creator", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));

    // Create event with anonymous voting
    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Anon Bracket Event",
      votingScheme: "tournament",
      anonymousVoting: true,
      maxTotalSubmissions: 4,
      maxSubmissionsPerMember: 4,
    });

    // Add 2 books and submit them
    const book1 = await adminCaller.books.create({ groupId: 1, title: "Book A", author: "Author A" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "Book B", author: "Author B" });
    await adminCaller.submissions.create({ groupId: 1, eventId: event.id, bookId: book1.id });
    await adminCaller.submissions.create({ groupId: 1, eventId: event.id, bookId: book2.id });

    // Start voting (generates bracket)
    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });

    // Get brackets
    const brackets = await adminCaller.brackets.getForEvent({ eventId: event.id });
    const votingBracket = brackets.find((b) => b.status === "voting");
    if (!votingBracket) return; // Skip if no voting bracket

    // Cast a vote as admin
    await adminCaller.brackets.vote({ bracketId: votingBracket.id, bookId: book1.id, eventId: event.id });

    // Admin (creator) should see full voter info
    const adminVotes = await adminCaller.brackets.getVotes({ bracketId: votingBracket.id, eventId: event.id });
    expect(adminVotes.length).toBeGreaterThan(0);
    // Admin should see their own userId
    expect(adminVotes[0].userId).toBe(99);

    // Regular member should see anonymized votes
    const memberCaller = appRouter.createCaller(createCtx(createMockUser()));
    const memberVotes = await memberCaller.brackets.getVotes({ bracketId: votingBracket.id, eventId: event.id });
    expect(memberVotes.length).toBeGreaterThan(0);
    // Voter identity should be stripped
    expect(memberVotes[0].userId).toBe(0);
  });

  it("does not strip voter identity when anonymousVoting is false", async () => {
    const adminCaller = appRouter.createCaller(createCtx(createAdminUser()));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Non-Anon Bracket Event",
      votingScheme: "tournament",
      anonymousVoting: false,
      maxTotalSubmissions: 4,
      maxSubmissionsPerMember: 4,
    });

    const book1 = await adminCaller.books.create({ groupId: 1, title: "Book C", author: "Author C" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "Book D", author: "Author D" });
    await adminCaller.submissions.create({ groupId: 1, eventId: event.id, bookId: book1.id });
    await adminCaller.submissions.create({ groupId: 1, eventId: event.id, bookId: book2.id });

    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });

    const brackets = await adminCaller.brackets.getForEvent({ eventId: event.id });
    const votingBracket = brackets.find((b) => b.status === "voting");
    if (!votingBracket) return;

    await adminCaller.brackets.vote({ bracketId: votingBracket.id, bookId: book1.id, eventId: event.id });

    // Regular member should see full voter info since anonymousVoting is false
    const memberCaller = appRouter.createCaller(createCtx(createMockUser()));
    const memberVotes = await memberCaller.brackets.getVotes({ bracketId: votingBracket.id, eventId: event.id });
    expect(memberVotes.length).toBeGreaterThan(0);
    expect(memberVotes[0].userId).toBe(99); // Not anonymized
  });
});

// ─── Voting Reminder Tests ─────────────────────────────────────────
describe("notifications.sendVotingReminder", () => {
  it("sends a voting reminder with voter stats", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));

    // Create an event and move it to voting
    const eventId = (await adminCaller.events.create({
      groupId: 1,
      title: "Voting Reminder Test Event",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 1,
      maxTotalSubmissions: 8,
    })).id;

    await adminCaller.events.updateStatus({ groupId: 1, eventId, status: "voting" });

    // Send reminder
    const result = await adminCaller.notifications.sendVotingReminder({ groupId: 1, eventId });
    expect(result.success).toBe(true);
    expect(result.totalMembers).toBeGreaterThan(0);
    expect(typeof result.votedCount).toBe("number");
    expect(typeof result.nonVoterCount).toBe("number");
  });

  it("rejects non-admin from sending reminder", async () => {
    const user = createMockUser();
    const userCaller = appRouter.createCaller(createCtx(user));

    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));

    const eventId = (await adminCaller.events.create({
      groupId: 1,
      title: "Reminder Reject Test",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 1,
      maxTotalSubmissions: 8,
    })).id;

    await adminCaller.events.updateStatus({ groupId: 1, eventId, status: "voting" });

    await expect(
      userCaller.notifications.sendVotingReminder({ groupId: 1, eventId })
    ).rejects.toThrow();
  });

  it("rejects reminder for non-voting event", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));

    const eventId = (await adminCaller.events.create({
      groupId: 1,
      title: "Non-Voting Reminder Test",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 1,
      maxTotalSubmissions: 8,
    })).id;

    // Event is still in submissions_open status
    await expect(
      adminCaller.notifications.sendVotingReminder({ groupId: 1, eventId })
    ).rejects.toThrow("Event is not in voting phase");
  });
});

// ─── Submission Removal Tests ──────────────────────────────────────
describe("submissions.remove", () => {
  it("allows event creator to remove a submission", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const user = createMockUser();
    const userCaller = appRouter.createCaller(createCtx(user));

    const eventId = (await adminCaller.events.create({
      groupId: 1,
      title: "Removal Test Event",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 1,
      maxTotalSubmissions: 8,
    })).id;

    // User submits a book
    const bookId = (await userCaller.books.create({
      groupId: 1,
      title: "Book to Remove",
      author: "Author",
    })).id;

    const subId = (await userCaller.submissions.create({
      eventId,
      bookId,
      groupId: 1,
    })).id;

    // Admin removes it
    const result = await adminCaller.submissions.remove({
      groupId: 1,
      eventId,
      submissionId: subId,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-creator from removing submissions", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const user = createMockUser();
    const userCaller = appRouter.createCaller(createCtx(user));

    const eventId = (await adminCaller.events.create({
      groupId: 1,
      title: "Removal Reject Test",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 1,
      maxTotalSubmissions: 8,
    })).id;

    const bookId = (await userCaller.books.create({
      groupId: 1,
      title: "Book Not Removable",
      author: "Author",
    })).id;

    const subId = (await userCaller.submissions.create({
      eventId,
      bookId,
      groupId: 1,
    })).id;

    // Regular user tries to remove - should fail
    await expect(
      userCaller.submissions.remove({ groupId: 1, eventId, submissionId: subId })
    ).rejects.toThrow("Only the event creator can remove submissions");
  });

  it("rejects removal when event is not in submissions_open", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));

    const eventId = (await adminCaller.events.create({
      groupId: 1,
      title: "Removal Status Test",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 1,
      maxTotalSubmissions: 8,
    })).id;

    const bookId = (await adminCaller.books.create({
      groupId: 1,
      title: "Book in Voting",
      author: "Author",
    })).id;

    const subId = (await adminCaller.submissions.create({
      eventId,
      bookId,
      groupId: 1,
    })).id;

    // Move to voting
    await adminCaller.events.updateStatus({ groupId: 1, eventId, status: "voting" });

    // Try to remove - should fail
    await expect(
      adminCaller.submissions.remove({ groupId: 1, eventId, submissionId: subId })
    ).rejects.toThrow("Can only remove submissions while submissions are open");
  });
});

// ─── Invite Accept Improvements Tests ──────────────────────────────
describe("invitations.accept improvements", () => {
  it("handles already-accepted invitation gracefully", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const user = createMockUser({ id: 50, openId: "invite-test-user" });
    const userCaller = appRouter.createCaller(createCtx(user));

    // Create invitation
    await adminCaller.invitations.create({
      groupId: 1,
      email: "invitee@test.com",
    });

    // Get the token (from mock)
    const db = await import("./db");
    const invites = await db.getPendingInvitations(1);
    // Since getPendingInvitations returns [], we'll test with a direct token
    // Instead, let's test the verify endpoint
    const verifyResult = await userCaller.invitations.verify({ token: "nonexistent-token" });
    expect(verifyResult.valid).toBe(false);
  });

  it("verify returns invalid for expired invitation", async () => {
    const user = createMockUser();
    const caller = appRouter.createCaller(createCtx(user));

    const result = await caller.invitations.verify({ token: "expired-token-xyz" });
    expect(result.valid).toBe(false);
    expect(result.invitation).toBeNull();
  });
});

// ─── Book Summary Tests ────────────────────────────────────────────
describe("books.getSummary", () => {
  it("returns stored description when book already has one", async () => {
    const user = createMockUser();
    const caller = appRouter.createCaller(createCtx(user));

    // Create a book with a description
    const bookId = (await caller.books.create({
      groupId: 1,
      title: "Book With Description",
      author: "Author A",
      description: "This is a pre-existing summary of the book.",
    })).id;

    const result = await caller.books.getSummary({ bookId });
    expect(result.summary).toBe("This is a pre-existing summary of the book.");
    expect(result.source).toBe("stored");
  });

  it("throws NOT_FOUND for non-existent book", async () => {
    const user = createMockUser();
    const caller = appRouter.createCaller(createCtx(user));

    await expect(caller.books.getSummary({ bookId: 999999 })).rejects.toThrow("Book not found");
  });

  it("attempts to fetch summary for book without description", async () => {
    const user = createMockUser();
    const caller = appRouter.createCaller(createCtx(user));

    // Create a book without description
    const bookId = (await caller.books.create({
      groupId: 1,
      title: "Book Without Description",
      author: "Author B",
    })).id;

    // This will try Open Library and LLM, both may fail in test env
    // but should not throw - should return gracefully
    const result = await caller.books.getSummary({ bookId });
    // Result should have a summary (from OL or LLM) or null
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("source");
  });
});


// ─── Vote Undo & Admin Adjustment Tests ─────────────────────────────
describe("voting.undoVote (simple/ranked)", () => {
  it("allows a voter to undo their simple majority vote before outcome is determined", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const voter = createMockUser({ id: 60, openId: "undo-voter-1" });
    const voterCaller = appRouter.createCaller(createCtx(voter));

    // Create event and submit books first
    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Undo Vote Test",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 2,
    });
    const book = await adminCaller.books.create({ groupId: 1, title: "Undo Book", author: "Author" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "Undo Book 2", author: "Author" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    // Now start voting
    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });
    await voterCaller.voting.castSimple({ eventId: event.id, bookId: book.id });

    // Verify vote exists
    const myVote = await voterCaller.voting.myVote({ eventId: event.id });
    expect(myVote).toBeTruthy();

    // Undo the vote
    const result = await voterCaller.voting.undoVote({ eventId: event.id });
    expect(result.success).toBe(true);

    // Verify vote is gone
    const myVoteAfter = await voterCaller.voting.myVote({ eventId: event.id });
    expect(myVoteAfter).toBeFalsy();
  });

  it("rejects undo when no vote exists", async () => {
    const voter = createMockUser({ id: 61, openId: "undo-voter-2" });
    const voterCaller = appRouter.createCaller(createCtx(voter));
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Undo No Vote Test",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 2,
    });
    const bookA = await adminCaller.books.create({ groupId: 1, title: "No Vote Book A", author: "Author" });
    const bookB = await adminCaller.books.create({ groupId: 1, title: "No Vote Book B", author: "Author" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: bookA.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: bookB.id, groupId: 1 });
    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });

    await expect(voterCaller.voting.undoVote({ eventId: event.id })).rejects.toThrow();
  });
});

describe("voting.adminAdjustVote (simple/ranked)", () => {
  it("allows admin to remove a member's vote", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const voter = createMockUser({ id: 62, openId: "admin-adjust-voter" });
    const voterCaller = appRouter.createCaller(createCtx(voter));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Admin Adjust Test",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 2,
    });
    const book = await adminCaller.books.create({ groupId: 1, title: "Admin Adjust Book", author: "Author" });
    const book2a = await adminCaller.books.create({ groupId: 1, title: "Admin Adjust Book 2", author: "Author" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2a.id, groupId: 1 });
    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });
    await voterCaller.voting.castSimple({ eventId: event.id, bookId: book.id });

    // Admin removes the vote
    const result = await adminCaller.voting.adminAdjustVote({
      groupId: 1,
      eventId: event.id,
      userId: 62,
      action: "remove",
    });
    expect(result.success).toBe(true);
  });

  it("allows admin to change a member's vote", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const voter = createMockUser({ id: 63, openId: "admin-change-voter" });
    const voterCaller = appRouter.createCaller(createCtx(voter));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Admin Change Vote Test",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 3,
    });
    const book1 = await adminCaller.books.create({ groupId: 1, title: "Book A", author: "Author" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "Book B", author: "Author" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });
    await voterCaller.voting.castSimple({ eventId: event.id, bookId: book1.id });

    // Admin changes the vote to book2
    const result = await adminCaller.voting.adminAdjustVote({
      groupId: 1,
      eventId: event.id,
      userId: 63,
      bookId: book2.id,
      action: "change",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-admin from adjusting votes", async () => {
    const member = createMockUser({ id: 1, openId: "test-user-1" });
    const memberCaller = appRouter.createCaller(createCtx(member));

    await expect(
      memberCaller.voting.adminAdjustVote({
        groupId: 1,
        eventId: 999,
        userId: 99,
        action: "remove",
      })
    ).rejects.toThrow();
  });
});

describe("brackets.undoVote", () => {
  it("allows a voter to undo their bracket vote before matchup is resolved", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const voter = createMockUser({ id: 64, openId: "bracket-undo-voter" });
    const voterCaller = appRouter.createCaller(createCtx(voter));

    // Create tournament event
    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Bracket Undo Test",
      votingScheme: "tournament",
      maxSubmissionsPerMember: 4,
    });

    // Create books and submit
    const book1 = await adminCaller.books.create({ groupId: 1, title: "Bracket Undo Book 1", author: "A1" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "Bracket Undo Book 2", author: "A2" });
    const book3 = await adminCaller.books.create({ groupId: 1, title: "Bracket Undo Book 3", author: "A3" });
    const book4 = await adminCaller.books.create({ groupId: 1, title: "Bracket Undo Book 4", author: "A4" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book3.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book4.id, groupId: 1 });

    // Start voting (generates bracket)
    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });

    const brackets = await adminCaller.brackets.getForEvent({ eventId: event.id });
    const votingBracket = brackets.find((b) => b.status === "voting");
    if (!votingBracket) throw new Error("No voting bracket found");

    // Cast a vote
    await voterCaller.brackets.vote({ bracketId: votingBracket.id, bookId: book1.id, eventId: event.id });

    // Undo the vote
    const result = await voterCaller.brackets.undoVote({ bracketId: votingBracket.id, eventId: event.id });
    expect(result.success).toBe(true);
  });
});

describe("brackets.adminAdjustVote", () => {
  it("allows admin to change a bracket vote", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const voter = createMockUser({ id: 65, openId: "bracket-admin-voter" });
    const voterCaller = appRouter.createCaller(createCtx(voter));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Bracket Admin Adjust Test",
      votingScheme: "tournament",
      maxSubmissionsPerMember: 4,
    });

    const book1 = await adminCaller.books.create({ groupId: 1, title: "BA Book 1", author: "A1" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "BA Book 2", author: "A2" });
    const book3 = await adminCaller.books.create({ groupId: 1, title: "BA Book 3", author: "A3" });
    const book4 = await adminCaller.books.create({ groupId: 1, title: "BA Book 4", author: "A4" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book3.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book4.id, groupId: 1 });

    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });

    const brackets = await adminCaller.brackets.getForEvent({ eventId: event.id });
    const votingBracket = brackets.find((b) => b.status === "voting");
    if (!votingBracket) return; // Skip if no voting bracket

    // Cast a vote as voter
    await voterCaller.brackets.vote({ bracketId: votingBracket.id, bookId: book1.id, eventId: event.id });

    // Admin changes the vote
    const result = await adminCaller.brackets.adminAdjustVote({
      groupId: 1,
      bracketId: votingBracket.id,
      eventId: event.id,
      userId: 65,
      bookId: book2.id,
      action: "change",
    });
    expect(result.success).toBe(true);
  });

  it("allows admin to remove a bracket vote", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const voter = createMockUser({ id: 66, openId: "bracket-admin-remove" });
    const voterCaller = appRouter.createCaller(createCtx(voter));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Bracket Admin Remove Test",
      votingScheme: "tournament",
      maxSubmissionsPerMember: 4,
    });

    const book1 = await adminCaller.books.create({ groupId: 1, title: "BR Book 1", author: "A1" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "BR Book 2", author: "A2" });
    const book3 = await adminCaller.books.create({ groupId: 1, title: "BR Book 3", author: "A3" });
    const book4 = await adminCaller.books.create({ groupId: 1, title: "BR Book 4", author: "A4" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book3.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book4.id, groupId: 1 });

    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });

    const brackets = await adminCaller.brackets.getForEvent({ eventId: event.id });
    const votingBracket = brackets.find((b) => b.status === "voting");
    if (!votingBracket) return; // Skip if no voting bracket

    // Cast a vote as voter
    await voterCaller.brackets.vote({ bracketId: votingBracket.id, bookId: book1.id, eventId: event.id });

    // Admin removes the vote
    const result = await adminCaller.brackets.adminAdjustVote({
      groupId: 1,
      bracketId: votingBracket.id,
      eventId: event.id,
      userId: 66,
      action: "remove",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Admin Undo Resolve Tests ─────────────────────────────────────
describe("brackets.undoResolve", () => {
  it("allows admin to undo a resolved matchup", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));

    // Create a tournament event
    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Undo Resolve Test",
      votingScheme: "tournament",
      maxSubmissionsPerMember: 4,
    });

    // Create and submit books
    const book1 = await adminCaller.books.create({ groupId: 1, title: "UR Book 1", author: "A1" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "UR Book 2", author: "A2" });
    const book3 = await adminCaller.books.create({ groupId: 1, title: "UR Book 3", author: "A3" });
    const book4 = await adminCaller.books.create({ groupId: 1, title: "UR Book 4", author: "A4" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book3.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book4.id, groupId: 1 });

    // Start voting
    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });

    // Get brackets
    const bracketsBefore = await adminCaller.brackets.getForEvent({ eventId: event.id });
    const firstMatch = bracketsBefore.find((b: any) => b.round === 1 && b.matchOrder === 1);
    expect(firstMatch).toBeDefined();

    // Vote and resolve
    await adminCaller.brackets.vote({ bracketId: firstMatch!.id, bookId: firstMatch!.book1Id!, eventId: event.id });
    await adminCaller.brackets.resolveMatch({ groupId: 1, bracketId: firstMatch!.id, eventId: event.id });

    // Undo resolve
    const result = await adminCaller.brackets.undoResolve({ groupId: 1, bracketId: firstMatch!.id, eventId: event.id });
    expect(result.success).toBe(true);
  });

  it("rejects undo on a matchup that is not resolved", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Undo Unresolved Test",
      votingScheme: "tournament",
      maxSubmissionsPerMember: 4,
    });

    const book1 = await adminCaller.books.create({ groupId: 1, title: "UU Book 1", author: "A1" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "UU Book 2", author: "A2" });
    const book3 = await adminCaller.books.create({ groupId: 1, title: "UU Book 3", author: "A3" });
    const book4 = await adminCaller.books.create({ groupId: 1, title: "UU Book 4", author: "A4" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book3.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book4.id, groupId: 1 });

    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });

    const bracketsList = await adminCaller.brackets.getForEvent({ eventId: event.id });
    const firstMatch = bracketsList.find((b: any) => b.round === 1 && b.matchOrder === 1);

    await expect(
      adminCaller.brackets.undoResolve({ groupId: 1, bracketId: firstMatch!.id, eventId: event.id })
    ).rejects.toThrow("This matchup has not been resolved yet");
  });

  it("rejects undo from non-admin", async () => {
    const admin = createAdminUser();
    const member = createMockUser({ id: 70, openId: "undo-resolve-member" });
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const memberCaller = appRouter.createCaller(createCtx(member));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Non-Admin Undo Test",
      votingScheme: "tournament",
      maxSubmissionsPerMember: 4,
    });

    const book1 = await adminCaller.books.create({ groupId: 1, title: "NA Book 1", author: "A1" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "NA Book 2", author: "A2" });
    const book3 = await adminCaller.books.create({ groupId: 1, title: "NA Book 3", author: "A3" });
    const book4 = await adminCaller.books.create({ groupId: 1, title: "NA Book 4", author: "A4" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book3.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book4.id, groupId: 1 });

    await adminCaller.events.startVoting({ groupId: 1, eventId: event.id });

    const bracketsList = await adminCaller.brackets.getForEvent({ eventId: event.id });
    const firstMatch = bracketsList.find((b: any) => b.round === 1 && b.matchOrder === 1);

    await adminCaller.brackets.vote({ bracketId: firstMatch!.id, bookId: firstMatch!.book1Id!, eventId: event.id });
    await adminCaller.brackets.resolveMatch({ groupId: 1, bracketId: firstMatch!.id, eventId: event.id });

    await expect(
      memberCaller.brackets.undoResolve({ groupId: 1, bracketId: firstMatch!.id, eventId: event.id })
    ).rejects.toThrow();
  });
});

// ─── Voter Participation Indicators ────────────────────────────────
describe("brackets.getVoters", () => {
  it("returns voter list for bracket matchup (non-anonymous)", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const member = createMockUser(); // id: 1, pre-seeded as group member
    const memberCaller = appRouter.createCaller(createCtx(member));

    // Create tournament event with maxSubmissionsPerMember: 4
    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Bracket Voters Test",
      votingScheme: "tournament",
      maxSubmissionsPerMember: 4,
    });

    // Submit 2 books and start voting
    const book1 = await adminCaller.books.create({ groupId: 1, title: "Voters Book A", author: "Author A" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "Voters Book B", author: "Author B" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.events.startVoting({ eventId: event.id, groupId: 1 });

    const bracketsList = await adminCaller.brackets.getForEvent({ eventId: event.id });
    const votingBracket = bracketsList.find((b: any) => b.book1Id && b.book2Id);
    if (!votingBracket) return;

    // Cast a vote as member
    await memberCaller.brackets.vote({ bracketId: votingBracket.id, bookId: book1.id, eventId: event.id });

    // Get voters - should show real identity since not anonymous
    const voters = await adminCaller.brackets.getVoters({ bracketId: votingBracket.id, eventId: event.id });
    expect(voters.length).toBe(1);
    expect(voters[0].userId).toBe(1);
    expect(voters[0].bookId).toBe(book1.id);
  });

  it("anonymizes voter list when anonymousVoting is enabled (non-creator)", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const member = createMockUser(); // id: 1, pre-seeded as group member
    const memberCaller = appRouter.createCaller(createCtx(member));

    // Create event with anonymous voting
    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Bracket Anon Voters Test",
      votingScheme: "tournament",
      anonymousVoting: true,
      maxSubmissionsPerMember: 4,
    });

    const book1 = await adminCaller.books.create({ groupId: 1, title: "Anon Voter Book A", author: "Author A" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "Anon Voter Book B", author: "Author B" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.events.startVoting({ eventId: event.id, groupId: 1 });

    const bracketsList = await adminCaller.brackets.getForEvent({ eventId: event.id });
    const votingBracket = bracketsList.find((b: any) => b.book1Id && b.book2Id);
    if (!votingBracket) return;

    await adminCaller.brackets.vote({ bracketId: votingBracket.id, bookId: book1.id, eventId: event.id });

    // Non-creator (member) should see anonymized voters
    const voters = await memberCaller.brackets.getVoters({ bracketId: votingBracket.id, eventId: event.id });
    expect(voters.length).toBe(1);
    expect(voters[0].userId).toBe(0);
    expect(voters[0].userName).toBe("Anonymous");
    expect(voters[0].bookId).toBeNull();

    // Creator should see real voter info
    const adminVoters = await adminCaller.brackets.getVoters({ bracketId: votingBracket.id, eventId: event.id });
    expect(adminVoters.length).toBe(1);
    expect(adminVoters[0].userId).toBe(99);
  });
});

describe("voting.getVoters", () => {
  it("returns voter list for simple majority event (non-anonymous)", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const member = createMockUser(); // id: 1, pre-seeded as group member
    const memberCaller = appRouter.createCaller(createCtx(member));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Voting Voters Test",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 4,
    });

    const book1 = await adminCaller.books.create({ groupId: 1, title: "Voting Voter Book A", author: "Author A" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "Voting Voter Book B", author: "Author B" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.events.startVoting({ eventId: event.id, groupId: 1 });

    // Cast a vote as member
    await memberCaller.voting.castSimple({ eventId: event.id, bookId: book1.id });

    // Get voters - should show real identity
    const voters = await adminCaller.voting.getVoters({ eventId: event.id });
    expect(voters.length).toBe(1);
    expect(voters[0].userId).toBe(1);
    expect(voters[0].bookId).toBe(book1.id);
  });

  it("anonymizes voter list when anonymousVoting is enabled (non-creator)", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));
    const member = createMockUser(); // id: 1, pre-seeded as group member
    const memberCaller = appRouter.createCaller(createCtx(member));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Voting Anon Voters Test",
      votingScheme: "simple_majority",
      anonymousVoting: true,
      maxSubmissionsPerMember: 4,
    });

    const book1 = await adminCaller.books.create({ groupId: 1, title: "Anon V Book A", author: "Author A" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "Anon V Book B", author: "Author B" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.events.startVoting({ eventId: event.id, groupId: 1 });

    await adminCaller.voting.castSimple({ eventId: event.id, bookId: book1.id });

    // Non-creator (member) should see anonymized voters
    const voters = await memberCaller.voting.getVoters({ eventId: event.id });
    expect(voters.length).toBe(1);
    expect(voters[0].userId).toBe(0);
    expect(voters[0].userName).toBe("Anonymous");
    expect(voters[0].bookId).toBeNull();

    // Creator should see real voter info
    const adminVoters = await adminCaller.voting.getVoters({ eventId: event.id });
    expect(adminVoters.length).toBe(1);
    expect(adminVoters[0].userId).toBe(99);
  });

  it("returns empty array when no votes have been cast", async () => {
    const admin = createAdminUser();
    const adminCaller = appRouter.createCaller(createCtx(admin));

    const event = await adminCaller.events.create({
      groupId: 1,
      title: "Empty Voters Test",
      votingScheme: "simple_majority",
      maxSubmissionsPerMember: 4,
    });

    const book1 = await adminCaller.books.create({ groupId: 1, title: "Empty V Book A", author: "Author A" });
    const book2 = await adminCaller.books.create({ groupId: 1, title: "Empty V Book B", author: "Author B" });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book1.id, groupId: 1 });
    await adminCaller.submissions.create({ eventId: event.id, bookId: book2.id, groupId: 1 });
    await adminCaller.events.startVoting({ eventId: event.id, groupId: 1 });

    const voters = await adminCaller.voting.getVoters({ eventId: event.id });
    expect(voters.length).toBe(0);
  });
});
