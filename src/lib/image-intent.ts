/**
 * Detects whether a chat message is asking Opera AI to CREATE an image
 * (as opposed to asking for code, text or an explanation).
 *
 * Supports the explicit `/image <prompt>` command plus natural language
 * requests in English and Arabic.
 */

export type ImageIntent = { isImage: false } | { isImage: true; prompt: string };

const COMMAND = /^\/(image|img|draw|صورة|ارسم)\s*/i;

// Phrases that clearly ask for a picture to be produced.
const EN_PATTERNS: RegExp[] = [
  /\b(generate|create|make|draw|paint|render|design|produce|give me|show me)\b[^.?!]{0,40}\b(an?|the|some)?\s*(image|images|picture|pictures|photo|photos|illustration|artwork|drawing|wallpaper|logo|poster|avatar|painting)\b/i,
  /\b(draw|sketch|paint|illustrate)\s+(me\s+)?(an?|the)\s+\w+/i,
  /\b(image|picture|photo|illustration|artwork)\s+of\s+\w+/i,
];

const AR_PATTERNS: RegExp[] = [
  /(ارسم|إرسم|ارسملي|صمم|صمّم|اصنع|أنشئ|انشئ|ولد|ولّد|وَلِّد|اعمل|أعطني|اعطني|اظهر|أظهر)\s*[^؟?.!]{0,40}(صورة|صوره|رسمة|رسمه|لوحة|تصميم|شعار|خلفية|بوستر|صور)/,
  /(صورة|صوره|رسمة|رسمه|لوحة)\s*(ل|لي|عن|of)?\s*\S+/,
  // Arabic "draw" verbs on their own already mean "produce a picture".
  /(^|\s)(ارسم|إرسم|أرسم|ارسملي|ارسمي|رسمة|ريندر)/,
];

// Guard: the user is asking about writing code, not for a picture.
const CODE_HINTS =
  /\b(code|python|javascript|canvas|svg|html|css|matplotlib|pillow|function|script|library|api|component)\b|(كود|برمج|سكربت|دالة|مكتبة)/i;

const CLEAN_PREFIX =
  /^\s*(please\s+)?(can you\s+|could you\s+|i want you to\s+|i want\s+|i need\s+)?(generate|create|make|draw|paint|render|design|produce|give me|show me)\s+(me\s+)?(an?|the|some)?\s*(image|images|picture|pictures|photo|photos|illustration|artwork|drawing)?\s*(of|for|about|showing|with)?\s*/i;

const CLEAN_PREFIX_AR =
  /^\s*(من فضلك\s*)?(ممكن\s*|هل يمكنك\s*)?(ارسم|إرسم|ارسملي|صمم|صمّم|اصنع|أنشئ|انشئ|ولد|ولّد|اعمل|أعطني|اعطني|اظهر|أظهر)\s*(لي|لنا)?\s*(صورة|صوره|رسمة|رسمه|لوحة|تصميم)?\s*(ل|عن|فيها|تظهر)?\s*/;

export function detectImageRequest(raw: string): ImageIntent {
  const text = raw.trim();
  if (!text) return { isImage: false };

  const command = text.match(COMMAND);
  if (command) {
    const prompt = text.slice(command[0].length).trim();
    return prompt ? { isImage: true, prompt } : { isImage: false };
  }

  if (CODE_HINTS.test(text)) return { isImage: false };

  const matched = [...EN_PATTERNS, ...AR_PATTERNS].some((pattern) => pattern.test(text));
  if (!matched) return { isImage: false };

  const prompt = text.replace(CLEAN_PREFIX, "").replace(CLEAN_PREFIX_AR, "").trim();
  return { isImage: true, prompt: prompt.length >= 2 ? prompt : text };
}
