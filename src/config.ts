/**
 * Global configuration for NeoFermi
 */

/**
 * Default number of Monte Carlo samples
 * 20,000 samples gives ~0.7% sampling error (1/√20000)
 */
export const DEFAULT_SAMPLE_COUNT = 20000

/**
 * Default confidence level for distributions
 * 0.9 means the interval contains 90% of probability mass
 * (5th percentile to 95th percentile)
 */
export const DEFAULT_CONFIDENCE = 0.9
