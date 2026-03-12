import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

// Helper: verify user is member of group, returns membership
async function requireGroupMember(userId: number, groupId: number) {
  const membership = await db.getGroupMembership(groupId, userId);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this group" });
  return membership;
}

// Helper: verify user is admin of group
async function requireGroupAdmin(userId: number, groupId: number) {
  const membership = await requireGroupMember(userId, groupId);
  if (membership.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required for this group" });
  return membership;
}

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

  // ─── Groups ────────────────────────────────────────────────────
  groups: router({
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(256), description: z.string().max(1000).optional(), isPublic: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createGroup({ name: input.name, description: input.description, isPublic: input.isPublic, createdBy: ctx.user.id });
        return { id };
      }),
    myGroups: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserGroups(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.id);
        const group = await db.getGroupById(input.id);
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });
        return group;
      }),
    update: protectedProcedure
      .input(z.object({ groupId: z.number(), name: z.string().min(1).max(256).optional(), description: z.string().max(1000).optional(), isPublic: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        await db.updateGroup(input.groupId, { name: input.name, description: input.description, isPublic: input.isPublic });
        return { success: true };
      }),
    publicGroups: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getPublicGroups(ctx.user.id);
      }),
    joinPublic: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
        if (!group.isPublic) throw new TRPCError({ code: "FORBIDDEN", message: "This group is private. You need an invitation to join." });
        const existing = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "You are already a member of this group" });
        await db.addGroupMember(input.groupId, ctx.user.id, "member");
        return { success: true };
      }),
  }),

  // ─── Members (group-scoped) ────────────────────────────────────
  members: router({
    list: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getGroupMembers(input.groupId);
      }),
    updateRole: protectedProcedure
      .input(z.object({ groupId: z.number(), userId: z.number(), role: z.enum(["admin", "member"]) }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        await db.updateGroupMemberRole(input.groupId, input.userId, input.role);
        return { success: true };
      }),
    myMembership: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getGroupMembership(input.groupId, ctx.user.id) ?? null;
      }),
  }),

  // ─── Invitations (group-scoped) ────────────────────────────────
  invitations: router({
    create: protectedProcedure
      .input(z.object({ groupId: z.number(), email: z.string().email().optional(), role: z.enum(["member", "admin"]).default("member") }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.createInvitation(token, input.groupId, ctx.user.id, input.email ?? null, input.role, expiresAt);
        return { token, expiresAt };
      }),
    list: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        return db.getPendingInvitations(input.groupId);
      }),
    verify: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const inv = await db.getInvitationByToken(input.token);
        if (!inv) return { valid: false, invitation: null };
        if (inv.status !== "pending" || inv.expiresAt < new Date()) return { valid: false, invitation: null };
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
        return { success: true, groupId: inv.groupId };
      }),
  }),

  // ─── Books (group-scoped) ─────────────────────────────────────
  books: router({
    create: protectedProcedure
      .input(z.object({
        groupId: z.number(), title: z.string().min(1), author: z.string().min(1), genre: z.string().optional(),
        pageCount: z.number().positive().optional(), coverUrl: z.string().url().optional(), rating: z.number().min(0).max(100).optional(),
        isbn: z.string().optional(), description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        const id = await db.createBook(input);
        return { id };
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getBookById(input.id);
      }),
    list: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getAllBooks(input.groupId);
      }),
    search: protectedProcedure
      .input(z.object({ groupId: z.number(), query: z.string() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.searchBooks(input.groupId, input.query);
      }),
    markAsRead: protectedProcedure
      .input(z.object({ groupId: z.number(), bookId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        await db.markBookAsRead(input.bookId);
        return { success: true };
      }),
    readBooks: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getReadBooks(input.groupId);
      }),
  }),

  // ─── Open Library Search ──────────────────────────────────────
  openLibrary: router({
    search: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const res = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(input.query)}&limit=10&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median,isbn,subject`
          );
          if (!res.ok) return [];
          const data = await res.json();
          return (data.docs ?? []).map((doc: any) => ({
            key: doc.key, title: doc.title ?? "Unknown", author: doc.author_name?.[0] ?? "Unknown",
            coverId: doc.cover_i ?? null, coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
            year: doc.first_publish_year ?? null, pageCount: doc.number_of_pages_median ?? null,
            isbn: doc.isbn?.[0] ?? null, genres: (doc.subject ?? []).slice(0, 5) as string[],
          }));
        } catch { return []; }
      }),
  }),

  // ─── Notifications ────────────────────────────────────────────
  notifications: router({
    notifyVotingOpen: protectedProcedure
      .input(z.object({ groupId: z.number(), eventId: z.number(), eventTitle: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        await notifyOwner({ title: `Voting Now Open: ${input.eventTitle}`, content: `The voting round for "${input.eventTitle}" has started. Head to the Book Club portal to cast your vote!` });
        return { success: true };
      }),
    notifyDeadline: protectedProcedure
      .input(z.object({ groupId: z.number(), eventTitle: z.string(), deadlineType: z.string(), deadline: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        await notifyOwner({ title: `Deadline Approaching: ${input.eventTitle}`, content: `The ${input.deadlineType} deadline for "${input.eventTitle}" is ${input.deadline}. Don't miss it!` });
        return { success: true };
      }),
    notifyNewChat: protectedProcedure
      .input(z.object({ senderName: z.string(), preview: z.string() }))
      .mutation(async ({ input }) => {
        await notifyOwner({ title: `New Chat Message from ${input.senderName}`, content: input.preview.slice(0, 200) });
        return { success: true };
      }),
  }),

  // ─── Events (group-scoped) ────────────────────────────────────
  events: router({
    create: protectedProcedure
      .input(z.object({
        groupId: z.number(), title: z.string().min(1), description: z.string().optional(),
        votingScheme: z.enum(["tournament", "simple_majority", "ranked_choice", "no_vote"]),
        maxPageCount: z.number().positive().optional(), allowPreviouslyRead: z.boolean().default(false),
        allowedGenres: z.array(z.string()).optional(), minRating: z.number().min(0).max(100).optional(),
        anonymousSubmissions: z.boolean().default(false),
        maxTotalSubmissions: z.number().min(1).max(64).default(8),
        maxSubmissionsPerMember: z.number().min(1).max(64).default(1),
        submissionDeadline: z.date().optional(), votingDeadline: z.date().optional(), readingDeadline: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
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
    list: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getAllEvents(input.groupId);
      }),
    active: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getActiveEvents(input.groupId);
      }),
    completed: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getCompletedEvents(input.groupId);
      }),
    updateStatus: protectedProcedure
      .input(z.object({ groupId: z.number(), eventId: z.number(), status: z.enum(["submissions_open", "voting", "completed", "cancelled"]) }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        await db.updateEventStatus(input.eventId, input.status);
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        groupId: z.number(), eventId: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        votingScheme: z.enum(["tournament", "simple_majority", "ranked_choice", "no_vote"]).optional(),
        maxPageCount: z.number().positive().nullable().optional(),
        allowPreviouslyRead: z.boolean().optional(),
        allowedGenres: z.array(z.string()).nullable().optional(),
        minRating: z.number().min(0).max(100).nullable().optional(),
        anonymousSubmissions: z.boolean().optional(),
        maxTotalSubmissions: z.number().min(1).max(64).optional(),
        maxSubmissionsPerMember: z.number().min(1).max(64).optional(),
        submissionDeadline: z.date().nullable().optional(),
        votingDeadline: z.date().nullable().optional(),
        readingDeadline: z.date().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        const event = await db.getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        const { groupId, eventId, ...updateData } = input;
        await db.updateEvent(eventId, updateData);
        return { success: true };
      }),
    overrideWinner: protectedProcedure
      .input(z.object({ groupId: z.number(), eventId: z.number(), bookId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        const event = await db.getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        if (input.bookId) {
          await db.setEventWinner(input.eventId, input.bookId);
          await db.markBookAsRead(input.bookId);
          const book = await db.getBookById(input.bookId);
          try { await notifyOwner({ title: `Winner Override: ${book?.title}`, content: `Admin overrode the winner for "${event.title}" to "${book?.title}".` }); } catch {}
        } else {
          // Clear winner
          await db.updateEvent(input.eventId, { winningBookId: null });
        }
        return { success: true };
      }),
    reopenSubmissions: protectedProcedure
      .input(z.object({ groupId: z.number(), eventId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        const event = await db.getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        await db.updateEventStatus(input.eventId, "submissions_open");
        return { success: true };
      }),
    startVoting: protectedProcedure
      .input(z.object({ groupId: z.number(), eventId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        const event = await db.getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        if (event.status !== "submissions_open") throw new TRPCError({ code: "BAD_REQUEST", message: "Event is not in submissions phase" });
        const subs = await db.getEventSubmissions(input.eventId);
        if (subs.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot start voting with only ${subs.length} submission${subs.length === 1 ? '' : 's'}. At least 2 book submissions are required.` });
        if (event.votingScheme === "tournament") await generateTournamentBracket(input.eventId, subs);
        await db.updateEventStatus(input.eventId, "voting");
        try { await notifyOwner({ title: `Voting Now Open: ${event.title}`, content: `The voting round for "${event.title}" has started with ${subs.length} book submissions.` }); } catch {}
        return { success: true };
      }),
  }),

  // ─── Submissions ──────────────────────────────────────────────
  submissions: router({
    create: protectedProcedure
      .input(z.object({ groupId: z.number(), eventId: z.number(), bookId: z.number(), isAnonymous: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        const event = await db.getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        if (event.status !== "submissions_open") throw new TRPCError({ code: "BAD_REQUEST", message: "Submissions are closed" });
        // Check per-member submission limit
        const userSubs = await db.getUserSubmissionsForEvent(input.eventId, ctx.user.id);
        if (userSubs.length >= event.maxSubmissionsPerMember) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `You've reached your submission limit (${event.maxSubmissionsPerMember} per member)` });
        }
        // Check total submission limit
        const subs = await db.getEventSubmissions(input.eventId);
        if (subs.length >= event.maxTotalSubmissions) throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum total submissions reached" });
        const book = await db.getBookById(input.bookId);
        if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
        if (event.maxPageCount && book.pageCount && book.pageCount > event.maxPageCount) throw new TRPCError({ code: "BAD_REQUEST", message: `Book exceeds max page count of ${event.maxPageCount}` });
        if (!event.allowPreviouslyRead && book.hasBeenRead) throw new TRPCError({ code: "BAD_REQUEST", message: "This book has already been read by the club" });
        if (event.allowedGenres && Array.isArray(event.allowedGenres) && (event.allowedGenres as string[]).length > 0) {
          if (book.genre && !(event.allowedGenres as string[]).includes(book.genre)) throw new TRPCError({ code: "BAD_REQUEST", message: `Genre "${book.genre}" is not allowed` });
        }
        if (event.minRating && book.rating && book.rating < event.minRating) throw new TRPCError({ code: "BAD_REQUEST", message: `Book rating ${book.rating} is below minimum ${event.minRating}` });
        const id = await db.createSubmission({ eventId: input.eventId, bookId: input.bookId, submittedBy: ctx.user.id, isAnonymous: event.anonymousSubmissions || input.isAnonymous });
        // For no_vote mode with single submission: auto-complete the event
        if (event.votingScheme === "no_vote" && event.maxTotalSubmissions === 1) {
          await db.updateEventStatus(input.eventId, "completed");
          await db.setEventWinner(input.eventId, input.bookId);
          await db.markBookAsRead(input.bookId);
          await db.recordSubmissionHistory(input.bookId, input.eventId, true);
          try { await notifyOwner({ title: `Book Selected: ${book.title}`, content: `"${book.title}" by ${book.author} was selected for "${event.title}" (single-title mode).` }); } catch {}
        }
        // For no_vote mode when all submissions are in: auto-complete with random pick
        else if (event.votingScheme === "no_vote" && (subs.length + 1) >= event.maxTotalSubmissions) {
          // Pick a random winner from all submissions including the one just created
          const allBookIds = [...subs.map(s => s.bookId), input.bookId];
          const winnerId = allBookIds[Math.floor(Math.random() * allBookIds.length)];
          await db.updateEventStatus(input.eventId, "completed");
          await db.setEventWinner(input.eventId, winnerId);
          await db.markBookAsRead(winnerId);
          for (const bid of allBookIds) {
            await db.recordSubmissionHistory(bid, input.eventId, bid === winnerId);
          }
          const winnerBook = await db.getBookById(winnerId);
          try { await notifyOwner({ title: `Book Selected: ${winnerBook?.title}`, content: `"${winnerBook?.title}" was randomly selected from ${allBookIds.length} submissions for "${event.title}".` }); } catch {}
        }
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
    mySubmissions: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserSubmissionsForEvent(input.eventId, ctx.user.id);
      }),
  }),

  // ─── Brackets ─────────────────────────────────────────────────
  brackets: router({
    getForEvent: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        const bracketList = await db.getEventBrackets(input.eventId);
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
      .input(z.object({ bracketId: z.number(), bookId: z.number(), eventId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserVoteForBracket(input.bracketId, ctx.user.id);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "You already voted on this matchup" });
        await db.castVote({ eventId: input.eventId, bracketId: input.bracketId, userId: ctx.user.id, bookId: input.bookId });
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
    resolveMatch: protectedProcedure
      .input(z.object({ groupId: z.number(), bracketId: z.number(), eventId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        const bracketVotes = await db.getBracketVotes(input.bracketId);
        if (bracketVotes.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No votes cast yet" });
        const bracketList = await db.getEventBrackets(input.eventId);
        const bracket = bracketList.find((b) => b.id === input.bracketId);
        if (!bracket) throw new TRPCError({ code: "NOT_FOUND" });

        const voteCounts = new Map<number, number>();
        for (const v of bracketVotes) voteCounts.set(v.bookId, (voteCounts.get(v.bookId) || 0) + 1);

        let winnerId: number;
        const book1Votes = voteCounts.get(bracket.book1Id!) || 0;
        const book2Votes = voteCounts.get(bracket.book2Id!) || 0;
        if (book1Votes > book2Votes) winnerId = bracket.book1Id!;
        else if (book2Votes > book1Votes) winnerId = bracket.book2Id!;
        else winnerId = Math.random() > 0.5 ? bracket.book1Id! : bracket.book2Id!;

        await db.updateBracketWinner(input.bracketId, winnerId);

        // Advance winner to next round
        const nextRoundMatches = bracketList.filter((b) => b.conference === bracket.conference && b.round === bracket.round + 1);
        if (nextRoundMatches.length > 0) {
          const nextMatchIdx = Math.floor((bracket.matchOrder - 1) / 2);
          const nextMatch = nextRoundMatches.find((b) => b.matchOrder === nextMatchIdx + 1);
          if (nextMatch) {
            const isFirstSlot = (bracket.matchOrder - 1) % 2 === 0;
            if (isFirstSlot) await db.updateBracketBooks(nextMatch.id, { book1Id: winnerId });
            else await db.updateBracketBooks(nextMatch.id, { book2Id: winnerId });
            const updatedBrackets = await db.getEventBrackets(input.eventId);
            const updatedNext = updatedBrackets.find((b) => b.id === nextMatch.id);
            if (updatedNext?.book1Id && updatedNext?.book2Id) await db.updateBracketStatus(nextMatch.id, "voting");
          }
        }

        // Check for finals (cross-conference)
        const allBrackets = await db.getEventBrackets(input.eventId);
        const maxRoundInConf = Math.max(...allBrackets.filter((b) => b.conference === bracket.conference).map((b) => b.round));
        if (bracket.round === maxRoundInConf) {
          const confAWinner = allBrackets.find((b) => b.conference === "A" && b.round === maxRoundInConf && b.winnerId);
          const confBWinner = allBrackets.find((b) => b.conference === "B" && b.round === maxRoundInConf && b.winnerId);
          if (confAWinner?.winnerId && confBWinner?.winnerId) {
            const finalMatch = allBrackets.find((b) => b.round === maxRoundInConf + 1);
            if (finalMatch) {
              await db.updateBracketBooks(finalMatch.id, { book1Id: confAWinner.winnerId, book2Id: confBWinner.winnerId });
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
          const subs = await db.getEventSubmissions(input.eventId);
          for (const sub of subs) await db.recordSubmissionHistory(sub.bookId, input.eventId, sub.bookId === winnerId);
          const event = await db.getEventById(input.eventId);
          const winnerBook = await db.getBookById(winnerId);
          try { await notifyOwner({ title: `Tournament Champion: ${winnerBook?.title ?? "Unknown"}`, content: `"${winnerBook?.title}" by ${winnerBook?.author} has won the ${event?.title} tournament!` }); } catch {}
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
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "You already voted" });
        await db.castVote({ eventId: input.eventId, userId: ctx.user.id, bookId: input.bookId });
        return { success: true };
      }),
    castRanked: protectedProcedure
      .input(z.object({ eventId: z.number(), rankings: z.array(z.number()).min(1) }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserVoteForEvent(input.eventId, ctx.user.id);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "You already voted" });
        await db.castVote({ eventId: input.eventId, userId: ctx.user.id, bookId: input.rankings[0], rankings: input.rankings });
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
          for (const v of allVotes) voteCounts.set(v.bookId, (voteCounts.get(v.bookId) || 0) + 1);
          const results = subs.map((s) => ({ bookId: s.bookId, bookTitle: s.bookTitle, bookAuthor: s.bookAuthor, votes: voteCounts.get(s.bookId) || 0 }));
          results.sort((a, b) => b.votes - a.votes);
          return { scheme: "simple_majority" as const, results, totalVotes: allVotes.length };
        }
        if (event.votingScheme === "ranked_choice") return runRankedChoice(allVotes, subs);
        return { scheme: event.votingScheme, results: [], totalVotes: allVotes.length };
      }),
    myVote: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserVoteForEvent(input.eventId, ctx.user.id) ?? null;
      }),
    resolve: protectedProcedure
      .input(z.object({ groupId: z.number(), eventId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        const event = await db.getEventById(input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
        const allVotes = await db.getEventVotes(input.eventId);
        const subs = await db.getEventSubmissions(input.eventId);
        let winnerId: number | null = null;
        if (event.votingScheme === "simple_majority") {
          const voteCounts = new Map<number, number>();
          for (const v of allVotes) voteCounts.set(v.bookId, (voteCounts.get(v.bookId) || 0) + 1);
          let maxVotes = 0;
          Array.from(voteCounts.entries()).forEach(([bookId, countVal]) => { if (countVal > maxVotes) { maxVotes = countVal; winnerId = bookId; } });
        } else if (event.votingScheme === "ranked_choice") {
          const result = runRankedChoice(allVotes, subs);
          if (result.results.length > 0) winnerId = result.results[0].bookId;
        }
        if (winnerId) {
          await db.setEventWinner(input.eventId, winnerId);
          await db.markBookAsRead(winnerId);
          for (const sub of subs) await db.recordSubmissionHistory(sub.bookId, input.eventId, sub.bookId === winnerId);
          const winnerBook = await db.getBookById(winnerId);
          try { await notifyOwner({ title: `Winner Selected: ${event.title}`, content: `"${winnerBook?.title}" by ${winnerBook?.author} has won the ${event.title} selection!` }); } catch {}
        }
        return { winnerId };
      }),
  }),

  // ─── Calendar (group-scoped) ──────────────────────────────────
  calendar: router({
    create: protectedProcedure
      .input(z.object({
        groupId: z.number(), title: z.string().min(1), description: z.string().optional(),
        eventType: z.enum(["submission_deadline", "voting_deadline", "reading_milestone", "meeting", "custom"]),
        startDate: z.date(), endDate: z.date().optional(), relatedEventId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        const id = await db.createCalendarEvent({ ...input, createdBy: ctx.user.id });
        return { id };
      }),
    list: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getCalendarEvents(input.groupId);
      }),
    upcoming: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getUpcomingCalendarEvents(input.groupId);
      }),
    delete: protectedProcedure
      .input(z.object({ groupId: z.number(), id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        await db.deleteCalendarEvent(input.id);
        return { success: true };
      }),
  }),

  // ─── Chat (group-scoped) ─────────────────────────────────────
  chat: router({
    send: protectedProcedure
      .input(z.object({ groupId: z.number(), content: z.string().min(1).max(2000), eventId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        const id = await db.createChatMessage({ groupId: input.groupId, userId: ctx.user.id, content: input.content, eventId: input.eventId });
        try { await notifyOwner({ title: `New Chat: ${ctx.user.name ?? "A member"}`, content: input.content.slice(0, 200) }); } catch {}
        return { id };
      }),
    messages: protectedProcedure
      .input(z.object({ groupId: z.number(), eventId: z.number().optional(), limit: z.number().min(1).max(200).default(100) }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getChatMessages(input.groupId, input.eventId, input.limit);
      }),
  }),

  // ─── Milestones ───────────────────────────────────────────────
  milestones: router({
    create: protectedProcedure
      .input(z.object({
        groupId: z.number(), eventId: z.number(), title: z.string().min(1), description: z.string().optional(),
        targetDate: z.date(), targetPage: z.number().positive().optional(), targetPercent: z.number().min(0).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        const id = await db.createMilestone(input);
        return { id };
      }),
    listForEvent: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return db.getEventMilestones(input.eventId);
      }),
  }),

  // ─── Reading Progress ─────────────────────────────────────────
  readingProgress: router({
    update: protectedProcedure
      .input(z.object({ groupId: z.number(), eventId: z.number(), currentPage: z.number().min(0), totalPages: z.number().positive().optional() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        const id = await db.upsertReadingProgress({ groupId: input.groupId, eventId: input.eventId, userId: ctx.user.id, currentPage: input.currentPage, totalPages: input.totalPages });
        return { id };
      }),
    getForEvent: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return db.getEventReadingProgress(input.eventId);
      }),
    mine: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getMyReadingProgress(input.eventId, ctx.user.id);
      }),
  }),

  // ─── Book Reviews ─────────────────────────────────────────────
  reviews: router({
    create: protectedProcedure
      .input(z.object({ groupId: z.number(), bookId: z.number(), rating: z.number().min(1).max(5), reviewText: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        const id = await db.createBookReview({ groupId: input.groupId, bookId: input.bookId, userId: ctx.user.id, rating: input.rating, reviewText: input.reviewText });
        return { id };
      }),
    listForBook: protectedProcedure
      .input(z.object({ groupId: z.number(), bookId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getBookReviews(input.bookId, input.groupId);
      }),
    averageRating: protectedProcedure
      .input(z.object({ groupId: z.number(), bookId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireGroupMember(ctx.user.id, input.groupId);
        return db.getBookAverageRating(input.bookId, input.groupId);
      }),
  }),

  // ─── Group Settings (admin) ───────────────────────────────────
  groupSettings: router({
    delete: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });
        if (group.createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the group creator can delete the group" });
        await db.deleteGroup(input.groupId);
        return { success: true };
      }),
    removeMember: protectedProcedure
      .input(z.object({ groupId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireGroupAdmin(ctx.user.id, input.groupId);
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove yourself" });
        await db.removeGroupMember(input.groupId, input.userId);
        return { success: true };
      }),
    transferOwnership: protectedProcedure
      .input(z.object({ groupId: z.number(), newOwnerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });
        if (group.createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the group creator can transfer ownership" });
        await db.transferGroupOwnership(input.groupId, input.newOwnerId);
        return { success: true };
      }),
    leave: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });
        if (group.createdBy === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "The group creator cannot leave. Transfer ownership first or delete the group." });
        await db.removeGroupMember(input.groupId, ctx.user.id);
        return { success: true };
      }),
  }),
});

