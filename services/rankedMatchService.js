(function () {
  let rankedChannel = null;
  let subscribedMatchId = null;

  function ensureOnline() {
    if (!window.SupabaseService?.hasSupabaseConfig?.().ok) {
      throw new Error("랭킹전은 Supabase 설정 후 사용할 수 있습니다.");
    }
    return window.SupabaseService.getSupabaseClient();
  }

  async function getActiveMatchForUser(userId) {
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("ranked_matches")
      .select("*")
      .in("status", ["matching", "playing"])
      .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw Object.assign(error, { stage: "ranked_matches active select" });
    return data;
  }

  async function getMatch(matchId) {
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("ranked_matches")
      .select("*")
      .eq("id", matchId)
      .maybeSingle();
    if (error) throw Object.assign(error, { stage: "ranked_matches select by id" });
    return data;
  }

  async function findOrCreateMatch(user, profile, settings = {}) {
    const supabase = ensureOnline();
    if (!user?.id) throw new Error("remote user가 없습니다.");
    if (!profile?.user_id) throw new Error("ranking profile이 없습니다.");

    const active = await getActiveMatchForUser(user.id);
    if (active) return { match: active, created: false, reused: true };

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
      const opponentRating = Number(candidate.player_a_result?.rating || 1000);
      return Math.abs(opponentRating - myRating) <= 300;
    });

    if (match) {
      const nextQuestionSet = Array.isArray(match.question_set) && match.question_set.length
        ? match.question_set
        : (settings.questionSet || []);
      const { data, error } = await supabase
        .from("ranked_matches")
        .update({
          player_b_id: user.id,
          status: "playing",
          question_set: nextQuestionSet,
          started_at: new Date().toISOString()
        })
        .eq("id", match.id)
        .eq("status", "matching")
        .select()
        .single();
      if (error) throw Object.assign(error, { stage: "ranked_matches join update" });
      return { match: data, created: false };
    }

    const payload = {
      player_a_id: user.id,
      status: "matching",
      difficulty: settings.difficulty || "normal",
      question_count: Number(settings.count || 5),
      question_set: settings.questionSet || [],
      player_a_result: { rating: myRating, nickname: user.nickname || "익명" },
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("ranked_matches")
      .insert(payload)
      .select()
      .single();
    if (error) throw Object.assign(error, { stage: "ranked_matches insert" });
    return { match: data, created: true };
  }

  async function submitResult(match, user, result) {
    const supabase = ensureOnline();
    const isPlayerA = match.player_a_id === user.id;
    const column = isPlayerA ? "player_a_result" : "player_b_result";
    const payload = {
      ...result,
      user_id: user.id,
      nickname: user.nickname || result.nickname || "익명",
      rating: Number(result.rating || 1000),
      submitted_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("ranked_matches")
      .update({ [column]: payload })
      .eq("id", match.id)
      .select()
      .single();
    if (error) throw Object.assign(error, { stage: "ranked_matches result update" });
    return data;
  }

  async function finalizeIfReady(matchId) {
    const match = await getMatch(matchId);
    if (!match?.player_a_result?.details || !match?.player_b_result?.details || match.status === "finished") return match;

    const a = match.player_a_result;
    const b = match.player_b_result;
    const comparison = window.RatingUtils.compareMultiplayerResults(a, b);
    const aRating = Number(a.rating || 1000);
    const bRating = Number(b.rating || 1000);
    const aGame = comparison < 0 ? 1 : comparison > 0 ? 0 : 0.5;
    const bGame = comparison > 0 ? 1 : comparison < 0 ? 0 : 0.5;
    const deltaA = window.RatingUtils.calculateRatingDelta(aRating, bRating, aGame);
    const deltaB = window.RatingUtils.calculateRatingDelta(bRating, aRating, bGame);
    const winnerUserId = comparison < 0 ? match.player_a_id : comparison > 0 ? match.player_b_id : null;

    const supabase = ensureOnline();
    const { data: finished, error } = await supabase
      .from("ranked_matches")
      .update({
        status: "finished",
        winner_user_id: winnerUserId,
        rating_delta_a: deltaA,
        rating_delta_b: deltaB,
        finished_at: new Date().toISOString()
      })
      .eq("id", matchId)
      .select()
      .single();
    if (error) throw Object.assign(error, { stage: "ranked_matches finish update" });

    await Promise.all([
      updateRankingProfile(match.player_a_id, a, deltaA, aGame),
      updateRankingProfile(match.player_b_id, b, deltaB, bGame)
    ]);
    await recalculateAllTiers();
    return finished;
  }

  async function updateRankingProfile(userId, result, delta, gameValue) {
    const supabase = ensureOnline();
    const { data: current, error: getError } = await supabase
      .from("ranking_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
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
    const { data, error } = await supabase
      .from("ranking_profiles")
      .select("*")
      .order("rating", { ascending: false });
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

  async function cancelMatch(matchId, userId) {
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("ranked_matches")
      .update({ status: "cancelled" })
      .eq("id", matchId)
      .eq("player_a_id", userId)
      .eq("status", "matching")
      .select();
    if (error) throw Object.assign(error, { stage: "ranked match cancel" });
    return data;
  }

  function subscribeRankedMatch(matchId, callback) {
    const supabase = ensureOnline();
    unsubscribeRankedMatch();
    subscribedMatchId = matchId;
    rankedChannel = supabase
      .channel(`ranked-match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ranked_matches", filter: `id=eq.${matchId}` }, callback)
      .subscribe();
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
    joinRankedMatch: getMatch,
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
