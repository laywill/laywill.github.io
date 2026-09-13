/*
 * PLACEHOLDER CONTENT. The category shape (Languages / Cloud & infrastructure
 * / Delivery tooling / Practices) and the accent-per-category mapping are
 * settled by docs/overhaul/design-direction.md ("Semantic colour map") and
 * docs/overhaul/component-library.md — those are real decisions. The specific
 * tools and practices listed below are not: they stand in for whatever
 * issue #28 pulls from William's CV (github.com/laywill/cv, `body.tex`) and
 * must be replaced then, not trusted as fact until that happens.
 *
 * The technology names themselves (Docker, Kubernetes, TypeScript, ...) are
 * generic, true-ish tool names rather than claims about William specifically,
 * so they are left as realistic placeholders per the brief for this issue.
 * Icon names are verified against the installed @iconify-json/simple-icons
 * and @iconify-json/lucide packages so the build cannot fail on a typo.
 */
import type { Accent } from '../lib/accents'

export interface ToolboxItem {
  label: string
  /** Iconify name, e.g. "simple-icons:docker". */
  icon: string
}

export interface ToolboxCategory {
  id: string
  /** Category name — carried as TEXT so the domain never depends on colour alone. */
  label: string
  accent: Accent
  /** Practices render as quoted strings, per the semantic colour map. */
  quoted?: boolean
  items: readonly ToolboxItem[]
}

export const TOOLBOX: readonly ToolboxCategory[] = [
  {
    id: 'languages',
    label: 'Languages',
    accent: 'blue',
    items: [
      { label: 'TypeScript', icon: 'simple-icons:typescript' },
      { label: 'Python', icon: 'simple-icons:python' },
      { label: 'Go', icon: 'simple-icons:go' },
      { label: 'Bash', icon: 'simple-icons:gnubash' }
    ]
  },
  {
    id: 'cloud-infrastructure',
    label: 'Cloud & infrastructure',
    accent: 'teal',
    items: [
      { label: 'Docker', icon: 'simple-icons:docker' },
      { label: 'Kubernetes', icon: 'simple-icons:kubernetes' },
      { label: 'Terraform', icon: 'simple-icons:terraform' },
      { label: 'AWS', icon: 'simple-icons:amazonwebservices' }
    ]
  },
  {
    id: 'delivery-tooling',
    label: 'Delivery tooling',
    accent: 'yellow',
    items: [
      { label: 'GitHub Actions', icon: 'simple-icons:githubactions' },
      { label: 'Jenkins', icon: 'simple-icons:jenkins' },
      { label: 'Argo CD', icon: 'simple-icons:argo' },
      { label: 'CircleCI', icon: 'simple-icons:circleci' }
    ]
  },
  {
    id: 'practices',
    label: 'Practices',
    accent: 'orange',
    // Practices are asserted, not installed, so they read as quoted strings
    // rather than brand-marked tags — see the semantic colour map.
    quoted: true,
    items: [
      { label: 'trunk-based development', icon: 'lucide:git-branch' },
      { label: 'continuous delivery', icon: 'lucide:repeat' },
      { label: 'infrastructure as code', icon: 'lucide:file-code' },
      { label: 'blameless retrospectives', icon: 'lucide:users' }
    ]
  }
] as const
