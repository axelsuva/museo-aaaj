/* ============================================
   Museo Virtual AAAJ — Router + Render + Filtros
   Funciona sobre data.js (805 partidos, 1035 goles, 284 jugadores, 122 camisetas)
   ============================================ */

// ===== Helpers =====
const $app = () => document.getElementById("app");
const escapeHTML = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
const slug = (s) => {
  if (!s) return "";
  return s
    .toString()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};
const initials = (nombre) => {
  if (!nombre) return "··";
  if (nombre.includes(",")) {
    const [last, first = ""] = nombre.split(",").map((s) => s.trim());
    return ((first[0] || "") + (last[0] || "")).toUpperCase().slice(0, 2) || "··";
  }
  const toks = nombre.split(/\s+/);
  return ((toks[0]?.[0] || "") + (toks[toks.length - 1]?.[0] || ""))
    .toUpperCase()
    .slice(0, 2) || "··";
};
const condicionLabel = (c) =>
  ({ L: "Local", V: "Visitante", N: "Neutral" }[c] || c || "—");
const normalizeEstado = (e) => {
  if (!e) return "";
  // E(G), E(P), P(P) → categorizamos: G y E(G) son "victoria efectiva", E y P normales, P(P) derrota
  if (e === "G") return "victoria";
  if (e === "P") return "derrota";
  if (e === "E") return "empate";
  if (e === "E(G)") return "victoria-pen";
  if (e === "E(P)") return "derrota-pen";
  if (e === "P(P)") return "derrota";
  return "empate";
};
const estadoLabel = (e) =>
  ({
    G: "Victoria",
    P: "Derrota",
    E: "Empate",
    "E(G)": "Empate (G pen.)",
    "E(P)": "Empate (P pen.)",
    "P(P)": "Derrota",
  }[e] || e || "—");
const decadaOf = (anio) => (anio ? Math.floor(anio / 10) * 10 : null);
const monthName = (m) =>
  [
    "—",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ][m] || "—";
const fechaPartido = (p) => {
  if (!p.anio) return "—";
  if (p.mes && p.diaNum)
    return `${String(p.diaNum).padStart(2, "0")}/${String(p.mes).padStart(2, "0")}/${p.anio}`;
  if (p.mes) return `${monthName(p.mes)} ${p.anio}`;
  return String(p.anio);
};
const resultadoPartido = (p) => {
  if (p.gh != null && p.gr != null) return `${p.gh} — ${p.gr}`;
  return "—";
};

// ===== Lookups precomputados (se llenan en bootData) =====
const LOOKUP = {
  jugadorByNombre: new Map(), // nombre exacto → jugador
  partidoByCodigo: new Map(), // codigo → partido
  camisetaById: new Map(), // id → camiseta
  golesByPartido: new Map(), // codigo → [goles]
  participacionesByPartido: new Map(), // codigo → [participaciones]
  golesByJugador: new Map(), // nombre → [goles]
  participacionesByJugador: new Map(), // nombre → [participaciones]
};

function bootData() {
  // Asignar id (slug) a cada jugador y mapear por nombre
  for (const j of DATA.jugadores) {
    if (!j.id) j.id = slug(j.nombre);
    if (!j.iniciales) j.iniciales = initials(j.nombre);
    LOOKUP.jugadorByNombre.set(j.nombre, j);
  }
  for (const p of DATA.partidos) {
    LOOKUP.partidoByCodigo.set(p.codigo, p);
  }
  for (const c of DATA.camisetas) {
    LOOKUP.camisetaById.set(c.id, c);
  }
  // Index goles por partido y por jugador
  for (const g of DATA.goles) {
    if (!LOOKUP.golesByPartido.has(g.codigo)) LOOKUP.golesByPartido.set(g.codigo, []);
    LOOKUP.golesByPartido.get(g.codigo).push(g);
    if (g.jugador) {
      if (!LOOKUP.golesByJugador.has(g.jugador))
        LOOKUP.golesByJugador.set(g.jugador, []);
      LOOKUP.golesByJugador.get(g.jugador).push(g);
    }
  }
  // Index participaciones
  for (const p of DATA.participaciones) {
    if (!LOOKUP.participacionesByPartido.has(p.codigo))
      LOOKUP.participacionesByPartido.set(p.codigo, []);
    LOOKUP.participacionesByPartido.get(p.codigo).push(p);
    if (p.jugador) {
      if (!LOOKUP.participacionesByJugador.has(p.jugador))
        LOOKUP.participacionesByJugador.set(p.jugador, []);
      LOOKUP.participacionesByJugador.get(p.jugador).push(p);
    }
  }
}

// ===== Estado global de filtros y paginación =====
const STATE = {
  partidos: { filters: { decada: "", anio: "", mes: "", rival: "", estadio: "", dia: "", estado: "", condicion: "", q: "" }, page: 1, perPage: 24 },
  goles: { filters: { anio: "", mes: "", jugador: "", tiempo: "", cuerpo: "", origen: "", distancia: "", q: "" }, page: 1, perPage: 30 },
  jugadores: { filters: { posicion: "", nacionalidad: "", q: "" }, page: 1, perPage: 30 },
  camisetas: { filters: { tipo: "", marca: "", q: "" }, page: 1, perPage: 24 },
};

// ===== SVG: camiseta =====
function shirtSVG({ size = 240, patron = "rayas" } = {}) {
  const pat =
    patron === "rayas-finas"
      ? Array.from({ length: 11 }, (_, i) => `<rect x="${32 + i * 12}" y="44" width="6" height="120" fill="#C8102E"/>`).join("")
      : Array.from({ length: 5 }, (_, i) => `<rect x="${32 + i * 28}" y="44" width="14" height="120" fill="#C8102E"/>`).join("");
  return `
  <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" role="img">
    <defs>
      <clipPath id="shirtClip${size}">
        <path d="M 60 28 L 80 18 Q 100 30 120 18 L 140 28 L 180 50 L 168 90 L 152 80 L 152 184 Q 100 200 48 184 L 48 80 L 32 90 L 20 50 Z"/>
      </clipPath>
    </defs>
    <path d="M 60 28 L 80 18 Q 100 30 120 18 L 140 28 L 180 50 L 168 90 L 152 80 L 152 184 Q 100 200 48 184 L 48 80 L 32 90 L 20 50 Z" fill="#FFFFFF" stroke="#1A1410" stroke-width="1.5"/>
    <g clip-path="url(#shirtClip${size})">${pat}</g>
    <path d="M 80 18 Q 100 38 120 18" fill="none" stroke="#1A1410" stroke-width="1.5"/>
  </svg>`;
}

