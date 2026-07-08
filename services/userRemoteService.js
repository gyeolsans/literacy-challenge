(function () {
  const ANON_KEY = "literacy.anonymousUserId";

  function getAnonymousUserId() {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  }

  async function getOrCreateUser(nickname = "익명") {
    const id = getAnonymousUserId();
    if (!window.SupabaseService?.isConfigured()) {
      return { id, nickname, isRemote: false };
    }

    try {
      const supabase = window.SupabaseService.getSupabaseClient();
      const payload = {
        id,
        nickname: nickname || localStorage.getItem("literacy.nickname") || "익명",
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from("users")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      await createRankingProfileIfNeeded(data);
      return { ...data, isRemote: true };
    } catch (error) {
      console.error("getOrCreateRemoteUser failed:", error);
      window.showNotice?.(`온라인 유저 생성 실패: ${window.SupabaseService.getFriendlyErrorMessage(error)}`, "error");
      throw error;
    }
  }

  async function updateNicknameRemote(nickname) {
    const id = getAnonymousUserId();
    if (!window.SupabaseService?.isConfigured()) return null;
    try {
      const supabase = window.SupabaseService.getSupabaseClient();
      const { data, error } = await supabase
        .from("users")
        .update({ nickname, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      const { error: profileError } = await supabase
        .from("ranking_profiles")
        .update({ nickname, updated_at: new Date().toISOString() })
        .eq("user_id", id);
      if (profileError) throw profileError;
      return data;
    } catch (error) {
      console.error("updateNicknameRemote failed:", error);
      throw error;
    }
  }

  async function getRankingProfile() {
    const id = getAnonymousUserId();
    if (!window.SupabaseService?.isConfigured()) return null;
    const supabase = window.SupabaseService.getSupabaseClient();
    const { data, error } = await supabase
      .from("ranking_profiles")
      .select("*")
      .eq("user_id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function createRankingProfileIfNeeded(user) {
    if (!window.SupabaseService?.isConfigured()) return null;
    try {
      const supabase = window.SupabaseService.getSupabaseClient();
      const existing = await getRankingProfile();
      if (existing) return existing;
      const payload = {
        user_id: user.id,
        nickname: user.nickname || "익명",
        rating: 1000,
        tier: "랭킹없음",
        tier_icon: "◽",
        division: 5,
        ranked_games: 0,
        percentile: null,
        rank_position: null,
        total_ranked_players: 0,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from("ranking_profiles")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("createRankingProfileIfNeeded failed:", error);
      window.showNotice?.(`랭킹 프로필 생성 실패: ${window.SupabaseService.getFriendlyErrorMessage(error)}`, "error");
      throw error;
    }
  }

  window.UserRemoteService = {
    getAnonymousUserId,
    getOrCreateUser,
    getOrCreateRemoteUser: getOrCreateUser,
    updateRemoteNickname: updateNicknameRemote,
    updateNicknameRemote,
    getRankingProfile,
    createRankingProfileIfNeeded
  };
})();
