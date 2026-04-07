# Design System Specification: The Technical Atelier

## 1. Overview & Creative North Star
### The Creative North Star: "The Digital Curator"
This design system moves away from the "industrial warehouse" feel of traditional database tools and toward a "Digital Atelier"—a space that is high-precision, technical, and hyper-productive, yet feels bespoke and curated. We reject the cluttered, grey-on-grey legacy interface in favor of an editorial layout that uses expansive white space, soft tonal transitions, and sophisticated purple accents to guide the developer's eye.

The system breaks the "standard template" look through **Intentional Asymmetry**. By utilizing varying sidebar widths and offset canvas elements, we create a rhythmic flow that prioritizes the data canvas (the ER diagram or result set) as a primary piece of "content" rather than just a table in a box.

---

## 2. Colors: Tonal Architecture
The palette is built on a foundation of "Cool Porcelains" and "Digital Amethysts." We use color not just for decoration, but as a structural tool to define hierarchy without visual noise.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders to section off the UI. 
Instead, boundaries must be defined by background color shifts. For example:
- The Global Sidebar uses `surface-container-low`.
- The Main Workspace uses `surface`.
- Nested Property Panels use `surface-container-high`.
This creates a seamless, "molded" look that feels more premium than a grid of boxes.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked sheets of fine paper.
- **Base Layer:** `surface` (#f7f9fb) – The foundation.
- **Secondary Containers:** `surface-container-low` (#f0f4f7) – Used for secondary navigation or sidebars.
- **Active Workspace:** `surface-container-lowest` (#ffffff) – Reserved for the most important interactive areas, like the ER diagram background or code editor.

### The "Glass & Gradient" Rule
To add "soul" to a technical tool:
- **Floating Modals:** Use `surface_variant` with a 70% opacity and a `24px` backdrop-blur.
- **Signature Accents:** Main Action CTAs (like "Execute") should utilize a subtle linear gradient from `primary` (#5148d8) to `primary_container` (#6f68f7) at a 135-degree angle. This prevents the "flat-system" fatigue.

---

## 3. Typography: The Editorial Engineer
We pair the structural elegance of **Manrope** for UI orchestration with the utilitarian clarity of **Inter** for data management.

*   **Display & Headlines (Manrope):** High-contrast scales (e.g., `display-lg` at 3.5rem) are used for empty states or dashboard summaries to provide an editorial, high-end feel.
*   **Titles (Inter):** Used for sidebar headers and table names. `title-sm` (1rem) provides a compact but authoritative weight.
*   **Data & Mono (System Mono):** All database values, SQL queries, and ER Diagram labels must use a monospaced font at `label-md` (0.75rem) to ensure character alignment and technical readability.

The hierarchy is designed to make the UI feel "quiet" until the user focuses on a specific data point.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than structural lines or heavy shadows.

### The Layering Principle
Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a "Natural Lift." The difference in hex codes provides enough contrast for the human eye to perceive depth without the cognitive load of a border.

### Ambient Shadows
For floating elements (Tooltips, Context Menus):
- **Shadow:** `0px 12px 32px rgba(44, 52, 55, 0.06)`. 
- Note the low opacity (6%) and large blur (32px). This mimics natural, ambient light and keeps the interface feeling "airy."

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in high-contrast modes), use a **Ghost Border**:
- Token: `outline-variant` (#acb3b7) at **15% opacity**.
- Never use a 100% opaque border.

---

## 5. Components: Precision Primitives

### Buttons
- **Primary:** Gradient-filled (`primary` to `primary_container`) with `roundness-md`.
- **Secondary:** Transparent background with a `surface-variant` hover state.
- **Tertiary/Ghost:** `on-surface-variant` text, used for low-priority actions in the toolbar.

### Data Tables & Tree Views
- **No Dividers:** Forbid the use of horizontal lines. Use `8px` of vertical white space between rows. On hover, apply a `surface-container-highest` background shift to the entire row.
- **Tree Nodes:** Use `tertiary` (#842cd3) for folder icons to provide a "pop" of color against the grey text.

### ER Diagram Nodes
- **Header:** Use `primary_fixed_dim` (#625bea) for the table header background.
- **Body:** `surface-container-lowest` with a `Ghost Border`.
- **Connectors:** 1.5px paths using `primary_dim` with rounded elbows. Avoid sharp 90-degree angles.

### Input Fields
- **Search:** Use `surface-container-low` with no border. On focus, transition the background to `surface-container-lowest` and add a subtle `primary` glow.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts. A wider left sidebar paired with a collapsed right panel creates a professional, "studio" feel.
*   **Do** use `body-sm` for metadata. Technical users appreciate high information density when it is clearly categorized.
*   **Do** use `Glassmorphism` on the top navigation bar to let the colorful ER diagrams peek through as the user scrolls.

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on-surface` (#2c3437) to maintain a soft, premium legibility.
*   **Don't** use traditional "Drop Shadows" on cards. Use tonal shifts.
*   **Don't** use standard blue for links. Use `tertiary` (#842cd3) to align with the soft purple signature of this design system.
*   **Don't** crowd the interface. If a screen feels full, increase the `spacing-scale` rather than adding more boxes.