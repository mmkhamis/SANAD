// Institution extraction. Matches against a small alias table for the
// banks/wallets we care about in Saudi (and a few in EG/AE). Sender ID
// (when iOS shares it) is the strongest signal — checked first.

interface Inst { id: string; name: string; aliases: string[]; country: 'SA' | 'EG' | 'AE'; }

const INSTITUTIONS: Inst[] = [
  { id: 'alrajhi',  name: 'Al Rajhi Bank', country: 'SA', aliases: ['alrajhi', 'al rajhi', 'rajhi', 'الراجحي', 'مصرف الراجحي'] },
  { id: 'snb',      name: 'SNB',           country: 'SA', aliases: ['snb', 'saudi national bank', 'الأهلي', 'الاهلي', 'البنك الأهلي'] },
  { id: 'alinma',   name: 'Alinma Bank',   country: 'SA', aliases: ['alinma', 'الإنماء', 'الانماء', 'مصرف الإنماء'] },
  { id: 'riyad',    name: 'Riyad Bank',    country: 'SA', aliases: ['riyad bank', 'riyadbank', 'بنك الرياض'] },
  { id: 'sab',      name: 'SAB',           country: 'SA', aliases: ['sab', 'البنك السعودي البريطاني'] },
  { id: 'bsf',      name: 'BSF',           country: 'SA', aliases: ['bsf', 'banque saudi fransi', 'البنك السعودي الفرنسي'] },
  { id: 'anb',      name: 'Arab National Bank', country: 'SA', aliases: ['anb', 'arab national', 'البنك العربي الوطني'] },
  { id: 'albilad',  name: 'Albilad',       country: 'SA', aliases: ['albilad', 'al bilad', 'البلاد', 'بنك البلاد'] },
  { id: 'aljazira', name: 'Bank Aljazira', country: 'SA', aliases: ['aljazira', 'al jazira', 'الجزيرة', 'بنك الجزيرة'] },
  { id: 'saib',     name: 'SAIB',          country: 'SA', aliases: ['saib', 'البنك السعودي للاستثمار'] },
  { id: 'gib',      name: 'Gulf International Bank', country: 'SA', aliases: ['gib', 'gulf international'] },
  { id: 'stcbank',  name: 'STC Bank',      country: 'SA', aliases: ['stc bank', 'stcbank', 'بنك stc'] },
  { id: 'stcpay',   name: 'STC Pay',       country: 'SA', aliases: ['stc pay', 'stcpay', 'stc-pay'] },
  { id: 'urpay',    name: 'URPay',         country: 'SA', aliases: ['urpay', 'ur pay', 'يو ار باي'] },
  { id: 'mobily',   name: 'Mobily',        country: 'SA', aliases: ['mobily', 'موبايلي'] },

  { id: 'cib',         name: 'CIB',          country: 'EG', aliases: ['cib', 'commercial international'] },
  { id: 'nbe',         name: 'NBE',          country: 'EG', aliases: ['nbe', 'national bank of egypt', 'البنك الأهلي المصري'] },
  { id: 'banquemisr',  name: 'Banque Misr',  country: 'EG', aliases: ['banque misr', 'بنك مصر'] },
  { id: 'instapay',    name: 'InstaPay',     country: 'EG', aliases: ['instapay', 'انستا باي'] },
];

export interface InstitutionResult {
  institution_name: string | null;
  institution_id: string | null;
  country: 'SA' | 'EG' | 'AE' | null;
}

// Normalize aliases at module load to match how `lower` is normalized
// in `normalize.ts`: إ/أ/آ → ا, ة → ه, ى → ي, diacritics stripped.
function nrm(s: string): string {
  return s.toLowerCase()
    .replace(/[ً-ْٰ]/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}
const INST_NORMALIZED = INSTITUTIONS.map((i) => ({
  ...i,
  normalized: i.aliases.map(nrm),
}));

export function extractInstitution(
  lower: string,
  sender?: string | null,
): InstitutionResult {
  if (sender) {
    const senderLower = nrm(sender);
    for (const inst of INST_NORMALIZED) {
      if (inst.normalized.some((a) => senderLower.includes(a))) {
        return { institution_name: inst.name, institution_id: inst.id, country: inst.country };
      }
    }
  }

  for (const inst of INST_NORMALIZED) {
    if (inst.normalized.some((a) => lower.includes(a))) {
      return { institution_name: inst.name, institution_id: inst.id, country: inst.country };
    }
  }

  return { institution_name: null, institution_id: null, country: null };
}
