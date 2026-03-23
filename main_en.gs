/**
 * --------------------------------------------------------------------------
 * Broad Match Cost Controller — Google Ads Script
 * --------------------------------------------------------------------------
 * Monitors broad match keyword cost share. Alerts when it exceeds a
 * configurable threshold. Optionally pauses expensive broad keywords.
 *
 * Author:  Thibault Fayol — Thibault Fayol Consulting
 * Website: https://thibaultfayol.com
 * License: MIT
 * --------------------------------------------------------------------------
 */

var CONFIG = {
  TEST_MODE: true,
  EMAIL: 'you@example.com',
  MAX_BROAD_COST_PERCENT: 30,
  PAUSE_EXCESS_BROAD: false,
  MAX_BROAD_KEYWORD_COST: 500,
  DATE_RANGE: 'LAST_30_DAYS'
};

function main() {
  try {
    Logger.log('=== Broad Match Cost Controller ===');

    var query =
      'SELECT keyword_view.resource_name, ' +
      'ad_group_criterion.keyword.match_type, ' +
      'ad_group_criterion.keyword.text, ' +
      'metrics.cost_micros, ' +
      'campaign.name, ad_group.name ' +
      'FROM keyword_view ' +
      'WHERE ad_group_criterion.status = "ENABLED" ' +
      'AND campaign.status = "ENABLED" ' +
      'AND segments.date DURING ' + CONFIG.DATE_RANGE;

    var rows = AdsApp.search(query);
    var totalCost = 0, broadCost = 0, exactCost = 0, phraseCost = 0;
    var broadKeywords = [];

    while (rows.hasNext()) {
      var row = rows.next();
      var cost = row.metrics.costMicros / 1e6;
      var matchType = row.adGroupCriterion.keyword.matchType;
      totalCost += cost;
      if (matchType === 'BROAD') {
        broadCost += cost;
        broadKeywords.push({
          keyword: row.adGroupCriterion.keyword.text,
          cost: cost,
          campaign: row.campaign.name,
          adGroup: row.adGroup.name
        });
      } else if (matchType === 'EXACT') { exactCost += cost; }
      else if (matchType === 'PHRASE') { phraseCost += cost; }
    }

    if (totalCost === 0) { Logger.log('No cost data.'); return; }

    var broadPct = (broadCost / totalCost) * 100;
    Logger.log('Total: $' + totalCost.toFixed(2) + ' | Broad: $' + broadCost.toFixed(2) +
      ' (' + broadPct.toFixed(1) + '%) | Exact: $' + exactCost.toFixed(2) +
      ' | Phrase: $' + phraseCost.toFixed(2));

    var paused = [];
    if (broadPct > CONFIG.MAX_BROAD_COST_PERCENT) {
      Logger.log('ALERT: Broad match exceeds ' + CONFIG.MAX_BROAD_COST_PERCENT + '% threshold!');

      if (CONFIG.PAUSE_EXCESS_BROAD) {
        broadKeywords.sort(function(a, b) { return b.cost - a.cost; });
        for (var i = 0; i < broadKeywords.length; i++) {
          if (broadKeywords[i].cost > CONFIG.MAX_BROAD_KEYWORD_COST) {
            Logger.log('Pausing: "' + broadKeywords[i].keyword + '" ($' + broadKeywords[i].cost.toFixed(2) + ')');
            if (!CONFIG.TEST_MODE) {
              var kwIter = AdsApp.keywords()
                .withCondition('KeywordMatchType = BROAD')
                .withCondition('Text = "' + broadKeywords[i].keyword + '"')
                .withCondition('Status = ENABLED').get();
              if (kwIter.hasNext()) kwIter.next().pause();
            }
            paused.push(broadKeywords[i]);
          }
        }
      }

      sendAlert_(broadPct, broadCost, totalCost, broadKeywords, paused);
    }

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    MailApp.sendEmail(CONFIG.EMAIL, 'Broad Match Controller — Error', e.message);
  }
}

function sendAlert_(broadPct, broadCost, totalCost, broadKeywords, paused) {
  var subject = (CONFIG.TEST_MODE ? '[TEST] ' : '') +
    'Broad Match Alert — ' + broadPct.toFixed(1) + '% of spend';

  var body = 'Broad Match Cost Controller Report\n===================================\n\n';
  body += 'Broad match: ' + broadPct.toFixed(1) + '% of total (threshold: ' + CONFIG.MAX_BROAD_COST_PERCENT + '%)\n';
  body += 'Broad cost: $' + broadCost.toFixed(2) + ' | Total: $' + totalCost.toFixed(2) + '\n\n';

  body += '--- Top 10 Broad Keywords by Cost ---\n';
  broadKeywords.sort(function(a, b) { return b.cost - a.cost; });
  for (var i = 0; i < Math.min(10, broadKeywords.length); i++) {
    body += '  $' + broadKeywords[i].cost.toFixed(2) + ' — "' + broadKeywords[i].keyword + '" (' + broadKeywords[i].campaign + ')\n';
  }

  if (paused.length > 0) {
    body += '\n--- Paused Keywords ---\n';
    for (var i = 0; i < paused.length; i++) {
      body += '  "' + paused[i].keyword + '" ($' + paused[i].cost.toFixed(2) + ')\n';
    }
  }

  MailApp.sendEmail(CONFIG.EMAIL, subject, body);
}
