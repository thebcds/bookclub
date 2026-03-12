# Book Club Portal TODO

## Core Infrastructure
- [x] Database schema design (users, members, books, events, votes, chat, calendar)
- [x] Backend API routes (tRPC routers)
- [x] Frontend theming and layout

## Member Management
- [x] Member invitation system (link-based invites)
- [x] Role management (admin/member)
- [x] Member list and profile display

## Calendar
- [x] Calendar event creation (submission deadlines, voting periods, reading milestones)
- [x] Calendar view UI
- [x] ICS export for Google Calendar / Apple Calendar

## Book Submissions
- [x] Book submission form with adjustable parameters
- [x] Maximum book length filter
- [x] Previously-read filter (prevent duplicates)
- [x] Genre selection
- [x] Critical rating field
- [x] Public or anonymous submission toggle
- [x] Submission deadline enforcement

## Voting Systems
- [x] Tournament bracket voting (8 books, random seeding, conferences)
- [x] Seeding advantage for previously-submitted books
- [x] Bracket progression and matchup voting
- [x] Simple majority voting
- [x] Ranked choice voting
- [x] Voting deadline management

## Dashboard
- [x] Upcoming books display
- [x] Past books read history
- [x] Historical bracket results
- [x] Book history tracking

## Chat
- [x] Real-time chat group for discussion
- [x] Link sharing support
- [x] Member communication

## Reading Coordination
- [x] Reading milestone tracking
- [x] Deadline management for submissions, voting, reading

## Testing
- [x] Vitest unit tests for all backend procedures (38 passing)

## New Features (v1.1)
- [x] Book cover images via Open Library API auto-fetch
- [x] Book cover display on submission cards, book lists, bracket views, and dashboard
- [x] Notifications when voting rounds open (via notifyOwner)
- [x] Notifications when deadlines approach (via notifyOwner)
- [x] Notifications for new chat messages (via notifyOwner)
- [x] Notifications when winner is selected (via notifyOwner)
- [x] Visual bracket tree layout with conference columns, VS dividers, and champion final
- [x] Open Library search component with cover preview in submission form
- [x] New tests for Open Library, notifications, and cover URL features

## Bugs
- [x] Preview not loading - fixed by clearing zombie processes and restarting server on port 3000

## Multi-Group Support (v2.0)
- [x] Groups table in database schema
- [x] Group memberships table with role (admin/member) per group
- [x] Add groupId foreign key to: books, events, submissions, brackets, votes, calendar_events, chat_messages, invitations, reading_milestones, submission_history
- [x] Group CRUD API (create, update, list, get)
- [x] Group membership API (join, leave, invite, manage roles)
- [x] Scope all data queries by groupId
- [x] Group selector/switcher in sidebar navigation
- [x] Group creation and management page
- [x] Group-specific invitations (invite to a specific group)
- [x] Group settings page (name, description, admin management)
- [x] Landing page showing user's groups
- [x] All existing pages scoped to selected group
- [x] Tests for group-scoped operations (51 passing)
- [x] Fix: `<p>` cannot contain nested `<div>` error on Home page (/)
- [x] Fix: voting.myVote query returns undefined instead of null
- [x] Fix: submissions.mySubmission query returns undefined instead of null
- [x] Fix: "Need at least 2 submissions" error - improved message clarity

## Features v3.0
- [x] Reading progress tracker (log current page, group-wide progress bar)
- [x] Book ratings and reviews from group members (1-5 stars, text reviews, average rating)
- [x] Group settings page (edit name/description, transfer ownership, delete group, leave group, remove members)
- [x] Toast notifications for start-voting errors
- [x] Submission count tracker on event detail page (X / Y submitted)
- [x] Auto-disable Start Voting button when fewer than 2 submissions
- [x] Book detail page with reviews and ratings
- [x] Clickable book cards linking to detail page
- [x] Tests for reading progress, reviews, and group settings (51 total passing)

## Theme Switching (v3.1)
- [x] Dark mode CSS variables in index.css (already existed)
- [x] Enable switchable theme in ThemeProvider
- [x] Theme toggle button in sidebar footer with animated switch
- [x] Persist theme preference across sessions via localStorage

## Customizable Submission Quantity (v3.2)
- [x] Add maxTotalSubmissions column to events table (total titles allowed for the event)
- [x] Add maxSubmissionsPerMember column to events table (how many each member can submit)
- [x] Add no_vote voting scheme (direct selection, no voting)
- [x] Enforce submission limits in backend (per-member and total)
- [x] Update event creation form with submission quantity fields and tooltips
- [x] Show submission count / limits on event detail page
- [x] Auto-complete event when single submission received in no-vote mode
- [x] Per-member multi-submission support with counter on Submit button
- [x] Hide Start Voting button for no_vote events
- [x] All 51 tests passing

## Admin Event Editing (v3.3)
- [x] Backend: events.update procedure (title, description, dates, criteria, voting scheme)
- [x] Backend: events.updateStatus procedure (cancel, reactivate)
- [x] Backend: events.overrideWinner procedure (admin can change or clear the winning book)
- [x] Backend: events.reopenSubmissions procedure
- [x] Frontend: Edit Event dialog on EventDetail page (admin only, full form)
- [x] Frontend: Admin dropdown menu with gear icon (edit, reopen, cancel, reactivate, override winner)
- [x] Frontend: Override winner UI (select from submitted books or clear)
- [x] All 51 tests passing

## Retro Theme & Bug Fixes (v3.4)
- [x] Fix: Open Library search dropdown overlaps form fields in submission dialog (absolute positioning with z-50)
- [x] Add retro display theme mode (amber CRT aesthetic with scanlines, monospace font, phosphor glow)
- [x] Update theme toggle to 3-mode segmented control (Light, Dark, Retro) in sidebar footer
- [x] All 51 tests passing

## Public/Private Group Visibility (v3.5)
- [x] Add isPublic column to groups table (default false/private)
- [x] Add public/private toggle to group creation dialog
- [x] Add public/private toggle to group settings page
- [x] Create "Discover Groups" / "Browse Public Groups" page
- [x] Add backend route to list public groups
- [x] Add backend route to join a public group directly (no invite needed)
- [x] Add navigation link to discover/browse public groups
- [x] Write tests for public group listing and joining (58 total passing)

## Invite Link Visibility Fix (v3.6)
- [x] Add copy link button to each pending invitation in Members page

## Invite Link Auth Fix (v3.7)
- [x] Fix invite link authorization error for users on different accounts
- [x] Stop global auto-redirect to login on invite pages
- [x] Preserve return path (invite URL) through OAuth login flow
- [x] All 58 tests passing

## Invitation Improvements (v3.8)
- [x] Test invite flow end-to-end (create invite, copy link, accept from different account)
- [x] Add revoke/cancel button for pending invitations
- [x] Show accepted invitations history (who accepted which invite and when)
- [x] Write tests for revoke and invitation history (63 total passing)
