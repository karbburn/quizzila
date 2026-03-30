// ── HTML Sanitization ──────────────────────────────────────────────────────────

export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

// ── Field-Specific Sanitizers ─────────────────────────────────────────────────

export function sanitizeTeamName(input: string): string {
  return input
    .trim()
    .slice(0, 25)
    .replace(/[^a-zA-Z0-9 _-]/g, '');
}

export function sanitizeMemberName(input: string): string {
  return input
    .trim()
    .slice(0, 50)
    .replace(/[^a-zA-Z '/-]/g, '');
}

export function sanitizeQuestionText(input: string): string {
  return input.trim().slice(0, 500).replace(/<[^>]*>/g, '');
}

export function sanitizeOptionText(input: string): string {
  return input.trim().slice(0, 200).replace(/<[^>]*>/g, '');
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateTeamName(name: string): string | null {
  const clean = sanitizeTeamName(name);
  if (!clean || clean.length < 3) {
    return 'Team name must be at least 3 characters';
  }
  if (clean.length > 25) {
    return 'Team name must be 25 characters or less';
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(clean)) {
    return 'Only letters, numbers, spaces, - and _ allowed';
  }
  return null;
}

export function validateMemberName(name: string, required = false): string | null {
  const clean = sanitizeMemberName(name);
  if (!clean || !clean.trim()) {
    return required ? 'This field is required' : null;
  }
  if (clean.length > 50) {
    return 'Name must be 50 characters or less';
  }
  if (!/^[a-zA-Z '/-]+$/.test(clean)) {
    return 'Only letters, spaces, hyphens and apostrophes allowed';
  }
  return null;
}

export function validateQuestionText(text: string): string | null {
  const clean = sanitizeQuestionText(text);
  if (!clean || clean.length === 0) {
    return 'Question text is required';
  }
  if (clean.length > 500) {
    return 'Question must be 500 characters or less';
  }
  return null;
}

export function validateOptionText(text: string): string | null {
  const clean = sanitizeOptionText(text);
  if (!clean || clean.length === 0) {
    return 'Option text is required';
  }
  if (clean.length > 200) {
    return 'Option must be 200 characters or less';
  }
  return null;
}

// ── Bulk Sanitization ─────────────────────────────────────────────────────────

export interface SanitizedRegistration {
  team_name: string;
  member1: string;
  member2: string;
  member3: string;
  member4: string;
}

export function sanitizeRegistration(data: {
  teamName: string;
  member1: string;
  member2: string;
  member3: string;
  member4: string;
}): SanitizedRegistration {
  return {
    team_name: sanitizeTeamName(data.teamName),
    member1: sanitizeMemberName(data.member1),
    member2: sanitizeMemberName(data.member2),
    member3: sanitizeMemberName(data.member3),
    member4: sanitizeMemberName(data.member4),
  };
}

export function validateRegistration(data: {
  teamName: string;
  member1: string;
}): { teamName?: string; member1?: string } {
  const errors: { teamName?: string; member1?: string } = {};
  const teamNameError = validateTeamName(data.teamName);
  if (teamNameError) errors.teamName = teamNameError;
  const member1Error = validateMemberName(data.member1, true);
  if (member1Error) errors.member1 = member1Error;
  return errors;
}
