(function () {
  const LOCAL_REPLAYS_KEY = "literacy.localReplays";

  function getLocalReplays() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_REPLAYS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function setLocalReplays(replays) {
    localStorage.setItem(LOCAL_REPLAYS_KEY, JSON.stringify(replays));
  }

  function buildReplayPayload(summary, options = {}) {
    const userId = window.UserRemoteService?.getAnonymousUserId?.() || crypto.randomUUID();
    return {
      id: options.id || crypto.randomUUID(),
      user_id: userId,
      nickname: summary.nickname || "익명",
      mode: summary.mode || "solo",
      related_match_id: summary.relatedMatchId || null,
      title: options.title || `${summary.nickname || "익명"}의 ${summary.mode || "solo"} 리플레이`,
      difficulty: summary.difficulty || "normal",
      score: Number(summary.score || 0),
      max_score: Number(summary.maxScore || 0),
      grade: summary.grade || "-",
      correct_count: Number(summary.correctCount || 0),
      partial_count: Number(summary.partialCount || 0),
      wrong_count: Number(summary.wrongCount || 0),
      total_questions: Number(summary.totalQuestions || 0),
      total_time: Number(summary.totalTime || 0),
      average_time: Number(summary.averageTime || 0),
      is_public: Boolean(options.isPublic),
      public_title: options.publicTitle || null,
      view_count: 0,
      like_count: 0,
      created_at: new Date().toISOString()
    };
  }

  function buildReplayItems(replayId, details = []) {
    return details.map((item, index) => ({
      id: crypto.randomUUID(),
      replay_id: replayId,
      question_index: index,
      question_snapshot: item.question,
      user_answer: { value: item.userAnswer },
      grading_result: item.grade,
      elapsed_time: Number(item.elapsed || 0),
      is_correct: Boolean(item.grade?.isCorrect),
      is_partial: Boolean(item.grade?.isPartial),
      is_timeout: Boolean(item.timedOut || item.grade?.isTimeout),
      explanation_snapshot: item.question?.explanation || "",
      analysis_snapshot: window.AnalysisService?.buildQuestionAnalysis?.(item) || {},
      created_at: new Date().toISOString()
    }));
  }

  async function saveReplay(summary, details, options = {}) {
    const replay = buildReplayPayload(summary, options);
    const items = buildReplayItems(replay.id, details);

    if (window.SupabaseService?.isConfigured()) {
      try {
        const inserted = await window.SupabaseService.request("replays", {
          method: "POST",
          body: JSON.stringify(replay)
        });
        if (items.length) {
          await window.SupabaseService.request("replay_items", {
            method: "POST",
            body: JSON.stringify(items)
          });
        }
        return { replay: inserted?.[0] || replay, items, remote: true };
      } catch (error) {
        console.error("Remote replay save failed, falling back to localStorage:", error);
      }
    }

    const localReplay = { ...replay, items, remote: false };
    const replays = getLocalReplays().filter((item) => item.id !== replay.id);
    replays.push(localReplay);
    setLocalReplays(replays);
    return { replay: localReplay, items, remote: false };
  }

  async function updateReplayVisibility(replayId, isPublic, publicTitle = "") {
    if (window.SupabaseService?.isConfigured()) {
      return window.SupabaseService.request(`replays?id=eq.${replayId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_public: isPublic, public_title: publicTitle || null })
      });
    }
    const replays = getLocalReplays().map((replay) => replay.id === replayId
      ? { ...replay, is_public: isPublic, public_title: publicTitle || replay.public_title }
      : replay);
    setLocalReplays(replays);
    return replays.find((replay) => replay.id === replayId);
  }

  async function getMyReplays() {
    const userId = window.UserRemoteService?.getAnonymousUserId?.();
    if (window.SupabaseService?.isConfigured() && userId) {
      return window.SupabaseService.request(`replays?user_id=eq.${userId}&order=created_at.desc`);
    }
    return getLocalReplays().filter((replay) => replay.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async function getPublicReplays() {
    if (window.SupabaseService?.isConfigured()) {
      return window.SupabaseService.request("replays?is_public=eq.true&order=created_at.desc");
    }
    return getLocalReplays().filter((replay) => replay.is_public).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async function getReplayById(replayId) {
    const userId = window.UserRemoteService?.getAnonymousUserId?.();
    if (window.SupabaseService?.isConfigured()) {
      const rows = await window.SupabaseService.request(`replays?id=eq.${replayId}&limit=1`);
      const replay = rows?.[0];
      if (!replay) return null;
      if (!replay.is_public && replay.user_id !== userId) return null;
      const items = await window.SupabaseService.request(`replay_items?replay_id=eq.${replayId}&order=question_index.asc`);
      return { ...replay, items };
    }
    const replay = getLocalReplays().find((item) => item.id === replayId);
    if (!replay) return null;
    if (!replay.is_public && replay.user_id !== userId) return null;
    return replay;
  }

  async function deleteReplay(replayId) {
    if (window.SupabaseService?.isConfigured()) {
      await window.SupabaseService.request(`replay_items?replay_id=eq.${replayId}`, { method: "DELETE" });
      return window.SupabaseService.request(`replays?id=eq.${replayId}`, { method: "DELETE" });
    }
    const replays = getLocalReplays().filter((replay) => replay.id !== replayId);
    setLocalReplays(replays);
    return true;
  }

  async function incrementReplayViewCount(replayId) {
    if (!window.SupabaseService?.isConfigured()) return;
    const replay = await getReplayById(replayId);
    if (!replay) return;
    await window.SupabaseService.request(`replays?id=eq.${replayId}`, {
      method: "PATCH",
      body: JSON.stringify({ view_count: Number(replay.view_count || 0) + 1 })
    });
  }

  window.ReplayService = {
    LOCAL_REPLAYS_KEY,
    saveReplay,
    updateReplayVisibility,
    getMyReplays,
    getPublicReplays,
    getReplayById,
    deleteReplay,
    incrementReplayViewCount,
    getLocalReplays
  };
})();
