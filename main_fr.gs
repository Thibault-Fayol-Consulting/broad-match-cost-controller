/**
 * --------------------------------------------------------------------------
 * broad-match-cost-controller - Google Ads Script for SMBs
 * --------------------------------------------------------------------------
 * Author: Thibault Fayol - Consultant SEA PME
 * Website: https://thibaultfayol.com
 * License: MIT
 * --------------------------------------------------------------------------
 */
var CONFIG = { TEST_MODE: true, MAX_BROAD_PERCENT: 30 };
function main() {
    var kwIter = AdsApp.keywords().withCondition("Status = ENABLED").forDateRange("LAST_30_DAYS").get();
    var exactCost = 0, broadCost = 0, totalCost = 0;
    while(kwIter.hasNext()) {
        var kw = kwIter.next();
        var c = kw.getStatsFor("LAST_30_DAYS").getCost();
        totalCost += c;
        if (kw.getMatchType() === "BROAD") broadCost += c;
        else if (kw.getMatchType() === "EXACT") exactCost += c;
    }
    if (totalCost > 0) {
        var broadPct = (broadCost / totalCost) * 100;
        Logger.log("Le Requête Large consomme " + broadPct.toFixed(2) + "% du budget (" + broadCost.toFixed(2) + "€)");
        if (broadPct > CONFIG.MAX_BROAD_PERCENT) {
            Logger.log("⚠️ Vos Broad dépensent trop ! À vérifier d'urgence.");
        }
    }
}
