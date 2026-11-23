// End-to-end suite: drives the real forms (no JavaScript, like a basic
// browser) against a running DabaShare server and the linked dev database.
// Run it through scripts/e2e/run.mjs, which creates and deletes the users.
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_PASSWORD;
const results = [];
const ok = (cond, name, extra = "") => results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`);

function makeJar() {
  const jar = new Map();
  return {
    header: () => [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
    store(res) {
      for (const c of res.headers.getSetCookie()) {
        const [pair, ...attrs] = c.split(";");
        const i = pair.indexOf("=");
        const name = pair.slice(0, i).trim();
        const value = pair.slice(i + 1);
        const expired = attrs.some((a) => /max-age=0/i.test(a) || /expires=thu, 01 jan 1970/i.test(a));
        if (expired || value === "") jar.delete(name);
        else jar.set(name, value);
      }
    },
    names: () => [...jar.keys()],
  };
}

async function req(jar, path, init = {}) {
  // A stuck request fails the run with its path instead of hanging it.
  let res;
  try {
    res = await fetch(BASE + path, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: { cookie: jar.header(), origin: BASE, ...(init.headers || {}) },
    });
  } catch (e) {
    throw new Error(`${init.method ?? "GET"} ${path} failed: ${e.name === "TimeoutError" ? "no response in 30s" : e.message}`);
  }
  jar.store(res);
  const html = res.status === 200 ? (await res.text()).replace(/<!-- -->/g, "") : "";
  return { status: res.status, location: res.headers.get("location"), html };
}

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
function forms(html) {
  return [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map((m) => ({
    inner: m[1],
    hidden: [...m[1].matchAll(/<input\b[^>]*>/g)]
      .map((t) => t[0])
      .filter((t) => /name="\$ACTION/.test(t))
      .map((t) => [decode(t.match(/name="([^"]*)"/)[1]), decode((t.match(/value="([^"]*)"/) || [, ""])[1])]),
  }));
}
function pick(html, needle) {
  const f = forms(html).find((x) => x.inner.includes(needle));
  if (!f) throw new Error(`form containing ${needle} not found`);
  return f;
}
async function submit(jar, path, form, fields) {
  const body = new FormData();
  for (const [k, v] of form.hidden) body.append(k, v);
  for (const [k, v] of Object.entries(fields)) for (const one of [].concat(v)) body.append(k, one);
  return req(jar, path, { method: "POST", body });
}
// Value of a plain (non-$ACTION) input inside a form, e.g. a hidden id.
const field = (form, name) => decode((form.inner.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`)) || [])[1] || "");
const redirectedTo = (r) =>
  r.location || (r.html.match(/http-equiv="refresh" content="\d+;url=([^"]+)"/) || [])[1] || null;

