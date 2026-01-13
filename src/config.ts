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
 * ~0.6827 means the interval contains ~68% of probability mass (1 sigma)
 * (16th percentile to 84th percentile)
 *
 * This is the standard convention in physics where "1 to 10" means
 * the true value is within one standard deviation of this range.
 */
export const DEFAULT_CONFIDENCE = 0.6827
