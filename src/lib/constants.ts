/**
 * KiranaWala — Permanent Design System Constants & Token References
 */

export const THEME_COLORS = {
  canvas: "#FFFFFF",
  ink: "#0B051D",
  pink: "#FFA8CD",
  pinkHover: "#F796BE",
  white: "#FFFFFF",
  cardBg: "#F8F7FA",
  neutralBg: "#F3F3F5",
  borderSubtle: "#E2E2E7",
  textSecondary: "#636071",
  purpleFocus: "#7B57D8",
  statusSuccess: "#059669",
  statusWarning: "#D97706",
  statusDanger: "#DC2626",
} as const;

export const BREAKPOINTS = {
  mobile: "375px",
  tablet: "768px",
  laptop: "1024px",
  desktop: "1440px",
  wide: "1920px",
} as const;

export const MOTION_EASING = {
  editorial: [0.16, 1, 0.3, 1] as const, // Primary cubic-bezier
  snappy: [0.25, 1, 0.5, 1] as const,
  micro: [0.4, 0, 0.2, 1] as const,
};

export const Z_INDEX = {
  base: 0,
  card: 10,
  stickyHeader: 50,
  drawerBackdrop: 90,
  drawerContent: 100,
  modal: 150,
  toast: 200,
} as const;
