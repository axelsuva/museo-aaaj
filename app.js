/* ============================================
   Museo Virtual AAAJ — Router + Render
   ============================================ */

// ===== Helpers =====
const $app = () => document.getElementById("app");
const escapeHTML = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
const byId = (collection, id) => collection.find((x) => x.id === id);
const pluralize = (n, sing, plur) => `${n} ${n === 1 ? sing : plur}`;

// ===== SVG: camiseta con patrón de rayas =====
function shirtSVG({ size = 240, patron = "rayas" } = {}) {
  // Camiseta con rayas verticales rojas y blancas
  const pat =
    patron === "rayas-finas"
      ? `<rect x="32" y="44" width="6" height="120" fill="#C8102E"/>
         <rect x="44" y="44" width="6" height="120" fill="#C8102E"/>
         <rect x="56" y="44" width="6" height="120" fill="#C8102E"/>
         <rect x="68" y="44" width="6" height="120" fill="#C8102E"/>
         <rect x="80" y="44" width="6" height="120" fill="#C8102E"/>
         <rect x="92" y="44" width="6" height="120" fill="#C8102E"/>
         <rect x="104" y="44" width="6" height="120" fill="#C8102E"/>
         <rect x="116" y="44" width="6" height="120" fill="#C8102E"/>
         <rect x="128" y="44" width="6" height="120" fill="#C8102E"/>
         <rect x="140" y="44" width="6" height="120" fill="#C8102E"/>
         <rect x="152" y="44" width="6" height="120" fill="#C8102E"/>`
      : `<rect x="32" y="44" width="14" height="120" fill="#C8102E"/>
         <rect x="60" y="44" width="14" height="120" fill="#C8102E"/>
         <rect x="88" y="44" width="14" height="120" fill="#C8102E"/>
         <rect x="116" y="44" width="14" height="120" fill="#C8102E"/>
         <rect x="144" y="44" width="14" height="120" fill="#C8102E"/>`;
  return `
  <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" role="img" aria-label="Camiseta del club">
    <defs>
      <clipPath id="shirtClip">
        <path d="M 60 28 L 80 18 Q 100 30 120 18 L 140 28 L 180 50 L 168 90 L 152 80 L 152 184 Q 100 200 48 184 L 48 80 L 32 90 L 20 50 Z"/>
      </clipPath>
      <filter id="shirtShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#1A1410" flood-opacity="0.18"/>
      </filter>
    </defs>
    <g filter="url(#shirtShadow)">
      <path d="M 60 28 L 80 18 Q 100 30 120 18 L 140 28 L 180 50 L 168 90 L 152 80 L 152 184 Q 100 200 48 184 L 48 80 L 32 90 L 20 50 Z" fill="#FFFFFF" stroke="#1A1410" stroke-width="1.5"/>
      <g clip-path="url(#shirtClip)">${pat}</g>
      <path d="M 80 18 Q 100 38 120 18" fill="none" stroke="#1A1410" stroke-width="1.5"/>
    </g>
  </svg>`;
}

// ===== SVG: marco de cuadro para sala virtual =====
function frameSVG(label) {
  return `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHTML(label)}">
    <rect x="6" y="6" width="88" height="88" fill="none" stroke="#D4A861" stroke-width="2"/>
    <rect x="12" y="12" width="76" height="76" fill="rgba(244,237,227,0.06)"/>
    <text x="50" y="56" text-anchor="middle" font-family="Playfair Display, serif" font-size="28" font-weight="700" fill="#D4A861">${escapeHTML(
      label
    )}</text>
  </svg>`;
}

