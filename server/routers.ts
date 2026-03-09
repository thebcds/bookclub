import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Members ────────────────────────────────────────────────────
  members: router({
    list: protectedProcedure.query(async () => {
      return db.getAllMembers();
    }),
    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbConn.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),

  // ─── Invitations ──────────────────────────────────────────────
  invitations: router({
    create: adminProcedure
      .input(
        z.object({
          email: z.string().email().optional(),
          role: z.enum(["user", "admin"]).default("user"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await db.createInvitation(
          token,
          ctx.user.id,
          input.email ?? null,
          input.role,
          expiresAt
        );
        return { token, expiresAt };
      }),
    list: adminProcedure.query(async () => {
      return db.getPendingInvitations();
    }),
    verify: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const inv = await db.getInvitationByToken(input.token);
        if (!inv) return { valid: false, invitation: null };
        if (inv.status !== "pending" || inv.expiresAt < new Date()) {
          return { valid: false, invitation: null };
        }
        return { valid: true, invitation: inv };
      }),
    accept: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const inv = await db.getInvitationByToken(input.token);
        if (!inv || inv.status !== "pending" || inv.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired invitation" });
        }
        await db.acceptInvitation(input.token, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Books ────────────────────────────────────────────────────
  books: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          author: z.string().min(1),
          genre: z.string().optional(),
          pageCount: z.number().positive().optional(),
          coverUrl: z.string().url().optional(),
          rating: z.number().min(0).max(100).optional(),
          isbn: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await db.createBook(input);
        return { id };
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getBookById(input.id);
      }),
    list: protectedProcedure.query(async () => {
      return db.getAllBooks();
    }),
    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return db.searchBooks(input.query);
      }),
    markAsRead: adminProcedure
      .input(z.object({ bookId: z.number() }))
      .mutation(async ({ input }) => {
        await db.markBookAsRead(input.bookId);
        return { success: true };
      }),
    readBooks: protectedProcedure.query(async () => {
      return db.getReadBooks();
    }),
  }),

  // ─── Events ───────────────────────────────────────────────────
  events: router({
    create: adminProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          votingScheme: z.enum(["tournament", "simple_majority", "ranked_choice"]),
          maxPageCount: z.number().positive().optional(),
          allowPreviouslyRead: z.boolean().default(false),
          allowedGenres: z.array(z.string()).optional(),
          minRating: z.number().min(0).max(100).optional(),
          anonymousSubmissions: z.boolean().default(false),
          maxSubmissions: z.number().min(2).max(64).default(8),
          submissionDeadline: z.date().optional(),
          votingDeadline: z.date().optional(),
          readingDeadline: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createEvent({ ...input, createdBy: ctx.user.id });
        return { id };
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const event = await db.getEventById(input.id);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        return event;
      }),
    list: protectedProcedure.query(async () => {
      return db.getAllEvents();
    }),
    active: protectedProcedure.query(async () => {
      return db.getActiveEvents();
    }),
    completed: protectedProcedure.query(async () => {
      return db.getCompletedEvents();
    }),
    updateStatus: adminProcedure
      .input(
        z.object({
          eventId: z.number(),
          status: z.enum(["submissions_open", "voting", "completed", "cancelled"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateEventStatus(input.eventId, input.status);
        return { success: true };
      }),
    startVoting: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        if (event.status !== "submissions_open") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Event is not in submissions phase" });
        }
        const subs = await db.getEventSubmissions(input.eventId);
        if (event.votingScheme === "tournament" && subs.length < 2) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Need at least 2 submissions for tournament" });
        }
        if (subs.length < 2) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Need at least 2 submissions" });
        }

        // For tournament: generate bracket
        if (event.votingScheme === "tournament") {
          await generateTournamentBracket(input.eventId, subs);
        }

        await db.updateEventStatus(input.eventId, "voting");
        return { success: true };
      }),
  }),

  // ─── Submissions ──────────────────────────────────────────────
  submissions: router({
    create: protectedProcedure
      .input(
        z.object({
          eventId: z.number(),
          bookId: z.number(),
          isAnonymous: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        if (event.status !== "submissions_open") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Submissions are closed" });
        }

        // Check if user already submitted
        const existing = await db.getUserSubmissionForEvent(input.eventId, ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You already submitted a book" });
        }

        // Check submission count
        const subs = await db.getEventSubmissions(input.eventId);
        if (subs.length >= event.maxSubmissions) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum submissions reached" });
        }

        // Validate book against event parameters
        const book = await db.getBookById(input.bookId);
        if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });

        if (event.maxPageCount && book.pageCount && book.pageCount > event.maxPageCount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Book exceeds max page count of ${event.maxPageCount}` });
        }
        if (!event.allowPreviouslyRead && book.hasBeenRead) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This book has already been read by the club" });
        }
        if (event.allowedGenres && Array.isArray(event.allowedGenres) && (event.allowedGenres as string[]).length > 0) {
          if (book.genre && !(event.allowedGenres as string[]).includes(book.genre)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `Genre "${book.genre}" is not allowed for this event` });
          }
        }
        if (event.minRating && book.rating && book.rating < event.minRating) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Book rating ${book.rating} is below minimum ${event.minRating}` });
        }

        const id = await db.createSubmission({
          eventId: input.eventId,
          bookId: input.bookId,
          submittedBy: ctx.user.id,
          isAnonymous: event.anonymousSubmissions || input.isAnonymous,
        });
        return { id };
      }),
    listForEvent: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return db.getEventSubmissions(input.eventId);
      }),
    mySubmission: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserSubmissionForEvent(input.eventId, ctx.user.id);
      }),
  }),

  // ─── Brackets ─────────────────────────────────────────────────
  brackets: router({
    getForEvent: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        const bracketList = await db.getEventBrackets(input.eventId);
        // Enrich with book info
        const enriched = await Promise.all(
          bracketList.map(async (b) => {
            const book1 = b.book1Id ? await db.getBookById(b.book1Id) : null;
            const book2 = b.book2Id ? await db.getBookById(b.book2Id) : null;
            const winner = b.winnerId ? await db.getBookById(b.winnerId) : null;
            return { ...b, book1, book2, winner };
          })
        );
        return enriched;
      }),
    vote: protectedProcedure
      .input(
        z.object({
          bracketId: z.number(),
          bookId: z.number(),
          eventId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if already voted
        const existing = await db.getUserVoteForBracket(input.bracketId, ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You already voted on this matchup" });
        }
        await db.castVote({
          eventId: input.eventId,
          bracketId: input.bracketId,
          userId: ctx.user.id,
          bookId: input.bookId,
        });
        return { success: true };
      }),
    getVotes: protectedProcedure
      .input(z.object({ bracketId: z.number() }))
      .query(async ({ input }) => {
        return db.getBracketVotes(input.bracketId);
      }),
    myVote: protectedProcedure
      .input(z.object({ bracketId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserVoteForBracket(input.bracketId, ctx.user.id) ?? null;
      }),
    resolveMatch: adminProcedure
      .input(z.object({ bracketId: z.number(), eventId: z.number() }))
      .mutation(async ({ input }) => {
        const bracketVotes = await db.getBracketVotes(input.bracketId);
        if (bracketVotes.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No votes cast yet" });
        }
        const bracketList = await db.getEventBrackets(input.eventId);
        const bracket = bracketList.find((b) => b.id === input.bracketId);
        if (!bracket) throw new TRPCError({ code: "NOT_FOUND" });

        // Count votes
        const voteCounts = new Map<number, number>();
        for (const v of bracketVotes) {
          voteCounts.set(v.bookId, (voteCounts.get(v.bookId) || 0) + 1);
        }

        let winnerId: number;
        const book1Votes = voteCounts.get(bracket.book1Id!) || 0;
        const book2Votes = voteCounts.get(bracket.book2Id!) || 0;
        if (book1Votes > book2Votes) winnerId = bracket.book1Id!;
        else if (book2Votes > book1Votes) winnerId = bracket.book2Id!;
        else winnerId = Math.random() > 0.5 ? bracket.book1Id! : bracket.book2Id!; // tiebreaker

        await db.updateBracketWinner(input.bracketId, winnerId);

        // Check if there's a next round match to advance to
        const nextRoundMatches = bracketList.filter(
          (b) =>
            b.conference === bracket.conference &&
            b.round === bracket.round + 1
        );
        if (nextRoundMatches.length > 0) {
          const nextMatchIdx = Math.floor((bracket.matchOrder - 1) / 2);
          const nextMatch = nextRoundMatches.find(
            (b) => b.matchOrder === nextMatchIdx + 1
          );
          if (nextMatch) {
            const isFirstSlot = (bracket.matchOrder - 1) % 2 === 0;
            if (isFirstSlot) {
              await db.updateBracketBooks(nextMatch.id, { book1Id: winnerId });
            } else {
              await db.updateBracketBooks(nextMatch.id, { book2Id: winnerId });
            }
            // If both slots filled, open voting
            const updatedBrackets = await db.getEventBrackets(input.eventId);
            const updatedNext = updatedBrackets.find((b) => b.id === nextMatch.id);
            if (updatedNext?.book1Id && updatedNext?.book2Id) {
              await db.updateBracketStatus(nextMatch.id, "voting");
            }
          }
        }

        // Check for finals (cross-conference)
        const allBrackets = await db.getEventBrackets(input.eventId);
        const maxRoundInConf = Math.max(
          ...allBrackets
            .filter((b) => b.conference === bracket.conference)
            .map((b) => b.round)
        );
        if (bracket.round === maxRoundInConf) {
          // This was the conference final - check if both conference winners exist
          const confAWinner = allBrackets.find(
            (b) => b.conference === "A" && b.round === maxRoundInConf && b.winnerId
          );
          const confBWinner = allBrackets.find(
            (b) => b.conference === "B" && b.round === maxRoundInConf && b.winnerId
          );
          if (confAWinner?.winnerId && confBWinner?.winnerId) {
            // Create or update finals match
            const finalMatch = allBrackets.find(
              (b) => b.round === maxRoundInConf + 1
            );
            if (finalMatch) {
              await db.updateBracketBooks(finalMatch.id, {
                book1Id: confAWinner.winnerId,
                book2Id: confBWinner.winnerId,
              });
              await db.updateBracketStatus(finalMatch.id, "voting");
            }
          }
        }

        // Check if this was the final match
        const finalBrackets = await db.getEventBrackets(input.eventId);
        const maxRound = Math.max(...finalBrackets.map((b) => b.round));
        const finalMatch = finalBrackets.find((b) => b.round === maxRound);
        if (finalMatch?.id === input.bracketId && winnerId) {
          await db.setEventWinner(input.eventId, winnerId);
          await db.markBookAsRead(winnerId);
          // Record submission history
          const subs = await db.getEventSubmissions(input.eventId);
          for (const sub of subs) {
            await db.recordSubmissionHistory(
              sub.bookId,
              input.eventId,
              sub.bookId === winnerId
            );
          }
        }

        return { winnerId };
      }),
  }),

  // ─── Voting (simple majority & ranked choice) ─────────────────
  voting: router({
    castSimple: protectedProcedure
      .input(z.object({ eventId: z.number(), bookId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserVoteForEvent(input.eventId, ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You already voted" });
        }
        await db.castVote({
          eventId: input.eventId,
          userId: ctx.user.id,
          bookId: input.bookId,
        });
        return { success: true };
      }),
    castRanked: protectedProcedure
      .input(
        z.object({
          eventId: z.number(),
          rankings: z.array(z.number()).min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserVoteForEvent(input.eventId, ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You already voted" });
        }
        await db.castVote({
          eventId: input.eventId,
          userId: ctx.user.id,
          bookId: input.rankings[0],
          rankings: input.rankings,
        });
        return { success: true };
      }),
    getResults: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        const allVotes = await db.getEventVotes(input.eventId);
        const subs = await db.getEventSubmissions(input.eventId);

        if (event.votingScheme === "simple_majority") {
          const voteCounts = new Map<number, number>();
          for (const v of allVotes) {
            voteCounts.set(v.bookId, (voteCounts.get(v.bookId) || 0) + 1);
          }
          const results = subs.map((s) => ({
            bookId: s.bookId,
            bookTitle: s.bookTitle,
            bookAuthor: s.bookAuthor,
            votes: voteCounts.get(s.bookId) || 0,
          }));
          results.sort((a, b) => b.votes - a.votes);
          return { scheme: "simple_majority" as const, results, totalVotes: allVotes.length };
        }

        if (event.votingScheme === "ranked_choice") {
          return runRankedChoice(allVotes, subs);
        }

        return { scheme: event.votingScheme, results: [], totalVotes: allVotes.length };
      }),
    myVote: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserVoteForEvent(input.eventId, ctx.user.id) ?? null;
      }),
    resolve: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        const allVotes = await db.getEventVotes(input.eventId);
        const subs = await db.getEventSubmissions(input.eventId);

        let winnerId: number | null = null;

        if (event.votingScheme === "simple_majority") {
          const voteCounts = new Map<number, number>();
          for (const v of allVotes) {
            voteCounts.set(v.bookId, (voteCounts.get(v.bookId) || 0) + 1);
          }
          let maxVotes = 0;
          Array.from(voteCounts.entries()).forEach(([bookId, countVal]) => {
            if (countVal > maxVotes) {
              maxVotes = countVal;
              winnerId = bookId;
            }
          });
        } else if (event.votingScheme === "ranked_choice") {
          const result = runRankedChoice(allVotes, subs);
          if (result.results.length > 0) {
            winnerId = result.results[0].bookId;
          }
        }

        if (winnerId) {
          await db.setEventWinner(input.eventId, winnerId);
          await db.markBookAsRead(winnerId);
          for (const sub of subs) {
            await db.recordSubmissionHistory(sub.bookId, input.eventId, sub.bookId === winnerId);
          }
        }

        return { winnerId };
      }),
  }),

  // ─── Calendar ─────────────────────────────────────────────────
  calendar: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          eventType: z.enum([
            "submission_deadline",
            "voting_deadline",
            "reading_milestone",
            "meeting",
            "custom",
          ]),
          startDate: z.date(),
          endDate: z.date().optional(),
          relatedEventId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createCalendarEvent({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id };
      }),
    list: protectedProcedure.query(async () => {
      return db.getCalendarEvents();
    }),
    upcoming: protectedProcedure.query(async () => {
      return db.getUpcomingCalendarEvents();
    }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCalendarEvent(input.id);
        return { success: true };
      }),
  }),

  // ─── Chat ─────────────────────────────────────────────────────
  chat: router({
    send: protectedProcedure
      .input(
        z.object({
          content: z.string().min(1).max(2000),
          eventId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createChatMessage({
          userId: ctx.user.id,
          content: input.content,
          eventId: input.eventId,
        });
        return { id };
      }),
    messages: protectedProcedure
      .input(
        z.object({
          eventId: z.number().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
      )
      .query(async ({ input }) => {
        return db.getChatMessages(input.eventId, input.limit);
      }),
  }),

  // ─── Milestones ───────────────────────────────────────────────
  milestones: router({
    create: adminProcedure
      .input(
        z.object({
          eventId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          targetDate: z.date(),
          targetPage: z.number().positive().optional(),
          targetPercent: z.number().min(0).max(100).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await db.createMilestone(input);
        return { id };
      }),
    listForEvent: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return db.getEventMilestones(input.eventId);
      }),
  }),
});

