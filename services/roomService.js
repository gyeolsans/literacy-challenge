(function () {
  const MAX_ROOM_PLAYERS = 4;
  const STALE_ROOM_MINUTES = 30;
  let activeRoomChannel = null;
  let activeRoomPlayersChannel = null;
  let activeOpenRoomsChannel = null;

  function log(scope, message, data) {
    window.debugLog?.(scope, message, data);
  }

  function fail(scope, message, error) {
    window.LAST_ROOM_ERROR = error;
    window.debugError?.(scope, message, error);
  }

  function formatSupabaseError(error, context = {}) {
    if (window.formatSupabaseError) return window.formatSupabaseError(error, context);
    if (!error) return "unknown error";
    return [
      (context.functionName || error.functionName) && `function=${context.functionName || error.functionName}`,
      (context.table || error.table) && `table=${context.table || error.table}`,
      (context.queryType || error.queryType) && `query=${context.queryType || error.queryType}`,
      (context.stage || error.stage) && `stage=${context.stage || error.stage}`,
      error.message && `message=${error.message}`,
      error.code && `code=${error.code}`,
      error.details && `details=${error.details}`,
      error.hint && `hint=${error.hint}`,
      error.status && `status=${error.status}`,
      error.statusText && `statusText=${error.statusText}`
    ].filter(Boolean).join(" / ") || String(error);
  }

  function ensureOnline() {
    if (!window.SupabaseService?.hasSupabaseConfig?.().ok) {
      throw new Error("Supabase config is required for room features.");
    }
    return window.SupabaseService.getSupabaseClient();
  }

  function activeOnly(players = []) {
    return players.filter((player) => player.status !== "left");
  }

  async function getRoom(roomId) {
    const supabase = ensureOnline();
    const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
    if (error) throw Object.assign(error, { stage: "rooms select by id" });
    return data;
  }

  async function getRoomPlayers(roomId, options = {}) {
    const supabase = ensureOnline();
    let query = supabase.from("room_players").select("*").eq("room_id", roomId).order("joined_at", { ascending: true });
    if (!options.includeLeft) query = query.neq("status", "left");
    const { data, error } = await query;
    if (error) {
      Object.assign(error, { functionName: "getRoomPlayers", table: "room_players", queryType: "select", stage: "room_players select" });
      console.error("[room.getRoomPlayers] room_players select failed", error);
      throw new Error("room_players select failed: " + formatSupabaseError(error));
    }
    return data || [];
  }

  async function getRoomPlayer(roomId, userId) {
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw Object.assign(error, { stage: "room_players select one" });
    return data;
  }

  async function findRoomByCode(roomCode) {
    log("room.joinRoomByCode", "called", { roomCode });
    const supabase = ensureOnline();
    const normalized = window.RoomCodeUtils?.normalizeRoomCode?.(roomCode) || String(roomCode || "").trim().toUpperCase();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", normalized)
      .eq("status", "waiting")
      .maybeSingle();
    if (error) throw Object.assign(error, { stage: "rooms select by room_code" });
    return data;
  }

  async function createRoom(settings, user, questionSet) {
    log("room.createRoom", "called", { settings, user, questionCount: questionSet?.length || 0 });
    try {
      const supabase = ensureOnline();
      if (!user?.id) throw new Error("Cannot create room without user.id.");
      console.log("[room.createRoom] settings", settings);
      console.log("[room.createRoom] currentUser", user);

      const { data: existingRoom, error: existingError } = await supabase
        .from("rooms")
        .select("*")
        .eq("host_user_id", user.id)
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingError) throw Object.assign(existingError, { stage: "rooms existing host select" });
      if (existingRoom) {
        const player = await joinRoom(existingRoom, user, true);
        return { room: existingRoom, player, reused: true };
      }

      const now = new Date().toISOString();
      const roomPayload = {
        room_code: window.RoomCodeUtils.generateRoomCode(),
        host_user_id: user.id,
        host_nickname: user.nickname || "anonymous",
        title: `${user.nickname || "anonymous"} room`,
        max_players: MAX_ROOM_PLAYERS,
        status: "waiting",
        difficulty: settings.difficulty || "normal",
        question_count: Number(settings.count || questionSet?.length || 5),
        include_short_answer: Boolean(settings.includeShortAnswer),
        time_limit_enabled: Boolean(settings.useTimer),
        time_per_question: Number(settings.secondsPerQuestion || 60),
        selected_types: settings.selectedTypes || [],
        question_set: Array.isArray(questionSet) ? questionSet : [],
        created_at: now,
        updated_at: now
      };
      console.log("[room.createRoom] insert room payload", roomPayload);
      const { data: room, error } = await supabase.from("rooms").insert(roomPayload).select().single();
      if (error) {
        Object.assign(error, { functionName: "createRoom", table: "rooms", queryType: "insert", stage: "rooms insert" });
        console.error("[room.createRoom] rooms insert failed", error);
        throw new Error("rooms insert failed: " + formatSupabaseError(error));
      }
      const player = await joinRoom(room, user, true);
      log("room.createRoom", "created", { room, player });
      return { room, player };
    } catch (error) {
      fail("room.createRoom", "failed", error);
      throw error;
    }
  }

  async function cleanupStaleRooms() {
    log("room.cleanupStaleRooms", "called");
    const supabase = ensureOnline();
    const now = new Date().toISOString();
    const before = new Date(Date.now() - STALE_ROOM_MINUTES * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("rooms")
      .update({ status: "cancelled", cancelled_at: now, updated_at: now })
      .eq("status", "waiting")
      .lt("created_at", before)
      .select();
    if (error) throw Object.assign(error, { stage: "rooms stale cleanup" });
    log("room.cleanupStaleRooms", "completed", { count: data?.length || 0 });
    return data || [];
  }

  async function getOpenRooms() {
    log("room.getOpenRooms", "called");
    const supabase = ensureOnline();
    await cleanupStaleRooms().catch((error) => fail("room.getOpenRooms", "stale cleanup failed", error));
    const { data: rooms, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      Object.assign(error, { functionName: "getOpenRooms", table: "rooms", queryType: "select", stage: "rooms select waiting list" });
      console.error("[room.getOpenRooms] rooms select failed", error);
      throw new Error("rooms select failed: " + formatSupabaseError(error));
    }

    const openRooms = [];
    for (const room of rooms || []) {
      try {
        const roomPlayers = await getRoomPlayers(room.id);
        const activePlayers = activeOnly(roomPlayers);
        const host = activePlayers.find((player) => player.user_id === room.host_user_id);
        if (host && activePlayers.length < Number(room.max_players || MAX_ROOM_PLAYERS)) {
          openRooms.push({ ...room, players: activePlayers, host });
        }
      } catch (playerError) {
        console.error("[room.getOpenRooms] room_players select failed", { roomId: room.id, error: playerError });
        throw playerError;
      }
    }
    log("room.getOpenRooms", "result", { count: openRooms.length, openRooms });
    return openRooms;
  }

  async function joinRoom(room, user, isHost = false) {
    log("room.joinRoom", "called", { roomId: room?.id || room, user, isHost });
    try {
      if (typeof room === "string") {
        const foundRoom = await findRoomByCode(room);
        if (!foundRoom) throw new Error("Waiting room was not found.");
        const remoteUser = user || await window.UserRemoteService.getOrCreateUser?.("anonymous");
        return joinRoom(foundRoom, remoteUser, false);
      }
      const supabase = ensureOnline();
      if (!room?.id) throw new Error("room.id is required.");
      if (!user?.id) throw new Error("user.id is required.");
      if (room.status !== "waiting") throw new Error(`Cannot join room with status ${room.status}.`);

      const players = await getRoomPlayers(room.id);
      if (!players.some((player) => player.user_id === user.id) && players.length >= Number(room.max_players || MAX_ROOM_PLAYERS)) {
        throw new Error("Room is full.");
      }

      const existing = await getRoomPlayer(room.id, user.id);
      if (existing && existing.status !== "left") return existing;

      const now = new Date().toISOString();
      const payload = {
        room_id: room.id,
        user_id: user.id,
        nickname: user.nickname || "anonymous",
        is_host: Boolean(isHost),
        is_ready: Boolean(isHost),
        status: isHost ? "ready" : "joined",
        current_index: 0,
        current_score: 0,
        correct_count: 0,
        partial_count: 0,
        wrong_count: 0,
        total_time: 0,
        finished_at: null,
        joined_at: existing?.joined_at || now,
        updated_at: now
      };
      console.log("[room.joinRoom] upsert player payload", payload);
      const { data, error } = await supabase
        .from("room_players")
        .upsert(payload, { onConflict: "room_id,user_id" })
        .select()
        .single();
      if (error) {
        Object.assign(error, { functionName: "joinRoom", table: "room_players", queryType: "upsert", stage: "room_players upsert" });
        console.error("[room.joinRoom] room_players upsert failed", error);
        throw new Error("room_players upsert failed: " + formatSupabaseError(error));
      }
      log("room.joinRoom", "joined", data);
      return data;
    } catch (error) {
      fail("room.joinRoom", "failed", error);
      throw error;
    }
  }

  async function joinRoomById(roomId, user) {
    log("room.joinRoomById", "called", { roomId, user });
    const room = await getRoom(roomId);
    if (!room) throw new Error("Room was not found.");
    const remoteUser = user || await window.UserRemoteService.getOrCreateUser?.("anonymous");
    return joinRoom(room, remoteUser, false);
  }

  async function setReady(roomId, userId, isReady) {
    log("room.toggleReady", "called", { roomId, userId, isReady });
    try {
      const supabase = ensureOnline();
      const room = await getRoom(roomId);
      if (!room) throw new Error("Room was not found.");
      if (room.host_user_id === userId) throw new Error("Host cannot use the ready button.");
      if (room.status !== "waiting") throw new Error(`Ready is disabled for room status ${room.status}.`);
      const player = await getRoomPlayer(roomId, userId);
      if (!player) throw new Error("Room player was not found.");
      if (["left", "finished"].includes(player.status)) throw new Error(`Ready is disabled for player status ${player.status}.`);

      const nextReady = Boolean(isReady);
      const { data, error } = await supabase
        .from("room_players")
        .update({
          is_ready: nextReady,
          status: nextReady ? "ready" : "joined",
          updated_at: new Date().toISOString()
        })
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw Object.assign(error, { stage: "room_players ready update" });
      log("room.toggleReady", "updated", data);
      return data;
    } catch (error) {
      fail("room.toggleReady", "failed", error);
      throw error;
    }
  }

  async function toggleReady(roomId, userId) {
    const player = await getRoomPlayer(roomId, userId);
    if (!player) throw new Error("Room player was not found.");
    return setReady(roomId, userId, !player.is_ready);
  }

  function canHostStartGame(players, hostUserId) {
    const activePlayers = activeOnly(players);
    if (activePlayers.length < 2) return false;
    const guests = activePlayers.filter((player) => player.user_id !== hostUserId);
    return guests.length > 0 && guests.every((player) => player.is_ready === true);
  }

  async function leaveRoom(roomId, userId) {
    log("room.leaveRoom", "called", { roomId, userId });
    try {
      const supabase = ensureOnline();
      const room = await getRoom(roomId);
      if (!room) throw new Error("Room was not found.");
      const me = await getRoomPlayer(roomId, userId);
      const isHost = room.host_user_id === userId || me?.is_host;
      const now = new Date().toISOString();

      const { error: playerError } = await supabase
        .from("room_players")
        .update({ status: "left", is_ready: false, updated_at: now })
        .eq("room_id", roomId)
        .eq("user_id", userId);
      if (playerError) throw Object.assign(playerError, { stage: "room_players leave update" });

      localStorage.removeItem("currentRoomId");
      localStorage.removeItem("currentRoomUserId");
      localStorage.removeItem("currentRoomMode");

      if (room.status === "waiting" && isHost) {
        const { data, error } = await supabase
          .from("rooms")
          .update({ status: "cancelled", cancelled_at: now, updated_at: now })
          .eq("id", roomId)
          .select()
          .single();
        if (error) throw Object.assign(error, { stage: "rooms cancel after host leave" });
        log("room.leaveRoom", "host cancelled room", data);
        return { room: data, cancelled: true };
      }
      return { left: true };
    } catch (error) {
      fail("room.leaveRoom", "failed", error);
      throw error;
    }
  }

  async function ensureRoomQuestionSet(room) {
    if (Array.isArray(room.question_set) && room.question_set.length) return room.question_set;
    if (!window.buildQuestionSet) throw new Error("buildQuestionSet is not available.");
    const settings = {
      difficulty: room.difficulty || "normal",
      count: Number(room.question_count || 5),
      includeShortAnswer: room.include_short_answer !== false,
      selectedTypes: Array.isArray(room.selected_types) ? room.selected_types : [],
      questionSource: "ai",
      useTimer: Boolean(room.time_limit_enabled),
      secondsPerQuestion: Number(room.time_per_question || 60)
    };
    const built = await window.buildQuestionSet(settings, { sourcePreference: "ai" });
    if (!built.questions?.length) throw new Error("Failed to build room question_set.");
    return built.questions;
  }

  async function startRoom(roomId, userId = null) {
    log("room.startRoomGame", "called", { roomId, userId });
    try {
      const supabase = ensureOnline();
      const currentUserId = userId || window.UserRemoteService?.getAnonymousUserId?.();
      const room = await getRoom(roomId);
      if (!room) throw new Error("Room was not found.");
      if (room.status !== "waiting") throw new Error(`Cannot start room with status ${room.status}.`);
      if (currentUserId && room.host_user_id !== currentUserId) throw new Error("Only the host can start this room.");
      const players = await getRoomPlayers(roomId);
      if (!canHostStartGame(players, room.host_user_id)) {
        throw new Error("At least one non-host player must be ready before starting.");
      }
      const questionSet = await ensureRoomQuestionSet(room);
      const startedAt = new Date().toISOString();
      const { data: updatedRoom, error: roomError } = await supabase
        .from("rooms")
        .update({
          status: "playing",
          question_set: questionSet,
          question_count: Number(room.question_count || questionSet.length),
          started_at: startedAt,
          updated_at: startedAt
        })
        .eq("id", roomId)
        .eq("status", "waiting")
        .select()
        .single();
      if (roomError) throw Object.assign(roomError, { stage: "rooms start update" });

      const { error: playersError } = await supabase
        .from("room_players")
        .update({ status: "playing", updated_at: startedAt })
        .eq("room_id", roomId)
        .neq("status", "left");
      if (playersError) throw Object.assign(playersError, { stage: "room_players start update" });
      log("room.startRoomGame", "started", updatedRoom);
      return updatedRoom;
    } catch (error) {
      fail("room.startRoomGame", "failed", error);
      throw error;
    }
  }

  async function updateRoomPlayerProgress(roomId, userId, progressData) {
    log("room.updateRoomPlayerProgress", "called", { roomId, userId, progressData });
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("room_players")
      .update({ ...progressData, updated_at: new Date().toISOString() })
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .select();
    if (error) throw Object.assign(error, { stage: "room_players progress update" });
    return data;
  }

  async function finishRoomIfComplete(roomId, players) {
    const activePlayers = activeOnly(players || await getRoomPlayers(roomId));
    if (!activePlayers.length || !activePlayers.every((player) => player.status === "finished")) return null;
    const sorted = [...activePlayers].sort((a, b) => window.RatingUtils.compareMultiplayerResults(a, b));
    const tied = sorted.length > 1 && window.RatingUtils.compareMultiplayerResults(sorted[0], sorted[1]) === 0;
    const winnerUserId = tied ? null : sorted[0]?.user_id || null;
    const now = new Date().toISOString();
    const supabase = ensureOnline();
    const { error } = await supabase
      .from("rooms")
      .update({ status: "finished", finished_at: now, updated_at: now })
      .eq("id", roomId)
      .neq("status", "finished");
    if (error) throw Object.assign(error, { stage: "rooms finish update" });
    await supabase.from("room_matches").insert({ room_id: roomId, winner_user_id: winnerUserId, result_summary: { players: sorted, winner_user_id: winnerUserId, finished_at: now } });
    return { players: sorted, winner_user_id: winnerUserId, finished_at: now };
  }

  async function finishRoomPlayer(roomId, userId, resultData) {
    const updated = await updateRoomPlayerProgress(roomId, userId, {
      ...resultData,
      status: "finished",
      finished_at: new Date().toISOString()
    });
    await finishRoomIfComplete(roomId);
    return updated;
  }

  function unsubscribeRoomChannel() {
    if (activeRoomChannel?.unsubscribe) activeRoomChannel.unsubscribe();
    activeRoomChannel = null;
  }

  function unsubscribeRoomPlayers() {
    if (activeRoomPlayersChannel?.unsubscribe) activeRoomPlayersChannel.unsubscribe();
    activeRoomPlayersChannel = null;
  }

  function unsubscribeOpenRooms() {
    if (activeOpenRoomsChannel?.unsubscribe) activeOpenRoomsChannel.unsubscribe();
    activeOpenRoomsChannel = null;
  }

  function subscribeRoom(roomId, callbacks = {}) {
    log("room.subscribeRoom", "called", { roomId });
    const supabase = ensureOnline();
    unsubscribeRoomChannel();
    const callbackObject = typeof callbacks === "function" ? { onRoomChange: callbacks } : callbacks;
    activeRoomChannel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, async (payload) => {
        log("room.realtime.room", "event", payload);
        const room = await getRoom(roomId);
        callbackObject?.onRoomChange?.(room, payload);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` }, async (payload) => {
        log("room.realtime.players", "event", payload);
        const players = await getRoomPlayers(roomId);
        callbackObject?.onPlayersChange?.(players, payload);
      })
      .subscribe((status, error) => {
        log("room.subscribeRoom", "subscription status", { roomId, status, error });
        if (error) fail("room.subscribeRoom", "subscription error", error);
        callbackObject?.onSubscribe?.(status, error);
      });
    return activeRoomChannel;
  }

  function subscribeRoomPlayers(roomId, callback) {
    log("room.subscribeRoomPlayers", "called", { roomId });
    const supabase = ensureOnline();
    unsubscribeRoomPlayers();
    activeRoomPlayersChannel = supabase
      .channel(`room-players-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` }, async (payload) => {
        log("room.realtime.players.extra", "event", payload);
        const players = await getRoomPlayers(roomId);
        callback?.(players, payload);
      })
      .subscribe((status, error) => {
        log("room.subscribeRoomPlayers", "subscription status", { roomId, status, error });
        if (error) fail("room.subscribeRoomPlayers", "subscription error", error);
      });
    return activeRoomPlayersChannel;
  }

  function subscribeOpenRooms(callback) {
    const supabase = ensureOnline();
    unsubscribeOpenRooms();
    activeOpenRoomsChannel = supabase
      .channel("open-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, callback)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players" }, callback)
      .subscribe((status, error) => log("room.subscribeOpenRooms", "subscription status", { status, error }));
    return activeOpenRoomsChannel;
  }

  function unsubscribeRoom() {
    unsubscribeRoomChannel();
    unsubscribeRoomPlayers();
  }

  window.RoomService = {
    createRoom,
    getRoom,
    getRoomPlayers,
    getRoomPlayer,
    getOpenRooms,
    cleanupStaleRooms,
    joinRoom,
    joinRoomById,
    findRoomByCode,
    toggleReady,
    setReady,
    canHostStartGame,
    leaveRoom,
    startRoomGame: startRoom,
    startRoom,
    submitRoomAnswer: updateRoomPlayerProgress,
    finishRoomPlayer,
    finalizeRoomIfAllFinished: finishRoomIfComplete,
    subscribeRoom,
    subscribeRoomPlayers,
    subscribeOpenRooms,
    unsubscribeRoom,
    unsubscribeRoomPlayers,
    unsubscribeOpenRooms,
    updateRoomPlayerProgress,
    finishRoomIfComplete
  };
})();
