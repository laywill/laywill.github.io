/*
 * PLACEHOLDER CONTENT. Real badge artwork and real certifications are
 * issues #28 (copy, sourced from github.com/laywill/cv `body.tex`) and #30
 * (badge artwork). Every entry here is deliberately generic — "Cert N" /
 * "Placeholder certification N" / "Placeholder issuer" — rather than a
 * real-sounding abbreviation or issuer, so nobody mistakes a stand-in for a
 * claim. Do not "improve" these into plausible certifications before #28
 * lands; that would make the placeholder harder to spot, not easier.
 */

export interface Certification {
  /** Short mono abbreviation shown on the badge face. */
  abbr: string
  /** Full name, the badge caption. */
  name: string
  issuer: string
  year?: number
}

export const CERTIFICATIONS: readonly Certification[] = [
  {
    abbr: 'PH1',
    name: 'Placeholder certification 1',
    issuer: 'Placeholder issuer'
  },
  {
    abbr: 'PH2',
    name: 'Placeholder certification 2',
    issuer: 'Placeholder issuer'
  },
  {
    abbr: 'PH3',
    name: 'Placeholder certification 3',
    issuer: 'Placeholder issuer'
  },
  {
    abbr: 'PH4',
    name: 'Placeholder certification 4',
    issuer: 'Placeholder issuer'
  },
  {
    abbr: 'PH5',
    name: 'Placeholder certification 5',
    issuer: 'Placeholder issuer'
  }
] as const