// ─── Tournament Bracket Generation ──────────────────────────────────
async function generateTournamentBracket(
  eventId: number,
  subs: Awaited<ReturnType<typeof db.getEventSubmissions>>
) {
  const bookIds = subs.map((s) => s.bookId);
  const historyCounts = await db.getBookSubmissionCounts(bookIds);

  // Calculate seeds: lower seed = better (more previous submissions = lower seed number)
  type SeededBook = { bookId: number; previousSubmissions: number; seed: number };
  const seededBooks: SeededBook[] = subs.map((s) => ({
    bookId: s.bookId,
    previousSubmissions: historyCounts.get(s.bookId) || 0,
    seed: 0,
  }));

  // Sort by previous submissions descending (more submissions = better seed)
  seededBooks.sort((a, b) => b.previousSubmissions - a.previousSubmissions);

  // Assign seeds (1 = best)
  seededBooks.forEach((b, i) => {
    b.seed = i + 1;
  });

  // Shuffle within same-submission-count groups for randomness
  let i = 0;
  while (i < seededBooks.length) {
    let j = i;
    while (j < seededBooks.length && seededBooks[j].previousSubmissions === seededBooks[i].previousSubmissions) {
      j++;
    }
    // Fisher-Yates shuffle within group
    for (let k = j - 1; k > i; k--) {
      const r = i + Math.floor(Math.random() * (k - i + 1));
      [seededBooks[k], seededBooks[r]] = [seededBooks[r], seededBooks[k]];
    }
    // Re-assign seeds after shuffle
    for (let k = i; k < j; k++) {
      seededBooks[k].seed = k + 1;
    }
    i = j;
  }

  // Split into two conferences
  const half = Math.ceil(seededBooks.length / 2);
  const confA = seededBooks.slice(0, half);
  const confB = seededBooks.slice(half);

  // Generate bracket matches for each conference
  const createConferenceBracket = async (
    conf: SeededBook[],
    confLabel: "A" | "B"
  ) => {
    if (conf.length === 0) return;
    // Pad to next power of 2
    const size = Math.pow(2, Math.ceil(Math.log2(Math.max(conf.length, 2))));
    const padded = [...conf];
    while (padded.length < size) padded.push({ bookId: 0, previousSubmissions: 0, seed: 999 });

    // Standard tournament seeding (1v8, 4v5, 2v7, 3v6 for 8)
    const seeded = tournamentSeed(padded);

    // Round 1
    const round1Matches = seeded.length / 2;
    for (let m = 0; m < round1Matches; m++) {
      const b1 = seeded[m * 2];
      const b2 = seeded[m * 2 + 1];
      const isB1Bye = b1.bookId === 0;
      const isB2Bye = b2.bookId === 0;

      await db.createBracketMatch({
        eventId,
        conference: confLabel,
        round: 1,
        matchOrder: m + 1,
        book1Id: isB1Bye ? undefined : b1.bookId,
        book2Id: isB2Bye ? undefined : b2.bookId,
        book1Seed: isB1Bye ? undefined : b1.seed,
        book2Seed: isB2Bye ? undefined : b2.seed,
      });
    }

    // Create empty slots for subsequent rounds
    let matchesInRound = round1Matches / 2;
    let round = 2;
    while (matchesInRound >= 1) {
      for (let m = 0; m < matchesInRound; m++) {
        await db.createBracketMatch({
          eventId,
          conference: confLabel,
          round,
          matchOrder: m + 1,
        });
      }
      matchesInRound = matchesInRound / 2;
      round++;
    }
  };

  await createConferenceBracket(confA, "A");
  await createConferenceBracket(confB, "B");

  // Create finals match
  const maxRoundA = confA.length <= 1 ? 1 : Math.ceil(Math.log2(Math.max(confA.length, 2)));
  const maxRoundB = confB.length <= 1 ? 1 : Math.ceil(Math.log2(Math.max(confB.length, 2)));
  const finalsRound = Math.max(maxRoundA, maxRoundB) + 1;
  await db.createBracketMatch({
    eventId,
    conference: "A", // finals
    round: finalsRound,
    matchOrder: 1,
  });

  // Handle byes in round 1
  const allBrackets = await db.getEventBrackets(eventId);
  const round1 = allBrackets.filter((b) => b.round === 1);
  for (const match of round1) {
    if (match.book1Id && !match.book2Id) {
      // Book 1 gets a bye
      await db.updateBracketWinner(match.id, match.book1Id);
      await advanceWinner(eventId, match, match.book1Id, allBrackets);
    } else if (!match.book1Id && match.book2Id) {
      // Book 2 gets a bye
      await db.updateBracketWinner(match.id, match.book2Id);
      await advanceWinner(eventId, match, match.book2Id, allBrackets);
    } else if (match.book1Id && match.book2Id) {
      await db.updateBracketStatus(match.id, "voting");
    }
  }
}

