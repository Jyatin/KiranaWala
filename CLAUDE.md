# 🎨 KiranaWala — Permanent Frontend Quality & Design Standard

> **Design Truth & Visual QA Standard**: This document sets the mandatory quality, aesthetic, and architectural standards for all KiranaWala frontend development. Every view, component, and interaction must feel deliberately crafted by a world-class digital studio rather than assembled from AI templates or generic boilerplates.

---

## 1. CORE DESIGN PHILOSOPHY

1. **Human Studio Craft vs. AI Template Vibe**:
   - The interface must feel like a bespoke, premium consumer product with editorial poise and thoughtful typography.
   - Avoid the "vibe-coded" look: no cookie-cutter SaaS layouts, no generic purple gradients, no centered-everything heroes, no fake metrics counters.

2. **Reference-First Discipline (Translating World-Class References)**:
   - When a design reference like **Klarna** is designated, use it as the benchmark for visual rhythm, whitespace confidence, typography scale, and fluid motion.
   - **CRITICAL**: Do NOT clone logos, trademarks, proprietary assets, copyrighted illustrations, or exact page copies.
   - **DO TRANSLATE**:
     - Editorial typography contrasts (bold expressive headings paired with pristine, legible body text).
     - Confident whitespace and asymmetric layout tension.
     - Tactile, modern card compositions with rich visual hierarchy.
     - Smooth, physics-based micro-interactions that feel responsive and alive.
     - Restrained color discipline where accents are intentional, not decorative noise.

---

## 2. HARD BANS & ANTI-VIBE-CODE RULES

The following anti-patterns are **STRICTLY PROHIBITED**:

- 🚫 **NO Default Tailwind/shadcn Boilerplate**: No generic neutral-gray cookie-cutter cards.
- 🚫 **NO Generic Purple/Blue AI Gradients**: No decorative glowing halos or neon borders without semantic purpose.
- 🚫 **NO Centered-Everything Syndrome**: Avoid center-aligning every heading, paragraph, and button. Use structured editorial alignment (left-aligned content with purposeful balance).
- 🚫 **NO Fake Marketing Clichés**: No meaningless "Trusted by 10,000+ Stores" or fake ticker counters unless backed by actual data.
- 🚫 **NO Overused Glassmorphism**: Use solid, high-contrast, tactile surfaces with subtle 1px borders rather than blurry translucent boxes everywhere.
- 🚫 **NO Low-Contrast Text**: Text must strictly meet WCAG AA standards (minimum 4.5:1 for body copy).
- 🚫 **NO Broken Mobile Viewports**: No horizontal scrollbars, clipped modals, or touch targets smaller than 44×44px.

---

## 3. DESIGN SYSTEM & TOKENS

### 3.1 Color Palette & Token Hierarchy

```css
:root {
  /* Surface & Backgrounds */
  --kw-bg-canvas: #FAF8F5;          /* Warm artisanal canvas */
  --kw-bg-surface: #FFFFFF;         /* Crisp elevated card surface */
  --kw-bg-subtle: #F3EFEA;          /* Secondary container / chip fill */
  --kw-bg-dark: #0F141C;            /* Dark surface for merchant / footer */

  /* Text & Ink */
  --kw-text-primary: #0F172A;       /* High-contrast charcoal ink */
  --kw-text-secondary: #475569;     /* Slate supporting copy */
  --kw-text-muted: #94A3B8;         /* Subtle metadata & placeholders */
  --kw-text-inverse: #FFFFFF;       /* Light text on dark containers */

  /* Brand Accents */
  --kw-accent-terracotta: #D9531E;  /* Warm saffron-terracotta brand primary */
  --kw-accent-terracotta-hover: #C2410C;
  --kw-accent-forest: #14532D;      /* Deep grocery green accent */
  --kw-accent-warm-gold: #F59E0B;   /* Quality rating & highlights */

  /* Semantic Feedback */
  --kw-status-success: #059669;     /* Placed / In stock */
  --kw-status-success-bg: #ECFDF5;
  --kw-status-warning: #D97706;     /* Processing / Low stock */
  --kw-status-warning-bg: #FFFBEB;
  --kw-status-danger: #DC2626;      /* Cancelled / Out of stock */
  --kw-status-danger-bg: #FEF2F2;

  /* Borders & Dividers */
  --kw-border-subtle: #E8E2D9;      /* Delicate card borders */
  --kw-border-strong: #CBD5E1;      /* Input & active borders */

  /* Shadows (Multi-layer diffused) */
  --kw-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.03);
  --kw-shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04);
  --kw-shadow-lg: 0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.03);
  --kw-shadow-floating: 0 20px 40px -8px rgba(15, 23, 42, 0.12);

  /* Radii */
  --kw-radius-xs: 4px;
  --kw-radius-sm: 8px;
  --kw-radius-md: 14px;
  --kw-radius-lg: 22px;
  --kw-radius-full: 9999px;

  /* Transitions */
  --kw-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --kw-duration-fast: 150ms;
  --kw-duration-normal: 250ms;
}
```