// ===== Filtros y paginación =====
function paginate(items, page, perPage) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * perPage;
  return { items: items.slice(start, start + perPage), total, totalPages, page: p };
}
function pagerHTML(state, total) {
  const totalPages = Math.max(1, Math.ceil(total / state.perPage));
  if (totalPages <= 1) return "";
  return `
    <div class="pager">
      <button class="pager-btn" data-pager="prev" ${state.page <= 1 ? "disabled" : ""}>← Anterior</button>
      <span class="pager-info">Página ${state.page} de ${totalPages} · ${total} resultados</span>
      <button class="pager-btn" data-pager="next" ${state.page >= totalPages ? "disabled" : ""}>Siguiente →</button>
    </div>`;
}
function selectFilter(name, label, options, current) {
  const opts = [`<option value="">${escapeHTML(label)}</option>`]
    .concat(
      options.map(
        (o) =>
          `<option value="${escapeHTML(o.value)}" ${o.value === current ? "selected" : ""}>${escapeHTML(o.label)}</option>`
      )
    )
    .join("");
  return `<select class="filter-select" data-filter="${escapeHTML(name)}">${opts}</select>`;
}
function searchFilter(value, placeholder = "Buscar…") {
  return `<input class="filter-search" data-filter="q" type="search" value="${escapeHTML(value || "")}" placeholder="${escapeHTML(placeholder)}" />`;
}
function uniqueValues(items, key, label = (v) => v) {
  const set = new Set();
  for (const it of items) {
    const v = it[key];
    if (v != null && v !== "" && v !== "-") set.add(v);
  }
  return Array.from(set)
    .sort((a, b) => {
      if (typeof a === "number" && typeof b === "number") return b - a;
      return String(a).localeCompare(String(b));
    })
    .map((v) => ({ value: String(v), label: String(label(v)) }));
}

// ===== Cards =====
function jugadorCard(j) {
  const nombreCorto = j.nombre.replace(/^([^,]+),\s*(.+)$/, "$2 $1");
  return `
    <a class="card" href="#/jugadores/${escapeHTML(j.id)}">
      <div class="card-thumb aspect-tall">
        <div class="pattern"></div>
        <span class="initials">${escapeHTML(j.iniciales)}</span>
      </div>
      <div class="card-body">
        <span class="kicker">${escapeHTML(j.posicion || "Jugador")}</span>
        <span class="title">${escapeHTML(nombreCorto)}</span>
        <span class="meta">${escapeHTML(j.nacionalidad || "—")}</span>
      </div>
    </a>`;
}
function partidoCard(p) {
  const cls = normalizeEstado(p.estadoFinal);
  return `
    <a class="card" href="#/partidos/${escapeHTML(p.codigo)}">
      <div class="card-thumb aspect-wide">
        <div class="pattern"></div>
        <span class="badge ${cls}">${escapeHTML(estadoLabel(p.estadoFinal).split(" ")[0])}</span>
        <span class="initials" style="font-size:1.8rem">${escapeHTML(resultadoPartido(p))}</span>
      </div>
      <div class="card-body">
        <span class="kicker">${escapeHTML(p.torneo || p.ambito || "Partido")}</span>
        <span class="title">${escapeHTML(p.rival || "—")}</span>
        <span class="meta">${escapeHTML(fechaPartido(p))} · ${escapeHTML(condicionLabel(p.condicion))}</span>
      </div>
    </a>`;
}
function golCard(g) {
  const partido = LOOKUP.partidoByCodigo.get(g.codigo);
  const jug = g.jugador ? LOOKUP.jugadorByNombre.get(g.jugador) : null;
  const minTxt = g.minuto != null ? `${g.minuto}'` : "";
  return `
    <a class="card gol-card" href="#/partidos/${escapeHTML(g.codigo)}">
      <div class="card-thumb aspect-wide gol-thumb">
        <span class="badge">GOL ${escapeHTML(minTxt)}</span>
        <span class="initials" style="font-size:1.8rem">⚽</span>
      </div>
      <div class="card-body">
        <span class="kicker">${escapeHTML(g.tiempo || "—")} · ${escapeHTML(g.origen || "—")}</span>
        <span class="title">${escapeHTML(g.jugador ? g.jugador.replace(/^([^,]+),\s*(.+)$/, "$2 $1") : "—")}</span>
        <span class="meta">vs ${escapeHTML(partido?.rival || "—")} · ${escapeHTML(g.anio || "—")}</span>
      </div>
    </a>`;
}
function camisetaCard(c) {
  return `
    <a class="card" href="#/camisetas/${escapeHTML(c.id)}">
      <div class="card-thumb shirt-thumb aspect-tall">${shirtSVG({ size: 220 })}</div>
      <div class="card-body">
        <span class="kicker">${escapeHTML(c.tipo || "Camiseta")}</span>
        <span class="title">${escapeHTML(c.id)}</span>
        <span class="meta">${escapeHTML(c.marca && c.marca !== "S/M" ? c.marca : "—")}${c.enMuseo === "Sí" ? " · En el museo" : ""}</span>
      </div>
    </a>`;
}

