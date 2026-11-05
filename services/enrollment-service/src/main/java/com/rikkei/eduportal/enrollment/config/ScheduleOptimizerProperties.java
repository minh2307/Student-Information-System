package com.rikkei.eduportal.enrollment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Externalized configuration properties for CSP Schedule Optimizer.
 */
@Component
@ConfigurationProperties(prefix = "schedule.optimizer")
public class ScheduleOptimizerProperties {

    /**
     * Maximum number of nodes (partial assignments) the DFS Backtracking algorithm can explore.
     */
    private int maxSearchNodes = 50_000;

    /**
     * Maximum execution time (in milliseconds) before the search is aborted.
     */
    private long maxExecutionTimeMs = 3_000L;

    /**
     * Maximum number of collision-free solutions to collect before terminating early.
     */
    private int maxSolutions = 100;

    public ScheduleOptimizerProperties() {}

    public ScheduleOptimizerProperties(int maxSearchNodes, long maxExecutionTimeMs, int maxSolutions) {
        this.maxSearchNodes = maxSearchNodes;
        this.maxExecutionTimeMs = maxExecutionTimeMs;
        this.maxSolutions = maxSolutions;
    }

    public int getMaxSearchNodes() { return maxSearchNodes; }
    public void setMaxSearchNodes(int maxSearchNodes) { this.maxSearchNodes = maxSearchNodes; }

    public long getMaxExecutionTimeMs() { return maxExecutionTimeMs; }
    public void setMaxExecutionTimeMs(long maxExecutionTimeMs) { this.maxExecutionTimeMs = maxExecutionTimeMs; }

    public int getMaxSolutions() { return maxSolutions; }
    public void setMaxSolutions(int maxSolutions) { this.maxSolutions = maxSolutions; }
}
