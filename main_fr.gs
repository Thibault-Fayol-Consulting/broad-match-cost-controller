/**
 * --------------------------------------------------------------------------
 * Broad Match Cost Controller — Script Google Ads
 * --------------------------------------------------------------------------
 * Surveille la part de couts des mots-cles en requete large. Alerte quand
 * le seuil est depasse. Peut mettre en pause les mots-cles excessifs.
 *
 * Auteur:  Thibault Fayol — Thibault Fayol Consulting
 * Site:    https://thibaultfayol.com
 * Licence: MIT
 * --------------------------------------------------------------------------
 */

var CONFIG = {
  TEST_MODE: true,
  EMAIL: 'vous@exemple.com',
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

    if (totalCost === 0) { Logger.log('Aucune donnee de cout.'); return; }

    var broadPct = (broadCost / totalCost) * 100;
    Logger.log('Total : ' + totalCost.toFixed(2) + ' $ | Large : ' + broadCost.toFixed(2) +
      ' $ (' + broadPct.toFixed(1) + '%) | Exact : ' + exactCost.toFixed(2) +
      ' $ | Expression : ' + phraseCost.toFixed(2) + ' $');

    var paused = [];
    if (broadPct > CONFIG.MAX_BROAD_COST_PERCENT) {
      Logger.log('ALERTE : Requete large depasse ' + CONFIG.MAX_BROAD_COST_PERCENT + '% !');

      if (CONFIG.PAUSE_EXCESS_BROAD) {
        broadKeywords.sort(function(a, b) { return b.cost - a.cost; });
        for (var i = 0; i < broadKeywords.length; i++) {
          if (broadKeywords[i].cost > CONFIG.MAX_BROAD_KEYWORD_COST) {
            Logger.log('Pause : "' + broadKeywords[i].keyword + '" (' + broadKeywords[i].cost.toFixed(2) + ' $)');
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
    Logger.log('ERREUR : ' + e.message);
    MailApp.sendEmail(CONFIG.EMAIL, 'Broad Match Controller — Erreur', e.message);
  }
}

function sendAlert_(broadPct, broadCost, totalCost, broadKeywords, paused) {
  var subject = (CONFIG.TEST_MODE ? '[TEST] ' : '') +
    'Alerte Requete Large — ' + broadPct.toFixed(1) + '% du budget';

  var body = 'Rapport Broad Match Cost Controller\n====================================\n\n';
  body += 'Requete large : ' + broadPct.toFixed(1) + '% du total (seuil : ' + CONFIG.MAX_BROAD_COST_PERCENT + '%)\n';
  body += 'Cout large : ' + broadCost.toFixed(2) + ' $ | Total : ' + totalCost.toFixed(2) + ' $\n\n';

  body += '--- Top 10 Mots-cles Larges ---\n';
  broadKeywords.sort(function(a, b) { return b.cost - a.cost; });
  for (var i = 0; i < Math.min(10, broadKeywords.length); i++) {
    body += '  ' + broadKeywords[i].cost.toFixed(2) + ' $ — "' + broadKeywords[i].keyword + '" (' + broadKeywords[i].campaign + ')\n';
  }

  if (paused.length > 0) {
    body += '\n--- Mots-cles mis en pause ---\n';
    for (var i = 0; i < paused.length; i++) {
      body += '  "' + paused[i].keyword + '" (' + paused[i].cost.toFixed(2) + ' $)\n';
    }
  }

  MailApp.sendEmail(CONFIG.EMAIL, subject, body);
}