// ─── Tournament Bracket Generation ──────────────────────────────────
async function generateTournamentBracket(eventId: number, subs: Awaited<ReturnType<typeof db.getEventSubmissions>>) {
  const bookIds = subs.map((s) => s.bookId);
  const historyCounts = await db.getBookSubmissionCounts(bookIds);
  type SeededBook = { bookId: number; previousSubmissions: number; seed: number };
  const seededBooks: SeededBook[] = subs.map((s) => ({ bookId: s.bookId, previousSubmissions: historyCounts.get(s.bookId) || 0, seed: 0 }));
  seededBooks.sort((a, b) => b.previousSubmissions - a.previousSubmissions);
  seededBooks.forEach((b, i) => { b.seed = i + 1; });
  let i = 0;
  while (i < seededBooks.length) {
    let j = i;
    while (j < seededBooks.length && seededBooks[j].previousSubmissions === seededBooks[i].previousSubmissions) j++;
    for (let k = j - 1; k > i; k--) { const r = i + Math.floor(Math.random() * (k - i + 1)); [seededBooks[k], seededBooks[r]] = [seededBooks[r], seededBooks[k]]; }
    for (let k = i; k < j; k++) seededBooks[k].seed = k + 1;
    i = j;
  }
  const half = Math.ceil(seededBooks.length / 2);
  const confA = seededBooks.slice(0, half);
  const confB = seededBooks.slice(half);

  const createConferenceBracket = async (conf: SeededBook[], confLabel: "A" | "B") => {
    if (conf.length === 0) return;
    const size = Math.pow(2, Math.ceil(Math.log2(Math.max(conf.length, 2))));
    const padded = [...conf];
    while (padded.length < size) padded.push({ bookId: 0, previousSubmissions: 0, seed: 999 });
    const seeded = tournamentSeed(padded);
    const round1Matches = seeded.length / 2;
    for (let m = 0; m < round1Matches; m++) {
      const b1 = seeded[m * 2]; const b2 = seeded[m * 2 + 1];
      await db.createBracketMatch({ eventId, conference: confLabel, round: 1, matchOrder: m + 1, book1Id: b1.bookId === 0 ? undefined : b1.bookId, book2Id: b2.bookId === 0 ? undefined : b2.bookId, book1Seed: b1.bookId === 0 ? undefined : b1.seed, book2Seed: b2.bookId === 0 ? undefined : b2.seed });
    }
    let matchesInRound = round1Matches / 2; let round = 2;
    while (matchesInRound >= 1) {
      for (let m = 0; m < matchesInRound; m++) await db.createBracketMatch({ eventId, conference: confLabel, round, matchOrder: m + 1 });
      matchesInRound = matchesInRound / 2; round++;
    }
  };

  await createConferenceBracket(confA, "A");
  await createConferenceBracket(confB, "B");
  const maxRoundA = confA.length <= 1 ? 1 : Math.ceil(Math.log2(Math.max(confA.length, 2)));
  const maxRoundB = confB.length <= 1 ? 1 : Math.ceil(Math.log2(Math.max(confB.length, 2)));
  const finalsRound = Math.max(maxRoundA, maxRoundB) + 1;
  await db.createBracketMatch({ eventId, conference: "A", round: finalsRound, matchOrder: 1 });

  const allBrackets = await db.getEventBrackets(eventId);
  const round1 = allBrackets.filter((b) => b.round === 1);
  for (const match of round1) {
    if (match.book1Id && !match.book2Id) { await db.updateBracketWinner(match.id, match.book1Id); await advanceWinner(eventId, match, match.book1Id, allBrackets); }
    else if (!match.book1Id && match.book2Id) { await db.updateBracketWinner(match.id, match.book2Id); await advanceWinner(eventId, match, match.book2Id, allBrackets); }
    else if (match.book1Id && match.book2Id) await db.updateBracketStatus(match.id, "voting");
  }
}