// ===== Vistas =====
const Views = {
  // ---------- HOME ----------
  home() {
    const tj = DATA.jugadores.length;
    const tp = DATA.partidos.length;
    const tg = DATA.goles.length;
    const tc = DATA.camisetas.length;

    // Top 3 partidos icónicos: campeón Libertadores, Intercontinental, debut Maradona
    const iconCodigos = [19761020, 19851028, 19851208];
    const destacados = DATA.partidos
      .filter((p) => iconCodigos.includes(p.codigo))
      .concat(DATA.partidos.filter((p) => p.estadoFinal === "G" && p.torneo === "Libertadores").slice(0, 2))
      .slice(0, 3);
    const fallback = destacados.length >= 3 ? destacados : DATA.partidos.filter((p) => p.estadoFinal === "G").slice(0, 3);

    return `
      <section class="hero view-enter">
        <div class="container hero-inner">
          <div>
            <span class="hero-tag">Museo Virtual · 1904 — Hoy</span>
            <h1>Recorré más de 120 años de historia del <em>bicho</em>.</h1>
            <p class="lead">El archivo histórico de Argentinos Juniors hecho navegación. Jugadores, partidos, goles y camisetas, todo conectado: tocá lo que quieras y descubrí qué más hay detrás.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="#/sala">
                Entrar a la sala virtual
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
              <a class="btn btn-ghost" href="#/partidos">Explorar el archivo</a>
            </div>
          </div>
          <div class="hero-visual" aria-hidden="true">
            <div class="hero-ring"></div>
            <div class="hero-ring r2"></div>
            <div class="hero-ring r3"></div>
            <div class="hero-shield">
              <img src="escudo.svg" alt="Escudo oficial de Argentinos Juniors" />
            </div>
          </div>
        </div>

      </section>

      <section class="section view-enter">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Salas del museo</span>
            <h2>Elegí por dónde empezar</h2>
            <p>Todo está conectado. Tocá un jugador y vas a ver sus partidos y goles. Tocá un partido y ves quiénes lo jugaron y la camiseta usada. El archivo entero, un click a la vez.</p>
          </div>
          <div class="home-categories">
            <a class="cat-card" href="#/jugadores">
              <span class="arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
              <span class="cat-num">${tj}</span>
              <span class="cat-title">Jugadores</span>
              <span class="cat-desc">Todos los jugadores con ficha en el archivo del club.</span>
            </a>
            <a class="cat-card" href="#/partidos">
              <span class="arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
              <span class="cat-num">${tp}</span>
              <span class="cat-title">Partidos</span>
              <span class="cat-desc">Filtrá por década, rival, estadio, resultado.</span>
            </a>
            <a class="cat-card" href="#/goles">
              <span class="arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
              <span class="cat-num">${tg}</span>
              <span class="cat-title">Goles</span>
              <span class="cat-desc">Por jugador, tiempo, origen, parte del cuerpo.</span>
            </a>
            <a class="cat-card" href="#/camisetas">
              <span class="arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
              <span class="cat-num">${tc}</span>
              <span class="cat-title">Camisetas</span>
              <span class="cat-desc">120 años de identidad: rojo y blanco a través del tiempo.</span>
            </a>
          </div>
        </div>
      </section>

      <section class="section section-tight view-enter">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Destacados</span>
            <h2>Partidos para no olvidar</h2>
          </div>
          <div class="feature-grid">
            ${fallback.map(partidoCard).join("")}
          </div>
        </div>
      </section>
    `;
  },

  // ---------- JUGADORES (LIST) ----------
  jugadores() {
    const s = STATE.jugadores;
    const f = s.filters;
    const posiciones = ["Arquero", "Defensor", "Mediocampista", "Volante", "Delantero"];
    const nacionalidades = uniqueValues(DATA.jugadores, "nacionalidad");

    let items = DATA.jugadores.slice();
    if (f.posicion) items = items.filter((j) => j.posicion === f.posicion);
    if (f.nacionalidad) items = items.filter((j) => j.nacionalidad === f.nacionalidad);
    if (f.q) {
      const q = f.q.toLowerCase();
      items = items.filter((j) => (j.nombre || "").toLowerCase().includes(q));
    }
    items.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    const page = paginate(items, s.page, s.perPage);

    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/">← Volver al museo</a>
          <div class="section-head">
            <span class="eyebrow">Sala 01</span>
            <h1>Jugadores</h1>
            <p>${DATA.jugadores.length} jugadores con ficha en el archivo histórico del club. Filtrá por posición, nacionalidad o buscá por nombre.</p>
          </div>
          <div class="filters">
            ${searchFilter(f.q, "Buscar jugador…")}
            ${selectFilter("posicion", "Posición", posiciones.map((p) => ({ value: p, label: p })), f.posicion)}
            ${selectFilter("nacionalidad", "Nacionalidad", nacionalidades, f.nacionalidad)}
            <button class="filter-clear" data-clear>Limpiar</button>
          </div>
          ${
            page.items.length === 0
              ? `<div class="empty"><h3>No encontramos jugadores</h3><p>Probá ajustar los filtros.</p></div>`
              : `<div class="collection-grid">${page.items.map(jugadorCard).join("")}</div>`
          }
          ${pagerHTML(s, items.length)}
        </div>
      </section>`;
  },

  // ---------- JUGADOR (DETAIL) ----------
  jugador(id) {
    const j = DATA.jugadores.find((x) => x.id === id);
    if (!j) return Views.notFound("ese jugador");

    const golesJ = LOOKUP.golesByJugador.get(j.nombre) || [];
    const partsJ = LOOKUP.participacionesByJugador.get(j.nombre) || [];

    // Partidos en los que jugó
    const codigosPartidos = new Set(partsJ.map((p) => p.codigo));
    const partidosJ = Array.from(codigosPartidos)
      .map((c) => LOOKUP.partidoByCodigo.get(c))
      .filter(Boolean)
      .sort((a, b) => (b.codigo || 0) - (a.codigo || 0));

    // Camisetas vestidas (de los partidos donde jugó)
    const camisetaIds = new Set();
    partidosJ.forEach((p) => p.equipacion && camisetaIds.add(p.equipacion));
    const camisetasJ = Array.from(camisetaIds)
      .map((cid) => LOOKUP.camisetaById.get(cid))
      .filter(Boolean)
      .slice(0, 8);

    const nombreCorto = j.nombre.replace(/^([^,]+),\s*(.+)$/, "$2 $1");
    const periodos = (() => {
      if (partidosJ.length === 0) return null;
      const anios = partidosJ.map((p) => p.anio).filter(Boolean).sort();
      if (anios.length === 0) return null;
      return `${anios[0]} — ${anios[anios.length - 1]}`;
    })();

    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/jugadores">← Volver a jugadores</a>
          <div class="detail">
            <div>
              <div class="detail-hero">
                <div class="detail-portrait">
                  <div class="pattern"></div>
                  <span class="initials">${escapeHTML(j.iniciales)}</span>
                </div>
                <div class="detail-meta">
                  <span class="eyebrow">Jugador</span>
                  <h1>${escapeHTML(nombreCorto)}</h1>
                  <p>${escapeHTML(j.posicion || "—")}${j.nacionalidad ? " · " + escapeHTML(j.nacionalidad) : ""}${periodos ? " · " + escapeHTML(periodos) : ""}</p>
                  <div class="fact-grid">
                    <div class="fact"><div class="lbl">Partidos</div><div class="val">${partidosJ.length}</div></div>
                    <div class="fact"><div class="lbl">Goles</div><div class="val">${golesJ.length}</div></div>
                    ${j.equipoFormativo ? `<div class="fact"><div class="lbl">Formado en</div><div class="val">${escapeHTML(j.equipoFormativo)}</div></div>` : ""}
                  </div>
                </div>
              </div>

              ${
                golesJ.length
                  ? `<div class="detail-section">
                      <h2>Goles (${golesJ.length})</h2>
                      <table class="table"><thead><tr><th>Partido</th><th>Tiempo</th><th>Min</th><th>Origen</th></tr></thead><tbody>
                        ${golesJ
                          .slice(0, 30)
                          .map((g) => {
                            const p = LOOKUP.partidoByCodigo.get(g.codigo);
                            return `<tr>
                              <td><a href="#/partidos/${escapeHTML(g.codigo)}">vs ${escapeHTML(p?.rival || "—")}</a> <span class="muted">${escapeHTML(fechaPartido(p || {}))}</span></td>
                              <td>${escapeHTML(g.tiempo || "—")}</td>
                              <td>${escapeHTML(g.minuto != null ? g.minuto + "'" : "—")}</td>
                              <td>${escapeHTML(g.origen || "—")}</td>
                            </tr>`;
                          })
                          .join("")}
                      </tbody></table>
                      ${golesJ.length > 30 ? `<p class="muted" style="margin-top:0.8rem">Mostrando 30 de ${golesJ.length}.</p>` : ""}
                    </div>`
                  : ""
              }

              ${
                partidosJ.length
                  ? `<div class="detail-section">
                      <h2>Partidos jugados (${partidosJ.length})</h2>
                      <table class="table"><thead><tr><th>Fecha</th><th>Rival</th><th>Cond.</th><th>Resultado</th><th></th></tr></thead><tbody>
                        ${partidosJ
                          .slice(0, 40)
                          .map(
                            (p) => `
                          <tr>
                            <td>${escapeHTML(fechaPartido(p))}</td>
                            <td><a href="#/partidos/${escapeHTML(p.codigo)}">${escapeHTML(p.rival || "—")}</a></td>
                            <td>${escapeHTML(condicionLabel(p.condicion))}</td>
                            <td class="col-result">${escapeHTML(resultadoPartido(p))}</td>
                            <td><span class="tag ${normalizeEstado(p.estadoFinal)}">${escapeHTML(estadoLabel(p.estadoFinal))}</span></td>
                          </tr>`
                          )
                          .join("")}
                      </tbody></table>
                      ${partidosJ.length > 40 ? `<p class="muted" style="margin-top:0.8rem">Mostrando 40 de ${partidosJ.length}.</p>` : ""}
                    </div>`
                  : ""
              }
            </div>

            <aside class="aside">
              ${
                camisetasJ.length
                  ? `<div class="aside-block">
                      <h3>Camisetas vestidas</h3>
                      <ul class="aside-list">
                        ${camisetasJ
                          .map(
                            (c) => `
                          <li><a href="#/camisetas/${escapeHTML(c.id)}">
                            <span class="mini-thumb shirt">${shirtSVG({ size: 36 })}</span>
                            <span class="ml-info">${escapeHTML(c.id)}<small>${escapeHTML(c.tipo || "—")}</small></span>
                          </a></li>`
                          )
                          .join("")}
                      </ul>
                    </div>`
                  : ""
              }
            </aside>
          </div>
        </div>
      </section>`;
  },

  // ---------- PARTIDOS (LIST) ----------
  partidos() {
    const s = STATE.partidos;
    const f = s.filters;

    const decadas = [];
    {
      const ds = new Set(DATA.partidos.map((p) => decadaOf(p.anio)).filter(Boolean));
      Array.from(ds)
        .sort((a, b) => b - a)
        .forEach((d) => decadas.push({ value: String(d), label: `${d}s` }));
    }
    const anios = uniqueValues(DATA.partidos, "anio");
    const meses = Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: monthName(i + 1),
    }));
    const dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"].map(
      (d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) })
    );
    const estados = [
      { value: "G", label: "Victoria" },
      { value: "E", label: "Empate" },
      { value: "P", label: "Derrota" },
    ];
    const condiciones = [
      { value: "L", label: "Local" },
      { value: "V", label: "Visitante" },
      { value: "N", label: "Neutral" },
    ];
    const rivales = uniqueValues(DATA.partidos, "rival").slice(0, 200);
    const estadios = uniqueValues(DATA.partidos, "estadio");

    let items = DATA.partidos.slice();
    if (f.decada) items = items.filter((p) => String(decadaOf(p.anio)) === f.decada);
    if (f.anio) items = items.filter((p) => String(p.anio) === f.anio);
    if (f.mes) items = items.filter((p) => String(p.mes) === f.mes);
    if (f.rival) items = items.filter((p) => p.rival === f.rival);
    if (f.estadio) items = items.filter((p) => p.estadio === f.estadio);
    if (f.dia) items = items.filter((p) => p.diaSemana === f.dia);
    if (f.estado) items = items.filter((p) => (p.estadoFinal || "").startsWith(f.estado));
    if (f.condicion) items = items.filter((p) => p.condicion === f.condicion);
    if (f.q) {
      const q = f.q.toLowerCase();
      items = items.filter(
        (p) =>
          (p.rival || "").toLowerCase().includes(q) ||
          (p.estadio || "").toLowerCase().includes(q) ||
          (p.torneo || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => (b.codigo || 0) - (a.codigo || 0));
    const page = paginate(items, s.page, s.perPage);

    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/">← Volver al museo</a>
          <div class="section-head">
            <span class="eyebrow">Sala 02</span>
            <h1>Partidos</h1>
            <p>${DATA.partidos.length} partidos del archivo digitalizado del club, desde 1961 hasta hoy. Filtrá por época, rival, estadio o resultado.</p>
          </div>
          <div class="filters">
            ${searchFilter(f.q, "Rival, estadio, torneo…")}
            ${selectFilter("decada", "Década", decadas, f.decada)}
            ${selectFilter("anio", "Año", anios, f.anio)}
            ${selectFilter("mes", "Mes", meses, f.mes)}
            ${selectFilter("estado", "Resultado", estados, f.estado)}
            ${selectFilter("condicion", "Condición", condiciones, f.condicion)}
            ${selectFilter("dia", "Día", dias, f.dia)}
            ${selectFilter("rival", "Rival", rivales, f.rival)}
            ${selectFilter("estadio", "Estadio", estadios, f.estadio)}
            <button class="filter-clear" data-clear>Limpiar</button>
          </div>
          ${
            page.items.length === 0
              ? `<div class="empty"><h3>No encontramos partidos</h3><p>Probá ajustar los filtros.</p></div>`
              : `<div class="collection-grid">${page.items.map(partidoCard).join("")}</div>`
          }
          ${pagerHTML(s, items.length)}
        </div>
      </section>`;
  },

  // ---------- PARTIDO (DETAIL) ----------
  partido(id) {
    const codigo = parseInt(id, 10);
    const p = LOOKUP.partidoByCodigo.get(codigo);
    if (!p) return Views.notFound("ese partido");

    const goles = (LOOKUP.golesByPartido.get(codigo) || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const parts = LOOKUP.participacionesByPartido.get(codigo) || [];
    const titulares = parts.filter((x) => x.titular);
    const suplentes = parts.filter((x) => !x.titular);
    const camiseta = p.equipacion ? LOOKUP.camisetaById.get(p.equipacion) : null;

    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/partidos">← Volver a partidos</a>
          <div class="detail">
            <div>
              <div class="detail-hero">
                <div class="detail-portrait">
                  <div class="pattern"></div>
                  <span class="initials" style="font-size:3rem">${escapeHTML(resultadoPartido(p))}</span>
                </div>
                <div class="detail-meta">
                  <span class="eyebrow">${escapeHTML(p.torneo || p.ambito || "Partido")}${p.fase ? " · " + escapeHTML(p.fase) : ""}${p.fechaIda ? " · " + escapeHTML(p.fechaIda) : ""}</span>
                  <h1>${escapeHTML(p.rival || "—")}</h1>
                  <p>${escapeHTML(fechaPartido(p))}${p.diaSemana ? " (" + escapeHTML(p.diaSemana) + ")" : ""} · ${escapeHTML(condicionLabel(p.condicion))}</p>
                  <div class="fact-grid">
                    <div class="fact"><div class="lbl">Resultado</div><div class="val"><span class="tag ${normalizeEstado(p.estadoFinal)}">${escapeHTML(estadoLabel(p.estadoFinal))}</span></div></div>
                    ${p.estadio ? `<div class="fact"><div class="lbl">Estadio</div><div class="val" style="font-size:0.95rem">${escapeHTML(p.estadio)}</div></div>` : ""}
                    ${p.entrenador ? `<div class="fact"><div class="lbl">DT</div><div class="val" style="font-size:0.95rem">${escapeHTML(p.entrenador)}</div></div>` : ""}
                    ${p.arbitro ? `<div class="fact"><div class="lbl">Árbitro</div><div class="val" style="font-size:0.95rem">${escapeHTML(p.arbitro)}</div></div>` : ""}
                  </div>
                </div>
              </div>

              ${
                goles.length
                  ? `<div class="detail-section">
                      <h2>Goles del partido</h2>
                      <table class="table"><thead><tr><th>#</th><th>Min</th><th>Tiempo</th><th>Jugador</th><th>Origen</th><th>Parcial</th></tr></thead><tbody>
                        ${goles
                          .map((g) => {
                            const jugObj = g.jugador ? LOOKUP.jugadorByNombre.get(g.jugador) : null;
                            return `<tr>
                              <td>${escapeHTML(g.orden || "")}</td>
                              <td>${escapeHTML(g.minuto != null ? g.minuto + "'" : "—")}</td>
                              <td>${escapeHTML(g.tiempo || "—")}</td>
                              <td>${jugObj ? `<a href="#/jugadores/${escapeHTML(jugObj.id)}">${escapeHTML(g.jugador)}</a>` : escapeHTML(g.jugador || "—")}</td>
                              <td>${escapeHTML([g.origen, g.cuerpo, g.distancia].filter((x) => x && x !== "-").join(" · ") || "—")}</td>
                              <td class="col-result">${escapeHTML(g.resParcial || "—")}</td>
                            </tr>`;
                          })
                          .join("")}
                      </tbody></table>
                    </div>`
                  : ""
              }

              ${
                titulares.length
                  ? `<div class="detail-section">
                      <h2>Plantel del partido</h2>
                      <h3 style="font-family:Inter,sans-serif;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.14em;color:var(--rojo);margin-bottom:0.6rem">Titulares</h3>
                      <ul class="player-list">
                        ${titulares.map((t) => {
                          const j = LOOKUP.jugadorByNombre.get(t.jugador);
                          return `<li>${j ? `<a href="#/jugadores/${escapeHTML(j.id)}">${escapeHTML(t.jugador)}</a>` : escapeHTML(t.jugador || "—")}${t.dorsal ? ` <span class="muted">#${t.dorsal}</span>` : ""}</li>`;
                        }).join("")}
                      </ul>
                      ${
                        suplentes.length
                          ? `<h3 style="font-family:Inter,sans-serif;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.14em;color:var(--rojo);margin-bottom:0.6rem;margin-top:1.2rem">Ingresaron</h3>
                            <ul class="player-list">
                              ${suplentes.map((t) => {
                                const j = LOOKUP.jugadorByNombre.get(t.jugador);
                                return `<li>${j ? `<a href="#/jugadores/${escapeHTML(j.id)}">${escapeHTML(t.jugador)}</a>` : escapeHTML(t.jugador || "—")}</li>`;
                              }).join("")}
                            </ul>`
                          : ""
                      }
                    </div>`
                  : ""
              }
            </div>

            <aside class="aside">
              ${
                camiseta
                  ? `<div class="aside-block">
                      <h3>Camiseta usada</h3>
                      <ul class="aside-list">
                        <li><a href="#/camisetas/${escapeHTML(camiseta.id)}">
                          <span class="mini-thumb shirt">${shirtSVG({ size: 36 })}</span>
                          <span class="ml-info">${escapeHTML(camiseta.id)}<small>${escapeHTML(camiseta.tipo || "—")}</small></span>
                        </a></li>
                      </ul>
                    </div>`
                  : ""
              }
              <div class="aside-block">
                <h3>Datos del partido</h3>
                <dl class="defs">
                  ${p.estadio ? `<dt>Estadio</dt><dd>${escapeHTML(p.estadio)}</dd>` : ""}
                  ${p.totalMin ? `<dt>Minutos</dt><dd>${escapeHTML(p.totalMin)}</dd>` : ""}
                  ${p.penalesC != null || p.penalesR != null ? `<dt>Penales</dt><dd>${escapeHTML(p.penalesC || 0)} - ${escapeHTML(p.penalesR || 0)}</dd>` : ""}
                  ${p.obs ? `<dt>Notas</dt><dd>${escapeHTML(p.obs)}</dd>` : ""}
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </section>`;
  },

  // ---------- GOLES (LIST) ----------
  goles() {
    const s = STATE.goles;
    const f = s.filters;

    const anios = uniqueValues(DATA.goles, "anio");
    const meses = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName(i + 1) }));
    const tiempos = [
      { value: "Primer Tiempo", label: "Primer tiempo" },
      { value: "Segundo Tiempo", label: "Segundo tiempo" },
    ];
    const cuerpos = [
      { value: "Pie", label: "Pie" },
      { value: "Cabeza", label: "Cabeza" },
    ];
    const origenes = uniqueValues(DATA.goles, "origen").filter((o) => o.value !== "-");
    const distancias = uniqueValues(DATA.goles, "distancia").filter((d) => d.value !== "-");
    const jugadoresGoleadores = uniqueValues(DATA.goles, "jugador").slice(0, 200);

    let items = DATA.goles.slice();
    if (f.anio) items = items.filter((g) => String(g.anio) === f.anio);
    if (f.mes) items = items.filter((g) => String(g.mes) === f.mes);
    if (f.jugador) items = items.filter((g) => g.jugador === f.jugador);
    if (f.tiempo) items = items.filter((g) => g.tiempo === f.tiempo);
    if (f.cuerpo) items = items.filter((g) => g.cuerpo === f.cuerpo);
    if (f.origen) items = items.filter((g) => g.origen === f.origen);
    if (f.distancia) items = items.filter((g) => g.distancia === f.distancia);
    if (f.q) {
      const q = f.q.toLowerCase();
      items = items.filter(
        (g) =>
          (g.jugador || "").toLowerCase().includes(q) ||
          (LOOKUP.partidoByCodigo.get(g.codigo)?.rival || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => (b.codigo || 0) - (a.codigo || 0) || (a.orden || 0) - (b.orden || 0));
    const page = paginate(items, s.page, s.perPage);

    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/">← Volver al museo</a>
          <div class="section-head">
            <span class="eyebrow">Sala 03</span>
            <h1>Goles</h1>
            <p>${DATA.goles.length} goles del archivo del club, con datos de jugador, tiempo, parte del cuerpo, origen y distancia.</p>
          </div>
          <div class="filters">
            ${searchFilter(f.q, "Jugador, rival…")}
            ${selectFilter("anio", "Año", anios, f.anio)}
            ${selectFilter("mes", "Mes", meses, f.mes)}
            ${selectFilter("jugador", "Jugador", jugadoresGoleadores, f.jugador)}
            ${selectFilter("tiempo", "Tiempo", tiempos, f.tiempo)}
            ${selectFilter("cuerpo", "Pie / cabeza", cuerpos, f.cuerpo)}
            ${selectFilter("origen", "Origen", origenes, f.origen)}
            ${selectFilter("distancia", "Distancia", distancias, f.distancia)}
            <button class="filter-clear" data-clear>Limpiar</button>
          </div>
          ${
            page.items.length === 0
              ? `<div class="empty"><h3>No encontramos goles</h3><p>Probá ajustar los filtros.</p></div>`
              : `<div class="collection-grid">${page.items.map(golCard).join("")}</div>`
          }
          ${pagerHTML(s, items.length)}
        </div>
      </section>`;
  },

  // ---------- CAMISETAS (LIST) ----------
  camisetas() {
    const s = STATE.camisetas;
    const f = s.filters;

    const tipos = uniqueValues(DATA.camisetas, "tipo");
    const marcas = uniqueValues(DATA.camisetas, "marca").filter((m) => m.value !== "S/M");

    let items = DATA.camisetas.slice();
    if (f.tipo) items = items.filter((c) => c.tipo === f.tipo);
    if (f.marca) items = items.filter((c) => c.marca === f.marca);
    if (f.q) {
      const q = f.q.toLowerCase();
      items = items.filter((c) => (c.id || "").toLowerCase().includes(q));
    }
    items.sort((a, b) => (b.id || "").localeCompare(a.id || ""));
    const page = paginate(items, s.page, s.perPage);

    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/">← Volver al museo</a>
          <div class="section-head">
            <span class="eyebrow">Sala 04</span>
            <h1>Camisetas</h1>
            <p>${DATA.camisetas.length} camisetas del archivo del club: titulares, alternativas, de arquero, edición libertadores. Filtrá por tipo o marca.</p>
          </div>
          <div class="filters">
            ${searchFilter(f.q, "ID camiseta…")}
            ${selectFilter("tipo", "Tipo", tipos, f.tipo)}
            ${selectFilter("marca", "Marca", marcas, f.marca)}
            <button class="filter-clear" data-clear>Limpiar</button>
          </div>
          ${
            page.items.length === 0
              ? `<div class="empty"><h3>No encontramos camisetas</h3><p>Probá ajustar los filtros.</p></div>`
              : `<div class="collection-grid">${page.items.map(camisetaCard).join("")}</div>`
          }
          ${pagerHTML(s, items.length)}
        </div>
      </section>`;
  },

  // ---------- CAMISETA (DETAIL) ----------
  camiseta(id) {
    const c = LOOKUP.camisetaById.get(id);
    if (!c) return Views.notFound("esa camiseta");

    const partidosConCamiseta = DATA.partidos
      .filter((p) => p.equipacion === c.id)
      .sort((a, b) => (b.codigo || 0) - (a.codigo || 0));

    // Jugadores que vistieron esta camiseta (de las participaciones de esos partidos)
    const jugSet = new Set();
    partidosConCamiseta.forEach((p) => {
      (LOOKUP.participacionesByPartido.get(p.codigo) || []).forEach((pa) => jugSet.add(pa.jugador));
    });
    const jugadoresUsaron = Array.from(jugSet)
      .filter(Boolean)
      .map((nombre) => LOOKUP.jugadorByNombre.get(nombre))
      .filter(Boolean)
      .slice(0, 12);

    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/camisetas">← Volver a camisetas</a>
          <div class="detail">
            <div>
              <div class="detail-hero">
                <div class="detail-portrait shirt">${shirtSVG({ size: 260 })}</div>
                <div class="detail-meta">
                  <span class="eyebrow">Camiseta</span>
                  <h1>${escapeHTML(c.id)}</h1>
                  <p>${escapeHTML(c.tipo || "—")}${c.marca && c.marca !== "S/M" ? " · " + escapeHTML(c.marca) : ""}${c.enMuseo === "Sí" ? " · En el museo" : ""}</p>
                  <div class="fact-grid">
                    <div class="fact"><div class="lbl">Partidos</div><div class="val">${partidosConCamiseta.length}</div></div>
                    <div class="fact"><div class="lbl">Jugadores</div><div class="val">${jugadoresUsaron.length}</div></div>
                    ${c.escudo ? `<div class="fact"><div class="lbl">Escudo</div><div class="val">${escapeHTML(c.escudo)}</div></div>` : ""}
                  </div>
                </div>
              </div>

              ${
                partidosConCamiseta.length
                  ? `<div class="detail-section">
                      <h2>Partidos en los que se vistió</h2>
                      <table class="table"><thead><tr><th>Fecha</th><th>Rival</th><th>Resultado</th></tr></thead><tbody>
                        ${partidosConCamiseta
                          .slice(0, 30)
                          .map(
                            (p) => `
                          <tr>
                            <td>${escapeHTML(fechaPartido(p))}</td>
                            <td><a href="#/partidos/${escapeHTML(p.codigo)}">${escapeHTML(p.rival || "—")}</a></td>
                            <td class="col-result">${escapeHTML(resultadoPartido(p))}</td>
                          </tr>`
                          )
                          .join("")}
                      </tbody></table>
                      ${partidosConCamiseta.length > 30 ? `<p class="muted" style="margin-top:0.8rem">Mostrando 30 de ${partidosConCamiseta.length}.</p>` : ""}
                    </div>`
                  : ""
              }
            </div>

            <aside class="aside">
              ${
                jugadoresUsaron.length
                  ? `<div class="aside-block">
                      <h3>Jugadores que la vistieron</h3>
                      <ul class="aside-list">
                        ${jugadoresUsaron
                          .map(
                            (j) => `
                          <li><a href="#/jugadores/${escapeHTML(j.id)}">
                            <span class="mini-thumb">${escapeHTML(j.iniciales)}</span>
                            <span class="ml-info">${escapeHTML(j.nombre)}<small>${escapeHTML(j.posicion || "—")}</small></span>
                          </a></li>`
                          )
                          .join("")}
                      </ul>
                    </div>`
                  : ""
              }
            </aside>
          </div>
        </div>
      </section>`;
  },

  // ---------- SALA VIRTUAL ----------
  sala() {
    const countBy = (arr, keyFn) => {
      const m = new Map();
      for (const it of arr) {
        const k = keyFn(it);
        if (k == null || k === "") continue;
        m.set(k, (m.get(k) || 0) + 1);
      }
      return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    };

    const topCapitanes = countBy(DATA.participaciones, (p) => p.jugador).slice(0, 10);
    const topGoleadores = countBy(
      DATA.goles.filter((g) => g.jugador !== "En contra"),
      (g) => g.jugador
    ).slice(0, 10);
    const topEstadios = countBy(DATA.partidos, (p) => p.estadio).slice(0, 10);
    const topRivales = countBy(DATA.partidos, (p) => p.rival).slice(0, 10);
    const topCamisetas = countBy(DATA.partidos, (p) => p.equipacion).slice(0, 8);

    // Partidos icónicos (selección curada por código + fallback)
    const iconicCodes = new Set([
      19761020, // Debut de Maradona
      19851208, // Final Intercontinental vs Juventus
    ]);
    const iconicos = DATA.partidos.filter((p) => iconicCodes.has(p.codigo));
    // Final Libertadores 85 (cualquier partido de Libertadores 1985)
    const libertadores85 = DATA.partidos.filter(
      (p) =>
        p.anio === 1985 &&
        (p.torneo || "").toLowerCase().includes("libertadores")
    );
    if (libertadores85[0]) iconicos.push(libertadores85[0]);
    // Clausura 2010 (algún partido del campeonato 2010)
    const finales2010 = DATA.partidos.filter(
      (p) => p.anio === 2010 && p.estadoFinal === "G" && (p.torneo || "").toLowerCase().includes("clausura")
    );
    if (finales2010[0]) iconicos.push(finales2010[0]);
    // Mejor partido reciente con buen resultado
    const recientesG = DATA.partidos.filter(
      (p) => p.anio >= 2020 && p.estadoFinal === "G" && p.gh >= 3
    );
    if (recientesG[0]) iconicos.push(recientesG[0]);

    const rankItem = (rank, label, sublabel, count, href, kicker) => `
      <a class="rank-row" href="${href}">
        <span class="rank-num">${String(rank).padStart(2, "0")}</span>
        <span class="rank-info">
          <span class="rank-kicker">${escapeHTML(kicker || "")}</span>
          <span class="rank-name">${escapeHTML(label)}</span>
          ${sublabel ? `<span class="rank-sub">${escapeHTML(sublabel)}</span>` : ""}
        </span>
        <span class="rank-count">${count}<small>${count === 1 ? " · partido" : count > 999 ? "" : " · partidos"}</small></span>
      </a>`;

    return `
      <main class="sala-page">

        <!-- COVER -->
        <section class="sala-cover">
          <div class="sala-cover-bg" aria-hidden="true">
            <img src="escudo.svg" alt="" />
          </div>
          <div class="container sala-cover-inner sala-reveal">
            <span class="eyebrow" style="color:var(--dorado-claro)">Sala virtual del museo</span>
            <h1>Las leyendas del <em>Bicho</em>.</h1>
            <p class="lead">Un recorrido por los nombres, los estadios, los rivales y los partidos que escribieron 120 años de historia. Tocá lo que quieras y abrí su archivo completo.</p>
            <div class="sala-cover-cta">
              <span class="muted">Desplazate para empezar</span>
              <span class="sala-arrow">↓</span>
            </div>
          </div>
          <a class="sala-back" href="#/">← Volver al museo</a>
        </section>

        <!-- CAPÍTULO 01: CAPITANES -->
        <section class="sala-chapter sala-chapter--papel">
          <div class="container">
            <div class="sala-chapter-head sala-reveal">
              <span class="chapter-num">01</span>
              <h2>Los que más vistieron la camiseta</h2>
              <p class="lead">El plantel histórico ordenado por participaciones registradas. Los nombres que más veces saltaron al campo con la cinta del Bicho.</p>
            </div>
            <div class="rank-list sala-reveal">
              ${topCapitanes
                .map(([nombre, count], i) => {
                  const j = LOOKUP.jugadorByNombre.get(nombre);
                  const href = j ? `#/jugadores/${j.id}` : "#/jugadores";
                  const display = nombre.replace(/^([^,]+),\s*(.+)$/, "$2 $1");
                  return rankItem(i + 1, display, j?.posicion, count, href, "Jugador");
                })
                .join("")}
            </div>
          </div>
        </section>

        <!-- CAPÍTULO 02: GOLEADORES -->
        <section class="sala-chapter sala-chapter--hueso">
          <div class="container">
            <div class="sala-chapter-head sala-reveal">
              <span class="chapter-num">02</span>
              <h2>Los que hicieron historia con goles</h2>
              <p class="lead">Los máximos goleadores del archivo. Cada gol con su minuto, su tiempo, su origen y su jugador en el archivo del museo.</p>
            </div>
            <div class="rank-list sala-reveal">
              ${topGoleadores
                .map(([nombre, count], i) => {
                  const j = LOOKUP.jugadorByNombre.get(nombre);
                  const href = j ? `#/jugadores/${j.id}` : `#/goles`;
                  const display = nombre.replace(/^([^,]+),\s*(.+)$/, "$2 $1");
                  return `
                    <a class="rank-row" href="${href}">
                      <span class="rank-num">${String(i + 1).padStart(2, "0")}</span>
                      <span class="rank-info">
                        <span class="rank-kicker">Goleador</span>
                        <span class="rank-name">${escapeHTML(display)}</span>
                        ${j?.posicion ? `<span class="rank-sub">${escapeHTML(j.posicion)}</span>` : ""}
                      </span>
                      <span class="rank-count">${count}<small> · goles</small></span>
                    </a>`;
                })
                .join("")}
            </div>
          </div>
        </section>

        <!-- CAPÍTULO 03: TEMPLOS -->
        <section class="sala-chapter sala-chapter--dark">
          <div class="container">
            <div class="sala-chapter-head sala-reveal">
              <span class="chapter-num">03</span>
              <h2>Templos del Bicho</h2>
              <p class="lead">Los estadios donde Argentinos escribió su historia. Desde La Paternal hasta los más visitados de visitante.</p>
            </div>
            <div class="rank-list sala-reveal">
              ${topEstadios
                .map(([estadio, count], i) => {
                  const href = `#/partidos`;
                  return `
                    <a class="rank-row" href="${href}" data-filter-set='{"section":"partidos","estadio":${JSON.stringify(estadio)}}'>
                      <span class="rank-num">${String(i + 1).padStart(2, "0")}</span>
                      <span class="rank-info">
                        <span class="rank-kicker">Estadio</span>
                        <span class="rank-name">${escapeHTML(estadio)}</span>
                      </span>
                      <span class="rank-count">${count}<small> · partidos</small></span>
                    </a>`;
                })
                .join("")}
            </div>
          </div>
        </section>

        <!-- CAPÍTULO 04: RIVALIDADES -->
        <section class="sala-chapter sala-chapter--papel">
          <div class="container">
            <div class="sala-chapter-head sala-reveal">
              <span class="chapter-num">04</span>
              <h2>Las rivalidades</h2>
              <p class="lead">Los clásicos que más se jugaron en estos años. Cada nombre carga partidos eternos y noches inolvidables.</p>
            </div>
            <div class="rank-list sala-reveal">
              ${topRivales
                .map(([rival, count], i) => `
                  <a class="rank-row" href="#/partidos" data-filter-set='{"section":"partidos","rival":${JSON.stringify(rival)}}'>
                    <span class="rank-num">${String(i + 1).padStart(2, "0")}</span>
                    <span class="rank-info">
                      <span class="rank-kicker">Rival</span>
                      <span class="rank-name">${escapeHTML(rival)}</span>
                    </span>
                    <span class="rank-count">${count}<small> · cruces</small></span>
                  </a>`)
                .join("")}
            </div>
          </div>
        </section>

        <!-- CAPÍTULO 05: PARTIDOS ETERNOS -->
        <section class="sala-chapter sala-chapter--hueso">
          <div class="container">
            <div class="sala-chapter-head sala-reveal">
              <span class="chapter-num">05</span>
              <h2>Partidos eternos</h2>
              <p class="lead">Los días que el Bicho se volvió leyenda. Una selección curada de partidos que vale la pena recordar.</p>
            </div>
            <div class="iconic-grid sala-reveal">
              ${iconicos
                .map(
                  (p) => `
                <a class="iconic-card iconic-${normalizeEstado(p.estadoFinal)}" href="#/partidos/${escapeHTML(p.codigo)}">
                  <div class="iconic-bg"></div>
                  <div class="iconic-content">
                    <span class="iconic-year">${p.anio || ""}</span>
                    <span class="iconic-result">${escapeHTML(resultadoPartido(p))}</span>
                    <span class="iconic-rival">vs ${escapeHTML(p.rival || "—")}</span>
                    <span class="iconic-meta">${escapeHTML(p.torneo || p.ambito || "Partido")} · ${escapeHTML(estadoLabel(p.estadoFinal))}</span>
                  </div>
                </a>`
                )
                .join("")}
            </div>
          </div>
        </section>

        <!-- CAPÍTULO 06: CAMISETAS -->
        <section class="sala-chapter sala-chapter--dark">
          <div class="container">
            <div class="sala-chapter-head sala-reveal">
              <span class="chapter-num">06</span>
              <h2>Casacas que vistieron a los grandes equipos</h2>
              <p class="lead">Las camisetas con más partidos en el archivo. La identidad del club en el tiempo: rojo y blanco a través de las décadas.</p>
            </div>
            <div class="iconic-shirts sala-reveal">
              ${topCamisetas
                .map(([id, count]) => {
                  const c = LOOKUP.camisetaById.get(id);
                  return `
                    <a class="shirt-card" href="#/camisetas/${escapeHTML(id)}">
                      <div class="shirt-card-thumb">${shirtSVG({ size: 200 })}</div>
                      <div class="shirt-card-body">
                        <span class="shirt-card-id">${escapeHTML(id)}</span>
                        <span class="shirt-card-meta">${escapeHTML(c?.tipo || "—")}${c?.marca && c.marca !== "S/M" ? " · " + escapeHTML(c.marca) : ""}</span>
                        <span class="shirt-card-count">${count}<small> partidos</small></span>
                      </div>
                    </a>`;
                })
                .join("")}
            </div>
          </div>
        </section>

        <!-- OUTRO -->
        <section class="sala-chapter sala-chapter--papel sala-outro">
          <div class="container sala-reveal">
            <span class="eyebrow">Esto recién empieza</span>
            <h2>El archivo entero, a un click.</h2>
            <p class="lead">Lo que viste son los rankings. Hay 805 partidos, 1.035 goles, 284 jugadores y 122 camisetas esperando. Cada pieza conecta con todas las demás.</p>
            <div class="sala-outro-cta">
              <a class="btn btn-primary" href="#/partidos">Explorar todos los partidos</a>
              <a class="btn btn-ghost" href="#/jugadores">Ver jugadores</a>
              <a class="btn btn-ghost" href="#/hitos">Línea de tiempo</a>
            </div>
          </div>
        </section>

      </main>
    `;
  },

  // ---------- HITOS (TIMELINE) ----------
  hitos() {
    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/">← Volver al museo</a>
          <div class="section-head">
            <span class="eyebrow">Sala 05</span>
            <h1>Línea de tiempo</h1>
            <p>Los hitos que marcaron al Bicho desde 1904, con la narrativa oficial del club por Hugo Frasso.</p>
          </div>
          <div class="timeline">
            ${DATA.hitos
              .map(
                (h) => `
              <div class="timeline-item">
                <span class="year">${h.anio || "··"}</span>
                <h3>${escapeHTML(h.titulo)}</h3>
                <p>${escapeHTML(h.descripcion)}</p>
              </div>`
              )
              .join("")}
          </div>
        </div>
      </section>`;
  },

  // ---------- 404 ----------
  notFound(que) {
    return `
      <section class="section view-enter">
        <div class="container">
          <div class="empty">
            <h3>No encontramos ${escapeHTML(que || "esa pieza")}</h3>
            <p>Quizá fue movida a otra sala. <a href="#/">Volver al museo</a>.</p>
          </div>
        </div>
      </section>`;
  },
};

