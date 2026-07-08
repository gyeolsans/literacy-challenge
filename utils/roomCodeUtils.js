(function () {
  function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function normalizeRoomCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, "")
      .slice(0, 6);
  }

  window.RoomCodeUtils = { generateRoomCode, normalizeRoomCode };
})();
