(function () {
  const TIER_ICONS = {
    "랭킹없음": "◽",
    Bronze: "🟫",
    Silver: "⚪",
    Gold: "🟨",
    Platinum: "🟦",
    Diamond: "💎",
    Master: "🔮",
    Grandmaster: "👑",
    Challenger: "🔥",
    "브론즈": "🟫",
    "실버": "⚪",
    "골드": "🟨",
    "플래티넘": "🟦",
    "다이아몬드": "💎",
    "마스터": "🔮",
    "그랜드마스터": "👑",
    "챌린저": "🔥"
  };

  function calculateExpectedScore(playerRating, opponentRating) {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  function calculateRatingDelta(playerRating, opponentRating, result, options = {}) {
    const k = options.promotionSeriesActive ? 24 : 32;
    const streakBonus = Math.min(Number(options.winStreak || 0), 4);
    return Math.round((k + streakBonus) * (result - calculateExpectedScore(playerRating, opponentRating)));
  }

  function compareMultiplayerResults(a, b) {
    const correctDiff = Number(b?.correct_count || 0) - Number(a?.correct_count || 0);
    if (correctDiff) return correctDiff;
    const partialDiff = Number(b?.partial_count || 0) - Number(a?.partial_count || 0);
    if (partialDiff) return partialDiff;
    const timeDiff = Number(a?.total_time || 0) - Number(b?.total_time || 0);
    if (timeDiff) return timeDiff;
    const scoreDiff = Number(b?.current_score || b?.score || 0) - Number(a?.current_score || a?.score || 0);
    return scoreDiff || 0;
  }

  function getTierByPercentile(profile) {
    const rankedGames = Number(profile?.ranked_games ?? (Number(profile?.wins || 0) + Number(profile?.losses || 0) + Number(profile?.draws || 0)));
    if (!rankedGames) return "랭킹없음";
    const percentile = Number(profile?.percentile || 100);
    if (percentile <= 0.1) return "챌린저";
    if (percentile <= 1) return "그랜드마스터";
    if (percentile <= 4) return "마스터";
    if (percentile <= 11) return "다이아몬드";
    if (percentile <= 23) return "플래티넘";
    if (percentile <= 40) return "골드";
    if (percentile <= 60) return "실버";
    return "브론즈";
  }

  function decorateProfilesWithPercentTiers(profiles = []) {
    const rows = (Array.isArray(profiles) ? profiles : []).map((profile) => ({
      ...profile,
      ranked_games: Number(profile.ranked_games ?? (Number(profile.wins || 0) + Number(profile.losses || 0) + Number(profile.draws || 0)))
    }));
    const ranked = rows
      .filter((profile) => Number(profile.ranked_games || 0) > 0)
      .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    const unranked = rows.filter((profile) => Number(profile.ranked_games || 0) === 0);
    const total = ranked.length;
    const decoratedRanked = ranked.map((profile, index) => {
      const rankPosition = index + 1;
      const percentile = total ? Number(((rankPosition / total) * 100).toFixed(1)) : 100;
      const decorated = {
        ...profile,
        rank_position: rankPosition,
        percentile,
        total_ranked_players: total
      };
      const tier = getTierByPercentile(decorated);
      return { ...decorated, tier, tier_icon: getTierIcon(tier) };
    });
    const decoratedUnranked = unranked.map((profile) => ({
      ...profile,
      tier: "랭킹없음",
      tier_icon: getTierIcon("랭킹없음"),
      percentile: null,
      rank_position: null,
      total_ranked_players: total
    }));
    return [...decoratedRanked, ...decoratedUnranked];
  }

  function getTierIcon(tier) {
    return TIER_ICONS[tier] || "◽";
  }

  function tierName(profileOrTier) {
    if (typeof profileOrTier === "string") return profileOrTier;
    return profileOrTier?.tier || "랭킹없음";
  }

  function tierLabel(profile) {
    const tier = tierName(profile);
    const percentile = profile?.percentile == null ? "" : ` · 상위 ${Number(profile.percentile).toFixed(1)}%`;
    return `${profile?.tier_icon || getTierIcon(tier)} ${tier}${percentile}`;
  }

  // Legacy helpers are kept so older UI paths do not break.
  function getTierFromRating(rating) {
    const value = Number(rating || 0);
    if (value >= 2900) return { tier: "Grandmaster", division: 1 };
    if (value >= 2600) return { tier: "Master", division: 1 };
    const bands = [
      ["Diamond", 2200],
      ["Platinum", 1800],
      ["Gold", 1400],
      ["Silver", 1000],
      ["Bronze", 0]
    ];
    const [tier, base] = bands.find(([, min]) => value >= min) || ["Bronze", 0];
    const division = Math.max(1, 5 - Math.floor((value - base) / 40));
    return { tier, division };
  }

  function getNextTierInfo(rating) {
    const thresholds = [1000, 1400, 1800, 2200, 2600, 2900];
    const next = thresholds.find((threshold) => rating < threshold);
    return next ? { rating: next, remaining: next - rating } : { rating: null, remaining: 0 };
  }

  function isPromotionSeriesNeeded(profile, newRating) {
    if (profile?.promotion_series_active) return true;
    return [1000, 1400, 1800, 2200, 2600].some((threshold) => profile.rating < threshold && newRating >= threshold);
  }

  window.RatingUtils = {
    calculateExpectedScore,
    calculateRatingDelta,
    compareMultiplayerResults,
    decorateProfilesWithPercentTiers,
    getTierByPercentile,
    getTierIcon,
    tierLabel,
    getTierFromRating,
    getNextTierInfo,
    isPromotionSeriesNeeded
  };
})();
