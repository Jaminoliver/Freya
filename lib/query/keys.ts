export const staleTimes = {
  feed:          2 * 60 * 1000,  // 2 min
  subscriptions: 4 * 60 * 1000,  // 4 min
  wallet:        4 * 60 * 1000,  // 4 min
  profile:       4 * 60 * 1000,  // 4 min
  notifications: 2 * 60 * 1000,  // 2 min
  explore:       6 * 60 * 1000,  // 6 min
  saved:         4 * 60 * 1000,  // 4 min
} as const;

export const queryKeys = {
  feed:          ()                 => ["feed"]                  as const,
  profile:       (username: string) => ["profile", username]    as const,
  subscriptions: ()                 => ["subscriptions"]        as const,
  notifications: (tab: string)      => ["notifications", tab]   as const,
  explore:       (filter: string)   => ["explore", filter]      as const,
  wallet:        ()                 => ["wallet"]               as const,
  saved:         (tab: string)      => ["saved", tab]           as const,
  viewer:        ()                 => ["viewer"]               as const,
};