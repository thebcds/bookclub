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
- [x] Tests for group-scoped operations (38 passing)
