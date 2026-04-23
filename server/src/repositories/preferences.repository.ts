// All database queries related to user preferences live here

import prisma from '../config/db';

type PreferencesData = {
  dietary_restrictions?: string[];
  allergies?: string[];
  cuisine_preferences?: string[];
  disliked_ingredients?: string[];
  servings_per_meal?: number;
  budget_per_week?: number;
};

// Creates preferences if none exist, updates them if they do
export const upsertPreferences = (userId: string, data: PreferencesData) => {
  return prisma.userPreferences.upsert({
    where: { user_id: userId },
    update: data,
    create: { user_id: userId, ...data },
  });
};

// Fetches preferences for the currently logged-in user
export const findPreferencesByUserId = (userId: string) => {
  return prisma.userPreferences.findUnique({
    where: { user_id: userId },
  });
};
