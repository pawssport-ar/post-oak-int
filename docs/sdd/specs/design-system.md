# Design system

Status: Implemented and verified.

## Purpose

Make the product unmistakably Post Oak: institutional, calm and precise, and still as quick to use as the best modern fintech.

## Brand translation

Taken from postoakgroup.co:

| Brand element          | Source      | Here                                       |
| ---------------------- | ----------- | ------------------------------------------ |
| Forest green           | `#193E2C`   | The frame, hero panels and primary actions |
| Charcoal               | `#231F20`   | Body text                                  |
| Adobe Garamond         | Headings    | EB Garamond, also for key figures          |
| Avenir                 | Body        | Nunito Sans                                |
| Column logo            | Logo        | Redrawn as a vector, so it takes any color |
| Green and white rhythm | Site layout | A green frame around a paper sheet         |

Signature elements, all drawn from the firm itself:

| Element       | Idea                                                                  |
| ------------- | --------------------------------------------------------------------- |
| **Flutes**    | The column's shaft becomes the texture of the frame and hero panels   |
| **Portico**   | Capital readiness is drawn as five columns holding up one entablature |
| **Tombstone** | Payments close with the framed notice banks use for completed deals   |
| **Brass**     | One restrained accent, for the things that matter most                |

## Requirements

### Foundations

| ID   | Requirement                                                                                        | Verified by |
| ---- | -------------------------------------------------------------------------------------------------- | ----------- |
| DS-1 | Colors SHALL come from semantic tokens, defined once for each theme                                | Read        |
| DS-2 | The app SHALL offer light and dark themes, with each dark color chosen rather than inverted        | Run         |
| DS-3 | Money SHALL use tabular figures in columns, and quieter cents everywhere                           | Run         |
| DS-4 | Counterparties SHALL use serif monograms rather than third-party logos                             | Run         |
| DS-5 | Every async view SHALL have a loading state shaped like its content, and every list an empty state | Read        |

### Charts

| ID    | Requirement                                                                    | Verified by |
| ----- | ------------------------------------------------------------------------------ | ----------- |
| DS-10 | Charts SHALL use one axis. Two measures never share a plot on different scales | Read        |
| DS-11 | Line charts SHALL use a crosshair, and bars their own hover targets            | Run         |
| DS-12 | Nominal categories SHALL use one hue, so length carries the value              | Run         |
| DS-13 | Ordered data, such as aging, SHALL use an ordered ramp                         | Run         |
| DS-14 | The categorical palette SHALL pass colorblind separation checks in both themes | Run         |
| DS-15 | Charts with two series or more SHALL have a legend                             | Run         |

### Motion

| ID    | Requirement                                                          | Verified by |
| ----- | -------------------------------------------------------------------- | ----------- |
| DS-20 | Pages SHALL settle in with a short stagger, and charts SHALL draw in | Run         |
| DS-21 | Balance changes SHALL count to their new value                       | Run         |
| DS-22 | New ledger rows SHALL arrive with a brief highlight                  | Read        |
| DS-23 | Motion SHALL respect `prefers-reduced-motion`                        | Read        |

### Accessibility

| ID    | Requirement                                                                    | Verified by |
| ----- | ------------------------------------------------------------------------------ | ----------- |
| DS-30 | Interactive elements SHALL be reachable by keyboard, with a visible focus ring | Read        |
| DS-31 | Dialogs and popovers SHALL trap focus and close on Escape                      | Run         |
| DS-32 | Sliders, switches and selects SHALL carry accessible names                     | Run         |
| DS-33 | Status SHALL always pair color with a label                                    | Run         |

### Responsive layout

| ID    | Requirement                                                                          | Verified by |
| ----- | ------------------------------------------------------------------------------------ | ----------- |
| DS-40 | Every page SHALL fit a 375px viewport with no horizontal overflow                    | Run         |
| DS-41 | Below 1024px, the sidebar SHALL give way to bottom navigation and a full-screen menu | Run         |
| DS-42 | On phones, dialogs SHALL become bottom sheets, and drawers full screen               | Read        |
| DS-43 | Sending money SHALL stay one tap away on mobile                                      | Run         |

### Honesty

| ID    | Requirement                                                                                 | Verified by |
| ----- | ------------------------------------------------------------------------------------------- | ----------- |
| DS-50 | A demo badge SHALL be visible at every screen size                                          | Run         |
| DS-51 | Every page SHALL carry a footer naming the author and stating the data is fictional         | Run         |
| DS-52 | WHEN someone first visits, a short guide SHALL open once, and stay reachable from the badge | Run         |

## Palette

Validated with OKLab distance under simulated protanopia and deuteranopia.

| Slot | Light     | Dark      | Use                   |
| ---- | --------- | --------- | --------------------- |
| 1    | `#1E7A52` | `#2F9E8A` | Money in, main series |
| 2    | `#B8862B` | `#C28434` | Money out, milestones |
| 3    | `#3F72B5` | `#6A92D4` | Reserved              |
| 4    | `#C2553A` | `#D2715C` | Reserved              |

## Code

`apps/web/src/app/globals.css`, `apps/web/src/components/ui`, `apps/web/src/components/charts`, `apps/web/src/components/brand`, `apps/web/src/components/layout`
