# DabaShare design v3: "The Commons"

Status: Phase 1 (study and decisions) is done. Nothing is implemented yet. Branch `design-v3`.

## 1. Why the current UI still reads as generic

We looked at screenshots of every screen at 360 and 1440px. An independent design review (Sonnet) reached the same conclusions.

1. **Every page has the same opening.** A serif H1 that repeats the sidebar label ("Home", "Courses", "People"), a grey one-liner, then a hairline. That costs about 120px of every screen and says nothing.
2. **Default SaaS blue.** Post, Search, Follow, Send, badges and sent message bubbles are all `blue-600`. Apart from the off-white background there's no brand colour and no warmth.
3. **One container for everything.** The composer, feed, course cards, people list, attachments, message shell and enrol panel are all the same thin-bordered white rounded box, often nested. Nothing changes scale, so nothing signals importance.
4. **Filters are forms, not browsing.** Courses stacks a search box, three native selects, a Search button and chips. People shows mutually exclusive modes and an on/off toggle as identical pills.
5. **No presence.** People appear as saturated initial circles (crimson, purple, blue), the loudest colour on most screens. Davao and its universities show up only as 12px grey text.
6. **Flat type.** Most text is 12–14px grey. On People, the labels, values and filler ("Shared interests", "Offers courses in") all share one size.
7. **The landing page is a stock template.** A hero, a three-icon row, and a 2×2 grid that just repeats the navigation.

What already works and stays: the warm off-white background, the Linear-like sidebar grouping, the plain-language copy, the course and session detail layout (main column plus a facts panel), inline attachments in posts, and the unread markers in Messages.

## 2. What the references actually teach (not what they look like)

| Reference | Principle we take | What we don't take |
|---|---|---|
| Linear | Group, then list: status groups with counts, dense rows, right-aligned metadata, one primary action at the top of the sidebar | Dark-only UI, issue-tracker density everywhere |
| Are.na | The content is the interface: chrome recedes, captions are small, breadcrumbs give a sense of place | Image grids. We have no course or profile images, so faking them would be dishonest. |
| Notion | A page has an identity (title and context first), views are tabs, and grouping can be tinted | Emoji page icons, kanban boards |
| Academic editorial (RVCC) | Confident condensed type for labels, a green institutional accent, a local and human tone | Stock photography. We have none and won't use stock or AI faces. |

## 3. The identity: DabaShare as "the commons"

DabaShare is a campus commons for Davao students: one place where students post notices, browse a catalogue of what classmates teach, find people to learn from, and write to each other. The visual language comes from **printed academic matter** (course catalogues, faculty directories, noticeboards, timetables), not from dashboards:

- **Rules, not boxes.** Hairline rules separate entries the way a catalogue or newspaper column does. A bordered container is used only for something you act on (the composer, an enrol panel, the message thread).
- **Condensed labels.** Small condensed uppercase labels ("PROGRAMMING & TECH", "SUN · 29 NOV · 6:00 PM") carry the metadata, as on a department noticeboard. Titles carry the content.
- **Forest green as ink.** Green marks one primary action per view, the active location, and real "positive" states (free, going, enrolled). Everything else is charcoal on paper.
- **Davao as a real presence.** The universities on the landing page come from the real `universities` table, and university names sit next to people throughout.

### Typography: one family, two widths

**Instrument Sans** (variable, `wght` 400–700, `wdth` 75–100; free via Google Fonts and `next/font`, so no new npm dependency). It replaces both Inter and the Newsreader serif.

| Role | Setting | Used for |
|---|---|---|
| Display | wdth 78, wght 600, tight leading, −1% tracking | Real titles only: course title, person's name, landing hero |
| Label | wdth 82, wght 600, uppercase, +6% tracking, 11–12px | Metadata, section labels, group headers, page bar |
| Heading | wdth 100, wght 600, 16–17px | Section headings |
| Body | wdth 100, wght 400, 15px / 1.6 | Everything else |

Page-level H1s become the small condensed page label in a compact page bar (still a real `<h1>` for screen readers), so the content starts at the top of the screen.

### Colour

| Token | Light | Dark |
|---|---|---|
| paper (canvas) | `#F5F3EC` warm off-white | `#121311` |
| surface | `#FBFAF7` | `#191A17` |
| ink (fg) | `#1C1D1A` charcoal | `#ECEBE4` |
| ink-muted / subtle | `#55564F` / `#6A6960` | `#A9A89F` / `#8C8B82` |
| rule / rule-strong | `#E3E0D6` / `#CFCBBE` | `#272824` / `#36372F` |
| forest (brand) | `#1F4A35`, hover `#173A29` | buttons `#2E6A4A`, text `#8CC2A0` |
| forest-soft | `#E4ECE5` | `#1B2A21` |
| clay (danger) | `#A8321F` | `#E08A75` |
| ochre (warning) | `#8A6414` | `#D9B35A` |

