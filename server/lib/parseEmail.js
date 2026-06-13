'use strict';

/**
 * Staged regex-based email parser for job application emails.
 *
 * Accepts either:
 *   parseEmail(string)                         — backward-compat: string treated as body
 *   parseEmail({ subject, body, from })        — preferred: full context object
 *
 * Returns:
 *   {
 *     company: string | null,
 *     company_confidence: 'high' | 'medium' | 'low',
 *     role: string | null,
 *     role_confidence: 'high' | 'medium' | 'low',
 *     stage: string,                   // defaults to 'applied'
 *     stage_confidence: 'high' | 'medium' | 'low',
 *     confidence: 'high' | 'low'       // backward compat: high if company OR role non-null
 *   }
 */
function parseEmail(input) {
  let subject = '';
  let body = '';
  let from = '';

  // Backward compatibility: if input is a plain string treat it as body
  if (typeof input === 'string') {
    body = input;
  } else if (input && typeof input === 'object') {
    subject = (input.subject && typeof input.subject === 'string') ? input.subject : '';
    body = (input.body && typeof input.body === 'string') ? input.body : '';
    from = (input.from && typeof input.from === 'string') ? input.from : '';
  } else {
    return {
      company: null,
      company_confidence: 'low',
      role: null,
      role_confidence: 'low',
      stage: 'applied',
      stage_confidence: 'low',
      confidence: 'low',
    };
  }

  // Normalize whitespace in each field
  subject = subject.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  body = body.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  from = from.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

  // -------------------------------------------------------------------------
  // Stage classification runs first — it benefits from both subject and body
  // -------------------------------------------------------------------------
  const { stage, stage_confidence } = classifyStage(subject, body);

  // -------------------------------------------------------------------------
  // Stage 1 — Subject parsing (highest signal for company + role)
  // -------------------------------------------------------------------------
  let company = null;
  let company_confidence = 'low';
  let role = null;
  let role_confidence = 'low';

  if (subject) {
    const fromSubject = extractFromSubject(subject);
    if (fromSubject.company) {
      company = fromSubject.company;
      company_confidence = 'high';
    }
    if (fromSubject.role) {
      role = fromSubject.role;
      role_confidence = 'high';
    }
  }

  // -------------------------------------------------------------------------
  // Stage 2 — Body parsing (existing patterns)
  // -------------------------------------------------------------------------
  if (body) {
    if (!company) {
      const bodyCompany = extractCompanyFromText(body);
      if (bodyCompany) {
        company = bodyCompany;
        company_confidence = 'medium';
      }
    }
    if (!role) {
      const bodyRole = extractRoleFromText(body);
      if (bodyRole) {
        role = bodyRole;
        role_confidence = 'medium';
      }
    }
  }

  // -------------------------------------------------------------------------
  // Stage 3 — Signature parsing
  // -------------------------------------------------------------------------
  if (!company && body) {
    const sigCompany = extractCompanyFromSignature(body);
    if (sigCompany) {
      company = sigCompany;
      company_confidence = 'medium';
    }
  }

  // -------------------------------------------------------------------------
  // Stage 4 — Domain extraction from `from` field
  // -------------------------------------------------------------------------
  if (!company && from) {
    const domainCompany = extractCompanyFromDomain(from);
    if (domainCompany) {
      company = domainCompany;
      company_confidence = 'medium';
    }
  }

  // -------------------------------------------------------------------------
  // Apply max-length constraints
  // -------------------------------------------------------------------------
  if (company && company.length > 200) {
    company = company.slice(0, 200).trim();
  }
  if (role && role.length > 200) {
    role = role.slice(0, 200).trim();
  }

  // Backward-compat confidence field
  const confidence = (company || role) ? 'high' : 'low';

  return {
    company: company || null,
    company_confidence,
    role: role || null,
    role_confidence,
    stage,
    stage_confidence,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Stage 1: Subject parsing
// ---------------------------------------------------------------------------

function extractFromSubject(subject) {
  const lower = subject.toLowerCase();
  let company = null;
  let role = null;

  // Pattern: "your application for <role> at <company>"
  //          "your application to <role> at <company>"
  let m = subject.match(
    /your\s+application\s+(?:for|to)\s+(.+?)\s+(?:at|with|@)\s+([A-Z][^,\n]{1,60})/i
  );
  if (m) {
    role = cleanRole(m[1]);
    company = cleanCompany(m[2]);
    return { company, role };
  }

  // Pattern: "interview/call/screen for/with/about <role> at/with/@ <company>"
  m = subject.match(
    /(?:interview|call|screen)\s+(?:for|with|about)\s+(.+?)\s+(?:at|with|@)\s+([A-Z][^,\n]{1,60})/i
  );
  if (m) {
    role = cleanRole(m[1]);
    company = cleanCompany(m[2]);
    return { company, role };
  }

  // Pattern: "<role> position/role/opportunity/opening at <company>"
  m = subject.match(
    /(.+?)\s+(?:position|role|opportunity|opening)\s+at\s+([A-Z][^,\n]{1,60})/i
  );
  if (m) {
    role = cleanRole(m[1]);
    company = cleanCompany(m[2]);
    return { company, role };
  }

  // Pattern: "<Company> — <role> position/role/opportunity"
  m = subject.match(
    /([A-Z][A-Za-z0-9\s&.,'()-]{1,60}?)\s+[-–—]\s+(.+?)\s+(?:position|role|opportunity)/i
  );
  if (m) {
    company = cleanCompany(m[1]);
    role = cleanRole(m[2]);
    return { company, role };
  }

  // Simpler fallback patterns — extract one field at a time

  // "Software Engineer at Google" — role must start with a capital and look like a job title
  // Exclude phrases starting with pronouns/articles/verbs (We, I, Hi, Thank, etc.)
  m = subject.match(/^([A-Z][A-Za-z0-9\s&/'()-]{2,80}?)\s+at\s+([A-Z][A-Za-z0-9\s&.,'()-]{1,60})$/);
  if (m) {
    const candidateRole = m[1].trim();
    const candidateCompany = m[2].trim();
    // Reject if the role looks like a sentence fragment (contains words like "invitation", "have", "are")
    const sentenceWords = /\b(?:invitation|have|are|is|was|were|an|we|i|hi|thank|your|our|the)\b/i;
    if (!isGenericWord(candidateRole) && !isGenericWord(candidateCompany) && !sentenceWords.test(candidateRole)) {
      role = cleanRole(candidateRole);
      company = cleanCompany(candidateCompany);
      return { company, role };
    }
  }

  // Extract just company from "... at <Company>" at end of subject when we have no role yet
  m = subject.match(/\bat\s+([A-Z][A-Za-z0-9\s&.,'()-]{1,60})$/);
  if (m) {
    const candidateCompany = m[1].trim();
    if (!isGenericWord(candidateCompany)) {
      company = cleanCompany(candidateCompany);
    }
  }

  return { company, role };
}

// ---------------------------------------------------------------------------
// Stage 2: Body parsing (original patterns, kept intact)
// ---------------------------------------------------------------------------

function extractCompanyFromText(text) {
  const patterns = [
    // "the Acme Corp team"
    /the\s+([A-Z][A-Za-z0-9\s&.,'()-]{1,60}?)\s+team/i,
    // "Acme Corp is excited" / "Acme Corp is pleased"
    /([A-Z][A-Za-z0-9\s&.,'()-]{1,60}?)\s+is\s+(?:excited|pleased|thrilled|happy)/i,
    // "at Acme Corp"
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
      if (/^[A-Z]/.test(candidate) && !isGenericWord(candidate)) {
        return cleanCompany(candidate);
      }
    }
  }

  return null;
}

function extractRoleFromText(text) {
  const patterns = [
    // "for the Product Manager position/role/opportunity"
    // Capture group must not contain " at " or " with " to avoid false positives
    /for\s+the\s+((?:(?!\bat\b|\bwith\b).)+?)\s+(?:position|role|opportunity)\b/i,
    // "role of Product Manager" — "role of <Role>"
    /\brole\s+of\s+([A-Z][A-Za-z0-9\s&/'()-]{1,80}?)(?=[,.]|\s+at\b|\s+with\b|$)/i,
    // "for a/an Product Manager position" — capture must not cross "at"/"with"
    /for\s+an?\s+((?:(?!\bat\b|\bwith\b).)+?)\s+(?:position|role|opportunity)\b/i,
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

// ---------------------------------------------------------------------------
// Stage 3: Signature parsing
// ---------------------------------------------------------------------------

function extractCompanyFromSignature(body) {
  // Look for signature blocks — lines after common closings
  const sigTriggers = /(?:regards|sincerely|best|cheers|thanks|thank you)[,\s]/i;
  const sigIdx = body.search(sigTriggers);

  // Use the portion after a signature trigger, or the last 300 chars as fallback
  const sigBlock = sigIdx !== -1
    ? body.slice(sigIdx)
    : body.slice(Math.max(0, body.length - 300));

  const lines = sigBlock.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // "at <Company>" or "@ <Company>" at end of line
    let m = trimmed.match(/(?:at|@)\s+([A-Z][A-Za-z0-9\s&.,'()-]{1,60})\s*$/);
    if (m) {
      const candidate = m[1].trim();
      if (!isGenericWord(candidate)) {
        return cleanCompany(candidate);
      }
    }

    // Line starting with a dash/em-dash then company name
    m = trimmed.match(/^[-–—]\s*([A-Z][A-Za-z0-9\s&.,'()-]{1,60})\s*$/);
    if (m) {
      const candidate = m[1].trim();
      if (!isGenericWord(candidate)) {
        return cleanCompany(candidate);
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Stage 4: Domain extraction
// ---------------------------------------------------------------------------

const GENERIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'googlemail.com', 'me.com', 'live.com',
]);

const GENERIC_DOMAIN_KEYWORDS = [
  'noreply', 'no-reply', 'notification', 'mailer', 'bounce', 'automated',
];

const STRIP_SUBDOMAINS = [
  'jobs.', 'careers.', 'recruiting.', 'talent.', 'hire.', 'mail.', 'email.',
];

function extractCompanyFromDomain(from) {
  // Extract email address from "Name <email@domain.com>" or bare "email@domain.com"
  let email = from;
  const angleMatch = from.match(/<([^>]+)>/);
  if (angleMatch) {
    email = angleMatch[1];
  }

  const atIdx = email.lastIndexOf('@');
  if (atIdx === -1) return null;

  let domain = email.slice(atIdx + 1).toLowerCase().trim();

  // Skip generic domains
  if (GENERIC_DOMAINS.has(domain)) return null;

  // Skip domains containing generic keywords
  if (GENERIC_DOMAIN_KEYWORDS.some(kw => domain.includes(kw))) return null;

  // Strip known subdomains
  for (const prefix of STRIP_SUBDOMAINS) {
    if (domain.startsWith(prefix)) {
      domain = domain.slice(prefix.length);
      break;
    }
  }

  // Take the domain root (part before first dot)
  const root = domain.split('.')[0];
  if (!root || root.length < 2) return null;

  // Title-case the root
  const candidate = root.charAt(0).toUpperCase() + root.slice(1);

  if (isGenericWord(candidate)) return null;

  return cleanCompany(candidate);
}

// ---------------------------------------------------------------------------
// Stage 5: Stage classification
// ---------------------------------------------------------------------------

function classifyStage(subject, body) {
  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase();
  const combined = lowerSubject + ' ' + lowerBody;

  // Check subject-level signals first for high confidence
  if (
    lowerSubject.includes('offer') &&
    !lowerSubject.includes('interview')
  ) {
    return { stage: 'offer', stage_confidence: 'high' };
  }

  if (
    lowerSubject.includes('unfortunately') ||
    lowerSubject.includes('regret')
  ) {
    return { stage: 'rejected', stage_confidence: 'high' };
  }

  if (
    lowerSubject.includes('interview invitation') ||
    lowerSubject.includes('interview request') ||
    lowerSubject.includes('interview scheduled')
  ) {
    return { stage: 'interview', stage_confidence: 'high' };
  }

  if (lowerSubject.includes('re: your application')) {
    return { stage: 'applied', stage_confidence: 'high' };
  }

  // Body-level signals (medium confidence)

  // Offer
  if (
    combined.includes('offer letter') ||
    combined.includes('pleased to offer') ||
    combined.includes('job offer') ||
    combined.includes('offer of employment') ||
    combined.includes('we would like to offer you')
  ) {
    return { stage: 'offer', stage_confidence: 'medium' };
  }

  // Rejected
  if (
    combined.includes('not moving forward') ||
    combined.includes('decided to move forward with other candidates') ||
    combined.includes('position has been filled') ||
    combined.includes('not a fit') ||
    combined.includes('will not be moving') ||
    (combined.includes('unfortunately') &&
      (combined.includes('application') || combined.includes('position') || combined.includes('role')))
  ) {
    return { stage: 'rejected', stage_confidence: 'medium' };
  }

  // Interview
  if (
    combined.includes('interview invitation') ||
    combined.includes('invite you to interview') ||
    combined.includes('interview scheduled') ||
    combined.includes('technical interview') ||
    combined.includes('on-site interview')
  ) {
    return { stage: 'interview', stage_confidence: 'medium' };
  }

  // Phone screen
  if (
    combined.includes('phone screen') ||
    combined.includes('preliminary interview') ||
    combined.includes('initial interview') ||
    combined.includes('schedule a call') ||
    combined.includes('want to connect') ||
    combined.includes('would like to chat')
  ) {
    return { stage: 'phone_screen', stage_confidence: 'medium' };
  }

  // Applied confirmation
  if (
    combined.includes('thank you for applying') ||
    combined.includes('received your application') ||
    combined.includes('we have received') ||
    combined.includes('successfully applied') ||
    combined.includes('application has been submitted')
  ) {
    return { stage: 'applied', stage_confidence: 'medium' };
  }

  // Default
  return { stage: 'applied', stage_confidence: 'low' };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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

module.exports = parseEmail;
