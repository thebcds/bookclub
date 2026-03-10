import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  books,
  brackets,
  calendarEvents,
  chatMessages,
  events,
  groupMembers,
  groups,
  invitations,
  readingMilestones,
  submissionHistory,
  submissions,
  users,
  votes,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Groups ─────────────────────────────────────────────────────────
export async function createGroup(data: { name: string; description?: string; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(groups).values(data);
  const groupId = result[0].insertId;
  // Creator is automatically an admin member
  await db.insert(groupMembers).values({ groupId, userId: data.createdBy, role: "admin" });
  return groupId;
}

export async function getGroupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getUserGroups(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: groups.id, name: groups.name, description: groups.description, createdBy: groups.createdBy, createdAt: groups.createdAt, role: groupMembers.role })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));
}

export async function getGroupMembers(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: groupMembers.role, joinedAt: groupMembers.joinedAt, siteRole: users.role })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));
}

export async function getGroupMembership(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return result[0] ?? undefined;
}

export async function updateGroupMemberRole(groupId: number, userId: number, role: "admin" | "member") {
  const db = await getDb();
  if (!db) return;
  await db.update(groupMembers).set({ role }).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
}

export async function addGroupMember(groupId: number, userId: number, role: "admin" | "member" = "member") {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await getGroupMembership(groupId, userId);
  if (existing) return existing.id;
  const result = await db.insert(groupMembers).values({ groupId, userId, role });
  return result[0].insertId;
}

export async function updateGroup(id: number, data: { name?: string; description?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(groups).set(data).where(eq(groups.id, id));
}

// ─── Invitations (group-scoped) ─────────────────────────────────────
export async function createInvitation(token: string, groupId: number, invitedBy: number, email: string | null, role: "member" | "admin", expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(invitations).values({ token, groupId, invitedBy, email, role, expiresAt });
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ id: invitations.id, token: invitations.token, groupId: invitations.groupId, invitedBy: invitations.invitedBy, email: invitations.email, role: invitations.role, status: invitations.status, expiresAt: invitations.expiresAt, groupName: groups.name })
    .from(invitations)
    .leftJoin(groups, eq(invitations.groupId, groups.id))
    .where(eq(invitations.token, token))
    .limit(1);
  return result[0] ?? undefined;
}

export async function getPendingInvitations(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invitations).where(and(eq(invitations.groupId, groupId), eq(invitations.status, "pending")));
}

export async function acceptInvitation(token: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  const inv = await getInvitationByToken(token);
  if (!inv) return;
  await db.update(invitations).set({ status: "accepted", acceptedBy: userId }).where(eq(invitations.token, token));
  await addGroupMember(inv.groupId, userId, inv.role);
}

// ─── Books (group-scoped) ───────────────────────────────────────────
export async function createBook(data: { groupId: number; title: string; author: string; genre?: string; pageCount?: number; coverUrl?: string; rating?: number; isbn?: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(books).values(data);
  return result[0].insertId;
}

export async function getBookById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(books).where(eq(books.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getAllBooks(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(eq(books.groupId, groupId)).orderBy(desc(books.createdAt));
}

export async function searchBooks(groupId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(and(eq(books.groupId, groupId), sql`(${books.title} LIKE ${`%${query}%`} OR ${books.author} LIKE ${`%${query}%`})`)).limit(20);
}

export async function markBookAsRead(bookId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(books).set({ hasBeenRead: true, readDate: new Date() }).where(eq(books.id, bookId));
}

// ─── Events (group-scoped) ──────────────────────────────────────────
export async function createEvent(data: {
  groupId: number; title: string; description?: string; votingScheme: "tournament" | "simple_majority" | "ranked_choice";
  maxPageCount?: number; allowPreviouslyRead?: boolean; allowedGenres?: string[]; minRating?: number;
  anonymousSubmissions?: boolean; maxSubmissions?: number; submissionDeadline?: Date; votingDeadline?: Date; readingDeadline?: Date; createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(events).values(data);
  return result[0].insertId;
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getAllEvents(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).where(eq(events.groupId, groupId)).orderBy(desc(events.createdAt));
}

export async function getActiveEvents(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).where(and(eq(events.groupId, groupId), sql`${events.status} IN ('submissions_open', 'voting')`)).orderBy(desc(events.createdAt));
}

export async function getCompletedEvents(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: events.id, title: events.title, votingScheme: events.votingScheme, winningBookId: events.winningBookId,
      createdAt: events.createdAt, updatedAt: events.updatedAt, bookTitle: books.title, bookAuthor: books.author, bookCoverUrl: books.coverUrl,
    })
    .from(events)
    .leftJoin(books, eq(events.winningBookId, books.id))
    .where(and(eq(events.groupId, groupId), eq(events.status, "completed")))
    .orderBy(desc(events.updatedAt));
}

export async function updateEventStatus(eventId: number, status: "submissions_open" | "voting" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) return;
  await db.update(events).set({ status }).where(eq(events.id, eventId));
}

export async function setEventWinner(eventId: number, bookId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(events).set({ winningBookId: bookId, status: "completed" }).where(eq(events.id, eventId));
}

// ─── Submissions ────────────────────────────────────────────────────
export async function createSubmission(data: { eventId: number; bookId: number; submittedBy: number; isAnonymous: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(submissions).values(data);
  return result[0].insertId;
}

export async function getEventSubmissions(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: submissions.id, eventId: submissions.eventId, bookId: submissions.bookId, submittedBy: submissions.submittedBy,
      isAnonymous: submissions.isAnonymous, createdAt: submissions.createdAt, bookTitle: books.title, bookAuthor: books.author,
      bookCoverUrl: books.coverUrl, bookPageCount: books.pageCount, bookGenre: books.genre, bookRating: books.rating,
      submitterName: users.name,
    })
    .from(submissions)
    .innerJoin(books, eq(submissions.bookId, books.id))
    .leftJoin(users, eq(submissions.submittedBy, users.id))
    .where(eq(submissions.eventId, eventId));
}

