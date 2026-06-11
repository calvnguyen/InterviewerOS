'use strict';

/**
 * Regex-based email parser for job application emails.
 * Returns { company, role, stage, confidence }
 *
 * confidence is "high" if at least company OR role was extracted; "low" otherwise.
 */
function parseEmail(text) {
  if (!text || typeof text !== 'string') {
    return { company: null, role: null, stage: null, confidence: 'low' };
  }

  // Normalise whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

  const company = extractCompany(normalized);
  const role = extractRole(normalized);
  const stage = extractStage(normalized);

  const confidence = company || role ? 'high' : 'low';

  return {
    company: company || null,
    role: role || null,
    stage: stage || null,
    confidence,
  };
}

function extractCompany(text) {
  // Each pattern has a named capture group or index-1 for the company candidate.
  // Ordered from most-specific to least-specific.
  const patterns = [
    // "the Acme Corp team"
    /the\s+([A-Z][A-Za-z0-9\s&.,'()-]{1,60}?)\s+team/i,
    // "Acme Corp is excited" / "Acme Corp is pleased"
    /([A-Z][A-Za-z0-9\s&.,'()-]{1,60}?)\s+is\s+(?:excited|pleased|thrilled|happy)/i,
    // "at Acme Corp" — stop at sentence-ending punctuation, prepositions, or end of string
    /\bat\s+([A-Z][A-Za-z0-9&'-]+(?:\s+[A-Z][A-Za-z0-9&'-]+){0,4})(?=[\s,.]|$)/,
    // "from Acme Corp"
    /\bfrom\s+([A-Z][A-Za-z0-9&'-]+(?:\s+[A-Z][A-Za-z0-9&'-]+){0,4})(?=[\s,.]|$)/,
    // "with Acme Corp"
    /\bwith\s+([A-Z][A-Za-z0-9&'-]+(?:\s+[A-Z][A-Za-z0-9&'-]+){0,4})(?=[\s,.]|$)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Must start with a capital letter and not be a generic filler word
      if (/^[A-Z]/.test(candidate) && !isGenericWord(candidate)) {
        return cleanCompany(candidate);
      }
    }
  }

  return null;
}

function extractRole(text) {
  const patterns = [
    // "for the Product Manager position" / "for the Product Manager role"
    /for\s+the\s+(.+?)\s+(?:position|role|opportunity)\b/i,
    // "for a Product Manager position"
    /for\s+an?\s+(.+?)\s+(?:position|role|opportunity)\b/i,
    // "applied for Product Manager"
    /applied\s+for\s+(?:the\s+)?(.+?)(?:\s+(?:position|role|opportunity)|[,.]|$)/i,
    // "as a Product Manager at ..."
    /\bas\s+an?\s+([A-Z][A-Za-z0-9\s&/'()-]{1,80}?)(?=\s+(?:at|with|position|role)|[,.]|$)/i,
    // "the Product Manager opening"
    /the\s+([A-Z][A-Za-z0-9\s&/'()-]{1,80}?)\s+(?:opening|vacancy|posting)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (candidate.length > 1 && candidate.length < 150) {
        return cleanRole(candidate);
      }
    }
  }

  return null;
}

function extractStage(text) {
  const lower = text.toLowerCase();

  // Check most specific signals first to avoid false positives

  // Offer
  if (
    lower.includes('offer letter') ||
    lower.includes('pleased to offer') ||
    lower.includes('job offer') ||
    lower.includes('offer of employment') ||
    lower.includes('we would like to offer you')
  ) {
    return 'offer';
  }

  // Rejected
  if (
    lower.includes('not moving forward') ||
    lower.includes('decided to move forward with other candidates') ||
    lower.includes('position has been filled') ||
    lower.includes('not a fit') ||
    lower.includes('will not be moving') ||
    (lower.includes('unfortunately') &&
      (lower.includes('application') || lower.includes('position') || lower.includes('role')))
  ) {
    return 'rejected';
  }

  // Interview (specific signals)
  if (
    lower.includes('interview invitation') ||
    lower.includes('invite you to interview') ||
    lower.includes('interview scheduled') ||
    lower.includes('technical interview') ||
    lower.includes('on-site interview')
  ) {
    return 'interview';
  }

  // Phone screen / initial call
  if (
    lower.includes('phone screen') ||
    lower.includes('preliminary interview') ||
    lower.includes('initial interview') ||
    lower.includes('schedule a call') ||
    lower.includes('want to connect') ||
    lower.includes('would like to chat')
  ) {
    return 'phone_screen';
  }

  // Applied (confirmation emails)
  if (
    lower.includes('thank you for applying') ||
    lower.includes('received your application') ||
    lower.includes('we have received') ||
    lower.includes('successfully applied') ||
    lower.includes('application has been submitted')
  ) {
    return 'applied';
  }

  return null;
}

const GENERIC_WORDS = new Set([
  'the', 'a', 'an', 'our', 'your', 'their', 'this', 'that', 'we', 'you',
  'they', 'it', 'us', 'thank', 'hi', 'hello', 'dear', 'team', 'hiring',
  'recruiting', 'hr', 'human', 'resources', 'position', 'role', 'opportunity',
  'application', 'interview', 'offer', 'company',
]);

function isGenericWord(word) {
  return GENERIC_WORDS.has(word.toLowerCase().trim());
}

function cleanCompany(str) {
  // Remove trailing punctuation, possessives, and filler words
  return str
    .replace(/[,.']+$/, '')
    .replace(/\s*'s$/, '')
    .replace(/\s+(team|hiring|recruiting|hr)$/i, '')
    .trim();
}

function cleanRole(str) {
  return str
    .replace(/[,.]+$/, '')
    .trim();
}

module.exports = { parseEmail };
