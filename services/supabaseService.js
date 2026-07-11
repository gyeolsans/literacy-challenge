(function () {
  let cachedClient = null;
  let lastStatus = {
    state: "unknown",
    label: "Supabase 상태 확인 전",
    details: [],
    ok: false
  };

  const REQUIRED_TABLES = [
    "users",
    "rooms",
    "room_players",
    "room_matches",
    "ranking_profiles",
    "ranked_matches",
    "replays",
    "replay_items",
    "questions_cache"
  ];

  function getConfig() {
    return window.APP_CONFIG || null;
  }

  function decodeJwtPayload(token) {
    try {
      const payload = token.split(".")[1];
      if (!payload) return null;
      return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return null;
    }
  }

  function hasSupabaseConfig() {
    const config = getConfig();
    const details = [];
    if (!config) {
      details.push("config.js가 로드되지 않았습니다.");
      details.push("Vercel에서 /config.js가 404이면 index.html 안에 window.APP_CONFIG를 직접 정의하는 방법 B를 사용하세요.");
    }
    if (!config?.SUPABASE_URL) details.push("SUPABASE_URL이 비어 있습니다.");
    if (!config?.SUPABASE_ANON_KEY) details.push("SUPABASE_ANON_KEY가 비어 있습니다.");
    if (config?.SUPABASE_URL && !String(config.SUPABASE_URL).startsWith("https://")) {
      details.push("SUPABASE_URL은 https:// 로 시작해야 합니다.");
    }
    if (config?.SUPABASE_ANON_KEY && !String(config.SUPABASE_ANON_KEY).trim()) {
      details.push("SUPABASE_ANON_KEY가 비어 있습니다.");
    }
    const payload = config?.SUPABASE_ANON_KEY ? decodeJwtPayload(config.SUPABASE_ANON_KEY) : null;
    if (payload?.role === "service_role" || String(config?.SUPABASE_ANON_KEY || "").includes("service_role")) {
      details.push("service_role key로 의심됩니다. 프론트엔드에는 anon public key만 넣어야 합니다.");
    }
    return {
      ok: details.length === 0,
      details
    };
  }

  function getFriendlyErrorMessage(error) {
    const message = String(error?.message || error || "");
    const code = error?.code || error?.details?.code;
    if (message.includes("Failed to fetch")) {
      return "네트워크 요청에 실패했습니다. config.js의 Supabase URL/anon key, 인터넷 연결, Supabase 프로젝트 상태, CORS를 확인하세요.";
    }
    if (code === "42P01" || message.includes("does not exist")) {
      return "테이블이 없습니다. supabase-schema.sql을 실행하세요.";
    }
    if (code === "42501" || message.toLowerCase().includes("row-level security") || message.includes("permission denied")) {
      return "RLS 정책 때문에 요청이 거부되었습니다. 개발용 RLS 정책을 확인하세요.";
    }
    if (message.toLowerCase().includes("schema cache")) {
      return "Supabase 스키마 migration을 실행한 뒤 10~30초 후 새로고침하세요.";
    }
    if (message.includes("Invalid API key") || message.includes("invalid api key")) {
      return "Supabase anon key가 잘못되었습니다.";
    }
    if (message.includes("JWT") || message.includes("jwt")) {
      return "Supabase key 또는 인증 토큰 문제가 있습니다.";
    }
    if (message.includes("config.js")) return message;
    return message || "알 수 없는 Supabase 오류가 발생했습니다.";
  }

  function getSupabaseClient() {
    const configCheck = hasSupabaseConfig();
    if (!configCheck.ok) {
      const error = new Error(configCheck.details.join(" "));
      error.code = "CONFIG_MISSING";
      throw error;
    }
    if (!window.supabase?.createClient) {
      throw new Error("window.supabase가 없습니다. index.html에서 @supabase/supabase-js CDN이 config.js보다 먼저 로드되는지 확인하세요.");
    }
    if (!cachedClient) {
      const config = getConfig();
      cachedClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }
    return cachedClient;
  }

  function ensureSupabaseClient() {
    return getSupabaseClient();
  }

  function isConfigured() {
    return hasSupabaseConfig().ok;
  }

  function isSupabaseOnlineReady(diagnostics = window.SUPABASE_DIAGNOSTICS) {
    const details = Array.isArray(diagnostics?.details) ? diagnostics.details : [];
    const requiredTablesOk = REQUIRED_TABLES.every((table) => details.includes(`${table} select OK`));
    return Boolean(
      window.supabase &&
      window.APP_CONFIG?.SUPABASE_URL &&
      window.APP_CONFIG?.SUPABASE_ANON_KEY &&
      diagnostics?.ok === true &&
      requiredTablesOk
    );
  }

  function setStatus(state, label, details = [], extra = {}) {
    const ok = Boolean(extra.ok ?? state === "connected");
    lastStatus = {
      state,
      label,
      details,
      ok,
      requiredTables: REQUIRED_TABLES,
      checkedAt: new Date().toISOString(),
      ...extra
    };
    window.SUPABASE_DIAGNOSTICS = lastStatus;
    window.SUPABASE_ONLINE_READY = isSupabaseOnlineReady(lastStatus);
    window.dispatchEvent(new CustomEvent("supabase-status-change", { detail: lastStatus }));
    return lastStatus;
  }

  async function checkSupabaseDiagnostics() {
    const configCheck = hasSupabaseConfig();
    if (window.location.protocol === "file:") {
      return setStatus("disabled", "파일 직접 실행 모드", ["현재 파일 직접 실행 모드입니다. 온라인 기능을 사용하려면 npm run dev 또는 Vercel 배포 주소로 접속하세요."]);
    }
    if (!configCheck.ok) {
      return setStatus("not-configured", "Supabase 설정 없음", configCheck.details);
    }

    try {
      const client = getSupabaseClient();
      const details = [];
      for (const table of REQUIRED_TABLES) {
        const { error } = await client.from(table).select("*").limit(1);
        if (error) {
          error.stage = `${table} select`;
          throw error;
        }
        details.push(`${table} select OK`);
      }
      return setStatus("connected", "Supabase 연결됨", details, { ok: true });
    } catch (error) {
      console.error("Supabase connection test failed:", error);
      const friendly = getFriendlyErrorMessage(error);
      const state = error.code === "42P01"
        ? "missing-tables"
        : error.code === "42501"
          ? "rls-blocked"
          : "failed";
      return setStatus(state, "Supabase 연결 테스트 실패", [friendly], { ok: false, error: friendly });
    }
  }

  async function testSupabaseConnection() {
    return checkSupabaseDiagnostics();
  }

  function renderSupabaseStatus() {
    const badgeClass = {
      connected: "success",
      "not-configured": "warning",
      disabled: "warning",
      "missing-tables": "error",
      "rls-blocked": "error",
      failed: "error",
      unknown: "info"
    }[lastStatus.state] || "info";
    return `
      <div class="card notice-inline ${badgeClass}">
        <strong>${lastStatus.label}</strong>
        ${lastStatus.details?.length ? `<p>${lastStatus.details.map((item) => String(item)).join(" ")}</p>` : ""}
      </div>
    `;
  }

  function renderSupabaseDiagnostics() {
    return renderSupabaseStatus();
  }

  function applyQuery(builder, queryString = "") {
    const params = new URLSearchParams(queryString);
    for (const [key, value] of params.entries()) {
      if (key === "limit") builder = builder.limit(Number(value));
      else if (key === "order") {
        const [column, direction] = value.split(".");
        builder = builder.order(column, { ascending: direction !== "desc" });
      } else if (value.startsWith("eq.")) {
        builder = builder.eq(key, decodeURIComponent(value.slice(3)));
      } else if (value.startsWith("neq.")) {
        builder = builder.neq(key, decodeURIComponent(value.slice(4)));
      }
    }
    return builder;
  }

  async function request(path, options = {}) {
    const client = getSupabaseClient();
    const method = String(options.method || "GET").toUpperCase();
    const [table, queryString = ""] = path.split("?");
    try {
      if (method === "GET") {
        const { data, error } = await applyQuery(client.from(table).select("*"), queryString);
        if (error) throw error;
        return data;
      }
      if (method === "POST") {
        const body = JSON.parse(options.body || "{}");
        const isUpsert = path.includes("on_conflict=");
        const tableName = table.split("?")[0];
        const { data, error } = isUpsert
          ? await client.from(tableName).upsert(body, { onConflict: new URLSearchParams(queryString).get("on_conflict") || undefined }).select()
          : await client.from(tableName).insert(body).select();
        if (error) throw error;
        return data;
      }
      if (method === "PATCH") {
        const body = JSON.parse(options.body || "{}");
        const { data, error } = await applyQuery(client.from(table).update(body).select(), queryString);
        if (error) throw error;
        return data;
      }
      if (method === "DELETE") {
        const { data, error } = await applyQuery(client.from(table).delete().select(), queryString);
        if (error) throw error;
        return data;
      }
      throw new Error(`지원하지 않는 Supabase method입니다: ${method}`);
    } catch (error) {
      console.error(`Supabase request failed at ${method} ${path}:`, error);
      throw new Error(getFriendlyErrorMessage(error));
    }
  }

  function eq(column, value) {
    return `${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`;
  }

  window.SupabaseService = {
    hasSupabaseConfig,
    getSupabaseClient,
    ensureSupabaseClient,
    checkSupabaseDiagnostics,
    testSupabaseConnection,
    isSupabaseOnlineReady,
    getRequiredTables: () => [...REQUIRED_TABLES],
    renderSupabaseStatus,
    renderSupabaseDiagnostics,
    getFriendlyErrorMessage,
    getFriendlySupabaseErrorMessage: getFriendlyErrorMessage,
    getStatus: () => lastStatus,
    isConfigured,
    request,
    eq
  };
})();