async function advanceWinner(eventId: number, match: { conference: string; round: number; matchOrder: number }, winnerId: number, allBrackets: Awaited<ReturnType<typeof db.getEventBrackets>>) {
  const nextRound = allBrackets.filter((b) => b.conference === match.conference && b.round === match.round + 1);
  if (nextRound.length > 0) {
    const nextMatchIdx = Math.floor((match.matchOrder - 1) / 2);
    const nextMatch = nextRound.find((b) => b.matchOrder === nextMatchIdx + 1);
    if (nextMatch) {
      const isFirstSlot = (match.matchOrder - 1) % 2 === 0;
      if (isFirstSlot) await db.updateBracketBooks(nextMatch.id, { book1Id: winnerId });
      else await db.updateBracketBooks(nextMatch.id, { book2Id: winnerId });
    }
  }
}

function tournamentSeed<T>(arr: T[]): T[] {
  if (arr.length <= 2) return arr;
  const n = arr.length;
  const result: T[] = new Array(n);
  const order = generateSeedOrder(n);
  for (let i = 0; i < n; i++) result[i] = arr[order[i]];
  return result;
}

function generateSeedOrder(n: number): number[] {
  if (n === 1) return [0];
  if (n === 2) return [0, 1];
  const half = n / 2;
  const prev = generateSeedOrder(half);
  const result: number[] = [];
  for (const p of prev) result.push(p, n - 1 - p);
  return result;
}

