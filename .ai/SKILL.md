# Skill: Digital Atelier Design System

## Description
This project uses the "Digital Atelier" design system — a curated, high-precision UI for a desktop database explorer tool. All UI/UX work MUST reference the design specification files before making any changes.

## Mandatory Reference Files
Always read these files before working on any UI component:
- `.ai/stitch/DESIGN.md` — Design system specification (colors, typography, elevation, components, do's/don'ts)
- `.ai/stitch/code.html` — Reference HTML implementation (component structure, class names, layout patterns)
- `.ai/stitch/screen.png` — Visual reference screenshot

## Design North Star
"The Digital Curator" — A technical atelier feel with editorial layout, expansive white space, soft tonal transitions, and sophisticated purple accents. Intentional asymmetry over industrial grid layouts.

## Core Rules (Non-Negotiable)

### 1. The "No-Line" Rule
NEVER use 1px solid borders to section off the UI. Boundaries must be defined by background color shifts:
- Sidebar: `surface-container-low`
- Main workspace: `surface`
- Nested panels: `surface-container-high`

### 2. Color Palette
- Primary: `#5148d8` → `#6f68f7` (gradient for CTAs)
- Tertiary: `#842cd3` (folder icons, accent links)
- Surface hierarchy: `#f7f9fb` → `#f0f4f7` → `#eaeff2` → `#e3e9ed` → `#ffffff`
- Text: `#2c3437` (on-surface), `#596064` (on-surface-variant)
- NEVER use pure black (#000000) for text

### 3. Typography
- Headlines/Display: **Manrope** (variable: `--font-headline`)
- Body/UI: **Inter** (variable: `--font-body`)
- Data/Mono: System monospace font
- All database values, SQL queries, ER labels use monospace at 0.75rem

### 4. Elevation & Depth
- Use tonal layering, NOT structural lines or heavy shadows
- Card shadow: `0px 12px 32px rgba(44, 52, 55, 0.06)`
- Ghost Border fallback: `outline-variant` (#acb3b7) at 15% opacity
- Glassmorphism: `surface_variant` at 70% opacity + 24px backdrop-blur

### 5. Components
- **Primary buttons**: Gradient from `primary` to `primary_container` at 135°
- **Data tables**: NO horizontal dividers. Use 8px vertical space between rows. Hover = `surface-container-highest`
- **Tree nodes**: Use `tertiary` (#842cd3) for folder icons
- **Input fields**: `surface-container-low` background, no border. Focus = `surface-container-lowest` + primary glow
- **ER Diagram headers**: `primary_fixed_dim` (#625bea)

### 6. Do's and Don'ts
- DO use asymmetrical layouts (wider left sidebar, collapsed right panel)
- DO use `body-sm` for metadata
- DO use glassmorphism on top navigation
- DON'T use pure black for text
- DON'T use traditional drop shadows on cards (use tonal shifts)
- DON'T use standard blue for links (use tertiary #842cd3)
- DON'T crowd the interface

## Tech Stack
- **Frontend**: Next.js 14 + TypeScript
- **Desktop**: Tauri 2.x
- **Styling**: TailwindCSS with custom design tokens
- **State**: React Query (TanStack Query)
- **Icons**: Lucide React

## File Structure
- `src/app/page.tsx` — Main application UI
- `src/app/globals.css` — Design tokens and component classes
- `src/app/layout.tsx` — Font configuration (Manrope + Inter)
- `tailwind.config.js` — Tailwind theme extension with design colors
- `src-tauri/src/lib.rs` — Rust backend with ADB commands
