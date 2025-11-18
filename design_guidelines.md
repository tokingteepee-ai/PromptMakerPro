# Prompt Maker Design Guidelines

## Design Approach

**Selected Approach**: Modern Productivity Tool Aesthetic
Drawing inspiration from Linear, ChatGPT, and Notion - clean, functional interfaces that prioritize clarity and efficiency while maintaining visual appeal through thoughtful spacing and typography.

**Core Principle**: Form follows function. Every visual element serves the user's goal of creating expert-level prompts quickly and confidently.

---

## Color Palette

### Dark Mode (Primary)
- **Background Base**: 222 14% 8%
- **Surface**: 222 14% 12%
- **Surface Elevated**: 222 14% 16%
- **Border**: 222 14% 20%
- **Text Primary**: 0 0% 95%
- **Text Secondary**: 0 0% 65%
- **Primary Accent**: 262 83% 58% (vibrant purple for mode selector, CTAs)
- **Success**: 142 71% 45% (validation, copy success)
- **Warning**: 38 92% 50% (validator warnings)

### Light Mode
- **Background Base**: 0 0% 98%
- **Surface**: 0 0% 100%
- **Border**: 0 0% 90%
- **Text Primary**: 0 0% 10%
- **Text Secondary**: 0 0% 40%
- **Primary Accent**: 262 83% 48%

---

## Typography

**Font Stack**: 
- Primary: 'Inter', system-ui, sans-serif (via Google Fonts)
- Monospace: 'JetBrains Mono', monospace (for generated prompts)

**Scale**:
- Heading 1: text-4xl font-bold (mode titles)
- Heading 2: text-2xl font-semibold (section headers)
- Heading 3: text-lg font-medium (form labels)
- Body: text-base (default form text)
- Small: text-sm (helper text, validation messages)
- Code: text-sm font-mono (prompt output)

---

## Layout System

**Spacing Primitives**: Use tailwind units 2, 4, 6, 8, 12, 16
- Micro spacing: p-2, gap-2 (tight groupings)
- Standard spacing: p-4, gap-4 (form fields, cards)
- Section spacing: p-8, py-12 (major sections)
- Generous spacing: p-16, py-16 (page margins)

**Container Strategy**:
- Max width: max-w-5xl mx-auto (main content area)
- Form width: max-w-2xl (input forms)
- Full width: w-full (output display, mode selector)

**Grid System**: Single column layout with strategic use of 2-column for actions (edit/remix buttons side-by-side)

---

## Component Library

### Mode Selector (Hero Component)
- Large, prominent segmented control at top of page
- Three equal-width buttons with icons + labels
- Active state: filled with primary accent color
- Inactive state: transparent with border
- Smooth transition animation between modes (200ms)
- Position: Centered, directly below app header

### Dynamic Form Fields
**Shared Styling**:
- Labels: text-sm font-medium text-secondary mb-2
- Inputs: Rounded corners (rounded-lg), dark surface background
- Focus states: Ring with primary accent (ring-2 ring-primary)
- Spacing: gap-6 between field groups

**Mode-Specific Fields**:
- Prompt Template: Goal (textarea), Audience (input), Tone (select), Offer (textarea)
- Prompt Engineer: Media Tool selector (large buttons with icons), Specialization (textarea)
- Media Blueprint: Platform selector (grid of cards), Parameters (dynamic based on platform)

### Output Display
- Container: Surface elevated background, rounded-xl, p-8
- Prompt text: Monospace font, larger line-height (1.6)
- Structure markers: Subtle borders (border-l-4) in primary accent for sections
- Scrollable: max-h-96 overflow-y-auto for long prompts

### Action Bar
- Fixed position below output or sticky
- Three buttons: Copy (primary), Edit (secondary), Remix (secondary outline)
- Icons from Heroicons (DocumentDuplicate, Pencil, Sparkles)
- Button group: flex gap-3 justify-end

### Validator Panel
- Conditional display when validation runs
- Checklist style: green checks for passed, yellow warnings for suggestions
- Compact design: text-sm with icon indicators
- Collapsible section with smooth expand/collapse

---

## Interactions & States

**Button States**:
- Default: Solid or outline, subtle shadow
- Hover: Slight scale (scale-105), increased brightness
- Active: Scale down (scale-95)
- Disabled: 50% opacity, cursor-not-allowed

**Form Interactions**:
- Focus: Ring animation, label color shift to primary
- Error: Red ring, shake animation on invalid submit
- Success: Green checkmark icon appears inline

**Transitions**: 
- Mode switching: Fade out/in form fields (300ms ease)
- Copy action: Brief scale pulse + success toast
- Validation: Slide down from top when triggered

**Micro-animations**: Minimize - use only for feedback (copy success, validation complete)

---

## Page Structure

### Header
- App logo + name "Promptinator" (left)
- Dark/light mode toggle (right)
- Subtle bottom border
- Height: h-16, sticky top-0

### Main Content Area
1. **Hero: Mode Selector** (full width, centered, py-8)
2. **Input Section** (max-w-2xl centered, py-12)
   - Dynamic form based on mode
   - Generate button (large, primary, full-width on mobile)
3. **Output Section** (max-w-5xl centered, py-8)
   - Conditional render when prompt generated
   - Output display with action bar
   - Validator results (if enabled)

### Footer
- Minimal: Links to docs, GitHub, API status
- Centered, text-sm, text-secondary
- py-8

---

## Responsive Behavior

**Mobile (<768px)**:
- Mode selector: Vertical stack
- Form: Single column, full padding reduced to p-4
- Output: Full width with horizontal scroll for long lines
- Action bar: Full width buttons stacked

**Tablet (768-1024px)**:
- Mode selector: Horizontal, slightly smaller
- Form: Wider with comfortable margins
- Two-column for short fields (tone + audience)

**Desktop (>1024px)**:
- Full layout as described
- Generous whitespace
- Hover states fully active

---

## Accessibility

- WCAG AA contrast ratios maintained
- Focus indicators visible and clear (ring-2)
- Keyboard navigation: Tab through all interactive elements
- ARIA labels on mode selector buttons
- Screen reader announcements for validation results
- Dark mode optimized for reduced eye strain during extended use

---

This design creates a professional, efficient prompt generation tool that feels modern and trustworthy while keeping the focus on functionality and user workflow.