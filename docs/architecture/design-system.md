# Medisync Design System

## Purpose
Centralized design tokens and shared UI components serving all device profiles (Phone, Tablet, Desktop, POS).

## Folder Structure
```
src/theme/           ← Design tokens (colors, spacing, radius, shadows, gradients, motion)
src/components/ui/   ← Shared components (card, button, input, badge, container, icon, section)
src/components/ui/variants/ ← Pure style presets
src/types/ui/        ← Component prop type contracts
```

## Dependency Rules
1. Components → import from `@/theme` (never hardcode values)
2. Components → import types from `@/types/ui`
3. Theme tokens → no dependencies on components
4. Variants → pure objects, no React imports

## Theme Layers
- **tokens.ts** — Raw values (hex, px, rem)
- **gradients.ts** — Gradient strings from token colors
- **surfaces.ts** — Surface/bg colors from token colors
- **semantic-theme.ts** — Abstract roles (primary, surface, etc.) mapping to tokens
