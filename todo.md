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
- [x] Vitest unit tests for all backend procedures (26 passing)