export async function getUserSubmissionForEvent(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(submissions).where(and(eq(submissions.eventId, eventId), eq(submissions.submittedBy, userId))).limit(1);
  return result[0] ?? null;
}

// ─── Submission History ─────────────────────────────────────────────
export async function recordSubmissionHistory(bookId: number, eventId: number, didWin: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.insert(submissionHistory).values({ bookId, eventId, didWin });
}

export async function getBookSubmissionCounts(bookIds: number[]): Promise<Map<number, number>> {
  const db = await getDb();
  if (!db) return new Map();
  if (bookIds.length === 0) return new Map();
  const rows = await db.select({ bookId: submissionHistory.bookId, count: sql<number>`COUNT(*)` }).from(submissionHistory).where(sql`${submissionHistory.bookId} IN (${sql.join(bookIds.map((id) => sql`${id}`), sql`, `)})`).groupBy(submissionHistory.bookId);
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.bookId, Number(r.count));
  return map;
}

// ─── Brackets ───────────────────────────────────────────────────────
export async function createBracketMatch(data: { eventId: number; conference: "A" | "B"; round: number; matchOrder: number; book1Id?: number; book2Id?: number; book1Seed?: number; book2Seed?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(brackets).values({ ...data, book1Id: data.book1Id ?? null, book2Id: data.book2Id ?? null, book1Seed: data.book1Seed ?? null, book2Seed: data.book2Seed ?? null });
  return result[0].insertId;
}

export async function getEventBrackets(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brackets).where(eq(brackets.eventId, eventId)).orderBy(brackets.round, brackets.matchOrder);
}

export async function updateBracketWinner(bracketId: number, winnerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(brackets).set({ winnerId, status: "completed" }).where(eq(brackets.id, bracketId));
}

export async function updateBracketStatus(bracketId: number, status: "pending" | "voting" | "completed") {
  const db = await getDb();
  if (!db) return;
  await db.update(brackets).set({ status }).where(eq(brackets.id, bracketId));
}

export async function updateBracketBooks(bracketId: number, data: { book1Id?: number; book2Id?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.update(brackets).set(data).where(eq(brackets.id, bracketId));
}

// ─── Votes ──────────────────────────────────────────────────────────
export async function castVote(data: { eventId: number; bracketId?: number; userId: number; bookId: number; rankings?: number[] }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(votes).values({ ...data, bracketId: data.bracketId ?? null, rankings: data.rankings ?? null });
}

export async function getUserVoteForBracket(bracketId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(votes).where(and(eq(votes.bracketId, bracketId), eq(votes.userId, userId))).limit(1);
  return result[0] ?? null;
}

export async function getUserVoteForEvent(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(votes).where(and(eq(votes.eventId, eventId), eq(votes.userId, userId), isNull(votes.bracketId))).limit(1);
  return result[0] ?? null;
}

export async function getBracketVotes(bracketId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(votes).where(eq(votes.bracketId, bracketId));
}

export async function getEventVotes(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(votes).where(and(eq(votes.eventId, eventId), isNull(votes.bracketId)));
}

// ─── Calendar Events (group-scoped) ────────────────────────────────
export async function createCalendarEvent(data: { groupId: number; title: string; description?: string; eventType: "submission_deadline" | "voting_deadline" | "reading_milestone" | "meeting" | "custom"; startDate: Date; endDate?: Date; relatedEventId?: number; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(calendarEvents).values({ ...data, endDate: data.endDate ?? null, relatedEventId: data.relatedEventId ?? null });
  return result[0].insertId;
}

export async function getCalendarEvents(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendarEvents).where(eq(calendarEvents.groupId, groupId)).orderBy(calendarEvents.startDate);
}

export async function getUpcomingCalendarEvents(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendarEvents).where(and(eq(calendarEvents.groupId, groupId), gte(calendarEvents.startDate, new Date()))).orderBy(calendarEvents.startDate);
}

export async function deleteCalendarEvent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}

// ─── Chat Messages (group-scoped) ──────────────────────────────────
export async function createChatMessage(data: { groupId: number; userId: number; content: string; eventId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(chatMessages).values({ ...data, eventId: data.eventId ?? null });
  return result[0].insertId;
}

export async function getChatMessages(groupId: number, eventId?: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const condition = eventId
    ? and(eq(chatMessages.groupId, groupId), eq(chatMessages.eventId, eventId))
    : and(eq(chatMessages.groupId, groupId), isNull(chatMessages.eventId));
  return db
    .select({ id: chatMessages.id, userId: chatMessages.userId, content: chatMessages.content, eventId: chatMessages.eventId, createdAt: chatMessages.createdAt, userName: users.name })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.userId, users.id))
    .where(condition)
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

// ─── Reading Milestones ─────────────────────────────────────────────
export async function createMilestone(data: { eventId: number; title: string; description?: string; targetDate: Date; targetPage?: number; targetPercent?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(readingMilestones).values(data);
  return result[0].insertId;
}

export async function getEventMilestones(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(readingMilestones).where(eq(readingMilestones.eventId, eventId)).orderBy(readingMilestones.targetDate);
}

// ─── Dashboard Queries (group-scoped) ──────────────────────────────
export async function getReadBooks(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(books).where(and(eq(books.groupId, groupId), eq(books.hasBeenRead, true))).orderBy(desc(books.readDate));
}
