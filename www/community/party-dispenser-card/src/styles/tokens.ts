// src/styles/tokens.ts
// UI-SPEC §4.3 (typography) + §5.2 (spacing) — shared lit-css design tokens
// All values resolve via HA-native vars first, project-local --pd-* fallbacks, explicit literal last.
import { css } from 'lit';

export const typographyTokens = css`
  :host {
    --pd-font-size-caption: var(--ha-font-size-s, 0.75rem);
    --pd-font-size-label:   var(--ha-font-size-m, 0.875rem);
    --pd-font-size-body:    var(--ha-font-size-m, 1rem);
    --pd-font-size-heading: var(--ha-font-size-l, 1.25rem);

    --pd-font-weight-normal: var(--ha-font-weight-normal, 400);
    --pd-font-weight-medium: var(--ha-font-weight-medium, 500);

    --pd-line-height-tight:  1.3;
    --pd-line-height-normal: 1.5;
    --pd-line-height-loose:  1.6;
  }
`;

export const spacingTokens = css`
  :host {
    --pd-space-xs:  var(--ha-space-1,  4px);
    --pd-space-sm:  var(--ha-space-2,  8px);
    --pd-space-md:  var(--ha-space-3,  12px);
    --pd-space-lg:  var(--ha-space-4,  16px);
    --pd-space-xl:  var(--ha-space-6,  24px);
    --pd-space-2xl: var(--ha-space-8,  32px);
    --pd-space-3xl: var(--ha-space-12, 48px);

    --pd-radius-sm: var(--ha-border-radius-sm, 6px);
    --pd-radius-md: var(--ha-card-border-radius, 12px);
    --pd-radius-lg: var(--ha-card-border-radius-lg, 16px);
  }
`;

// Merged export so a component's static styles can `css`...${sharedTokens}`` in one go
export const sharedTokens = css`
  ${typographyTokens}
  ${spacingTokens}
`;
