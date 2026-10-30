package com.skillswap.campus.controller;

import com.skillswap.campus.dao.StatsDAO;
import com.skillswap.campus.dto.StatsResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public aggregate numbers for the landing page. No personal data. */
@RestController
@RequestMapping("/api/stats")
public class StatsController {
    private final StatsDAO statsDAO;

    public StatsController(StatsDAO statsDAO) {
        this.statsDAO = statsDAO;
    }

    @GetMapping
    public StatsResponse getStats() {
        return statsDAO.load();
    }
}
