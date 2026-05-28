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