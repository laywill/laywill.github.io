/*
 * PLACEHOLDER CONTENT. The four-entry shape (initial commit → branch: devops
 * → merge: coaching into management → HEAD → main) and its refKinds are
 * fixed by docs/overhaul/design-direction.md ("Split panes") — that is a
 * real structural decision, not a placeholder. The employer names, outcome
 * lines and exact dates are not: they stand in for issue #28's sourcing from
 * github.com/laywill/cv (`body.tex`) and must not be read as fact.
 *
 * Employer is deliberately a generic "[Employer placeholder]" rather than a
 * real-sounding invented company, and outcome is a generic placeholder
 * sentence rather than an invented metric, per the "no invented specifics"
 * rule for this issue. Role titles echo the hero terminal's own copy
 * (engineer → devops → coach → "leader" — see design-direction.md's hero
 * section), which is an existing design decision rather than a new claim.
 * Commit hashes are decorative flavour for the git-graph motif, not a claim
 * about anything, so they are left as plausible-looking short hex strings.
 */

export type CareerRefKind = 'head' | 'merge' | 'branch' | 'initial'

export interface CareerEntry {
  /** Short commit hash, --accent-yellow. */
  hash: string
  /** Ref text, e.g. "HEAD → main" or "merge: coaching → management". */
  ref: string
  /** Date range, e.g. "2023–present". */
  dates: string
  refKind: CareerRefKind
  role: string
  employer: string
  /** One outcome line. */
  outcome: string
}

// Newest first — CareerGraph renders this as an ordered list top-to-bottom,
// matching `git log --graph`'s own newest-at-top convention.
export const CAREER: readonly CareerEntry[] = [
  {
    hash: 'f3a9c1e',
    ref: 'HEAD → main',
    dates: '2023–present',
    refKind: 'head',
    role: 'Engineering Leader',
    employer: '[Employer placeholder]',
    outcome: 'Outcome placeholder — sourced from the CV in #28.'
  },
  {
    hash: '9d2b7a4',
    ref: 'merge: coaching → management',
    dates: '2019–2023',
    refKind: 'merge',
    role: 'Agile Coach',
    employer: '[Employer placeholder]',
    outcome: 'Outcome placeholder — sourced from the CV in #28.'
  },
  {
    hash: '6c1e8f0',
    ref: 'branch: devops',
    dates: '2015–2019',
    refKind: 'branch',
    role: 'DevOps Engineer',
    employer: '[Employer placeholder]',
    outcome: 'Outcome placeholder — sourced from the CV in #28.'
  },
  {
    hash: '1a0b3d2',
    ref: 'initial commit',
    dates: '2010–2015',
    refKind: 'initial',
    role: 'Software Engineer',
    employer: '[Employer placeholder]',
    outcome: 'Outcome placeholder — sourced from the CV in #28.'
  }
] as const