"Success" maps to forest, so there's one green in the product. Initial avatars switch from saturated hues to a muted earth set (forest, clay, ochre, slate, plum, teal) that sits quietly on paper. Every text pairing is checked for WCAG AA.

### Shape and motion

- Radii are restrained: 4px for controls, 6px for containers, round only for avatars. There are no shadows except on menus and toasts.
- Motion is 120–180ms on colour, opacity and background only. Hover gives rows a paper-tinted background; nothing lifts. Everything respects reduced motion.

## 4. Decisions per experience (real data only)

### Navigation
- The sidebar has a workspace header ("DabaShare · Davao"), then a **New post** primary action in Linear's spot, which goes to the composer.
- Active location: forest text with a 2px forest rule on the left, not a grey pill. Counts sit right-aligned in label type.
- Phones keep the 5 bottom tabs, with forest marking the active tab.

### Home: the noticeboard
- **Composer:** one quiet line ("Share a study tip, an event, or what you're learning") that expands on focus. The attachment picker appears only when the composer is open.
- **Feed:** entries separated by rules, with no outer card. An attachment renders as a catalogue line (condensed label "STUDY SESSION · SUN 29 NOV" plus title), not a box inside a box.
- **Right rail, "This week":** upcoming sessions as a small timetable (day and time column, then title), "Can teach you" (matches whose `teaches_you` is non-empty), and "New in the catalogue" (the 3 newest courses). All of it is real data.

### Courses: the catalogue
- **Page bar:** "Courses", a search field and "Post a course".
- **Category index:** a horizontal list of the real categories ("All · Programming & Tech · Mathematics · …"), like departments in a catalogue. University, level and price move into one **Filters** disclosure that works without JavaScript.
- **Results:** a ruled catalogue list instead of a card grid. Each entry has a condensed category/level label, a display-weight title, a one-line description, the tutor (avatar, name, university) and the price right-aligned. Free prices are in forest. On phones the right column folds under the title.
- **Course page:** keeps the document plus facts layout. The tutor's line moves into the masthead.
- Not supported, documented rather than faked: sorting (the RPC is fixed to newest first), enrolment counts, course covers.

### People: the directory
- **Filters:** a segmented control for the modes (All / Can teach me / Want to learn from me). "My university" is a separate on/off switch.
- **Rows lead with the reason.** For example "Teaches you **Python, React** · Wants your **Accounting**", with the skills in ink-weight forest. Filler that repeats categories ("Offers courses in") is dropped. The avatar is 48px with name, program and university. Actions are one quiet Message and a text-style Follow.
- **Skill swaps** (both directions match) get their own group at the top, using Linear's group header with a count.
- Not supported: free-text people search (the RPC has no text filter). It's documented as a backend requirement.

### Messages
- The frame stays, without the outer card.
- Consecutive messages from the same person within 5 minutes are grouped, with the time shown once per group. "Report" appears on hover or focus.
- Your messages are forest with white text and theirs are a muted paper tone. The empty and loading states are quiet.

### Landing
- A condensed display hero ("Learn from the student next to you."), one clear call to action in forest, and a line listing the real universities from the database.
- The icon row and the 2×2 navigation grid are deleted. In their place: three numbered editorial steps (make a profile, find someone, learn together), each one sentence. There are no stats and no stock photos.
- **Photography:** the academic reference relies on real student photos. We don't have consent-cleared campus photos, so the layout doesn't depend on them. Adding them later is an owner task.

## 5. Phases

1. Study and decisions (this document).
2. **Foundations:** tokens, Instrument Sans, primitives (button, badge, page bar, segmented control, filter disclosure, avatar palette, inputs) and the navigation shell. Verified in the browser.
3. **Home.** 4. **Courses** (list and detail). 5. **People** (directory and profiles). 6. **Messages.** 7. **Landing, auth, sessions, notifications, settings.**
8. **Micro-interactions, responsive and QA:** check, build, E2E, RLS, the accessibility and overflow sweep, light and dark at 360/768/1024/1440, and an independent visual review of the result.

Each phase ends with real screenshots reviewed in the browser and is refined before moving on.

## 6. Backend requirements (documented, not faked)

- Course cover images (a column plus a storage bucket) would allow a visual, Are.na-style catalogue.
- Course sorting (popular, price) needs an `order_by` parameter on `search_courses`. Public enrolment counts would need a privacy decision.
- People search needs a text filter on `suggest_matches` or a separate profile search RPC.
- Read receipts or typing indicators need `last_read_at` exposed and Realtime presence.
- Comments on posts need a comments table.
