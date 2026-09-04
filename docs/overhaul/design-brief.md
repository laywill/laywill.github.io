# Design Brief

## Purpose

williamlay.co.uk is a **landing page**, not a portfolio archive. The typical visitor is a recruiter, hiring manager, or engineering peer clicking through from LinkedIn, William's CV, or GitHub, asking one question: *"is this person interesting?"* The site must answer that fast, then offer one obvious next step.

## Audience and positioning

- **Primary:** recruiters and hiring managers evaluating William for software engineering / DevOps / agile coaching / engineering leadership roles.
- **Secondary:** engineering peers and open-source collaborators arriving from GitHub.
- Photography and production/theatre tech are **personal interests**, not professional identities. They humanise; they do not lead.

## CTA hierarchy

1. **Primary: Connect on LinkedIn** — above the fold, specific wording, unmissable.
2. **Secondary: Download CV** — links to the latest release build at `https://github.com/laywill/CV/releases/latest/download/<asset>.pdf` (never a PDF committed to this repo).
3. Tertiary: GitHub profile, Notes.

## Design direction: Developer Dark Mode

Dark-first design built from the VS Code Dark+ palette (see [colour-scheme.md](colour-scheme.md)), with IDE-inspired motifs used **semantically, sparingly, and authentically** — the lokkal.space lesson: form follows function, and the aesthetic must genuinely reflect who William is, not be decoration.

Candidate motifs (design study to select):

- Status-bar style footer (VS Code blue `#007ACC`)
- Tab / breadcrumb styling for navigation
- Syntax-highlight colours applied semantically (e.g. types teal, functions yellow) rather than randomly
- Obsidian-flavoured elements in Notes: callout blocks, `[[wikilink]]` styling, tag pills; graph-view visual as a stretch goal
- Terminal/prompt touches where they carry meaning

## Gestalt / diagram-first principle

William is a Gestalt thinker. Prefer **showing structure over describing it**: diagrams, strong visual groupings, icon grids (the lokkal.space "what I'm running" pattern), timelines, and layout that communicates hierarchy without labels. Where a section could be a paragraph or a diagram, try the diagram first.

## Copy rules (Unbounce lessons)

- One goal per page; remove anything that doesn't serve it.
- Critical content above the fold — average scroll depth is ~50%.
- 150–350 words on the landing page; scannable; short paragraphs.
- Specific CTAs ("Connect on LinkedIn"), never "Learn more".
- You-focused framing where possible; proof over claims (real roles, real repos, real numbers).
- Layered social proof: GitHub activity, certifications, roles held.

## Anti-patterns — hard exclusions

These read as low-effort AI-generated design and are banned:

1. **Oatmeal/beige/cream backgrounds** — warm off-white "Anthropic-esque" grounds.
2. **Eyebrow labels** — small uppercase tracked text above every headline.
3. **Generic font stacks** — Inter, Roboto, and friends as the default answer (see [typography.md](typography.md)).
4. **Purple/violet gradients** — on heroes, buttons, or cards; no glowing accents.
5. **Centered card grids** — symmetrical card containers with subtle borders and heavy drop shadows.

Also avoid: stock-photo genericism (prefer William's own photography or clearly purposeful imagery), decorative animation without meaning, and cookie-banner-requiring third-party scripts.

## Accessibility and performance floors

- WCAG AA contrast minimum on all text (check tokens in colour-scheme.md against backgrounds).
- Meaningful `alt` text on every image (the old site had none).
- Lighthouse targets at launch: Performance / Accessibility / SEO ≥ 95.
- Works well on mobile HD displays and vertical monitors; no horizontal scroll ever.
