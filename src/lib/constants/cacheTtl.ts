/**
 * Cache TTL constants in seconds.
 */

/** RxNorm drug name to RxCUI lookup: 7 days */
export const RXNORM_NAME_TTL = 604800; // 7 days

/** RxNorm RxCUI to NDCs lookup: 24 hours */
export const RXNORM_NDCS_TTL = 86400; // 24 hours

/** RxNorm NDC to RxCUI lookup: 7 days */
export const RXNORM_NDC_TTL = 604800; // 7 days

/** FDA package details: 24 hours */
export const FDA_PACKAGE_TTL = 86400; // 24 hours

/** SIG parsing results: 30 days */
export const SIG_PARSE_TTL = 2592000; // 30 days

