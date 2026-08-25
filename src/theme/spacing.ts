/** Spatial contracts backed by semantic Tailwind theme variables. */
const spacing = {
  card: "var(--spacing-card)",
  cardWide: "var(--spacing-card-wide)",
  cluster: "var(--spacing-cluster)",
  compact: "var(--spacing-card-compact)",
  detail: "var(--spacing-detail)",
  page: "var(--spacing-page)",
  pageBlock: "var(--spacing-page-block)",
  section: "var(--spacing-section)",
  stack: "var(--spacing-stack)",
} as const;

const spacingStyles = {
  badge: "px-control-padding-sm py-badge-y",
  buttonSize: {
    lg: "h-control-lg px-control-padding-lg text-base",
    md: "h-control-md px-control-padding-md text-sm",
    sm: "h-control-sm px-control-padding-sm text-sm",
  },
  cardPadding: {
    lg: "p-card-wide",
    md: "p-card",
    none: "",
    sm: "p-card-compact",
  },
  cardRegionPadding: {
    lg: "p-card-wide",
    md: "p-card",
    sm: "p-card-compact",
  },
  cardGrid: "grid gap-card",
  cardStack: "space-y-card",
  chip: "px-card py-detail",
  cluster: "flex flex-wrap gap-cluster",
  contentNarrow: "mx-auto w-full max-w-4xl",
  detailStack: "space-y-detail",
  floatingPosition:
    "right-[var(--inset-page-right)] bottom-[var(--inset-page-bottom)]",
  floatingButton: "size-floating-control p-0",
  floatingPanel: "max-h-[70dvh] overflow-y-auto overscroll-contain",
  captureNoticePosition:
    "fixed top-[var(--inset-page-top)] left-1/2 z-40 -translate-x-1/2",
  desktopCapturePosition:
    "fixed inset-x-0 bottom-[var(--inset-page-bottom)] z-30 hidden px-page md:flex md:justify-center",
  heroContent: "pt-card",
  item: "gap-cluster px-card py-card",
  itemList: "divide-y",
  pageContainer:
    "mx-auto min-h-dvh w-full max-w-atlas px-page py-page-block",
  pageHeader: "max-w-3xl space-y-card",
  pageStack: "space-y-section",
  mobileCapturePosition:
    "fixed z-30 flex flex-col items-end gap-cluster md:hidden",
  pageWithUniversalCapture:
    "pb-[calc(var(--spacing-page-block)+var(--spacing-floating-control)+var(--spacing-cluster))]",
  rating: "flex gap-detail",
  section: "space-y-stack",
  sectionHeader:
    "flex flex-col items-start justify-between gap-card-compact sm:flex-row sm:items-end",
} as const;

export { spacing, spacingStyles };
