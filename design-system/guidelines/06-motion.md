# Motion

Motion confirms an action or shows that something is working. It never decorates a number.

## Speeds

| Token               | Value          | Use                                                                          |
| ------------------- | -------------- | ---------------------------------------------------------------------------- |
| `transition-fast`   | 100ms ease-out | Colour and border changes: links, inputs, icon buttons, tabs, checkbox hover |
| `transition-normal` | 150ms ease-out | Buttons, cards, nav backgrounds, toasts, fade-in                             |
| `transition-slow`   | 200ms ease-out | Progress fills, entrances (fade-up, slide-in, scale-in), the toggle thumb    |

Name the property you animate (`background-color`, `color`, `transform`) rather than `all`. The nav item does this to avoid a background flash when it changes state.

## Entrances and exits

| Class               | Keyframes                          | Duration | Use                                    |
| ------------------- | ---------------------------------- | -------- | -------------------------------------- |
| `animate-fade-in`   | opacity 0 → 1                      | 150ms    | Modal overlays, tooltips               |
| `animate-fade-up`   | opacity 0 → 1, translateY 10px → 0 | 200ms    | Content arriving after a load          |
| `animate-scale-in`  | opacity 0 → 1, scale 0.95 → 1      | 200ms    | Menus, dialogs, the notification panel |
| `animate-slide-in`  | opacity 0 → 1, translateX 100% → 0 | 200ms    | Toasts from the right                  |
| `animate-slide-out` | reverse of slide-in                | 150ms    | Toasts leaving                         |

## Press feedback

- Nav items and interactive cards scale to 0.98 while pressed, and icon buttons to 0.95.
- A hovered toast lifts 1px and deepens its shadow from `shadow-xl` to `shadow-2xl`.
- A hovered notification item slides 2px to the right, and its icon tile scales to 1.05.

## Loops

Loops are only for waiting or for the AI thinking. Stop each loop the moment the wait ends.

- `animate-spin` on `loading-spinner`: a 2px `color-border-strong` ring with a `color-interactive` top arc.
- The thinking dots: three `color-primary-500` dots on `animate-bounce` (1s), 150ms apart. They are 6px on the page loader and 8px beside James's "Thinking...".
- `animate-pulse` on the small status dot of James's launcher.
- `animate-pulse-subtle` (3s) for a single call to action that is waiting on the user.
- `typing-dot` (1.4s) and `animate-glow-pulse` (2s) are defined in globals.css but nothing uses them. Prefer the bouncing dots.

## Data motion

- KPI sparklines draw from left to right over 1200ms the first time they scroll into view, with the end dots appearing at 80%. They never redraw on data refresh.
- Progress bars ease their width over `transition-slow`.
- Chart bars grow from their baseline (`animate-grow`), and a hovered bar scales to 1.02 over 150ms.

## Reduced motion

`prefers-reduced-motion: reduce` sets every animation and transition to 0.01ms and turns off smooth scrolling. Components that drive motion from script (the landing orbit, the sparkline draw, framer-motion springs) also read `useReducedMotion()` and render their final state.

## Marketing only

The landing and Store pages add a few flourishes that stay out of the app:

- `card-gradient-border`: an emerald-gold-emerald border that circulates over 3s on hover.
- `animate-float`: a 10px bob.
- `animate-sparkle`.
- The orbit.
