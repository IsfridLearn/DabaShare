# Course space and reviews

Status: built and tested on branch `course-space` (phases 1–5). The database part is live (additive); the screens are not deployed yet.

## The problem

DabaShare helps students find each other, but stops at "Enroll". After that the learning (scheduling, links, updates) moves to Messenger and group chats, there's no reason to come back, and nobody can tell whether a tutor is any good. This project makes the learning itself happen on DabaShare, and turns finished courses into trust.

## What we're building (and deliberately not)

| Building | Not now (and why) |
|---|---|
| A **course space** for the tutor and enrolled students: schedule, updates, students | Chat inside a course (Messages already exists) |
| **Lessons** with date, time and a place or meeting link that only members see | Attendance tracking per lesson (extra work for tutors, little value yet) |
| **Updates** from the tutor, optionally with a link (notes, slides, a Drive folder) | File uploads (storage cost, and moderation of uploaded files). Links cover materials for now |
| **Completion:** the tutor marks a student as finished | Certificates (no verification behind them) |
| **Reviews:** 1–5 stars plus text, only from students who finished | Tutor replies to reviews (later) |
| **Ratings** on the course page, the catalogue and the tutor's profile | Ranking or sorting by rating (needs enough reviews to be fair) |

## Data design (one additive migration, nothing existing changes)

- `private.is_course_member(course)`: the owner, or a student with an **accepted** enrollment, and no block between them.
- `course_enrollments.completed_at`, set only through `set_enrollment_completed(enrollment, done)`. Only the tutor can call it, and only for an accepted student. The student is notified. The existing status rules and grants are untouched.
- `course_lessons`:
  - Fields: course, title, start and end time (max 12 hours), place or meeting link, notes.
  - Only members can read them; only the tutor can write.
  - Links must be `https://`.
  - A course can have at most 50 upcoming lessons.
  - Members are notified of new lessons.
- `course_updates`:
  - Fields: course, author (the tutor), text (up to 2000 characters), and an optional `https://` link.
  - Only members can read them; only the tutor can post or delete.
  - Members are notified, with at most one unread notification per course.
- `course_reviews`:
  - Fields: course, author, rating 1–5, and text up to 1000 characters.
  - One review per student per course.
  - Only a student with a **completed** enrollment can write one, and it's editable and deletable by its author.
  - Anyone who can see the course can read reviews, except reviews by someone in a block relationship with them.
  - The tutor is notified, and reviews can be reported (`report_target` gets `review`).
- `course_rating_summary(course_ids[])`: the average and count for each course, read under RLS. The catalogue, course page and profile use it.
- New notification types: `lesson_scheduled`, `course_update`, `course_completed`, `review_received`.

## Screens

The course page gets **tabs**:

| Tab | Visible to | Content |
|---|---|---|
| Overview | everyone | The current page (description, skills, tutor) |
| Schedule | members | Upcoming lessons as a timetable, then past ones. The tutor gets an "Add lesson" form. |
| Updates | members | The tutor's updates, newest first. The tutor gets a composer with an optional link. |
| Reviews | everyone | The average and count, then reviews. A student who finished and hasn't reviewed yet gets the review form. |
| Students | tutor | Requests, enrolled students, and **Mark as completed** |

Ratings also appear as "★ 4.8 (12)" in the catalogue entry and the course page facts panel, and as a tutor rating on profiles. My courses shows each course's next lesson.

## Phases

1. Study and this plan.
2. Database: the migration, RLS smoke tests that fail before and pass after, and an independent security review.
3. App: queries, actions, the tabbed course page, schedule, updates, students and completion, reviews.
4. Ratings in the catalogue and profile, and notification texts and links.
5. QA: extend the E2E suite with the full flow (schedule, update, complete, review, report), run the accessibility and overflow sweep in light and dark, and get a visual review.

Every change is additive and tested on the shared database with rolled-back RLS tests and self-cleaning E2E users. Nothing is deployed without the owner's go-ahead.

## Result

**Database.**
- `20261202090000_course_space.sql` adds the tables, rules and RPCs above.
- `20261202100000_course_space_hardening.sql` adds the security-review fixes:
  - Any clean text is a place, with no control characters; only strict http(s) values are linked.
  - Completion needs a lesson that has ended or 7 days since joining, with at most 30 a day per tutor.
  - Completion and review notifications are deduplicated.
  - Students blocked by the tutor can't review.
  - Reviewers stay finished.
  - Lesson edits are checked, and members are told about changed times or places.
- Both are additive and were applied to the shared database and recorded in `schema_migrations`.

**App.**
- The course page has tabs: Overview, Schedule, Updates, Reviews (with a count) and Students (with pending requests).
- Members see the next lesson in the facts panel.
- The tutor gets the "Add a lesson" form, the update composer, and **Mark as finished**, which shows its reason inline when it isn't allowed yet.
- Finished students get the review form (rating chips 1–5 and text), and can edit or delete their review. Reviews can be reported.
- Ratings with half stars show on the course page, in catalogue entries and as a tutor rating on profiles.
- My courses shows each course's next lesson.
- Four notification types link to the right tab.

**Tested.**
- `npm run check`: 114 unit tests, including lesson, update and review validation, link detection, tabs and notification texts.
- `npm run build`.
- RLS smoke: **170 passed, 0 failed**.
- E2E: **167 passed, 0 failed**, including schedule, update, notifications, the completion rule, review gating and tab fallback.
- Accessibility and overflow sweep: 44 screenshots of the course space as student and tutor, at 360 to 1440px and in dark mode. 0 issues.

**Not in this version** (from the plan): file uploads, attendance, tutor replies to reviews, sorting by rating, and feed activity for completions.