// ===== Router =====
function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  return { route: parts[0] || "home", id: parts[1] ? decodeURIComponent(parts[1]) : null };
}

function render(opts = {}) {
  const { route, id } = parseHash();
  let html;
  switch (route) {
    case "home":
    case "":
      html = Views.home();
      break;
    case "jugadores":
      html = id ? Views.jugador(id) : Views.jugadores();
      break;
    case "partidos":
      html = id ? Views.partido(id) : Views.partidos();
      break;
    case "goles":
      html = Views.goles();
      break;
    case "camisetas":
      html = id ? Views.camiseta(id) : Views.camisetas();
      break;
    case "hitos":
      html = Views.hitos();
      break;
    case "sala":
      html = Views.sala();
      break;
    default:
      html = Views.notFound("esta sección");
  }
  $app().innerHTML = html;
  document.querySelectorAll(".site-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === route);
  });
  document.querySelector(".site-nav")?.classList.remove("is-open");
  if (!opts.preserveScroll) window.scrollTo({ top: 0, behavior: "instant" });
  // Reveal on scroll para la sala
  setupRevealObserver();
}

// IntersectionObserver para fade-in en .sala-reveal
let _revealObs = null;
function setupRevealObserver() {
  const els = document.querySelectorAll(".sala-reveal");
  if (els.length === 0) return;
  if (_revealObs) _revealObs.disconnect();
  _revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in-view");
          _revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
  );
  els.forEach((el) => _revealObs.observe(el));
}

