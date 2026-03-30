/**
 * Quiz Configuration Constants
 * Centralizes magic numbers and configuration values used throughout the app
 */

export const QUIZ_CONFIG = {
  /** Default timer duration in seconds for each question */
  DEFAULT_TIMER_SECONDS: 30,
  
  /** Minimum timer duration in seconds */
  MIN_TIMER_SECONDS: 15,
  
  /** Maximum timer duration in seconds */
  MAX_TIMER_SECONDS: 60,
  
  /** Base points awarded for a correct answer */
  BASE_POINTS: 100,
  
  /** Countdown duration before a question appears (in seconds) */
  COUNTDOWN_SECONDS: 3,
  
  /** Maximum number of teams that can participate */
  MAX_TEAMS: 120,
  
  /** Number of top teams to show in leaderboard */
  LEADERBOARD_LIMIT: 10,
} as const;

export const VALIDATION_LIMITS = {
  /** Minimum team name length */
  TEAM_NAME_MIN: 3,
  
  /** Maximum team name length */
  TEAM_NAME_MAX: 25,
  
  /** Maximum member name length */
  MEMBER_NAME_MAX: 50,
  
  /** Maximum question text length */
  QUESTION_MAX: 500,
  
  /** Maximum option text length */
  OPTION_MAX: 200,
  
  /** Minimum number of options per question */
  MIN_OPTIONS: 2,
  
  /** Maximum number of options per question */
  MAX_OPTIONS: 4,
} as const;

export const UI_CONFIG = {
  /** Debounce delay for team name validation (ms) */
  TEAM_NAME_DEBOUNCE_MS: 500,
  
  /** Duration to show welcome message (ms) */
  WELCOME_DURATION_MS: 2000,
  
  /** Duration to show import success message (ms) */
  IMPORT_SUCCESS_DURATION_MS: 3000,
  
  /** Timer refresh interval (ms) */
  TIMER_REFRESH_INTERVAL_MS: 500,
} as const;
