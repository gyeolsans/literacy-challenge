(function () {
  let rankedChannel = null;
  let subscribedMatchId = null;

  function log(scope, message, data) {
    window.debugLog?.(scope, message, data);
  }

  function fail(scope, message, error) {
    window.LAST_RANKED_ERROR = error;
    window.debugError?.(scope, message, error);
  }

  function ensureOnline() {
    if (!window.SupabaseService?.hasSupabaseConfig?.().ok) {
      throw new Error("Supabase config is required for ranked matches.");
    }
    return window.SupabaseService.getSupabaseClient();
  }

  function player1Id(match) {
    return match?.player_a_id || match?.player1_user_id;
  }

  function player2Id(match) {
    return match?.player_b_id || match?.player2_user_id;
  }

  function result1(match) {
    return match?.player_a_result || match?.player1_result;
  }

  function result2(match) {
    return match?.player_b_result || match?.player2_result;
  }

  async function getMatch(matchId) {
    const supabase = ensureOnline();
    const { data, error } = await supabase.from("ranked_matches").select("*").eq("id", matchId).maybeSingle();
    if (error) throw Object.assign(error, { stage: "ranked_matches select by id" });
    return data;
  }

  async function getActiveMatchForUser(userId) {
    log("ranked.getActiveMatchForUser", "called", { userId });
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("ranked_matches")
      .select("*")
      .in("status", ["matching", "playing"])
      .or(`player_a_id.eq.${userId},player_b_id.eq.${userId},player1_user_id.eq.${userId},player2_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw Object.assign(error, { stage: "ranked_matches active select" });
    return data;
  }

  async function ensureQuestionSet(settings = {}) {
    if (Array.isArray(settings.questionSet) && settings.questionSet.length) return settings.questionSet;
    if (!window.buildQuestionSet) throw new Error("buildQuestionSet is not available.");
    const built = await window.buildQuestionSet({
      difficulty: settings.difficulty || "normal",
      count: Number(settings.count || 5),
      includeShortAnswer: settings.includeShortAnswer !== false,
      selectedTypes: settings.selectedTypes || [],
      questionSource: settings.questionSource || "ai"
    }, { sourcePreference: settings.questionSource || "ai" });
    if (!built.questions?.length) throw new Error("Failed to build ranked question_set.");
    return built.questions;
  }

  async function joinRankedMatch(matchId, user, profile, settings = {}) {
    log("ranked.joinRankedMatch", "called", { matchId, user, profile, settings });
    try {
      const supabase = ensureOnline();
      const match = await getMatch(matchId);
      if (!match) throw new Error("Ranked match was not found.");
      if (match.status !== "matching") throw new Error(`Cannot join match with status ${match.status}.`);
      if (player1Id(match) === user.id) return match;
      if (player2Id(match)) throw new Error("Ranked match already has player2.");
      const questionSet = Array.isArray(match.question_set) && match.question_set.length
        ? match.question_set
        : await ensureQuestionSet(settings);
      const now = new Date().toISOString();
      const seedResult = { rating: Number(profile?.rating || 1000), nickname: user.nickname || "anonymous" };
      const { data, error } = await supabase
        .from("ranked_matches")
        .update({
          player_b_id: user.id,
          player2_user_id: user.id,
          player2_nickname: user.nickname || "anonymous",
          player_b_result: seedResult,
          player2_result: seedResult,
          question_set: questionSet,
          question_count: Number(match.question_count || questionSet.length || settings.count || 5),
          status: "playing",
          started_at: now,
          updated_at: now
        })
        .eq("id", match.id)
        .eq("status", "matching")
        .select()
        .single();
      if (error) throw Object.assign(error, { stage: "ranked_matches join update" });
      log("ranked.joinRankedMatch", "joined", data);
      return data;
    } catch (error) {
      fail("ranked.joinRankedMatch", "failed", error);
      throw error;
    }
  }

  async function findOrCreateMatch(user, profile, settings = {}) {
    log("ranked.startRankedQueue", "called", { user, profile, settings });
    try {
      const supabase = ensureOnline();
      if (!user?.id) throw new Error("user.id is required.");
      if (!profile?.user_id) throw new Error("ranking profile is required.");

      const active = await getActiveMatchForUser(user.id);
      if (active) {
        log("ranked.startRankedQueue", "active match reused", active);
        return { match: active, created: false, reused: true };
      }

      const { data: candidates, error: queueError } = await supabase
        .from("ranked_matches")
        .select("*")
        .eq("status", "matching")
        .neq("player_a_id", user.id)
        .order("created_at", { ascending: true })
        .limit(20);
      if (queueError) throw Object.assign(queueError, { stage: "ranked_matches matching select" });

      const myRating = Number(profile.rating || 1000);
      const match = (candidates || []).find((candidate) => {
        if (player2Id(candidate)) return false;
        const opponentRating = Number(result1(candidate)?.rating || 1000);
        return Math.abs(opponentRating - myRating) <= 300;
      });
      if (match) {
        const joined = await joinRankedMatch(match.id, user, profile, settings);
        return { match: joined, created: false };
      }

      const questionSet = await ensureQuestionSet(settings);
      const now = new Date().toISOString();
      const seedResult = { rating: myRating, nickname: user.nickname || "anonymous" };
      const payload = {
        player_a_id: user.id,
        player1_user_id: user.id,
        player1_nickname: user.nickname || "anonymous",
        status: "matching",
        difficulty: settings.difficulty || "normal",
        question_count: Number(settings.count || questionSet.length || 5),
        question_set: questionSet,
        player_a_result: seedResult,
        player1_result: seedResult,
        created_at: now,
        updated_at: now
      };
      const { data, error } = await supabase.from("ranked_matches").insert(payload).select().single();
      if (error) throw Object.assign(error, { stage: "ranked_matches insert" });
      log("ranked.startRankedQueue", "created", data);
      return { match: data, created: true };
    } catch (error) {
      fail("ranked.startRankedQueue", "failed", error);
      throw error;
    }
  }

  async function submitResult(matchOrId, user, result) {
    const match = typeof matchOrId === "string" ? await getMatch(matchOrId) : matchOrId;
    log("ranked.finishRankedPlayer", "called", { matchId: match?.id, user, result });
    try {
      if (!match?.id) throw new Error("match.id is required.");
      const isPlayer1 = player1Id(match) === user.id;
      const isPlayer2 = player2Id(match) === user.id;
      if (!isPlayer1 && !isPlayer2) throw new Error("Current user is not a player in this ranked match.");
      const payload = {
        ...result,
        user_id: user.id,
        nickname: user.nickname || result.nickname || "anonymous",
        rating: Number(result.rating || (isPlayer1 ? result1(match)?.rating : result2(match)?.rating) || 1000),
        submitted_at: new Date().toISOString()
      };
      const updatePayload = isPlayer1
        ? { player_a_result: payload, player1_result: payload, updated_at: new Date().toISOString() }
        : { player_b_result: payload, player2_result: payload, updated_at: new Date().toISOString() };
      const supabase = ensureOnline();
      const { data, error } = await supabase.from("ranked_matches").update(updatePayload).eq("id", match.id).select().single();
      if (error) throw Object.assign(error, { stage: "ranked_matches result update" });
      log("ranked.finishRankedPlayer", "updated", data);
      return data;
    } catch (error) {
      fail("ranked.finishRankedPlayer", "failed", error);
      throw error;
    }
  }

  async function updateRankingProfile(userId, result, delta, gameValue) {
    const supabase = ensureOnline();
    const { data: current, error: getError } = await supabase.from("ranking_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (getError) throw Object.assign(getError, { stage: "ranking profile select for update" });
    if (!current) return null;
    const wins = Number(current.wins || 0) + (gameValue === 1 ? 1 : 0);
    const losses = Number(current.losses || 0) + (gameValue === 0 ? 1 : 0);
    const draws = Number(current.draws || 0) + (gameValue === 0.5 ? 1 : 0);
    const rating = Math.max(0, Number(current.rating || result.rating || 1000) + Number(delta || 0));
    const { data, error } = await supabase
      .from("ranking_profiles")
      .update({
        nickname: result.nickname || current.nickname,
        rating,
        wins,
        losses,
        draws,
        ranked_games: wins + losses + draws,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw Object.assign(error, { stage: "ranking profile update" });
    return data;
  }

  async function getRankingProfiles() {
    const supabase = ensureOnline();
    const { data, error } = await supabase.from("ranking_profiles").select("*").order("rating", { ascending: false });
    if (error) throw Object.assign(error, { stage: "ranking profiles select" });
    return data || [];
  }

  async function recalculateAllTiers() {
    const supabase = ensureOnline();
    const decorated = window.RatingUtils.decorateProfilesWithPercentTiers(await getRankingProfiles());
    await Promise.all(decorated.map((profile) => supabase
      .from("ranking_profiles")
      .update({
        ranked_games: Number(profile.ranked_games || 0),
        tier: profile.tier,
        tier_icon: profile.tier_icon || window.RatingUtils.getTierIcon(profile.tier),
        percentile: profile.percentile,
        rank_position: profile.rank_position,
        total_ranked_players: profile.total_ranked_players,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", profile.user_id)));
    return decorated;
  }

  async function finalizeIfReady(matchId) {
    log("ranked.finalizeRankedMatchIfBothFinished", "called", { matchId });
    try {
      const match = await getMatch(matchId);
      const a = result1(match);
      const b = result2(match);
      if (!a?.details || !b?.details || match.status === "finished") return match;

      const comparison = window.RatingUtils.compareMultiplayerResults(a, b);
      const aRating = Number(a.rating || 1000);
      const bRating = Number(b.rating || 1000);
      const aGame = comparison < 0 ? 1 : comparison > 0 ? 0 : 0.5;
      const bGame = comparison > 0 ? 1 : comparison < 0 ? 0 : 0.5;
      const deltaA = window.RatingUtils.calculateRatingDelta(aRating, bRating, aGame);
      const deltaB = window.RatingUtils.calculateRatingDelta(bRating, aRating, bGame);
      const winnerUserId = comparison < 0 ? player1Id(match) : comparison > 0 ? player2Id(match) : null;
      const now = new Date().toISOString();
      const supabase = ensureOnline();
      const { data: finished, error } = await supabase
        .from("ranked_matches")
        .update({
          status: "finished",
          winner_user_id: winnerUserId,
          rating_delta_a: deltaA,
          rating_delta_b: deltaB,
          rating_delta_player1: deltaA,
          rating_delta_player2: deltaB,
          finished_at: now,
          updated_at: now
        })
        .eq("id", matchId)
        .select()
        .single();
      if (error) throw Object.assign(error, { stage: "ranked_matches finish update" });
      await Promise.all([
        updateRankingProfile(player1Id(match), a, deltaA, aGame),
        updateRankingProfile(player2Id(match), b, deltaB, bGame)
      ]);
      await recalculateAllTiers();
      log("ranked.finalizeRankedMatchIfBothFinished", "finished", finished);
      return finished;
    } catch (error) {
      fail("ranked.finalizeRankedMatchIfBothFinished", "failed", error);
      throw error;
    }
  }

  async function cancelMatch(matchId, userId) {
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("ranked_matches")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", matchId)
      .eq("player_a_id", userId)
      .eq("status", "matching")
      .select();
    if (error) throw Object.assign(error, { stage: "ranked match cancel" });
    return data;
  }

  function subscribeRankedMatch(matchId, callback) {
    log("ranked.subscribeRankedMatch", "called", { matchId });
    const supabase = ensureOnline();
    unsubscribeRankedMatch();
    subscribedMatchId = matchId;
    rankedChannel = supabase
      .channel(`ranked-match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ranked_matches", filter: `id=eq.${matchId}` }, async (payload) => {
        log("ranked.realtime.match", "event", payload);
        const latest = await getMatch(matchId);
        callback?.(latest, payload);
      })
      .subscribe((status, error) => {
        log("ranked.subscribeRankedMatch", "subscription status", { matchId, status, error });
        if (error) fail("ranked.subscribeRankedMatch", "subscription error", error);
      });
    return rankedChannel;
  }

  function unsubscribeRankedMatch() {
    if (rankedChannel?.unsubscribe) rankedChannel.unsubscribe();
    rankedChannel = null;
    subscribedMatchId = null;
  }

  window.RankedMatchService = {
    startRankedQueue: findOrCreateMatch,
    findOrCreateRankedMatch: findOrCreateMatch,
    findOrCreateMatch,
    getActiveMatchForUser,
    joinRankedMatch,
    getMatch,
    submitRankedAnswer: submitResult,
    finishRankedPlayer: submitResult,
    submitResult,
    finalizeRankedMatchIfBothFinished: finalizeIfReady,
    finalizeIfReady,
    updateRankingProfileAfterMatch: updateRankingProfile,
    getRankedLeaderboard: getRankingProfiles,
    getRankingProfiles,
    recalculateAllTiers,
    cancelMatch,
    subscribeRankedMatch,
    unsubscribeRankedMatch
  };
})();
