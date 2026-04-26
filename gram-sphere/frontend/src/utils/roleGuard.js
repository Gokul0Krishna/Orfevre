const ACCESS_MAP = {
  youth: [
    "jobconnect", "youth_profile", "my_gigs", "work_posts",
    "notifications", "skill_tokens", "skill_demand"
  ],
  merchant: [
    "merchant_home", "recruitment_chat", "post_gig", "applications",
    "hired_people", "inventory", "bazaarpulse", "notifications"
  ],
  official: [
    "gramlens", "district_summary", "notifications"
  ]
};

export const canAccess = (role, feature) => {
  if (!role) return false;
  return ACCESS_MAP[role]?.includes(feature) ?? false;
};
