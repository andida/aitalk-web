import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_URL } from '../constants';
import { isTutorPracticeReport } from '../lib/tutor-completion';
import type { TutorPracticeReport } from '../types';

// Not a server action. Never export a browser-callable endpoint accepting grades.
// Caller must supply only a report produced by the authenticated server Tutor turn.
export async function commitTrustedCourseCompletion(
  sessionClient: SupabaseClient,
  input: {
    lessonId: number;
    planId: number;
    report: TutorPracticeReport;
    transcript: string;
  }
): Promise<TutorPracticeReport | null> {
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();
  if (authError || !user) throw new Error('Authentication required');
  const encoder = new TextEncoder();
  if (
    !Number.isSafeInteger(input.lessonId) ||
    input.lessonId < 1 ||
    !Number.isSafeInteger(input.planId) ||
    input.planId < 1 ||
    !isTutorPracticeReport(input.report) ||
    encoder.encode(JSON.stringify(input.report)).byteLength > 65536 ||
    typeof input.transcript !== 'string' ||
    encoder.encode(input.transcript).byteLength > 450000
  ) {
    throw new Error('Invalid trusted course completion input');
  }
  let transcript: unknown;
  try {
    transcript = JSON.parse(input.transcript);
  } catch {
    transcript = null;
  }
  if (!Array.isArray(transcript)) {
    throw new Error('Invalid trusted course completion input');
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey)
    throw new Error('Trusted course completion is not configured');
  const trustedClient = createClient(SUPABASE_URL, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await trustedClient.rpc('complete_course_lesson_v1', {
    p_user_id: user.id,
    p_lesson_id: input.lessonId,
    p_plan_id: input.planId,
    p_report: input.report,
    p_transcript: input.transcript,
  });
  if (error) throw new Error('Atomic course completion failed');
  if (data === null) return null;
  if (!isTutorPracticeReport(data)) {
    throw new Error('Invalid committed course report');
  }
  return data;
}
