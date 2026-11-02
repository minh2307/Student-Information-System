package com.rikkei.eduportal.enrollment.dto;

/**
 * Standardized status codes for CSP Schedule Optimization results.
 */
public enum OptimizationStatus {
    /**
     * Successfully found one or more valid, collision-free schedule options.
     */
    SUCCESS,

    /**
     * Search space was exhausted completely, and no valid schedule option exists.
     */
    NO_SOLUTION,

    /**
     * The search reached its maximum allowed execution time before finding a solution.
     * Note: This does NOT mean no solution exists; it means the search was interrupted.
     */
    TIME_LIMIT_EXCEEDED,

    /**
     * The search visited the maximum allowed number of search nodes before finding a solution.
     */
    SEARCH_LIMIT_REACHED,

    /**
     * The request was invalid (e.g., empty course list, credit limit exceeded BR-01).
     */
    INVALID_REQUEST
}