// ===== Render: tarjeta de jugador =====
function jugadorCard(j) {
  const meta = j.placeholder
    ? "<span class='muted'>Por completar</span>"
    : `${escapeHTML(j.posicion)} · ${escapeHTML(j.periodo)}`;
  return `
    <a class="card" href="#/jugadores/${escapeHTML(j.id)}">
      <div class="card-thumb aspect-tall">
        <div class="pattern"></div>
        <span class="initials">${escapeHTML(j.iniciales)}</span>
      </div>
      <div class="card-body">
        <span class="kicker">Jugador</span>
        <span class="title">${escapeHTML(j.nombre)}</span>
        ${j.apodo ? `<span class="muted" style="font-style:italic">«${escapeHTML(j.apodo)}»</span>` : ""}
        <span class="meta">${meta}</span>
      </div>
    </a>`;
}

// ===== Render: tarjeta de partido =====
function partidoCard(p) {
  const badgeClass = p.desenlace || "empate";
  const badgeText = p.placeholder ? "Por completar" : (p.desenlace || "—").toUpperCase();
  return `
    <a class="card" href="#/partidos/${escapeHTML(p.id)}">
      <div class="card-thumb aspect-wide">
        <div class="pattern"></div>
        <span class="badge ${badgeClass}">${escapeHTML(badgeText)}</span>
        <span class="initials" style="font-size:2rem;text-align:center;padding:0 1rem">${escapeHTML(
          p.resultado || "—"
        )}</span>
      </div>
      <div class="card-body">
        <span class="kicker">${escapeHTML(p.torneo)}</span>
        <span class="title">${escapeHTML(p.titulo)}</span>
        <span class="meta">${escapeHTML(p.fecha)}${p.rival ? ` · vs ${escapeHTML(p.rival)}` : ""}</span>
      </div>
    </a>`;
}

// ===== Render: tarjeta de camiseta =====
function camisetaCard(c) {
  return `
    <a class="card" href="#/camisetas/${escapeHTML(c.id)}">
      <div class="card-thumb shirt-thumb aspect-tall">${shirtSVG({ size: 220, patron: c.patron })}</div>
      <div class="card-body">
        <span class="kicker">Camiseta</span>
        <span class="title">${escapeHTML(c.nombre)}</span>
        <span class="meta">${escapeHTML(c.anio)}</span>
      </div>
    </a>`;
}

