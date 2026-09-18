import type { Locale } from './game';

export type Localized = Record<Locale, string>;
export interface EvidenceFile {
  id: string; stage: number; title: Localized; body: Localized;
  kind?: 'document' | 'photo' | 'audio'; asset?: string;
  back?: Localized; symbol?: string; digit?: string; pulses?: number;
}
export interface InvestigationView {
  evidence: EvidenceFile[];
  hint?: Localized;
  hintUsed: boolean;
  order: string[];
  flipped: string[];
  examined: string[];
  draft: string[];
  partnerAnalyzed: boolean;
}
export const local = (en: string, pt: string): Localized => ({ 'en-US': en, 'pt-BR': pt });
