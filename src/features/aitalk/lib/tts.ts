export const DEFAULT_AITALK_VOICE_NAME = 'en-US-JennyNeural';
export const DEFAULT_AITALK_SPEECH_LANG = 'en-US';
export const DEFAULT_AITALK_SPEECH_STYLE = 'friendly';

const VOICE_BY_LANG: Record<string, string> = {
  'en-us': 'en-US-JennyNeural',
  en: 'en-US-JennyNeural',
  'zh-cn': 'zh-CN-XiaoxiaoNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
  'zh-hk': 'zh-HK-HiuMaanNeural',
  'zh-tw': 'zh-TW-HsiaoChenNeural',
  'ja-jp': 'ja-JP-NanamiNeural',
  ja: 'ja-JP-NanamiNeural',
  'ko-kr': 'ko-KR-SunHiNeural',
  ko: 'ko-KR-SunHiNeural',
  'fr-fr': 'fr-FR-DeniseNeural',
  fr: 'fr-FR-DeniseNeural',
  'de-de': 'de-DE-KatjaNeural',
  de: 'de-DE-KatjaNeural',
  'it-it': 'it-IT-ElsaNeural',
  it: 'it-IT-ElsaNeural',
  'es-es': 'es-ES-ElviraNeural',
  es: 'es-ES-ElviraNeural',
  'pt-br': 'pt-BR-FranciscaNeural',
  pt: 'pt-BR-FranciscaNeural',
  'vi-vn': 'vi-VN-HoaiMyNeural',
  vi: 'vi-VN-HoaiMyNeural',
};

export function normalizeAitalkSpeechLang(value: unknown) {
  const lang = typeof value === 'string' ? value.trim() : '';
  return lang || DEFAULT_AITALK_SPEECH_LANG;
}

export function resolveAitalkVoiceName(lang: string, value?: unknown) {
  const requested = typeof value === 'string' ? value.trim() : '';
  if (requested) return requested;

  const normalized = normalizeAitalkSpeechLang(lang).toLowerCase();
  return (
    VOICE_BY_LANG[normalized] ||
    VOICE_BY_LANG[normalized.split('-')[0]] ||
    DEFAULT_AITALK_VOICE_NAME
  );
}

export function prepareAitalkSpeechText(text: string, lang: string) {
  let clean = text.trim();
  if (!clean) return '';

  clean = clean.replaceAll(/```[\s\S]*?```/g, ' ');
  clean = clean.replaceAll(/`([^`]*)`/g, '$1');
  clean = clean.replaceAll(/\*\*|\*/g, ' ');
  clean = clean.replaceAll(
    /^\s*(提示|你可以这样说|Hint|You can say)\s*[:：]/gim,
    ''
  );
  clean = clean.replaceAll(/_{2,}|＿+/g, ' ');
  clean = clean.replaceAll(/[_＿]/g, ' ');

  if (!isCjkTargetLanguage(lang)) {
    clean = clean.replaceAll(
      /[\(（][^\)）]*[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af][^\)）]*[\)）]/g,
      ' '
    );
    clean = clean.replaceAll(
      /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g,
      ' '
    );
  }

  clean = clean.replaceAll(/\s+([,.!?;:])/g, '$1');
  clean = clean.replaceAll(/\s+/g, ' ').trim();
  return clean;
}

export function escapeAitalkSpeechXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function buildAitalkSpeechSsml({
  lang,
  name,
  rate = 'default',
  style,
  text,
}: {
  lang: string;
  name: string;
  rate?: string;
  style: string;
  text: string;
}) {
  const speechLang = escapeAitalkSpeechXml(normalizeAitalkSpeechLang(lang));
  const speechName = escapeAitalkSpeechXml(resolveAitalkVoiceName(lang, name));
  const speechRate = escapeAitalkSpeechXml(rate || 'default');
  const speechStyle = escapeAitalkSpeechXml(
    style || DEFAULT_AITALK_SPEECH_STYLE
  );
  const speechText = escapeAitalkSpeechXml(text);

  return `<speak version="1.0" xmlns:mstts="https://www.w3.org/2001/mstts" xmlns="https://www.w3.org/2001/10/synthesis" xml:lang="${speechLang}">
  <voice name="${speechName}">
    <prosody rate="${speechRate}">
      <mstts:express-as style="${speechStyle}" styledegree="1.5">
        ${speechText}
      </mstts:express-as>
    </prosody>
  </voice>
</speak>`;
}

function isCjkTargetLanguage(lang: string) {
  const normalized = lang.toLowerCase();
  return (
    normalized.startsWith('zh') ||
    normalized.startsWith('ja') ||
    normalized.startsWith('ko')
  );
}
