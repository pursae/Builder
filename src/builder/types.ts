import type { LucideIcon } from 'lucide-react'

export type Mode = 'basic' | 'studio' | 'ai'
export type Device = 'desktop' | 'tablet' | 'mobile'
export type SectionKind =
  | 'nav'
  | 'hero'
  | 'banner'
  | 'features'
  | 'media'
  | 'steps'
  | 'quote'
  | 'faq'
  | 'cta'
  | 'footer'
  | 'text'
  | 'image'
  | 'form'
  | 'layout'
  | 'html'
  | 'custom'
export type PaletteId = 'brand' | 'dark' | 'light' | 'soft' | 'sand'
export type FontPairId = 'elegant' | 'modern' | 'plain'
export type CornerId = 'sharp' | 'soft' | 'round'
export type ElKind = 'heading' | 'text' | 'button' | 'badge' | 'image' | 'link' | 'code' | 'box' | 'icon'

export interface Box4 {
  t: number
  r: number
  b: number
  l: number
}

/** Per-cell (child container) settings. */
export interface CellBox {
  width?: number // % of the row
  padding?: Box4
  bg?: string
  radius?: number
  valign?: 'start' | 'center' | 'end'
  halign?: 'start' | 'center' | 'end'
}

/** Per-element fine tuning (any heading, text, button, image…). */
export interface ElStyle {
  margin?: Box4
  /** Space above / below only (set by dragging on the canvas). */
  mt?: number
  mb?: number
  ml?: number
  mr?: number
  padding?: Box4
  fontSize?: number
  fontWeight?: number
  lineHeight?: number
  letterSpacing?: number
  color?: string
  bg?: string
  radius?: number
  align?: 'left' | 'center' | 'right'
  /** Size; width unset = auto. Text elements use height as min-height. */
  width?: number
  widthUnit?: 'px' | '%' | 'vw'
  maxWidth?: number
  maxWidthUnit?: 'px' | '%'
  height?: number
  heightUnit?: 'px' | 'vh'
  fit?: 'cover' | 'contain'
  /** SVG icons / images: repaint every color with this one. */
  iconColor?: string
  /** SVG icons / images: per-color overrides, original #rrggbb → new color (wins over iconColor). */
  iconColors?: Record<string, string>
}

export interface Item {
  id: string
  title: string
  text: string
  icon?: string
  box?: CellBox
  href?: string
  /** Free-form ('custom') sections: element type, parent box id and box layout. */
  node?: NodeType
  parent?: string
  tag?: string
  lay?: NodeLayout
  /** Layout cells of type 'layout': the nested Flexbox / Grid container. */
  sub?: Section
}

/** Elementor-style container settings for Flexbox / Grid sections. */
export interface ContainerBox {
  contentWidth: 'boxed' | 'full'
  width: number
  widthUnit: 'px' | '%' | 'vw'
  minHeight: number
  minHeightUnit: 'px' | 'vh'
  direction: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justify: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
  align: 'stretch' | 'start' | 'center' | 'end'
  wrap: boolean
  stackMobile: boolean
  gapX: number
  gapY: number
  gridCols: number
  gridRows: number
  margin: Box4
  padding: Box4
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted'
  borderWidth: number
  borderColor: string
  radius: number
  shadow: 'none' | 'sm' | 'md' | 'lg'
  zIndex: number
}

export interface SectionStyle {
  palette: PaletteId
  align: 'left' | 'center'
  padding: number
  titleSize: number
  titleWeight?: number
  letterSpacing?: number
  titleColor?: string
  bodySize?: number
  bg?: string
  hideOn: Device[]
  cssId?: string
  /** Custom CSS; the word `selector` targets this section. */
  css?: string
  /** Entrance animation when scrolled into view (preview / live site). */
  anim?: 'none' | 'fade' | 'up' | 'zoom' | 'left'
}

export interface Section {
  id: string
  kind: SectionKind
  name: string
  hidden: boolean
  content: Record<string, string>
  items: Item[]
  style: SectionStyle
  box?: ContainerBox
  els?: Record<string, ElStyle>
  grid?: Partial<GridSettings>
  bg?: Partial<BgSettings>
}

export type DecorId = 'none' | 'globe' | 'rings' | 'waves' | 'blob' | 'dots' | 'grid' | 'custom'

/** Section background: base fill + a decorative SVG layer. */
export interface BgSettings {
  type: 'color' | 'gradient' | 'image'
  gradFrom: string
  gradTo: string
  gradAngle: number
  image?: string
  overlay: number
  decor: DecorId
  decorSvg?: string
  decorColor?: string
  decorOpacity: number
  decorScale: number
  decorX: number
  decorY: number
  decorRotate: number
  decorAnim: 'none' | 'spin' | 'float' | 'pulse'
}

/** Item grids inside ready-made sections (cards, steps, link lists). */
export interface GridSettings {
  cols: number
  colsT: number
  colsM: number
  gapX: number
  gapY: number
  pad: number
  radius?: number
  bg?: string
  border: boolean
  borderW: number
  borderColor?: string
  shadow: 'none' | 'sm' | 'md' | 'lg'
  showIcon: boolean
  iconSize: number
  iconColor?: string
}

export interface SiteSettings {
  brand: string
  fontPair: FontPairId
  corners: CornerId
  /** Font library families (fonts.ts); unset = the font pair's heading font / Inter. */
  headingFont?: string
  headingWeight?: number
  bodyFont?: string
  bodyWeight?: number
}