async function advanceWinner(
  eventId: number,
  match: { conference: string; round: number; matchOrder: number },
  winnerId: number,
  allBrackets: Awaited<ReturnType<typeof db.getEventBrackets>>
) {
  const nextRound = allBrackets.filter(
    (b) => b.conference === match.conference && b.round === match.round + 1
  );
  if (nextRound.length > 0) {
    const nextMatchIdx = Math.floor((match.matchOrder - 1) / 2);
    const nextMatch = nextRound.find((b) => b.matchOrder === nextMatchIdx + 1);
    if (nextMatch) {
      const isFirstSlot = (match.matchOrder - 1) % 2 === 0;
      if (isFirstSlot) {
        await db.updateBracketBooks(nextMatch.id, { book1Id: winnerId });
      } else {
        await db.updateBracketBooks(nextMatch.id, { book2Id: winnerId });
      }
    }
  }
}

function tournamentSeed<T>(arr: T[]): T[] {
  if (arr.length <= 2) return arr;
  const n = arr.length;
  const result: T[] = new Array(n);
  // Standard tournament bracket seeding: 1v8, 4v5, 2v7, 3v6
  const order = generateSeedOrder(n);
  for (let i = 0; i < n; i++) {
    result[i] = arr[order[i]];
  }
  return result;
}