function currentSectionState() {
  const { route } = parseHash();
  return STATE[route];
}

// ===== Init =====
window.addEventListener("hashchange", () => {
  // Cuando cambia de sección, resetear página a 1 (no resetear filtros)
  const s = currentSectionState();
  if (s) s.page = 1;
  render();
});

window.addEventListener("DOMContentLoaded", () => {
  bootData();

  // Nav toggle (mobile)
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Filtros: select change
  document.addEventListener("change", (e) => {
    const sel = e.target.closest(".filter-select");
    if (sel) {
      const s = currentSectionState();
      if (!s) return;
      const name = sel.dataset.filter;
      s.filters[name] = sel.value;
      s.page = 1;
      render({ preserveScroll: true });
    }
  });

  // Filtros: search input (debounced)
  let searchTimer;
  document.addEventListener("input", (e) => {
    const inp = e.target.closest(".filter-search");
    if (inp) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const s = currentSectionState();
        if (!s) return;
        s.filters.q = inp.value;
        s.page = 1;
        const focused = document.activeElement === inp;
        const cursorPos = inp.selectionStart;
        render({ preserveScroll: true });
        if (focused) {
          const newInp = document.querySelector(".filter-search");
          if (newInp) {
            newInp.focus();
            try {
              newInp.setSelectionRange(cursorPos, cursorPos);
            } catch (_) {}
          }
        }
      }, 220);
    }
  });

  // Pre-set de filtros desde la sala (rankings)
  document.addEventListener("click", (e) => {
    const fset = e.target.closest("[data-filter-set]");
    if (!fset) return;
    try {
      const cfg = JSON.parse(fset.dataset.filterSet);
      const section = cfg.section;
      if (section && STATE[section]) {
        // Reset all filters first
        Object.keys(STATE[section].filters).forEach((k) => (STATE[section].filters[k] = ""));
        // Apply only those given
        Object.keys(cfg).forEach((k) => {
          if (k !== "section" && k in STATE[section].filters) {
            STATE[section].filters[k] = cfg[k];
          }
        });
        STATE[section].page = 1;
      }
    } catch (_) {}
  });

  // Botón limpiar
  document.addEventListener("click", (e) => {
    const clear = e.target.closest("[data-clear]");
    if (clear) {
      const s = currentSectionState();
      if (!s) return;
      Object.keys(s.filters).forEach((k) => (s.filters[k] = ""));
      s.page = 1;
      render({ preserveScroll: true });
      return;
    }
    const pager = e.target.closest("[data-pager]");
    if (pager && !pager.disabled) {
      const s = currentSectionState();
      if (!s) return;
      if (pager.dataset.pager === "prev") s.page = Math.max(1, s.page - 1);
      else s.page = s.page + 1;
      render({ preserveScroll: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  render();
});