export interface DocState {
  sections: Section[]
  site: SiteSettings
}

export interface Selection {
  sectionId: string
  el?: string
}

export interface FieldDef {
  key: string
  label: string
  el: ElKind
  multiline?: boolean
  showIf?: (s: Section) => boolean
  /** Basic mode groups fields under this heading (default: Yazılar). */
  group?: string
  hint?: string
}

export interface ItemsDef {
  label: string
  add: string
  titleLabel: string
  textLabel?: string
  titleEl: ElKind
  textEl?: ElKind
  max: number
}

export interface OptionDef {
  key: string
  label: string
  choices: { value: string; label: string }[]
}

export interface KindDef {
  name: string
  icon: LucideIcon
  blurb: string
  fields: FieldDef[]
  items?: ItemsDef
  options?: OptionDef[]
  align: boolean
  spacing: boolean
  pinned?: boolean
}

export type CellType = '' | 'heading' | 'text' | 'button' | 'image' | 'layout'
export type LayoutType = 'flex' | 'grid'

export interface Structure {
  id: string
  cols: number
  rows: number
  /** [x, y, w, h] in grid units */
  cells: [number, number, number, number][]
  arrow?: 'down' | 'right'
}

export interface Payload {
  kind: SectionKind
  label: string
  content?: Record<string, string>
  /** When dropped into a layout cell, the cell becomes this type. */
  cell?: CellType
  /** A saved component: inserted as a fresh copy. */
  section?: Section
}

export interface PageSettings {
  title: string
  slug: string
  description: string
  indexable: boolean
}

export interface SavedComponent {
  id: string
  name: string
  section: Section
}

/* ---------- Free-form sections (site clones, custom compositions) ---------- */
/**
 * A 'custom' section stores a tree in `items`: every item is a node with `parent` pointing at a
 * box item (none = top level). Text lives in `title` (image / icon: the URL, `text` = alt), the
 * element style in `els['items.<id>.title']`, so editing, styling and undo reuse the usual actions.
 */
export type NodeType = 'box' | 'heading' | 'text' | 'button' | 'link' | 'image' | 'icon' | 'input' | 'divider'

export interface NodeLayout {
  /** Boxes: how children flow. */
  dir?: 'row' | 'column' | 'grid'
  cols?: number
  gap?: number
  gapY?: number
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'space-between'
  wrap?: boolean
  /** Rows: stack children vertically on narrow screens. */
  stack?: boolean
  /** Rows wider than their box (marquees, logo strips): stay on one line and clip the overflow. */
  clip?: boolean
  /** Navigation link rows: replaced by a hamburger icon on small screens. */
  menu?: boolean
  /** Placement inside the parent box. */
  self?: 'start' | 'center' | 'end' | 'stretch'
  /** Share of the parent row's width (%). */
  basis?: number
  /** Images: width / height. */
  ratio?: number
}

/** Extra element styles used by free-form sections (merged into ElStyle). */
export interface ElStyle {
  /** Font family name, or '@heading' / '@body' for the site fonts (fonts.ts). */
  font?: string
  border?: string
  shadow?: string
  transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  /** false = force upright (e.g. on an italic accent line). */
  italic?: boolean
  underline?: boolean
  /** CSS background-image list (url(...) / gradients) with matching size / position lists. */
  bgImage?: string
  bgSize?: string
  bgPos?: string
  list?: string
  opacity?: number
}

/** Icons of ready-made sections ("items.<id>.icon" / "icon"): glyph + optional tile. `iconColor` = glyph color, `bg` / `radius` = tile. */
export interface ElStyle {
  iconSize?: number
  tile?: boolean
  tileSize?: number
  /** Tile color strength, 0–100 %. */
  tileOpacity?: number
  hide?: boolean
}

/* ---------- Motion effects (see motion.ts) ---------- */
export type EntranceId =
  | 'none'
  | 'fade'
  | 'fade-up'
  | 'fade-down'
  | 'fade-left'
  | 'fade-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'slide-up'
  | 'slide-left'
  | 'slide-right'
  | 'blur'
  | 'flip'
  | 'bounce'
export type EasingId = 'smooth' | 'ease' | 'ease-out' | 'ease-in-out' | 'spring' | 'linear'
export type HoverId = 'none' | 'lift' | 'glow' | 'scale'

/** Entrance (on scroll into view), scroll-driven and hover effects. Every field is optional; see MOTION_DEFAULTS. */
export interface MotionSettings {
  entrance?: EntranceId
  /** ms */
  duration?: number
  delay?: number
  easing?: EasingId
  /** Play every time it scrolls into view (default: once). */
  repeat?: boolean
  /** Sections: animate the child blocks / cards one after another. */
  stagger?: boolean
  staggerDelay?: number
  /** -100…100, 0 = off. */
  parallax?: number
  parallaxTarget?: 'bg' | 'content'
  scrollFade?: boolean
  scrollScale?: boolean
  sticky?: boolean
  hover?: HoverId
  hoverTarget?: 'self' | 'items'
}

export interface SectionStyle {
  motion?: MotionSettings
}

/** Elements: entrance animation only. */
export interface ElStyle {
  motion?: MotionSettings
}

/**
 * Visibility of any element (see ElVisibility.tsx): `hide` = dimmed in the editor, not on the live page;
 * `removed` = a deleted fixed field of a ready-made section (title, image…), gone everywhere until restored.
 */
export interface ElStyle {
  removed?: boolean
}
