import { LanguageCode } from '../models/player-state.model';

/**
 * Lightweight i18n dictionaries. Keys are dotted, English is the source of
 * truth; German is the alternate. Missing keys fall back to the key itself.
 */
export type TranslationKey =
  | 'settings.title'
  | 'settings.audio'
  | 'settings.sfx'
  | 'settings.music'
  | 'settings.volume'
  | 'settings.access'
  | 'settings.colorblind'
  | 'settings.intensity'
  | 'settings.accent'
  | 'settings.language'
  | 'settings.combatBeats'
  | 'settings.save'
  | 'settings.export'
  | 'settings.import'
  | 'settings.reset'
  | 'common.on'
  | 'common.off'
  | 'expedition.title'
  | 'expedition.launch'
  | 'expedition.cores'
  | 'expedition.abandon'
  | 'onboarding.start'
  | 'onboarding.skip'
  | 'onboarding.back'
  | 'onboarding.next'
  | 'footer.tabs'
  | 'footer.startBattle'
  | 'tab.Evolution Tree'
  | 'tab.Squad'
  | 'tab.Forge'
  | 'tab.Arena'
  | 'tab.Expedition'
  | 'tab.Collection'
  | 'tab.Campaign'
  | 'tab.Medals'
  | 'tab.Handbook'
  | 'tab.Settings'
  | 'forge.title'
  | 'forge.blueprints'
  | 'forge.locker'
  | 'forge.equip'
  | 'campaign.title'
  | 'campaign.bossCodex';

type Dictionary = Record<TranslationKey, string>;

const EN: Dictionary = {
  'settings.title': 'Settings',
  'settings.audio': 'Audio',
  'settings.sfx': 'Sound effects',
  'settings.music': 'Background music',
  'settings.volume': 'Master volume',
  'settings.access': 'Accessibility & Motion',
  'settings.colorblind': 'Colorblind-safe glyphs',
  'settings.intensity': 'Effect intensity',
  'settings.accent': 'Accent theme',
  'settings.language': 'Language',
  'settings.combatBeats': 'Active combat beats',
  'settings.save': 'Save',
  'settings.export': 'Save Export',
  'settings.import': 'Save Import',
  'settings.reset': 'Reset Run',
  'common.on': 'ON',
  'common.off': 'OFF',
  'expedition.title': 'Expedition',
  'expedition.launch': 'Launch Expedition',
  'expedition.cores': 'Cores',
  'expedition.abandon': 'Abandon',
  'onboarding.start': 'Start Playing',
  'onboarding.skip': 'Skip',
  'onboarding.back': 'Back',
  'onboarding.next': 'Next',
  'footer.tabs': 'Tabs',
  'footer.startBattle': 'Start Battle',
  'tab.Evolution Tree': 'Evolution Tree',
  'tab.Squad': 'Squad',
  'tab.Forge': 'Forge',
  'tab.Arena': 'Arena',
  'tab.Expedition': 'Expedition',
  'tab.Collection': 'Collection',
  'tab.Campaign': 'Campaign',
  'tab.Medals': 'Medals',
  'tab.Handbook': 'Handbook',
  'tab.Settings': 'Settings',
  'forge.title': 'Forge',
  'forge.blueprints': 'Blueprints',
  'forge.locker': 'Gear Locker',
  'forge.equip': 'Equip Squad',
  'campaign.title': 'Campaign',
  'campaign.bossCodex': 'Boss Codex',
};

const DE: Dictionary = {
  'settings.title': 'Einstellungen',
  'settings.audio': 'Audio',
  'settings.sfx': 'Soundeffekte',
  'settings.music': 'Hintergrundmusik',
  'settings.volume': 'Gesamtlautstärke',
  'settings.access': 'Barrierefreiheit & Bewegung',
  'settings.colorblind': 'Farbenblind-sichere Symbole',
  'settings.intensity': 'Effekt-Intensität',
  'settings.accent': 'Akzent-Thema',
  'settings.language': 'Sprache',
  'settings.combatBeats': 'Aktive Kampf-Beats',
  'settings.save': 'Speicher',
  'settings.export': 'Spielstand-Export',
  'settings.import': 'Spielstand-Import',
  'settings.reset': 'Run zurücksetzen',
  'common.on': 'AN',
  'common.off': 'AUS',
  'expedition.title': 'Expedition',
  'expedition.launch': 'Expedition starten',
  'expedition.cores': 'Kerne',
  'expedition.abandon': 'Abbrechen',
  'onboarding.start': 'Los geht’s',
  'onboarding.skip': 'Überspringen',
  'onboarding.back': 'Zurück',
  'onboarding.next': 'Weiter',
  'footer.tabs': 'Tabs',
  'footer.startBattle': 'Kampf starten',
  'tab.Evolution Tree': 'Evolutionsbaum',
  'tab.Squad': 'Truppe',
  'tab.Forge': 'Schmiede',
  'tab.Arena': 'Arena',
  'tab.Expedition': 'Expedition',
  'tab.Collection': 'Sammlung',
  'tab.Campaign': 'Kampagne',
  'tab.Medals': 'Medaillen',
  'tab.Handbook': 'Handbuch',
  'tab.Settings': 'Einstellungen',
  'forge.title': 'Schmiede',
  'forge.blueprints': 'Baupläne',
  'forge.locker': 'Ausrüstungslager',
  'forge.equip': 'Truppe ausrüsten',
  'campaign.title': 'Kampagne',
  'campaign.bossCodex': 'Boss-Kodex',
};

export const TRANSLATIONS: Record<LanguageCode, Dictionary> = { en: EN, de: DE };

export function translate(language: LanguageCode, key: TranslationKey): string {
  return TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