### 3.2 Typography Rules

- **Display & Headings**: `Plus Jakarta Sans`, sans-serif (Weights: 700, 800).
  - Letter spacing: `-0.02em` to `-0.03em` for large headers.
- **Body & UI**: `Inter`, system-ui, sans-serif (Weights: 400, 500, 600).
  - Line-height: `1.5` for body copy, `1.2` for headings.
- **Numbers & Monetary Values**: Tabular numerals (`font-variant-numeric: tabular-nums`) with `₹` currency symbol clearly formatted (e.g., `₹280` or `₹1,450.00`).
- **Scale Hierarchy**:
  - `Display Hero`: `clamp(2.5rem, 5vw, 4.25rem)` / line-height: 1.08
  - `Section H1`: `clamp(1.75rem, 3vw, 2.5rem)` / line-height: 1.15
  - `Card Title H2/H3`: `1.25rem`–`1.5rem` / line-height: 1.25
  - `Body Standard`: `1rem` (16px) / line-height: 1.5
  - `Small / Metadata`: `0.875rem` (14px) / line-height: 1.4
  - `Micro Badges`: `0.75rem` (12px) / font-weight: 700 / letter-spacing: 0.04em

---

## 4. COMPOSITION & EDITORIAL LAYOUT

1. **Rhythm & Whitespace**:
   - Give content room to breathe. Sections must have generous vertical padding (`clamp(48px, 8vw, 96px)`).
   - Use visual anchors: high-contrast headers, bold editorial tags, and crisp store badges.
2. **Card Design**:
   - Clean solid backgrounds with subtle 1px border (`--kw-border-subtle`).
   - Generous internal padding (20px to 28px).
   - Clear visual separation between media, content, price, and CTA.
   - Smooth hover elevation (`transform: translateY(-2px)` + `--kw-shadow-md`).
3. **Forms & Interactive Controls**:
   - Form inputs must have distinct focus rings with high visibility.
   - Buttons must have clear tactile feedback (hover, active/pressed states).
   - Clear error and empty states with helpful micro-copy and call-to-actions.

---

## 5. MOTION & INTERACTION PRINCIPLES

1. **Subtle & Physics-Based**:
   - All animations must use natural easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
   - Durations should be brisk (150ms–280ms). Never make the user wait for an animation to finish to click.
2. **Micro-Interactions**:
   - Cart badge pulse on item addition.
   - Smooth drawer open/close for AI Shopping Assistant.
   - Interactive quantity steppers (+ / -) with instant optimistic UI feedback.
3. **Accessibility Motion Standard**:
   - Always wrap motion in `@media (prefers-reduced-motion: reduce)` to disable non-essential animations.

---

## 6. ACCESSIBILITY & PERFORMANCE STANDARDS

- **Semantic HTML**: Proper `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<footer>` landmarks.
- **Keyboard Navigation**: All interactive elements (buttons, links, inputs, quantity toggles, modals) must be 100% accessible via `Tab`, `Enter`, `Space`, and `Escape`.
- **Focus Management**: Visible, high-contrast focus rings (`outline: 2px solid var(--kw-accent-terracotta); outline-offset: 2px`).
- **Screen Reader Support**: Use `aria-expanded`, `aria-controls`, `aria-live="polite"`, and descriptive `aria-label` tags for icon-only buttons.
- **Fast Load Times**: Clean vanilla code without heavy frameworks or render-blocking scripts.

---

## 7. VISUAL QA CHECKLIST (BEFORE SUBMITTING ANY FRONTEND DELIVERABLE)

Before declaring any frontend work complete, verify:

- [ ] Does the page feel like a bespoke consumer brand rather than a generic template?
- [ ] Is there proper whitespace and strong typography contrast?
- [ ] Are prices formatted cleanly in INR (`₹`) with tabular numbers?
- [ ] Are single-store cart constraints and cross-store warnings handled gracefully?
- [ ] Does the responsive layout adapt smoothly from mobile (375px) to tablet to 1440px+ desktop?
- [ ] Are all buttons and inputs keyboard accessible with visible focus rings?
- [ ] Are there zero console errors or uncaught promise rejections?

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