const run = async () => {
  const a = makeJar();
  const user = `e2e_${Date.now().toString(36)}`;

  // Route protection
  let r = await req(a, "/profile");
  ok(r.status === 307 && r.location?.startsWith("/login?next=%2Fprofile"), "signed-out /profile redirects to login", `${r.status} ${r.location}`);
  r = await req(a, "/");
  ok(r.status === 200 && r.html.includes("Create your account"), "landing page has sign-up CTA");
  r = await req(a, "/privacy");
  ok(r.status === 200 && r.html.includes("Data Privacy Act"), "privacy notice renders");
  r = await req(a, "/signup");
  ok(r.status === 200 && r.html.includes("University of Mindanao") && r.html.includes("acceptTerms"), "signup form lists universities + consent");

  // Email link handler
  r = await req(a, "/auth/confirm");
  ok(r.location?.endsWith("/login?notice=link-invalid"), "confirm without params -> link-invalid", r.location);
  r = await req(a, "/auth/confirm?code=bogus&next=/onboarding");
  ok(r.location?.endsWith("/login?notice=confirmed-sign-in"), "confirm with foreign code -> sign in notice", r.location);
  r = await req(a, "/auth/confirm?code=bogus&next=https://evil.example");
  ok(!r.location?.includes("evil.example"), "confirm ignores external next", r.location);
  r = await req(a, "/auth/confirm?error=access_denied&error_code=otp_expired&next=/reset-password");
  ok(r.location?.endsWith("/forgot-password?notice=link-expired"), "expired recovery link -> forgot-password", r.location);

  // Login
  r = await req(a, "/login");
  const loginForm = pick(r.html, 'name="password"');
  r = await submit(a, "/login", loginForm, { email: "e2e-1@e2e.test.invalid", password: "wrong-password1", next: "" });
  ok(r.status === 200 && r.html.includes("Wrong email or password"), "wrong password shows error", String(r.status));
  if (!r.html.includes(`value="e2e-1@e2e.test.invalid"`)) results.push("NOTE no-JS fallback does not refill email after failed login");
  r = await submit(a, "/login", loginForm, { email: "E2E-1@e2e.test.invalid ", password: PASSWORD, next: "" });
  ok(r.status === 303 && r.location === "/home", "correct login redirects to /home", `${r.status} ${r.location}`);
  ok(a.names().some((n) => n.includes("auth-token")), "session cookie set");

  // Onboarding gate
  r = await req(a, "/profile");
  ok(redirectedTo(r)?.includes("/onboarding"), "un-onboarded user sent to onboarding", `${r.status} ${redirectedTo(r)}`);
  r = await req(a, "/login");
  ok(r.status === 307 && r.location?.endsWith("/home"), "signed-in /login redirects away", `${r.status} ${r.location}`);

  r = await req(a, "/onboarding");
  ok(r.status === 200 && r.html.includes("Set up your profile") && r.html.includes('value="E2E Student 1"'), "onboarding prefilled from signup");
  const onboard = pick(r.html, 'name="username"');
  r = await submit(a, "/onboarding", onboard, { displayName: "E2E Student 1", username: "No Spaces!", universityId: "1", program: "", bio: "" });
  ok(r.status === 200 && r.html.includes("lowercase letters, numbers and underscores"), "invalid username rejected");
  r = await submit(a, "/onboarding", onboard, { displayName: "E2E Student 1", username: user.toUpperCase(), universityId: "1", program: "BS Computer Science", bio: "Testing DabaShare <script>alert(1)</script>" });
  ok(r.status === 303 && r.location === "/profile?notice=welcome", "onboarding completes", `${r.status} ${r.location}`);

  r = await req(a, "/profile?notice=welcome");
  ok(r.status === 200 && r.html.includes("Welcome to DabaShare") && r.html.includes("My profile"), "profile page renders after onboarding");

  // Skills + interests
  const teach = pick(r.html, 'id="skill-teach"');
  let r2 = await submit(a, "/profile", teach, { skill: "  python  " });
  ok(r2.status === 200, "add teach skill", String(r2.status));
  const learn = pick(r.html, 'id="skill-learn"');
  r2 = await submit(a, "/profile", learn, { skill: "Ukulele Basics" });
  r2 = await submit(a, "/profile", learn, { skill: "" });
  ok(r2.html.includes("Type a skill first"), "empty skill rejected");
  const interests = pick(r.html, 'name="categoryId"');
  r2 = await submit(a, "/profile", interests, { categoryId: ["1", "5"] });
  ok(r2.html.includes("Interests saved"), "interests saved");

  // Public profile shows the saved data, escaped
  r = await req(a, `/u/${user}`);
  ok(r.status === 200 && r.html.includes(">Python<") && r.html.includes("Ukulele Basics"), "public profile shows canonical + new skill");
  ok(r.html.includes("Programming &amp; Tech") && r.html.includes("Business &amp; Accounting"), "public profile shows interests");
  ok(!r.html.includes("<script>alert(1)</script>") && r.html.includes("&lt;script&gt;"), "bio is HTML-escaped");
  r = await req(a, "/u/does_not_exist_zz");
  ok(r.status === 404 || r.html.includes("Page not found"), "unknown username -> not found", String(r.status));

  // Second user cannot see first before onboarding; can after
  const b = makeJar();
  r = await req(b, "/login");
  r = await submit(b, "/login", pick(r.html, 'name="password"'), { email: "e2e-2@e2e.test.invalid", password: PASSWORD, next: `/u/${user}` });
  ok(r.status === 303 && r.location === `/u/${user}`, "login honours safe next", r.location);
  r = await req(b, `/u/${user}`);
  ok(redirectedTo(r)?.includes("/onboarding"), "un-onboarded user B can't browse profiles yet");

  // ── Phase 4: marketplace ─────────────────────────────────────────────
  r = await req(b, "/onboarding");
  r = await submit(b, "/onboarding", pick(r.html, 'name="username"'), { displayName: "E2E Student 2", username: user + "_b", universityId: "2", program: "BS Accountancy", bio: "" });
  ok(r.location === "/profile?notice=welcome", "user B onboards", r.location);

  r = await req(a, "/courses/new");
  ok(r.status === 200 && r.html.includes("Post a course"), "new course form renders");
  const newForm = pick(r.html, 'name="title"');
  r2 = await submit(a, "/courses/new", newForm, { title: "Paid one", description: "Needs an amount.", categoryId: "5", level: "expert", priceType: "paid", pricePhp: "", status: "published", skills: "" });
  ok(r2.status === 200 && r2.html.includes("whole peso amount"), "paid course without amount rejected");
  r2 = await submit(a, "/courses/new", newForm, { title: "Python for Beginners " + user, description: "Variables, loops and functions with small projects.", categoryId: "1", level: "beginner", priceType: "free", pricePhp: "", status: "published", skills: "python, Web Development, Ukulele Basics" });
  ok(r2.status === 303 && /^\/courses\/[0-9a-f-]{36}\?notice=created$/.test(r2.location || ""), "free course created", r2.location);
  const freeId = r2.location.split("/")[2].split("?")[0];
  r2 = await submit(a, "/courses/new", newForm, { title: "Accounting 101 " + user, description: "Journal entries, ledgers and statements.", categoryId: "5", level: "expert", priceType: "paid", pricePhp: "250", status: "published", skills: "Accounting" });
  const paidId = r2.location.split("/")[2].split("?")[0];
  r2 = await submit(a, "/courses/new", newForm, { title: "Secret draft " + user, description: "Not ready for anyone yet.", categoryId: "1", level: "beginner", priceType: "free", pricePhp: "", status: "draft", skills: "" });
  const draftId = r2.location.split("/")[2].split("?")[0];

  r = await req(a, "/courses/" + freeId + "?notice=created");
  ok(r.html.includes("Your course is posted") && r.html.includes(">Python<") && r.html.includes("Edit course"), "owner sees course page with canonical skills");

  r = await req(b, "/courses?q=" + encodeURIComponent(user));
  ok(r.html.includes("Python for Beginners") && r.html.includes("Accounting 101") && !r.html.includes("Secret draft"), "B finds published courses, not the draft");
  ok(r.html.includes("₱250") && !r.html.includes("$ ₱"), "price badge shows pesos only");
  r = await req(b, "/courses?q=" + encodeURIComponent(user) + "&price=paid");
  ok(r.html.includes("Accounting 101") && !r.html.includes("Python for Beginners"), "paid filter");
  r = await req(b, "/courses?q=ukulele");
  ok(r.html.includes("Python for Beginners"), "search by skill name");
  r = await req(b, "/courses?q=" + encodeURIComponent(user) + "&level=advanced");
  ok(r.html.includes("No courses match"), "empty state when nothing matches");
  r = await req(b, "/courses?uni=abc&page=-3&level=god");
  ok(r.status === 200, "junk filters are ignored", String(r.status));
  r = await req(b, "/courses/" + draftId);
  ok(r.status === 404 || r.html.includes("Page not found"), "B cannot open A's draft");
  r = await req(b, "/courses/not-a-uuid");
  ok(r.status === 404 || r.html.includes("Page not found"), "invalid course id -> not found");
  r = await req(b, "/courses/" + freeId + "/edit");
  ok(r.status === 404 || r.html.includes("Page not found"), "non-owner cannot open edit page");

  r = await req(b, "/courses/" + freeId);
  r2 = await submit(b, "/courses/" + freeId, pick(r.html, "Enroll for free"), {});
  r = await req(b, "/courses/" + freeId);
  ok(r.html.includes("You&#x27;re enrolled") || r.html.includes("You're enrolled"), "free enrollment is immediate");
  r = await req(b, "/courses/" + paidId);
  ok(r.html.includes("Request to enroll · ₱250"), "paid course shows request button");
  r2 = await submit(b, "/courses/" + paidId, pick(r.html, 'name="note"'), { note: "I can do weekends." });
  r = await req(b, "/courses/" + paidId);
  ok(r.html.includes("Request sent"), "paid enrollment is a request");

  r = await req(a, "/courses/mine");
  ok(r.html.includes("1 new request") && r.html.includes("Secret draft"), "My courses shows pending request and draft");
  r = await req(a, "/courses/" + paidId);
  ok(r.html.includes("I can do weekends."), "owner sees the request note");
  const accept = forms(r.html).find((f) => f.inner.includes(">Accept<"));
  r2 = await submit(a, "/courses/" + paidId, accept, {});
  r = await req(b, "/courses/" + paidId);
  ok(r.html.includes("Arrange the ₱250 payment"), "accepted student sees payment note");
  r = await req(b, "/courses/mine");
  ok(r.html.includes("Accounting 101") && r.html.includes("Enrolled"), "B's learning list shows the course");

  r = await req(b, "/courses/" + freeId);
  r2 = await submit(b, "/courses/" + freeId, forms(r.html).find((f) => f.inner.includes("Leave this course")), {});
  r = await req(b, "/courses/" + freeId);
  ok(r.html.includes("Enroll for free"), "student can leave and re-enroll later");

  r = await req(a, "/courses/" + freeId + "/edit");
  const edit = pick(r.html, 'name="title"');
  ok(edit.inner.includes("Web Development") && edit.inner.includes('value="free"'), "edit form prefilled");
  r2 = await submit(a, "/courses/" + freeId + "/edit", edit, { title: "Python for Beginners " + user + " v2", description: "Variables, loops and functions with small projects.", categoryId: "1", level: "intermediate", priceType: "free", pricePhp: "", status: "published", skills: "Python" });
  ok(r2.location === "/courses/" + freeId + "?notice=updated", "course updated", r2.location);
  r = await req(b, "/courses/" + freeId);
  ok(r.html.includes(" v2") && r.html.includes("Intermediate") && !r.html.includes("Ukulele Basics"), "B sees the edits");

  r = await req(a, "/courses/" + paidId + "/edit");
  const del = pick(r.html, "Delete course");
  r2 = await submit(a, "/courses/" + paidId + "/edit", del, {});
  ok(r2.html.includes("Tick the box"), "delete needs confirmation");
  r2 = await submit(a, "/courses/" + paidId + "/edit", del, { confirm: "on" });
  ok(r2.location === "/courses/mine?notice=deleted", "course deleted", r2.location);
  r = await req(b, "/courses/" + paidId);
  ok(r.status === 404 || r.html.includes("Page not found"), "deleted course is gone for students");

  // ── Phase 5: matching ────────────────────────────────────────────────
  r = await req(b, "/matches");
  ok(r.status === 200 && r.html.includes("Tell us what you know"), "no skills -> prompt to add skills");
  r = await req(b, "/profile");
  r2 = await submit(b, "/profile", pick(r.html, 'id="skill-teach"'), { skill: "ukulele basics" });
  r2 = await submit(b, "/profile", pick(r.html, 'id="skill-learn"'), { skill: "Python" });
  r = await req(b, "/matches");
  ok(r.html.includes("E2E Student 1") && r.html.includes("Skill swap"), "A appears for B as a skill swap");
  ok(r.html.includes("Can teach you") && r.html.includes(">Python<") && r.html.includes("Wants to learn from you") && r.html.includes("Ukulele Basics"), "match explains both directions");
  ok(r.html.includes("/u/" + user + "\""), "match links to the public profile");
  r = await req(b, "/matches?mode=teaches_me");
  ok(r.html.includes("E2E Student 1"), "filter: can teach me");
  r = await req(b, "/matches?uni=same");
  ok(!r.html.includes("E2E Student 1") && r.html.includes("No matches with these filters"), "filter: my university only (A is at another university)");
  r = await req(a, "/matches");
  ok(r.html.includes("E2E Student 2") && r.html.includes("Skill swap"), "matching is symmetric for A");

  // ── Social: posts, follows, likes ────────────────────────────────────
  r = await req(a, "/home");
  ok(r.status === 200 && r.html.includes("Your feed is quiet"), "new user's following feed is empty");
  const postForm = pick(r.html, 'id="post-body"');
  ok(postForm.inner.includes("course:" + freeId), "composer offers your published course");
  r2 = await submit(a, "/home", postForm, { body: "   ", attachment: "" });
  ok(r2.html.includes("Write something first"), "empty post rejected");
  r2 = await submit(a, "/home", postForm, { body: "Not mine", attachment: "session:00000000-0000-0000-0000-000000000000" });
  ok(r2.html.includes("only share study sessions you host"), "can't attach a session you don't host");
  await submit(a, "/home", postForm, { body: "Study night on Friday <b>bring snacks</b>", attachment: "course:" + freeId });
  r = await req(a, "/home");
  ok(r.html.includes("Study night on Friday &lt;b&gt;bring snacks&lt;/b&gt;") && r.html.includes('href="/courses/' + freeId + '"'), "post with course card in own feed, HTML-escaped");
  const postId = (r.html.match(new RegExp('href="/posts/([0-9a-f-]{36})"')) || [])[1];
  ok(Boolean(postId), "post has a permalink");

  r = await req(b, "/home?feed=everyone");
  ok(r.html.includes("Study night on Friday"), "everyone feed shows A's post to B");
  r = await req(b, "/home");
  ok(!r.html.includes("Study night on Friday"), "following feed leaves out people B doesn't follow");
  r = await req(b, "/u/" + user);
  let f = pick(r.html, 'name="profileId"');
  ok(field(f, "follow") === "1" && r.html.includes(">0</strong> followers<"), "profile shows Follow and 0 followers");
  await submit(b, "/u/" + user, f, { profileId: field(f, "profileId"), follow: "1" });
  r = await req(b, "/u/" + user);
  ok(r.html.includes(">Following<") && r.html.includes(">1</strong> follower<"), "B follows A; follower count updates");
  ok(r.html.includes("Study night on Friday"), "profile lists the student's posts");
  r = await req(b, "/home");
  ok(r.html.includes("Study night on Friday"), "following feed shows people B follows");
  f = pick(r.html, 'name="like"');
  await submit(b, "/home", f, { postId: field(f, "postId"), like: "1" });
  r = await req(b, "/home");
  ok(r.html.includes(">Liked<") && r.html.includes(", 1 like<"), "B likes the post; count shows");
  r = await req(a, "/notifications");
  ok(r.html.includes("E2E Student 2 started following you") && r.html.includes("E2E Student 2 liked your post"), "author notified of follower and like");
  r = await req(b, "/posts/" + postId);
  ok(r.status === 200 && r.html.includes("Study night on Friday") && !r.html.includes("Yes, delete"), "permalink opens; no delete for others");
  r = await req(b, "/report?type=post&id=" + postId);
  ok(r.status === 200 && r.html.includes("Report a post") && r.html.includes("Study night on Friday"), "posts can be reported");
  r = await req(b, "/home");
  f = pick(r.html, 'name="like"');
  await submit(b, "/home", f, { postId: field(f, "postId"), like: "0" });
  r = await req(b, "/home");
  ok(r.html.includes(">Like<") && !r.html.includes(">Liked<"), "unlike");

  // ── Phase 6: messaging, report, block ────────────────────────────────
  r = await req(a, "/matches");
  r2 = await submit(a, "/matches", pick(r.html, ">Message</button>"), {});
  ok(r2.status === 303 && /^\/messages\/[0-9a-f-]{36}$/.test(r2.location || ""), "Message button opens a conversation", r2.location);
  const convPath = r2.location;
  r = await req(a, "/matches");
  r2 = await submit(a, "/matches", pick(r.html, ">Message</button>"), {});
  ok(r2.location === convPath, "same conversation reused for the same pair");
  r = await req(a, convPath);
  ok(r.status === 200 && r.html.includes("No messages yet"), "empty conversation renders");
  const composer = pick(r.html, 'name="body"');
  r2 = await submit(a, convPath, composer, { body: "   " });
  ok(r2.html.includes("Write a message first"), "empty message rejected");
  await submit(a, convPath, composer, { body: "Hi B! <b>Can you help with Ukulele?</b>" });
  r = await req(a, convPath);
  ok(r.html.includes("&lt;b&gt;Can you help with Ukulele?&lt;/b&gt;") && !r.html.includes("<b>Can you help"), "message saved and HTML-escaped");

  r = await req(b, "/messages");
  ok(r.html.includes("E2E Student 1") && r.html.includes("Unread: "), "B inbox shows A with unread badge");
  // The badge streams in behind Suspense, so it appears later in the HTML.
  ok(/, unread conversations: <\/span>1</.test(r.html), "nav shows unread conversation count");
  r = await req(b, convPath);
  ok(r.html.includes("Can you help with Ukulele?"), "B reads the message");
  await submit(b, convPath, pick(r.html, 'name="body"'), { body: "Hello A, sure!" });
  r = await req(b, "/messages");
  ok(!r.html.includes("Unread: "), "opening the conversation marks it read");
  r = await req(a, "/messages");
  ok(r.html.includes("Hello A, sure!"), "A inbox shows B's reply");

  // Hide a conversation: leaves the inbox, still opens by link, returns on a new message.
  r = await req(a, convPath);
  r2 = await submit(a, convPath, forms(r.html).find((f) => f.inner.includes(">Hide<")), {});
  ok(r2.location === "/messages?notice=hidden", "hide conversation", r2.location);
  r = await req(a, "/messages?notice=hidden");
  ok(r.html.includes("Conversation hidden") && !r.html.includes("Hello A, sure!"), "hidden conversation leaves the inbox");
  r = await req(a, convPath);
  ok(r.status === 200 && r.html.includes("Hello A, sure!"), "hidden conversation still opens from its link");
  r = await req(b, convPath);
  await submit(b, convPath, pick(r.html, 'name="body"'), { body: "Are you still there?" });
  r = await req(a, "/messages");
  ok(r.html.includes("Are you still there?"), "a new message brings the conversation back");

  r = await req(b, convPath);
  const reportHref = (r.html.match(/\/report\?type=message&amp;id=([0-9a-f-]{36})/) || [])[1];
  ok(Boolean(reportHref), "report link on the other person's messages");
  r = await req(b, "/report?type=message&id=" + reportHref);
  ok(r.status === 200 && r.html.includes("Report a message") && r.html.includes("Can you help with Ukulele?"), "report page previews the message");
  const reportForm = pick(r.html, 'name="reason"');
  r2 = await submit(b, "/report?type=message&id=" + reportHref, reportForm, { targetType: "message", targetId: reportHref, details: "" });
  ok(r2.html.includes("Choose a reason"), "report needs a reason");
  r2 = await submit(b, "/report?type=message&id=" + reportHref, reportForm, { targetType: "message", targetId: reportHref, reason: "harassment", details: "test report" });
  ok(r2.html.includes("Thanks for letting us know"), "report filed");
  r2 = await submit(b, "/report?type=message&id=" + reportHref, reportForm, { targetType: "message", targetId: reportHref, reason: "spam", details: "" });
  ok(r2.html.includes("already reported"), "duplicate report handled");
  r = await req(b, "/report?type=message&id=00000000-0000-0000-0000-000000000000");
  ok(r.status === 404 || r.html.includes("Page not found"), "report of an unknown item -> not found");
  r = await req(b, "/messages/00000000-0000-0000-0000-000000000000");
  ok(r.status === 404 || r.html.includes("Page not found"), "unknown conversation -> not found");

  r = await req(b, "/u/" + user);
  ok(r.html.includes(">Message</button>") && r.html.includes("Block this student"), "profile has Message and Block");
  r2 = await submit(b, "/u/" + user, pick(r.html, "Yes, block"), {});
  ok(r2.location === "/messages?notice=blocked", "block redirects to messages", r2.location);
  r = await req(b, convPath);
  ok(!r.html.includes('name="body"') && (r.html.includes("Messaging isn&#x27;t available") || r.html.includes("Messaging isn't available")), "blocker can no longer reply");
  r = await req(a, convPath);
  ok(!r.html.includes('name="body"') && r.html.includes("DabaShare member"), "blocked student can't reply and B is anonymised");
  r = await req(a, "/u/" + user + "_b");
  ok(r.status === 404 || r.html.includes("Page not found"), "blocked student can't see the blocker's profile");
  r = await req(b, "/settings");
  ok(r.html.includes("Blocked students") && r.html.includes("E2E Student 1"), "settings lists blocked students");
  r2 = await submit(b, "/settings", forms(r.html).find((f) => f.inner.includes(">Unblock<")), {});
  r = await req(a, "/u/" + user + "_b");
  ok(r.status === 200 && r.html.includes("E2E Student 2"), "unblock restores visibility");
  r = await req(b, "/u/" + user);
  ok(r.html.includes(">0</strong> followers<") && pick(r.html, 'name="profileId"').inner.includes('value="1"'), "blocking removed the follow");
  r = await req(a, "/posts/" + postId);
  f = forms(r.html).find((x) => x.inner.includes("Yes, delete"));
  ok(Boolean(f), "author sees Delete on own post");
  if (f) await submit(a, "/posts/" + postId, f, { postId });
  r = await req(b, "/posts/" + postId);
  ok(r.status === 404 || r.html.includes("Page not found"), "deleted post is gone");

  // ── Phase 7: sessions and notifications ──────────────────────────────
  const tomorrow = new Date(Date.now() + 32 * 3600 * 1000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 16 * 3600 * 1000).toISOString().slice(0, 10);
  const sessionFields = (over) => ({
    title: "Calculus finals prep " + user, description: "Derivatives and integrals.", type: "study_group",
    categoryId: "2", date: tomorrow, time: "18:00", duration: "90", capacity: "1", meetingUrl: "https://meet.example.com/e2e-room", ...over,
  });
  r = await req(a, "/sessions/new");
  ok(r.status === 200 && r.html.includes("Start time (PH)"), "host form renders");
  const sForm = pick(r.html, 'name="meetingUrl"');
  r2 = await submit(a, "/sessions/new", sForm, sessionFields({ meetingUrl: "http://insecure.example.com" }));
  ok(r2.html.includes("full https:// link"), "non-https meeting link rejected");
  r2 = await submit(a, "/sessions/new", sForm, sessionFields({ date: yesterday }));
  ok(r2.html.includes("Choose a start time in the future"), "past start time rejected (database rule)");
  r2 = await submit(a, "/sessions/new", sForm, sessionFields({}));
  ok(r2.status === 303 && /^\/sessions\/[0-9a-f-]{36}\?notice=created$/.test(r2.location || ""), "session created", r2.location);
  const s1 = r2.location.split("/")[2].split("?")[0];
  r = await req(a, "/sessions/" + s1);
  ok(r.html.includes("meet.example.com/e2e-room") && r.html.includes("Participants") && r.html.includes("6:00"), "host sees link, participants and PH time");

  r = await req(b, "/sessions?tab=upcoming");
  ok(r.html.includes("Calculus finals prep " + user), "B sees it in Upcoming");
  r = await req(b, "/sessions/" + s1);
  ok(!r.html.includes("meet.example.com/e2e-room") && r.html.includes("Join session"), "meeting link hidden until you join");
  r2 = await submit(b, "/sessions/" + s1, pick(r.html, "Join session"), {});
  r = await req(b, "/sessions/" + s1);
  ok(r.html.includes("Open meeting link") && r.html.includes("meet.example.com/e2e-room"), "joined student sees the meeting link");
  ok(r.html.includes("1/1 joined"), "seat count updated");
  r = await req(a, "/sessions/" + s1);
  ok(r.html.includes("Going (1)") && r.html.includes("E2E Student 2"), "host sees the participant");
  r = await req(b, "/sessions/" + s1);
  await submit(b, "/sessions/" + s1, forms(r.html).find((f) => f.inner.includes("leave")), {});
  r = await req(b, "/sessions/" + s1);
  ok(r.html.includes("0/1 joined") && r.html.includes("Join session"), "leaving frees the seat");
  await submit(b, "/sessions/" + s1, pick(r.html, "Join session"), {});

  r = await req(a, "/sessions/" + s1 + "/edit");
  const eForm = pick(r.html, 'name="meetingUrl"');
  ok(eForm.inner.includes('value="18:00"') && eForm.inner.includes(tomorrow), "edit form shows PH date and time");
  r2 = await submit(a, "/sessions/" + s1 + "/edit", eForm, sessionFields({ capacity: "5", time: "19:00", requiresApproval: "on" }));
  ok(r2.location === "/sessions/" + s1 + "?notice=updated", "session updated", r2.location);
  r = await req(a, "/sessions/" + s1);
  const inv = pick(r.html, 'name="username"');
  r2 = await submit(a, "/sessions/" + s1, inv, { username: "nobody_here_zz" });
  ok(r2.html.includes("No student with that username"), "invite unknown username");
  r2 = await submit(a, "/sessions/" + s1, inv, { username: "@" + user + "_b" });
  ok(r2.html.includes("already on the list"), "invite someone already going");
  r = await req(b, "/sessions/" + s1 + "/edit");
  ok(r.status === 404 || r.html.includes("Page not found"), "non-host cannot edit");

  // B hosts an approval-only webinar; A requests; B accepts
  r = await req(b, "/sessions/new");
  r2 = await submit(b, "/sessions/new", pick(r.html, 'name="meetingUrl"'), sessionFields({ title: "Accounting Q&A " + user, type: "qa", capacity: "10", requiresApproval: "on", meetingUrl: "" }));
  const s2 = r2.location.split("/")[2].split("?")[0];
  r = await req(a, "/sessions/" + s2);
  ok(r.html.includes("Request to join"), "approval session shows Request to join");
  await submit(a, "/sessions/" + s2, pick(r.html, "Request to join"), {});
  r = await req(a, "/sessions/" + s2);
  ok(r.html.includes("Request sent"), "request pending");
  r = await req(b, "/notifications");
  ok(r.html.includes("E2E Student 1 asked to join Accounting Q&amp;A " + user) && /, unread notifications: <\/span>\d+</.test(r.html), "host notified, with unread badge");
  const openHref = (r.html.match(/\/notifications\/open\/([0-9a-f-]{36})/) || [])[0];
  r2 = await req(b, openHref);
  ok(r2.location?.endsWith("/sessions/" + s2), "opening a notification goes to the session", r2.location);
  r = await req(b, "/sessions/" + s2);
  await submit(b, "/sessions/" + s2, forms(r.html).find((f) => f.inner.includes(">Accept<")), {});
  r = await req(a, "/sessions/" + s2);
  ok(r.html.includes("You&#x27;re going") || r.html.includes("You're going"), "accepted requester is going");
  ok(r.html.includes("hasn&#x27;t added a meeting link") || r.html.includes("hasn't added a meeting link"), "no-link message for participants");
  r = await req(a, "/notifications");
  ok(r.html.includes("accepted you into Accounting Q&amp;A " + user), "requester notified of acceptance");
  r2 = await submit(a, "/notifications", forms(r.html).find((f) => f.inner.includes("Mark all as read")), {});
  r = await req(a, "/notifications");
  ok(!r.html.includes("Mark all as read") && !/, unread notifications: /.test(r.html), "mark all as read clears the badge");

  r = await req(b, "/sessions?tab=mine");
  ok(r.html.includes("Accounting Q&amp;A " + user) && r.html.includes("Calculus finals prep " + user), "My sessions lists hosted and joined");
  r = await req(b, "/sessions?tab=live");
  ok(r.html.includes("Nothing is live right now"), "live tab empty state");

  r = await req(a, "/sessions/" + s1);
  const cancelForm = pick(r.html, "Cancel this session");
  r2 = await submit(a, "/sessions/" + s1, cancelForm, {});
  ok(r2.html.includes("Tick the box"), "cancel needs confirmation");
  r2 = await submit(a, "/sessions/" + s1, cancelForm, { confirm: "on" });
  ok(r2.location === "/sessions/" + s1 + "?notice=cancelled", "session cancelled", r2.location);
  r = await req(b, "/sessions/" + s1);
  ok(r.html.includes("cancelled by the host") && !r.html.includes("meet.example.com/e2e-room"), "participant sees cancellation");
  r = await req(b, "/notifications");
  ok(r.html.includes("Calculus finals prep " + user + " was cancelled"), "participant notified of cancellation");
  r = await req(b, "/sessions?tab=upcoming");
  ok(!r.html.includes("Calculus finals prep " + user), "cancelled session leaves Upcoming");

  // Settings: privacy toggle
  r = await req(a, "/settings");
  ok(r.status === 200 && r.html.includes("Show me in matches"), "settings page renders");
  const disc = pick(r.html, 'name="discoverable"');
  r2 = await submit(a, "/settings", disc, {});
  ok(r2.html.includes("hidden from matches"), "discoverable can be turned off");
  r = await req(b, "/matches");
  ok(!r.html.includes("E2E Student 1"), "hidden student disappears from others' matches");

  // Logout
  r = await req(a, "/profile");
  const logout = forms(r.html).find((f) => f.inner.includes("Log out"));
  r = await submit(a, "/profile", logout, {});
  ok(r.status === 303 && r.location === "/login", "logout redirects to login", `${r.status} ${r.location}`);
  r = await req(a, "/profile");
  ok(r.status === 307 && r.location?.startsWith("/login"), "after logout /profile is protected again");

  // Password change (sign back in)
  r = await req(a, "/login");
  r = await submit(a, "/login", pick(r.html, 'name="password"'), { email: "e2e-1@e2e.test.invalid", password: PASSWORD, next: "/settings" });
  ok(r.location === "/settings", "sign back in to settings", r.location);
  r = await req(a, "/settings");
  const pwForm = pick(r.html, 'name="currentPassword"');
  const NEW_PW = PASSWORD + "x9";
  r2 = await submit(a, "/settings", pwForm, { currentPassword: "not-my-password1", password: NEW_PW, confirmPassword: NEW_PW });
  ok(r2.html.includes("That isn&#x27;t your current password") || r2.html.includes("That isn't your current password"), "password change needs the current password");
  r2 = await submit(a, "/settings", pwForm, { currentPassword: PASSWORD, password: NEW_PW, confirmPassword: NEW_PW });
  ok(r2.html.includes("Password updated"), "password changed with current password");

  // Reset page without a recovery link is refused
  r = await req(a, "/reset-password");
  r2 = await submit(a, "/reset-password", pick(r.html, 'name="confirmPassword"'), { password: "Another9pass", confirmPassword: "Another9pass" });
  ok(r2.html.includes("reset link has expired"), "reset-password refused without a recovery link");

  // Old password no longer works, new one does (on a second device)
  const c = makeJar();
  r = await req(c, "/login");
  r = await submit(c, "/login", pick(r.html, 'name="password"'), { email: "e2e-1@e2e.test.invalid", password: PASSWORD, next: "" });
  ok(r.html.includes("Wrong email or password"), "old password rejected after change");
  r = await req(c, "/login");
  r = await submit(c, "/login", pick(r.html, 'name="password"'), { email: "e2e-1@e2e.test.invalid", password: NEW_PW, next: "" });
  ok(r.status === 303 && r.location === "/home", "new password works on second device", r.location);

  // Account deletion on device A
  r = await req(a, "/settings");
  const delAcct = pick(r.html, 'name="confirm"');
  r2 = await submit(a, "/settings", delAcct, { confirm: "delete" });
  ok(r2.html.includes("Type DELETE in capital letters"), "deletion needs exact confirmation");
  r2 = await submit(a, "/settings", delAcct, { confirm: "DELETE" });
  ok(r2.status === 303 && r2.location === "/login?notice=account-deleted", "account deleted", `${r2.status} ${r2.location}`);
  r = await req(a, "/login");
  r = await submit(a, "/login", pick(r.html, 'name="password"'), { email: "e2e-1@e2e.test.invalid", password: NEW_PW, next: "" });
  ok(r.html.includes("Wrong email or password"), "deleted account can no longer sign in");

  // Device C still holds an unexpired token for the deleted account
  r = await req(c, "/profile");
  const to = redirectedTo(r);
  ok(to?.includes("/auth/signout"), "stale session on other device is sent to sign-out", `${r.status} ${to}`);
  r = await req(c, "/auth/signout");
  ok(r.location?.endsWith("/login?notice=session-ended"), "stale session cleared", r.location);
  r = await req(c, "/profile");
  ok(r.status === 307 && r.location?.startsWith("/login"), "other device is signed out afterwards", `${r.status} ${r.location}`);

  const failed = results.filter((x) => x.startsWith("FAIL")).length;
  console.log(results.join("\n"));
  console.log(`\nE2E SUMMARY: ${results.length - failed} passed, ${failed} failed`);
};

// Exit code 1 on any failure, so CI or a script can rely on it.
run()
  .then(() => process.exit(results.some((x) => x.startsWith("FAIL")) ? 1 : 0))
  .catch((e) => {
    console.log(results.join("\n"));
    console.log("E2E CRASH:", e.message);
    process.exit(1);
  });