// ===== Vistas =====
const Views = {
  // ---------- HOME ----------
  home() {
    const totalJugadores = DATA.jugadores.filter((j) => !j.placeholder).length;
    const totalPartidos = DATA.partidos.filter((p) => !p.placeholder).length;
    const totalCamisetas = DATA.camisetas.filter((c) => !c.placeholder).length;
    const totalHitos = DATA.hitos.filter((h) => !h.placeholder).length;

    const destacados = DATA.partidos.filter((p) => p.destacado);

    return `
      <section class="hero view-enter">
        <div class="container hero-inner">
          <div>
            <span class="hero-tag">Museo Virtual · 1904 — Hoy</span>
            <h1>Recorré 120 años del <em>Bicho</em>.</h1>
            <p class="lead">El archivo histórico de Argentinos Juniors hecho navegación. Jugadores, partidos, camisetas, goles y objetos del archivo del club, conectados entre sí. Recorré la historia desde donde quieras.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="#/sala">
                Entrar a la sala virtual
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
              <a class="btn btn-ghost" href="#/hitos">Ver línea de tiempo</a>
            </div>
          </div>
          <div class="hero-visual" aria-hidden="true">
            <div class="hero-ring"></div>
            <div class="hero-ring r2"></div>
            <div class="hero-ring r3"></div>
            <div class="hero-shield">
              <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="bigShield" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#E11935"/>
                    <stop offset="100%" stop-color="#A30E25"/>
                  </linearGradient>
                </defs>
                <path d="M100 8 L190 40 L190 130 C190 188 150 218 100 232 C50 218 10 188 10 130 L10 40 Z" fill="url(#bigShield)" stroke="#3A0712" stroke-width="3"/>
                <path d="M50 70 L150 70 M50 100 L150 100 M50 130 L150 130 M50 160 L150 160" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" opacity="0.95"/>
                <text x="100" y="200" text-anchor="middle" font-family="Playfair Display, serif" font-size="28" font-weight="800" fill="#FFFFFF">AAAJ</text>
              </svg>
            </div>
          </div>
        </div>

        <div class="container">
          <div class="hero-stats">
            <div class="hero-stat"><span class="num">${totalJugadores}+</span><span class="lbl">Jugadores</span></div>
            <div class="hero-stat"><span class="num">${totalPartidos}+</span><span class="lbl">Partidos</span></div>
            <div class="hero-stat"><span class="num">${totalCamisetas}+</span><span class="lbl">Camisetas</span></div>
            <div class="hero-stat"><span class="num">${totalHitos}+</span><span class="lbl">Hitos</span></div>
          </div>
        </div>
      </section>

      <section class="section view-enter">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Salas del museo</span>
            <h2>Elegí por dónde empezar</h2>
            <p>Cada sala te lleva a una colección distinta. Todo conectado: hacé click en un jugador y vas a ver sus partidos, sus camisetas, sus goles. Hacé click en un partido y ves quiénes lo jugaron.</p>
          </div>
          <div class="home-categories">
            <a class="cat-card" href="#/jugadores">
              <span class="arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </span>
              <span class="cat-num">${totalJugadores}+</span>
              <span class="cat-title">Jugadores</span>
              <span class="cat-desc">De Maradona a Cambiasso. Cracks históricos del Bicho.</span>
            </a>
            <a class="cat-card" href="#/partidos">
              <span class="arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </span>
              <span class="cat-num">${totalPartidos}+</span>
              <span class="cat-title">Partidos</span>
              <span class="cat-desc">Resultados, goles y los partidos que dieron forma a la historia.</span>
            </a>
            <a class="cat-card" href="#/camisetas">
              <span class="arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </span>
              <span class="cat-num">${totalCamisetas}+</span>
              <span class="cat-title">Camisetas</span>
              <span class="cat-desc">120 años de identidad: rojo y blanco a través del tiempo.</span>
            </a>
            <a class="cat-card" href="#/hitos">
              <span class="arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </span>
              <span class="cat-num">${totalHitos}+</span>
              <span class="cat-title">Línea de tiempo</span>
              <span class="cat-desc">Desde 1904 hasta hoy. Los momentos que marcaron al club.</span>
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
            ${destacados.map(partidoCard).join("")}
          </div>
        </div>
      </section>
    `;
  },

  // ---------- JUGADORES (LIST) ----------
  jugadores() {
    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/">← Volver al museo</a>
          <div class="section-head">
            <span class="eyebrow">Sala 01</span>
            <h1>Jugadores</h1>
            <p>Cracks históricos surgidos del club o que dejaron huella en La Paternal. Cada ficha incluye partidos jugados, camisetas vestidas y citas del archivo.</p>
          </div>
          <div class="filters" role="tablist" aria-label="Filtrar por época">
            <button class="filter-chip active" data-filter="todos">Todos</button>
            <button class="filter-chip" data-filter="70-80">Años 70-80</button>
            <button class="filter-chip" data-filter="90-00">Años 90-00</button>
            <button class="filter-chip" data-filter="moderno">Moderno</button>
          </div>
          <div class="collection-grid">
            ${DATA.jugadores.map(jugadorCard).join("")}
          </div>
        </div>
      </section>
    `;
  },

  // ---------- JUGADOR (DETAIL) ----------
  jugador(id) {
    const j = byId(DATA.jugadores, id);
    if (!j) return Views.notFound("ese jugador");

    const partidosRel = (j.partidosDestacados || [])
      .map((pid) => byId(DATA.partidos, pid))
      .filter(Boolean);
    const camisetasRel = (j.camisetasUsadas || [])
      .map((cid) => byId(DATA.camisetas, cid))
      .filter(Boolean);
    const otrosJugadores = DATA.jugadores
      .filter((x) => x.id !== j.id && !x.placeholder)
      .slice(0, 4);

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
                  <span class="eyebrow">Jugador histórico</span>
                  <h1>${escapeHTML(j.nombre)}</h1>
                  ${j.apodo ? `<p class="muted" style="font-size:1.1rem;font-style:italic;margin-bottom:0.5rem">«${escapeHTML(j.apodo)}»</p>` : ""}
                  <p>${escapeHTML(j.posicion)} · ${escapeHTML(j.periodo)}</p>
                  <div class="fact-grid">
                    ${j.partidos != null ? `<div class="fact"><div class="lbl">Partidos</div><div class="val">${j.partidos}</div></div>` : ""}
                    ${j.goles != null ? `<div class="fact"><div class="lbl">Goles</div><div class="val">${j.goles}</div></div>` : ""}
                    ${j.debutFecha ? `<div class="fact"><div class="lbl">Debut</div><div class="val">${escapeHTML(j.debutFecha)}</div></div>` : ""}
                  </div>
                </div>
              </div>

              <div class="detail-body">
                <p>${escapeHTML(j.bio)}</p>
                ${
                  j.cita
                    ? `<blockquote>"${escapeHTML(j.cita.texto)}"<cite>— ${escapeHTML(j.cita.autor)}</cite></blockquote>`
                    : ""
                }

                ${
                  j.titulos && j.titulos.length
                    ? `<div class="detail-section">
                         <h2>Títulos y reconocimientos</h2>
                         <ul style="padding-left:1.2rem;color:var(--carbon)">
                           ${j.titulos.map((t) => `<li>${escapeHTML(t)}</li>`).join("")}
                         </ul>
                       </div>`
                    : ""
                }

                ${
                  partidosRel.length
                    ? `<div class="detail-section">
                         <h2>Partidos donde fue protagonista</h2>
                         <table class="table">
                           <thead><tr><th>Partido</th><th>Fecha</th><th>Resultado</th><th></th></tr></thead>
                           <tbody>
                             ${partidosRel
                               .map(
                                 (p) => `
                               <tr>
                                 <td><a href="#/partidos/${escapeHTML(p.id)}">${escapeHTML(p.titulo)}</a></td>
                                 <td>${escapeHTML(p.fecha)}</td>
                                 <td class="col-result">${escapeHTML(p.resultado || "—")}</td>
                                 <td><span class="tag ${p.desenlace || "empate"}">${escapeHTML((p.desenlace || "—").toUpperCase())}</span></td>
                               </tr>`
                               )
                               .join("")}
                           </tbody>
                         </table>
                       </div>`
                    : ""
                }
              </div>
            </div>

            <aside class="aside">
              ${
                camisetasRel.length
                  ? `<div class="aside-block">
                       <h3>Camisetas que vistió</h3>
                       <ul class="aside-list">
                         ${camisetasRel
                           .map(
                             (c) => `
                           <li><a href="#/camisetas/${escapeHTML(c.id)}">
                             <span class="mini-thumb shirt">${shirtSVG({ size: 36, patron: c.patron })}</span>
                             <span class="ml-info">${escapeHTML(c.nombre)}<small>${escapeHTML(c.anio)}</small></span>
                           </a></li>`
                           )
                           .join("")}
                       </ul>
                     </div>`
                  : ""
              }
              <div class="aside-block">
                <h3>Otros jugadores</h3>
                <ul class="aside-list">
                  ${otrosJugadores
                    .map(
                      (o) => `
                    <li><a href="#/jugadores/${escapeHTML(o.id)}">
                      <span class="mini-thumb">${escapeHTML(o.iniciales)}</span>
                      <span class="ml-info">${escapeHTML(o.nombre)}<small>${escapeHTML(o.periodo)}</small></span>
                    </a></li>`
                    )
                    .join("")}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>
    `;
  },

  // ---------- PARTIDOS (LIST) ----------
  partidos() {
    const ordenados = [...DATA.partidos].sort((a, b) => (b.anio || 0) - (a.anio || 0));
    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/">← Volver al museo</a>
          <div class="section-head">
            <span class="eyebrow">Sala 02</span>
            <h1>Partidos</h1>
            <p>Los encuentros que marcaron la historia del club. Ordenados del más reciente al más antiguo.</p>
          </div>
          <div class="collection-grid">
            ${ordenados.map(partidoCard).join("")}
          </div>
        </div>
      </section>
    `;
  },

  // ---------- PARTIDO (DETAIL) ----------
  partido(id) {
    const p = byId(DATA.partidos, id);
    if (!p) return Views.notFound("ese partido");

    const jugadoresRel = (p.jugadoresClave || [])
      .map((jid) => byId(DATA.jugadores, jid))
      .filter(Boolean);
    const camiseta = p.camisetaUsada ? byId(DATA.camisetas, p.camisetaUsada) : null;
    const otrosPartidos = DATA.partidos
      .filter((x) => x.id !== p.id && !x.placeholder)
      .slice(0, 4);

    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/partidos">← Volver a partidos</a>
          <div class="detail">
            <div>
              <div class="detail-hero">
                <div class="detail-portrait">
                  <div class="pattern"></div>
                  <span class="initials" style="font-size:3rem;text-align:center;padding:0 1rem">${escapeHTML(
                    p.resultado || "—"
                  )}</span>
                </div>
                <div class="detail-meta">
                  <span class="eyebrow">${escapeHTML(p.torneo)}</span>
                  <h1>${escapeHTML(p.titulo)}</h1>
                  <p>${escapeHTML(p.fecha)}${p.rival ? ` · vs ${escapeHTML(p.rival)}` : ""}</p>
                  <div class="fact-grid">
                    ${p.desenlace ? `<div class="fact"><div class="lbl">Resultado</div><div class="val">${escapeHTML(p.desenlace.toUpperCase())}</div></div>` : ""}
                    ${p.anio ? `<div class="fact"><div class="lbl">Año</div><div class="val">${p.anio}</div></div>` : ""}
                  </div>
                </div>
              </div>

              <div class="detail-body">
                <p>${escapeHTML(p.cronica)}</p>
              </div>
            </div>

            <aside class="aside">
              ${
                jugadoresRel.length
                  ? `<div class="aside-block">
                       <h3>Protagonistas</h3>
                       <ul class="aside-list">
                         ${jugadoresRel
                           .map(
                             (j) => `
                           <li><a href="#/jugadores/${escapeHTML(j.id)}">
                             <span class="mini-thumb">${escapeHTML(j.iniciales)}</span>
                             <span class="ml-info">${escapeHTML(j.nombre)}<small>${escapeHTML(j.posicion)}</small></span>
                           </a></li>`
                           )
                           .join("")}
                       </ul>
                     </div>`
                  : ""
              }
              ${
                camiseta
                  ? `<div class="aside-block">
                       <h3>Camiseta usada</h3>
                       <ul class="aside-list">
                         <li><a href="#/camisetas/${escapeHTML(camiseta.id)}">
                           <span class="mini-thumb shirt">${shirtSVG({ size: 36, patron: camiseta.patron })}</span>
                           <span class="ml-info">${escapeHTML(camiseta.nombre)}<small>${escapeHTML(camiseta.anio)}</small></span>
                         </a></li>
                       </ul>
                     </div>`
                  : ""
              }
              <div class="aside-block">
                <h3>Otros partidos</h3>
                <ul class="aside-list">
                  ${otrosPartidos
                    .map(
                      (o) => `
                    <li><a href="#/partidos/${escapeHTML(o.id)}">
                      <span class="mini-thumb">${escapeHTML(String(o.anio || "··"))}</span>
                      <span class="ml-info">${escapeHTML(o.titulo)}<small>${escapeHTML(o.torneo)}</small></span>
                    </a></li>`
                    )
                    .join("")}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>
    `;
  },

  // ---------- CAMISETAS (LIST) ----------
  camisetas() {
    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/">← Volver al museo</a>
          <div class="section-head">
            <span class="eyebrow">Sala 03</span>
            <h1>Camisetas</h1>
            <p>120 años de rojo y blanco. Cada camiseta cuenta una época del club: los partidos en que se vistió, los jugadores que la usaron, los títulos que vio levantar.</p>
          </div>
          <div class="collection-grid">
            ${DATA.camisetas.map(camisetaCard).join("")}
          </div>
        </div>
      </section>
    `;
  },

  // ---------- CAMISETA (DETAIL) ----------
  camiseta(id) {
    const c = byId(DATA.camisetas, id);
    if (!c) return Views.notFound("esa camiseta");

    const partidosRel = (c.partidosUsada || [])
      .map((pid) => byId(DATA.partidos, pid))
      .filter(Boolean);
    const jugadoresRel = (c.jugadoresUsada || [])
      .map((jid) => byId(DATA.jugadores, jid))
      .filter(Boolean);

    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/camisetas">← Volver a camisetas</a>
          <div class="detail">
            <div>
              <div class="detail-hero">
                <div class="detail-portrait shirt">${shirtSVG({ size: 260, patron: c.patron })}</div>
                <div class="detail-meta">
                  <span class="eyebrow">Camiseta</span>
                  <h1>${escapeHTML(c.nombre)}</h1>
                  <p>${escapeHTML(c.anio)}</p>
                  <div class="fact-grid">
                    <div class="fact"><div class="lbl">Partidos</div><div class="val">${
                      partidosRel.length
                    }</div></div>
                    <div class="fact"><div class="lbl">Jugadores</div><div class="val">${
                      jugadoresRel.length
                    }</div></div>
                  </div>
                </div>
              </div>

              <div class="detail-body">
                <p>${escapeHTML(c.descripcion)}</p>

                ${
                  partidosRel.length
                    ? `<div class="detail-section">
                         <h2>Partidos en los que se vistió</h2>
                         <table class="table">
                           <thead><tr><th>Partido</th><th>Fecha</th><th>Resultado</th></tr></thead>
                           <tbody>
                             ${partidosRel
                               .map(
                                 (p) => `
                               <tr>
                                 <td><a href="#/partidos/${escapeHTML(p.id)}">${escapeHTML(p.titulo)}</a></td>
                                 <td>${escapeHTML(p.fecha)}</td>
                                 <td class="col-result">${escapeHTML(p.resultado || "—")}</td>
                               </tr>`
                               )
                               .join("")}
                           </tbody>
                         </table>
                       </div>`
                    : ""
                }
              </div>
            </div>

            <aside class="aside">
              ${
                jugadoresRel.length
                  ? `<div class="aside-block">
                       <h3>Jugadores que la vistieron</h3>
                       <ul class="aside-list">
                         ${jugadoresRel
                           .map(
                             (j) => `
                           <li><a href="#/jugadores/${escapeHTML(j.id)}">
                             <span class="mini-thumb">${escapeHTML(j.iniciales)}</span>
                             <span class="ml-info">${escapeHTML(j.nombre)}<small>${escapeHTML(j.periodo)}</small></span>
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
      </section>
    `;
  },

  // ---------- HITOS (TIMELINE) ----------
  hitos() {
    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/">← Volver al museo</a>
          <div class="section-head">
            <span class="eyebrow">Sala 04</span>
            <h1>Línea de tiempo</h1>
            <p>Los momentos que marcaron al Bicho, desde su fundación en 1904 hasta hoy. Cada hito conecta con jugadores y partidos del archivo.</p>
          </div>
          <div class="timeline">
            ${DATA.hitos
              .map((h) => {
                const enlaces = h.enlaces
                  ? `<div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:0.4rem">
                      ${h.enlaces.partido ? `<a href="#/partidos/${escapeHTML(h.enlaces.partido)}">Ver el partido →</a>` : ""}
                      ${h.enlaces.jugador ? `<a href="#/jugadores/${escapeHTML(h.enlaces.jugador)}">Ver el jugador →</a>` : ""}
                    </div>`
                  : "";
                return `
                <div class="timeline-item">
                  <span class="year">${h.anio || "··"}</span>
                  <h3>${escapeHTML(h.titulo)}</h3>
                  <p>${escapeHTML(h.descripcion)}</p>
                  ${enlaces}
                </div>`;
              })
              .join("")}
          </div>
        </div>
      </section>
    `;
  },

  // ---------- SALA VIRTUAL ----------
  sala() {
    const piezas = [
      { tipo: "jugador", id: "maradona", label: "Diego", sublabel: "Maradona" },
      { tipo: "partido", id: "final-liberta-85", label: "1985", sublabel: "Final Libertadores" },
      { tipo: "camiseta", id: "edicion-libertadores-85", label: "85", sublabel: "Edición Libertadores" },
      { tipo: "jugador", id: "batista", label: "Sergio", sublabel: "Batista" },
      { tipo: "partido", id: "final-intercontinental-85", label: "Tokio", sublabel: "Final Intercontinental" },
      { tipo: "camiseta", id: "clasica-anos-80", label: "80s", sublabel: "Clásica" },
      { tipo: "jugador", id: "borghi", label: "Claudio", sublabel: "Borghi" },
      { tipo: "jugador", id: "redondo", label: "El Príncipe", sublabel: "Redondo" },
    ];

    const piezaHTML = (p) => {
      const href =
        p.tipo === "jugador"
          ? `#/jugadores/${p.id}`
          : p.tipo === "partido"
          ? `#/partidos/${p.id}`
          : `#/camisetas/${p.id}`;
      const inner =
        p.tipo === "camiseta"
          ? shirtSVG({ size: 80, patron: byId(DATA.camisetas, p.id)?.patron })
          : frameSVG(p.label);
      return `
        <a class="sala-pieza" href="${href}">
          <div class="frame">${inner}</div>
          <div class="label"><strong>${escapeHTML(p.sublabel)}</strong>${escapeHTML(
            p.tipo === "jugador" ? "Jugador" : p.tipo === "partido" ? "Partido" : "Camiseta"
          )}</div>
        </a>`;
    };

    return `
      <section class="section view-enter">
        <div class="container">
          <a class="detail-back" href="#/">← Volver al museo</a>
          <div class="section-head">
            <span class="eyebrow">Sala virtual</span>
            <h1>Recorrido por la colección</h1>
            <p>Imaginá entrar a una sala del museo: las piezas más emblemáticas del archivo del club, expuestas para que las explores. Tocá cualquier pieza para abrir su ficha completa.</p>
          </div>
          <div class="sala-stage">
            <div class="sala-grid">
              ${piezas.map(piezaHTML).join("")}
            </div>
          </div>
        </div>
      </section>
    `;
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
      </section>
    `;
  },
};

// ===== Router =====
function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  return { route: parts[0] || "home", id: parts[1] || null };
}

function render() {
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

  // Active nav state
  document.querySelectorAll(".site-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === route);
  });

  // Cerrar nav móvil al navegar
  document.querySelector(".site-nav")?.classList.remove("is-open");

  // Scroll arriba al cambiar de vista
  window.scrollTo({ top: 0, behavior: "instant" });
}

// ===== Init =====
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  // Nav toggle (mobile)
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Filter chips (visual feedback, lógica de filtrado real cuando llegue data del archivo)
  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    const group = chip.parentElement;
    group.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
  });

  render();
});