function runRankedChoice(allVotes: Awaited<ReturnType<typeof db.getEventVotes>>, subs: Awaited<ReturnType<typeof db.getEventSubmissions>>) {
  const bookMap = new Map(subs.map((s) => [s.bookId, { title: s.bookTitle, author: s.bookAuthor }]));
  const ballots: number[][] = allVotes.map((v) => (v.rankings as number[]) || [v.bookId]).filter((r) => r.length > 0);
  if (ballots.length === 0) return { scheme: "ranked_choice" as const, results: [], totalVotes: 0, rounds: [] };
  const eliminated = new Set<number>();
  const rounds: { round: number; counts: { bookId: number; votes: number }[]; eliminated?: number }[] = [];
  const majority = Math.floor(ballots.length / 2) + 1;
  for (let round = 1; round <= 20; round++) {
    const counts = new Map<number, number>();
    for (const ballot of ballots) { const choice = ballot.find((id) => !eliminated.has(id)); if (choice !== undefined) counts.set(choice, (counts.get(choice) || 0) + 1); }
    const roundCounts = Array.from(counts.entries()).map(([bookId, votes]) => ({ bookId, votes })).sort((a, b) => b.votes - a.votes);
    if (roundCounts.length > 0 && roundCounts[0].votes >= majority) {
      rounds.push({ round, counts: roundCounts });
      const results = roundCounts.map((r) => ({ bookId: r.bookId, bookTitle: bookMap.get(r.bookId)?.title ?? "Unknown", bookAuthor: bookMap.get(r.bookId)?.author ?? "Unknown", votes: r.votes }));
      return { scheme: "ranked_choice" as const, results, totalVotes: ballots.length, rounds };
    }
    if (roundCounts.length <= 1) { rounds.push({ round, counts: roundCounts }); break; }
    const toEliminate = roundCounts[roundCounts.length - 1].bookId;
    eliminated.add(toEliminate);
    rounds.push({ round, counts: roundCounts, eliminated: toEliminate });
  }
  const finalCounts = new Map<number, number>();
  for (const ballot of ballots) { const choice = ballot.find((id) => !eliminated.has(id)); if (choice !== undefined) finalCounts.set(choice, (finalCounts.get(choice) || 0) + 1); }
  const results = Array.from(finalCounts.entries()).map(([bookId, votes]) => ({ bookId, bookTitle: bookMap.get(bookId)?.title ?? "Unknown", bookAuthor: bookMap.get(bookId)?.author ?? "Unknown", votes })).sort((a, b) => b.votes - a.votes);
  return { scheme: "ranked_choice" as const, results, totalVotes: ballots.length, rounds };
}

export type AppRouter = typeof appRouter;
