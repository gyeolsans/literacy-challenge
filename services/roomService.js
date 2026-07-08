(function () {
  const MAX_ROOM_PLAYERS = 4;
  const STALE_ROOM_MINUTES = 30;
  let activeRoomChannel = null;
  let activeRoomPlayersChannel = null;
  let activeOpenRoomsChannel = null;
  let activeRoomId = null;
  let activeRoomPlayersRoomId = null;

  function ensureOnline() {
    if (!window.SupabaseService?.hasSupabaseConfig?.().ok) {
      throw new Error("온라인 대결 기능은 Supabase 설정 후 사용할 수 있습니다.");
    }
    return window.SupabaseService.getSupabaseClient();
  }

  async function createRoom(settings, user, questionSet) {
    const supabase = ensureOnline();
    if (!user?.id) throw new Error("온라인 유저를 생성하지 못했습니다.");

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

    const roomPayload = {
      room_code: window.RoomCodeUtils.generateRoomCode(),
      host_user_id: user.id,
      status: "waiting",
      difficulty: settings.difficulty,
      question_count: Number(settings.count || 5),
      include_short_answer: Boolean(settings.includeShortAnswer),
      time_limit_enabled: Boolean(settings.useTimer),
      time_per_question: Number(settings.secondsPerQuestion || 60),
      selected_types: settings.selectedTypes || [],
      question_set: questionSet || [],
      created_at: new Date().toISOString()
    };

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert(roomPayload)
      .select()
      .single();
    if (roomError) throw Object.assign(roomError, { stage: "rooms insert" });
    if (!room?.id) throw new Error("rooms insert 후 room id를 받지 못했습니다.");

    const player = await joinRoom(room, user, true);
    return { room, player };
  }

  async function getRoom(roomId) {
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();
    if (error) throw Object.assign(error, { stage: "rooms select by id" });
    return data;
  }

  async function getRoomPlayers(roomId) {
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", roomId)
      .neq("status", "left")
      .order("joined_at", { ascending: true });
    if (error) throw Object.assign(error, { stage: "room_players select" });
    return data || [];
  }

  async function getOpenRooms() {
    const supabase = ensureOnline();
    const since = new Date(Date.now() - STALE_ROOM_MINUTES * 60 * 1000).toISOString();
    const { data: rooms, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("status", "waiting")
      .gte("created_at", since)
      .not("host_user_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw Object.assign(error, { stage: "rooms waiting list" });

    const roomIds = (rooms || []).map((room) => room.id);
    if (!roomIds.length) return [];

    const { data: players, error: playerError } = await supabase
      .from("room_players")
      .select("*")
      .in("room_id", roomIds);
    if (playerError) throw Object.assign(playerError, { stage: "room_players list for rooms" });

    return (rooms || [])
      .map((room) => {
        const roomPlayers = (players || []).filter((player) => player.room_id === room.id);
        const activePlayers = roomPlayers.filter((player) => player.status !== "left");
        const host = activePlayers.find((player) => player.user_id === room.host_user_id && player.is_host);
        return { ...room, players: activePlayers, host };
      })
      .filter((room) => room.host && room.players.length < MAX_ROOM_PLAYERS);
  }

  async function joinRoom(room, user, isHost = false) {
    const supabase = ensureOnline();
    if (typeof room === "string") {
      const foundRoom = await findRoomByCode(room);
      if (!foundRoom) throw new Error("waiting 상태의 방을 찾을 수 없습니다.");
      const remoteUser = user || await window.UserRemoteService.getOrCreateUser("익명");
      return joinRoom(foundRoom, remoteUser, false);
    }
    if (!room?.id) throw new Error("입장할 room id가 없습니다.");
    if (!user?.id) throw new Error("온라인 user id가 없습니다.");
    if (room.status !== "waiting") {
      throw new Error(room.status === "cancelled" ? "취소된 방입니다." : "이미 종료되었거나 시작된 방입니다.");
    }

    const activePlayers = await getRoomPlayers(room.id);
    if (!activePlayers.some((player) => player.user_id === user.id) && activePlayers.length >= MAX_ROOM_PLAYERS) {
      throw new Error("방 정원이 가득 찼습니다.");
    }

    const { data: existing, error: existingError } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingError) throw Object.assign(existingError, { stage: "room_players existing select" });
    if (existing && existing.status !== "left") return existing;

    const playerPayload = {
      room_id: room.id,
      user_id: user.id,
      nickname: user.nickname || "익명",
      is_host: Boolean(isHost),
      status: isHost ? "ready" : "joined",
      is_ready: Boolean(isHost),
      current_index: 0,
      current_score: 0,
      correct_count: 0,
      partial_count: 0,
      wrong_count: 0,
      total_time: 0,
      finished_at: null,
      joined_at: existing?.joined_at || new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("room_players")
      .upsert(playerPayload, { onConflict: "room_id,user_id" })
      .select()
      .single();
    if (error) throw Object.assign(error, { stage: "room_players upsert" });
    return data;
  }

  async function joinRoomById(roomId, user) {
    const room = await getRoom(roomId);
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    const remoteUser = user || await window.UserRemoteService.getOrCreateUser("익명");
    return joinRoom(room, remoteUser, false);
  }

  async function findRoomByCode(roomCode) {
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", window.RoomCodeUtils?.normalizeRoomCode?.(roomCode) || String(roomCode || "").toUpperCase())
      .eq("status", "waiting")
      .maybeSingle();
    if (error) throw Object.assign(error, { stage: "rooms select by room_code" });
    return data;
  }

  async function setReady(roomId, userId, isReady) {
    const supabase = ensureOnline();
    const room = await getRoom(roomId);
    if (!room) throw new Error("방 정보를 찾을 수 없습니다.");
    if (room.host_user_id === userId) throw new Error("방장은 준비 버튼을 사용할 수 없습니다.");
    if (room.status !== "waiting") throw new Error("이미 시작되었거나 종료된 방입니다.");
    const { data, error } = await supabase
      .from("room_players")
      .update({
        is_ready: Boolean(isReady),
        status: isReady ? "ready" : "joined"
      })
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw Object.assign(error, { stage: "room_players ready update" });
    return data;
  }

  async function toggleReady(roomId, userId) {
    const players = await getRoomPlayers(roomId);
    const current = players.find((player) => player.user_id === userId);
    return setReady(roomId, userId, !current?.is_ready);
  }

  function canHostStartGame(players, hostUserId) {
    const activePlayers = (players || []).filter((player) => player.status !== "left");
    if (activePlayers.length < 2) return false;
    const guests = activePlayers.filter((player) => player.user_id !== hostUserId);
    if (!guests.length) return false;
    return guests.every((player) => player.is_ready === true);
  }

  async function leaveRoom(roomId, userId) {
    const supabase = ensureOnline();
    const room = await getRoom(roomId);
    if (!room) throw new Error("방 정보를 찾을 수 없습니다.");
    const players = await getRoomPlayers(roomId);
    const me = players.find((player) => player.user_id === userId);
    const isHost = room.host_user_id === userId || me?.is_host;

    if (room.status === "waiting" && isHost) {
      const finishedAt = new Date().toISOString();
      const { error: playerError } = await supabase
        .from("room_players")
        .update({ status: "left", is_ready: false })
        .eq("room_id", roomId)
        .eq("user_id", userId);
      if (playerError) throw Object.assign(playerError, { stage: "room_players host leave update" });

      const { data, error } = await supabase
        .from("rooms")
        .update({ status: "cancelled", finished_at: finishedAt })
        .eq("id", roomId)
        .select()
        .single();
      if (error) throw Object.assign(error, { stage: "rooms cancel after host leave" });
      return { room: data, cancelled: true };
    }

    if (room.status === "waiting") {
      const { data, error } = await supabase
        .from("room_players")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .select();
      if (error) throw Object.assign(error, { stage: "room_players guest leave delete" });
      return { left: true, deleted: true, players: data };
    }

    const { data, error } = await supabase
      .from("room_players")
      .update({ status: "left", is_ready: false })
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .select();
    if (error) throw Object.assign(error, { stage: "room_players leave update" });
    return { left: true, players: data };
  }

  async function startRoom(roomId, userId = null) {
    const supabase = ensureOnline();
    const currentUserId = userId || window.UserRemoteService?.getAnonymousUserId?.();
    const currentRoom = await getRoom(roomId);
    if (!currentRoom) throw new Error("방 정보를 찾을 수 없습니다.");
    if (currentRoom.status !== "waiting") throw new Error("이미 시작되었거나 종료된 방입니다.");
    if (currentUserId && currentRoom.host_user_id !== currentUserId) throw new Error("방장만 게임을 시작할 수 있습니다.");
    const players = await getRoomPlayers(roomId);
    if (!canHostStartGame(players, currentRoom.host_user_id)) {
      const notReady = players.filter((player) => player.status !== "left" && player.user_id !== currentRoom.host_user_id && !player.is_ready);
      throw new Error(notReady.length ? "아직 준비하지 않은 참가자가 있습니다." : "게임 시작 조건이 충족되지 않았습니다.");
    }

    const startedAt = new Date().toISOString();
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .update({ status: "playing", started_at: startedAt })
      .eq("id", roomId)
      .eq("status", "waiting")
      .select()
      .single();
    if (roomError) throw Object.assign(roomError, { stage: "rooms start update" });

    const { error: playersError } = await supabase
      .from("room_players")
      .update({ status: "playing" })
      .eq("room_id", roomId)
      .neq("status", "left");
    if (playersError) throw Object.assign(playersError, { stage: "room_players start update" });
    return room;
  }

  async function updateRoomPlayerProgress(roomId, userId, progressData) {
    const supabase = ensureOnline();
    const { data, error } = await supabase
      .from("room_players")
      .update(progressData)
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .select();
    if (error) throw Object.assign(error, { stage: "room_players progress update" });
    return data;
  }

  async function finishRoomPlayer(roomId, userId, resultData) {
    const updated = await updateRoomPlayerProgress(roomId, userId, {
      ...resultData,
      status: "finished",
      finished_at: new Date().toISOString()
    });
    const players = await getRoomPlayers(roomId);
    await finishRoomIfComplete(roomId, players);
    return updated;
  }

  async function finishRoomIfComplete(roomId, players) {
    const activePlayers = (players || await getRoomPlayers(roomId)).filter((player) => player.status !== "left");
    if (!activePlayers.length || !activePlayers.every((player) => player.status === "finished")) return null;

    const sorted = [...activePlayers].sort((a, b) => window.RatingUtils.compareMultiplayerResults(a, b));
    const tied = sorted.length > 1 && window.RatingUtils.compareMultiplayerResults(sorted[0], sorted[1]) === 0;
    const winnerUserId = tied ? null : sorted[0]?.user_id || null;
    const resultSummary = { players: sorted, winner_user_id: winnerUserId, finished_at: new Date().toISOString() };
    const supabase = ensureOnline();
    const { error: roomError } = await supabase
      .from("rooms")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", roomId)
      .neq("status", "finished");
    if (roomError) throw Object.assign(roomError, { stage: "rooms finish update" });

    const { error: matchError } = await supabase
      .from("room_matches")
      .insert({ room_id: roomId, winner_user_id: winnerUserId, result_summary: resultSummary });
    if (matchError) console.warn("room match insert failed:", matchError);
    return resultSummary;
  }

  function subscribeRoom(roomId, callbacks) {
    const supabase = ensureOnline();
    if (activeRoomChannel) unsubscribeRoomChannel();
    activeRoomId = roomId;
    const callback = typeof callbacks === "function" ? callbacks : (payload) => callbacks?.onRoomChange?.(payload);
    activeRoomChannel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, callback)
      .subscribe();
    return activeRoomChannel;
  }

  function subscribeRoomPlayers(roomId, callback) {
    const supabase = ensureOnline();
    if (activeRoomPlayersChannel) unsubscribeRoomPlayers();
    activeRoomPlayersRoomId = roomId;
    activeRoomPlayersChannel = supabase
      .channel(`room-players-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` }, callback)
      .subscribe();
    return activeRoomPlayersChannel;
  }

  function subscribeOpenRooms(callback) {
    const supabase = ensureOnline();
    unsubscribeOpenRooms();
    activeOpenRoomsChannel = supabase
      .channel("open-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, callback)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players" }, callback)
      .subscribe();
    return activeOpenRoomsChannel;
  }

  function unsubscribeRoomChannel() {
    if (activeRoomChannel?.unsubscribe) activeRoomChannel.unsubscribe();
    activeRoomChannel = null;
    activeRoomId = null;
  }

  function unsubscribeRoomPlayers() {
    if (activeRoomPlayersChannel?.unsubscribe) activeRoomPlayersChannel.unsubscribe();
    activeRoomPlayersChannel = null;
    activeRoomPlayersRoomId = null;
  }

  function unsubscribeOpenRooms() {
    if (activeOpenRoomsChannel?.unsubscribe) activeOpenRoomsChannel.unsubscribe();
    activeOpenRoomsChannel = null;
  }

  function unsubscribeRoom() {
    unsubscribeRoomChannel();
    unsubscribeRoomPlayers();
  }

  async function cleanupStaleRooms() {
    const supabase = ensureOnline();
    const before = new Date(Date.now() - STALE_ROOM_MINUTES * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("rooms")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("status", "waiting")
      .lt("created_at", before)
      .select();
    if (error) throw Object.assign(error, { stage: "rooms stale cleanup" });
    return data || [];
  }

  window.RoomService = {
    createRoom,
    getRoom,
    getRoomPlayers,
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
