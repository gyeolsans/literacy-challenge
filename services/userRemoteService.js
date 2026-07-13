(function () {
  const GUEST_ID_KEY = "guestUserId";
  const GUEST_NICKNAME_KEY = "guestNickname";
  const LEGACY_ANON_KEY = "literacy.anonymousUserId";
  const LEGACY_NICKNAME_KEY = "literacy.nickname";
  const TEST_PROVIDER = "test_guest";
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function log(message, data) {
    window.debugLog?.("AUTH", message, data);
  }

  function supabase() {
    if (!window.SupabaseService?.isConfigured?.()) return null;
    return window.SupabaseService.getSupabaseClient();
  }

  function readJsonStorage(key, fallback = "") {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  function writeNickname(nickname) {
    localStorage.setItem(GUEST_NICKNAME_KEY, nickname);
    localStorage.setItem(LEGACY_NICKNAME_KEY, JSON.stringify(nickname));
  }

  function normalizeNickname(nickname) {
    return String(nickname || "").trim().toLowerCase();
  }

  function validateNickname(nickname) {
    const trimmed = String(nickname || "").trim();
    if (trimmed.length < 2) return "닉네임은 2자 이상이어야 합니다.";
    if (trimmed.length > 12) return "닉네임은 12자 이하로 입력해 주세요.";
    if (/\s/.test(trimmed)) return "닉네임에는 공백을 사용할 수 없습니다.";
    if (!/^[가-힣A-Za-z0-9_]+$/u.test(trimmed)) return "닉네임은 한글, 영문, 숫자, 언더바만 사용할 수 있습니다.";
    return "";
  }

  function getOrCreateTestGuestId() {
    let id = localStorage.getItem(GUEST_ID_KEY) || localStorage.getItem(LEGACY_ANON_KEY);
    if (!id || String(id).startsWith("guest_") || !UUID_REGEX.test(String(id))) {
      id = crypto.randomUUID();
    }
    localStorage.setItem(GUEST_ID_KEY, id);
    localStorage.setItem(LEGACY_ANON_KEY, id);
    return id;
  }

  function normalizeGuestUserId() {
    const current = localStorage.getItem(GUEST_ID_KEY);
    const legacy = localStorage.getItem(LEGACY_ANON_KEY);
    if (current && (current.startsWith("guest_") || !UUID_REGEX.test(current))) {
      localStorage.removeItem(GUEST_ID_KEY);
    }
    if (legacy && (legacy.startsWith("guest_") || !UUID_REGEX.test(legacy))) {
      localStorage.removeItem(LEGACY_ANON_KEY);
    }
    return getOrCreateTestGuestId();
  }

  function getOrCreateGuestNickname() {
    let nickname = localStorage.getItem(GUEST_NICKNAME_KEY) || readJsonStorage(LEGACY_NICKNAME_KEY, "");
    if (!nickname) {
      nickname = "Guest" + Math.floor(100000 + Math.random() * 900000);
    }
    writeNickname(String(nickname));
    return String(nickname);
  }

  async function getCurrentTestUser() {
    const user_id = normalizeGuestUserId();
    const nickname = getOrCreateGuestNickname();
    return {
      id: user_id,
      user_id,
      nickname,
      nickname_normalized: normalizeNickname(nickname),
      is_guest: true,
      isAuthenticated: true,
      isRemote: false,
      provider: TEST_PROVIDER
    };
  }

  function normalizeRemoteUser(row, fallbackUser) {
    const user_id = row?.user_id || row?.id || fallbackUser.user_id;
    return {
      ...fallbackUser,
      ...row,
      id: user_id,
      user_id,
      nickname: row?.nickname || fallbackUser.nickname,
      is_guest: row?.is_guest !== false,
      isAuthenticated: true,
      isRemote: Boolean(row)
    };
  }

  async function ensureTestUserProfile() {
    const user = await getCurrentTestUser();
    const client = supabase();
    if (!client) return user;

    const payload = {
      user_id: user.user_id,
      nickname: user.nickname,
      nickname_normalized: normalizeNickname(user.nickname),
      provider: TEST_PROVIDER,
      is_guest: true,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await client
        .from("users")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      log("test guest profile upserted", data);
      return normalizeRemoteUser(data, user);
    } catch (error) {
      console.error("[guest.ensureTestUserProfile] users upsert failed", error);
      throw error;
    }
  }

  async function checkGuestNicknameAvailable(nickname) {
    const error = validateNickname(nickname);
    if (error) return { ok: false, error };
    const client = supabase();
    if (!client) return { ok: true };

    const normalized = normalizeNickname(nickname);
    const currentUser = await getCurrentTestUser();
    const { data, error: selectError } = await client
      .from("users")
      .select("user_id,nickname")
      .eq("nickname_normalized", normalized)
      .maybeSingle();
    if (selectError) throw selectError;
    if (data && data.user_id !== currentUser.user_id) {
      return { ok: false, error: "이미 사용 중인 닉네임입니다." };
    }
    return { ok: true };
  }

  async function updateGuestNickname(nickname) {
    const trimmed = String(nickname || "").trim();
    const error = validateNickname(trimmed);
    if (error) throw new Error(error);

    const available = await checkGuestNicknameAvailable(trimmed);
    if (!available.ok) throw new Error(available.error);

    writeNickname(trimmed);
    const user = await getCurrentTestUser();
    const client = supabase();
    if (!client) return user;

    const now = new Date().toISOString();
    const payload = {
      user_id: user.user_id,
      nickname: trimmed,
      nickname_normalized: normalizeNickname(trimmed),
      provider: TEST_PROVIDER,
      is_guest: true,
      updated_at: now
    };

    const { data, error: userError } = await client
      .from("users")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (userError) throw userError;

    await client
      .from("ranking_profiles")
      .update({ nickname: trimmed, updated_at: now })
      .eq("user_id", user.user_id)
      .then(({ error: profileError }) => {
        if (profileError && !String(profileError.message || "").includes("does not exist")) throw profileError;
      });

    return normalizeRemoteUser(data, user);
  }

  async function getRankingProfile(userId = null) {
    const client = supabase();
    const user = await getCurrentTestUser();
    const id = userId || user.user_id;
    if (!client || !id) return null;
    const { data, error } = await client.from("ranking_profiles").select("*").eq("user_id", id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function createRankingProfileIfNeeded(user = null) {
    const client = supabase();
    const currentUser = user || await ensureTestUserProfile();
    if (!client) return {
      user_id: currentUser.user_id,
      nickname: currentUser.nickname,
      rating: 1000,
      tier: "랭킹없음",
      tier_icon: "",
      ranked_games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      is_guest: true
    };

    const existing = await getRankingProfile(currentUser.user_id);
    if (existing) return existing;

    const payload = {
      user_id: currentUser.user_id,
      nickname: currentUser.nickname,
      rating: 1000,
      tier: "랭킹없음",
      tier_icon: "",
      division: 5,
      ranked_games: 0,
      percentile: null,
      rank_position: null,
      total_ranked_players: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      win_streak: 0,
      lose_streak: 0,
      promotion_series_active: false,
      promotion_wins: 0,
      promotion_losses: 0,
      is_guest: true,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await client
      .from("ranking_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function requireAuthUser() {
    return ensureTestUserProfile();
  }

  async function getOrCreateUser() {
    return ensureTestUserProfile();
  }

  function getCurrentAuthUser() {
    return null;
  }

  function isLoggedIn() {
    return true;
  }

  async function initAuth() {
    normalizeGuestUserId();
    const user = await ensureTestUserProfile().catch((error) => {
      console.warn("test guest bootstrap skipped:", error);
      return getCurrentTestUser();
    });
    renderAuthStatus();
    return user;
  }

  async function refreshSession() {
    normalizeGuestUserId();
    return getCurrentTestUser();
  }

  async function signInWithGoogle() {
    throw new Error("Google login is disabled in test guest mode.");
  }

  async function signInWithNaver() {
    throw new Error("Naver login is disabled in test guest mode.");
  }

  async function signOut() {
    localStorage.removeItem("currentRoomId");
    localStorage.removeItem("currentRoomUserId");
    localStorage.removeItem("currentRoomMode");
    localStorage.removeItem("currentRankedMatchId");
    renderAuthStatus();
  }

  function renderAuthStatus() {
    const target = document.querySelector("[data-auth-status]");
    if (!target) return;
    const nickname = getOrCreateGuestNickname();
    const guestId = normalizeGuestUserId();
    target.innerHTML = `
      <strong>테스트 모드</strong>
      <p class="muted">현재 닉네임: ${nickname}</p>
      <p class="muted">브라우저/기기별 UUID로 기록합니다. ${guestId}</p>
    `;
  }

  normalizeGuestUserId();

  window.UserRemoteService = {
    getOrCreateTestGuestId,
    normalizeGuestUserId,
    getOrCreateGuestNickname,
    getCurrentTestUser,
    ensureTestUserProfile,
    updateGuestNickname,
    checkGuestNicknameAvailable,
    validateNickname,
    getAnonymousUserId: getOrCreateTestGuestId,
    getCurrentAuthUser,
    isLoggedIn,
    initAuth,
    refreshSession,
    requireAuthUser,
    getOrCreateUser,
    getOrCreateRemoteUser: getOrCreateUser,
    ensureAuthUserProfile: ensureTestUserProfile,
    ensureAnonymousUserProfile: ensureTestUserProfile,
    updateRemoteNickname: updateGuestNickname,
    updateNicknameRemote: updateGuestNickname,
    getRankingProfile,
    createRankingProfileIfNeeded,
    signInWithGoogle,
    signInWithNaver,
    signOut,
    renderAuthStatus
  };
})();
