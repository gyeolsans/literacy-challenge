(function () {
  const ANON_KEY = "literacy.anonymousUserId";
  let authInitialized = false;
  let authInitPromise = null;

  function log(message, data) {
    window.debugLog?.("AUTH", message, data);
  }

  function fail(message, error) {
    window.debugError?.("AUTH", message, error);
  }

  function getAnonymousUserId() {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  }

  function supabase() {
    if (!window.SupabaseService?.isConfigured?.()) return null;
    return window.SupabaseService.getSupabaseClient();
  }

  function getLocalNickname(fallback = "anonymous") {
    return localStorage.getItem("literacy.nickname")
      ? JSON.parse(localStorage.getItem("literacy.nickname"))
      : fallback;
  }

  function authMetadata(user) {
    return user?.user_metadata || {};
  }

  function profilePayloadFromAuthUser(user, nickname = null) {
    const meta = authMetadata(user);
    const resolvedNickname = nickname || getLocalNickname(meta.name || meta.full_name || "user");
    return {
      id: user.id,
      user_id: user.id,
      nickname: resolvedNickname,
      email: user.email || null,
      avatar_url: meta.avatar_url || meta.picture || null,
      provider: user.app_metadata?.provider || null,
      updated_at: new Date().toISOString()
    };
  }

  function getCurrentAuthUser() {
    return window.currentAuthUser || window.currentSession?.user || null;
  }

  function isLoggedIn() {
    return Boolean(getCurrentAuthUser());
  }

  async function refreshSession() {
    const client = supabase();
    if (!client?.auth) return null;
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    window.currentSession = sessionData?.session || null;
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError && sessionData?.session) throw userError;
    window.currentAuthUser = userData?.user || sessionData?.session?.user || null;
    return window.currentAuthUser;
  }

  async function ensureAuthUserProfile(nickname = null) {
    const client = supabase();
    const authUser = getCurrentAuthUser() || await refreshSession();
    if (!client || !authUser) return null;
    const payload = profilePayloadFromAuthUser(authUser, nickname);
    try {
      const { data, error } = await client.from("users").upsert(payload, { onConflict: "id" }).select().single();
      if (error) throw error;
      log("profile upserted", data);
      return { ...data, id: authUser.id, isRemote: true, isAuthenticated: true };
    } catch (error) {
      if (String(error?.message || "").includes("user_id") || String(error?.message || "").includes("schema cache")) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.user_id;
        const { data, error: fallbackError } = await client.from("users").upsert(fallbackPayload, { onConflict: "id" }).select().single();
        if (fallbackError) throw fallbackError;
        return { ...data, id: authUser.id, isRemote: true, isAuthenticated: true };
      }
      throw error;
    }
  }

  async function getOrCreateUser(nickname = "anonymous") {
    const authUser = getCurrentAuthUser() || await refreshSession().catch(() => null);
    if (!authUser) {
      return {
        id: getAnonymousUserId(),
        nickname: nickname || getLocalNickname("anonymous"),
        isRemote: false,
        isAuthenticated: false
      };
    }
    return ensureAuthUserProfile(nickname);
  }

  async function requireAuthUser() {
    const user = await getOrCreateUser(getLocalNickname("anonymous"));
    if (!user?.isAuthenticated) {
      throw new Error("Login is required for this online feature.");
    }
    return user;
  }

  async function updateNicknameRemote(nickname) {
    const client = supabase();
    const authUser = getCurrentAuthUser() || await refreshSession().catch(() => null);
    if (!client || !authUser) return null;
    const now = new Date().toISOString();
    const userPayload = profilePayloadFromAuthUser(authUser, nickname);
    const { data, error } = await client.from("users").upsert(userPayload, { onConflict: "id" }).select().single();
    if (error) throw error;
    const { error: profileError } = await client
      .from("ranking_profiles")
      .update({ nickname, updated_at: now })
      .eq("user_id", authUser.id);
    if (profileError) throw profileError;
    return { ...data, id: authUser.id, isAuthenticated: true };
  }

  async function getRankingProfile(userId = null) {
    const client = supabase();
    const authUser = getCurrentAuthUser() || await refreshSession().catch(() => null);
    const id = userId || authUser?.id;
    if (!client || !id) return null;
    const { data, error } = await client.from("ranking_profiles").select("*").eq("user_id", id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function createRankingProfileIfNeeded(user = null) {
    const client = supabase();
    const authUser = getCurrentAuthUser() || await refreshSession().catch(() => null);
    if (!client || !authUser) {
      throw new Error("Login is required before creating a ranking profile.");
    }
    const remoteUser = user?.isAuthenticated ? user : await ensureAuthUserProfile();
    const existing = await getRankingProfile(authUser.id);
    if (existing) return existing;
    const nickname = remoteUser?.nickname || getLocalNickname("user");
    const payload = {
      user_id: authUser.id,
      nickname,
      rating: 1000,
      tier: "랭킹없음",
      tier_icon: "□",
      division: 5,
      ranked_games: 0,
      percentile: null,
      rank_position: null,
      total_ranked_players: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await client.from("ranking_profiles").upsert(payload, { onConflict: "user_id" }).select().single();
    if (error) throw error;
    return data;
  }

  async function signInWithGoogle() {
    const client = supabase();
    if (!client?.auth) throw new Error("Supabase Auth is not available.");
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
  }

  async function signInWithNaver() {
    window.showNotice?.("Naver login is not ready yet. Please use Google login first.", "info");
  }

  async function signOut() {
    const client = supabase();
    if (client?.auth) await client.auth.signOut();
    localStorage.removeItem("currentRoomId");
    localStorage.removeItem("currentRoomUserId");
    localStorage.removeItem("currentRoomMode");
    localStorage.removeItem("currentRankedMatchId");
    window.currentSession = null;
    window.currentAuthUser = null;
    location.reload();
  }

  function renderAuthStatus() {
    const target = document.querySelector("[data-auth-status]");
    if (!target) return;
    const user = getCurrentAuthUser();
    target.innerHTML = user
      ? `<strong>Logged in</strong><p class="muted">${user.email || user.id}</p>`
      : `<strong>Not logged in</strong><p class="muted">Solo tests work without login. Rooms and ranked matches require Google login.</p>`;
  }

  async function initAuth() {
    if (authInitPromise) return authInitPromise;
    authInitPromise = (async () => {
      const client = supabase();
      if (!client?.auth) return null;
      const user = await refreshSession();
      if (user) await ensureAuthUserProfile().catch((error) => fail("profile bootstrap failed", error));
      if (!authInitialized) {
        client.auth.onAuthStateChange(async (event, session) => {
          log("state changed", { event, user: session?.user });
          window.currentSession = session || null;
          window.currentAuthUser = session?.user || null;
          if (session?.user) await ensureAuthUserProfile().catch((error) => fail("profile upsert after auth change failed", error));
          renderAuthStatus();
          const current = location.hash.replace("#", "") || "home";
          if (["profile", "ranked", "rooms", "ranking"].includes(current)) window.showView?.(current);
        });
        authInitialized = true;
      }
      return user;
    })();
    return authInitPromise;
  }

  window.UserRemoteService = {
    getAnonymousUserId,
    getCurrentAuthUser,
    isLoggedIn,
    initAuth,
    refreshSession,
    requireAuthUser,
    getOrCreateUser,
    getOrCreateRemoteUser: getOrCreateUser,
    ensureAuthUserProfile,
    updateRemoteNickname: updateNicknameRemote,
    updateNicknameRemote,
    getRankingProfile,
    createRankingProfileIfNeeded,
    signInWithGoogle,
    signInWithNaver,
    signOut,
    renderAuthStatus
  };
})();
