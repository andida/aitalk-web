import type { AitalkProfile } from '../types';
import { normalizeLearningLevel } from './course-plan';

type AuthIdentity = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type AitalkSidebarUser = {
  avatarUrl: string;
  email: string;
  initials: string;
  learningSummary: string;
  name: string;
};

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function firstInitial(value: string) {
  return Array.from(value.trim())[0]?.toUpperCase() || 'A';
}

export function resolveAitalkSidebarUser(
  profile: AitalkProfile | null,
  authUser: AuthIdentity | null
): AitalkSidebarUser {
  const email = String(authUser?.email || '').trim();
  const metadata = authUser?.user_metadata;
  const name =
    String(profile?.nick_name || '').trim() ||
    metadataString(metadata, ['full_name', 'name', 'preferred_username']) ||
    email.split('@')[0] ||
    'AITalk learner';
  const avatarUrl =
    String(profile?.avatar || '').trim() ||
    metadataString(metadata, ['avatar_url', 'picture', 'image']);
  const details = [
    profile?.level_language
      ? `Level ${normalizeLearningLevel(profile.level_language)}`
      : '',
    profile?.learn_language
      ? `Learning ${String(profile.learn_language).trim()}`
      : '',
  ].filter(Boolean);

  return {
    avatarUrl,
    email,
    initials: firstInitial(name),
    learningSummary: details.join(' | ') || 'Your learning profile',
    name,
  };
}
