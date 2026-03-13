import { relations } from "drizzle-orm";
import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  bio: text("bio"),
  favoriteGenres: json("favoriteGenres").$type<string[]>().default([]),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Groups (Book Clubs) ────────────────────────────────────────────
export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  isPublic: boolean("isPublic").default(false).notNull(),
  coverUrl: text("coverUrl"),
  tags: json("tags").$type<string[]>().default([]),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Group Members ──────────────────────────────────────────────────
export const groupMembers = mysqlTable("groupMembers", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

// ─── Invitations ─────────────────────────────────────────────────────
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  invitedBy: int("invitedBy").notNull(),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["member", "admin"]).default("member").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "expired"])
    .default("pending")
    .notNull(),
  acceptedBy: int("acceptedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

// ─── Books (per-group catalog) ──────────────────────────────────────
export const books = mysqlTable("books", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  author: varchar("author", { length: 512 }).notNull(),
  genre: varchar("genre", { length: 128 }),
  pageCount: int("pageCount"),
  coverUrl: text("coverUrl"),
  rating: int("rating"),
  isbn: varchar("isbn", { length: 20 }),
  description: text("description"),
  hasBeenRead: boolean("hasBeenRead").default(false).notNull(),
  readDate: timestamp("readDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Events (selection rounds, per-group) ───────────────────────────
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  votingScheme: mysqlEnum("votingScheme", [
    "tournament",
    "simple_majority",
    "ranked_choice",
    "no_vote",
  ]).notNull(),
  status: mysqlEnum("status", [
    "submissions_open",
    "voting",
    "completed",
    "cancelled",
  ])
    .default("submissions_open")
    .notNull(),
  maxPageCount: int("maxPageCount"),
  allowPreviouslyRead: boolean("allowPreviouslyRead").default(false).notNull(),
  allowedGenres: json("allowedGenres"),
  minRating: int("minRating"),
  anonymousSubmissions: boolean("anonymousSubmissions").default(false).notNull(),
  maxTotalSubmissions: int("maxTotalSubmissions").default(8).notNull(),
  maxSubmissionsPerMember: int("maxSubmissionsPerMember").default(1).notNull(),
  adminCurated: boolean("adminCurated").default(false).notNull(),
  submissionDeadline: timestamp("submissionDeadline"),
  votingDeadline: timestamp("votingDeadline"),
  readingDeadline: timestamp("readingDeadline"),
  winningBookId: int("winningBookId"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Submissions ────────────────────────────────────────────────────
export const submissions = mysqlTable("submissions", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  bookId: int("bookId").notNull(),
  submittedBy: int("submittedBy").notNull(),
  isAnonymous: boolean("isAnonymous").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Tournament Brackets ────────────────────────────────────────────
export const brackets = mysqlTable("brackets", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  conference: mysqlEnum("conference", ["A", "B"]).notNull(),
  round: int("round").notNull(),
  matchOrder: int("matchOrder").notNull(),
  book1Id: int("book1Id"),
  book2Id: int("book2Id"),
  book1Seed: int("book1Seed"),
  book2Seed: int("book2Seed"),
  winnerId: int("winnerId"),
  status: mysqlEnum("status", ["pending", "voting", "completed"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Votes ──────────────────────────────────────────────────────────
export const votes = mysqlTable("votes", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  bracketId: int("bracketId"),
  userId: int("userId").notNull(),
  bookId: int("bookId").notNull(),
  rankings: json("rankings"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Calendar Events ────────────────────────────────────────────────
export const calendarEvents = mysqlTable("calendarEvents", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  eventType: mysqlEnum("eventType", [
    "submission_deadline",
    "voting_deadline",
    "reading_milestone",
    "meeting",
    "custom",
  ]).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  relatedEventId: int("relatedEventId"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Chat Messages ──────────────────────────────────────────────────
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  eventId: int("eventId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Book Submission History (for seeding advantage) ────────────────
export const submissionHistory = mysqlTable("submissionHistory", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("bookId").notNull(),
  eventId: int("eventId").notNull(),
  didWin: boolean("didWin").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Reading Milestones ─────────────────────────────────────────────
export const readingMilestones = mysqlTable("readingMilestones", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  targetDate: timestamp("targetDate").notNull(),
  targetPage: int("targetPage"),
  targetPercent: int("targetPercent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Reading Progress (per user per event) ─────────────────────────
export const readingProgress = mysqlTable("readingProgress", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  currentPage: int("currentPage").default(0).notNull(),
  totalPages: int("totalPages"),
  percentComplete: int("percentComplete").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Book Reviews (per user per book per group) ────────────────────
export const bookReviews = mysqlTable("bookReviews", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  bookId: int("bookId").notNull(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(), // 1-5 stars
  reviewText: text("reviewText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Relations ──────────────────────────────────────────────────────
export const groupsRelations = relations(groups, ({ many, one }) => ({
  members: many(groupMembers),
  books: many(books),
  events: many(events),
  calendarEvents: many(calendarEvents),
  chatMessages: many(chatMessages),
  invitations: many(invitations),
  creator: one(users, { fields: [groups.createdBy], references: [users.id] }),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  groupMemberships: many(groupMembers),
  submissions: many(submissions),
  votes: many(votes),
  chatMessages: many(chatMessages),
}));

export const eventsRelations = relations(events, ({ many, one }) => ({
  group: one(groups, { fields: [events.groupId], references: [groups.id] }),
  submissions: many(submissions),
  brackets: many(brackets),
  votes: many(votes),
  calendarEvents: many(calendarEvents),
  milestones: many(readingMilestones),
  winningBook: one(books, {
    fields: [events.winningBookId],
    references: [books.id],
  }),
  creator: one(users, { fields: [events.createdBy], references: [users.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  event: one(events, { fields: [submissions.eventId], references: [events.id] }),
  book: one(books, { fields: [submissions.bookId], references: [books.id] }),
  submitter: one(users, { fields: [submissions.submittedBy], references: [users.id] }),
}));

export const bracketsRelations = relations(brackets, ({ one, many }) => ({
  event: one(events, { fields: [brackets.eventId], references: [events.id] }),
  book1: one(books, { fields: [brackets.book1Id], references: [books.id] }),
  book2: one(books, { fields: [brackets.book2Id], references: [books.id] }),
  winner: one(books, { fields: [brackets.winnerId], references: [books.id] }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  event: one(events, { fields: [votes.eventId], references: [events.id] }),
  bracket: one(brackets, { fields: [votes.bracketId], references: [brackets.id] }),
  user: one(users, { fields: [votes.userId], references: [users.id] }),
  book: one(books, { fields: [votes.bookId], references: [books.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  group: one(groups, { fields: [chatMessages.groupId], references: [groups.id] }),
  user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  group: one(groups, { fields: [books.groupId], references: [groups.id] }),
  reviews: many(bookReviews),
}));

export const readingProgressRelations = relations(readingProgress, ({ one }) => ({
  group: one(groups, { fields: [readingProgress.groupId], references: [groups.id] }),
  event: one(events, { fields: [readingProgress.eventId], references: [events.id] }),
  user: one(users, { fields: [readingProgress.userId], references: [users.id] }),
}));

export const bookReviewsRelations = relations(bookReviews, ({ one }) => ({
  group: one(groups, { fields: [bookReviews.groupId], references: [groups.id] }),
  book: one(books, { fields: [bookReviews.bookId], references: [books.id] }),
  user: one(users, { fields: [bookReviews.userId], references: [users.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  group: one(groups, { fields: [invitations.groupId], references: [groups.id] }),
}));