function generateSeedOrder(n: number): number[] {
  if (n === 1) return [0];
  if (n === 2) return [0, 1];
  const half = n / 2;
  const prev = generateSeedOrder(half);
  const result: number[] = [];
  for (const p of prev) {
    result.push(p, n - 1 - p);
  }
  return result;
}

// ─── Ranked Choice Voting ───────────────────────────────────────────
function runRankedChoice(
  allVotes: Awaited<ReturnType<typeof db.getEventVotes>>,
  subs: Awaited<ReturnType<typeof db.getEventSubmissions>>
) {
  const bookMap = new Map(subs.map((s) => [s.bookId, { title: s.bookTitle, author: s.bookAuthor }]));
  const ballots: number[][] = allVotes
    .map((v) => (v.rankings as number[]) || [v.bookId])
    .filter((r) => r.length > 0);

  if (ballots.length === 0) {
    return { scheme: "ranked_choice" as const, results: [], totalVotes: 0, rounds: [] };
  }

  const eliminated = new Set<number>();
  const rounds: { round: number; counts: { bookId: number; votes: number }[]; eliminated?: number }[] = [];
  const majority = Math.floor(ballots.length / 2) + 1;

  for (let round = 1; round <= 20; round++) {
    const counts = new Map<number, number>();
    for (const ballot of ballots) {
      const choice = ballot.find((id) => !eliminated.has(id));
      if (choice !== undefined) {
        counts.set(choice, (counts.get(choice) || 0) + 1);
      }
    }

    const roundCounts = Array.from(counts.entries())
      .map(([bookId, votes]) => ({ bookId, votes }))
      .sort((a, b) => b.votes - a.votes);

    // Check for winner
    if (roundCounts.length > 0 && roundCounts[0].votes >= majority) {
      rounds.push({ round, counts: roundCounts });
      const results = roundCounts.map((r) => ({
        bookId: r.bookId,
        bookTitle: bookMap.get(r.bookId)?.title ?? "Unknown",
        bookAuthor: bookMap.get(r.bookId)?.author ?? "Unknown",
        votes: r.votes,
      }));
      return { scheme: "ranked_choice" as const, results, totalVotes: ballots.length, rounds };
    }

    // Eliminate lowest
    if (roundCounts.length <= 1) {
      rounds.push({ round, counts: roundCounts });
      break;
    }

    const minVotes = roundCounts[roundCounts.length - 1].votes;
    const toEliminate = roundCounts[roundCounts.length - 1].bookId;
    eliminated.add(toEliminate);
    rounds.push({ round, counts: roundCounts, eliminated: toEliminate });
  }

  // Return final state
  const finalCounts = new Map<number, number>();
  for (const ballot of ballots) {
    const choice = ballot.find((id) => !eliminated.has(id));
    if (choice !== undefined) {
      finalCounts.set(choice, (finalCounts.get(choice) || 0) + 1);
    }
  }
  const results = Array.from(finalCounts.entries())
    .map(([bookId, votes]) => ({
      bookId,
      bookTitle: bookMap.get(bookId)?.title ?? "Unknown",
      bookAuthor: bookMap.get(bookId)?.author ?? "Unknown",
      votes,
    }))
    .sort((a, b) => b.votes - a.votes);

  return { scheme: "ranked_choice" as const, results, totalVotes: ballots.length, rounds };
}

export type AppRouter = typeof appRouter;
