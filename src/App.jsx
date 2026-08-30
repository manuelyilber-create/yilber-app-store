import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   TIENDA DE MÚSICA — plantilla completa
   Paleta: fondo violeta-medianoche elegante + acentos dorado / magenta / cian
   Tipografía: Playfair Display (display) + Inter (cuerpo)
   Firma visual: ecualizador de barras animado + disco de vinilo giratorio
   ============================================================ */

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap";

const DEFAULT_CONFIG = {
  siteName: "Aria",
  tagline: "Escucha, descubre y llévate la música contigo",
  background: { type: "gradient", value: "" },
  banner: { type: "none", value: "" },
  paypalClientId: "",
  currency: "USD",
  adminUser: "administrador",
  adminPassHash: "",
};

const DEFAULT_MENU = [
  { id: "m1", label: "Inicio", url: "#inicio", submenu: [] },
  { id: "m2", label: "Canciones", url: "#canciones", submenu: [] },
  { id: "m3", label: "Apps", url: "#apps", submenu: [] },
  { id: "m4", label: "Nosotros", url: "#nosotros", submenu: [] },
  { id: "m5", label: "Contacto", url: "#contacto", submenu: [] },
];

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return "h" + Math.abs(h).toString(36) + btoa(unescape(encodeURIComponent(str))).slice(0, 8);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
}

async function storageGet(key, shared) {
  try {
    const res = await window.storage.get(key, shared);
    return res ? res.value : null;
  } catch {
    return null;
  }
}
async function storageSet(key, value, shared) {
  try {
    await window.storage.set(key, value, shared);
    return true;
  } catch {
    return false;
  }
}

/* ---------------- Anthropic API helper for the assistant ---------------- */
async function askAssistant(history) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system:
        "Eres un asistente virtual amigable dentro de una tienda de música. Hablas siempre en español latino, con calidez y naturalidad, en frases claras y no muy largas. Puedes conversar y ayudar sobre cualquier tema que te pregunten, no solo música.",
      messages: history,
    }),
  });
  const data = await response.json();
  const text = (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n");
  return text || "No pude responder eso, ¿puedes reformularlo?";
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [menu, setMenu] = useState(DEFAULT_MENU);
  const [songs, setSongs] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchased, setPurchased] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editWidgets, setEditWidgets] = useState(false);
  const [saveNote, setSaveNote] = useState("");

  // player state
  const [currentId, setCurrentId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [search, setSearch] = useState("");
  const audioRef = useRef(null);

  // assistant state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMsgs, setAssistantMsgs] = useState([]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const tapTimes = useRef([]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_URL;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    (async () => {
      const c = await storageGet("site-config", true);
      const m = await storageGet("site-menu", true);
      const sm = await storageGet("songs-meta", true);
      const wg = await storageGet("site-widgets", true);

      let finalConfig = DEFAULT_CONFIG;
      if (c) {
        finalConfig = { ...DEFAULT_CONFIG, ...JSON.parse(c) };
      } else {
        finalConfig = { ...DEFAULT_CONFIG, adminPassHash: simpleHash("20192920") };
        await storageSet("site-config", JSON.stringify(finalConfig), true);
      }
      setConfig(finalConfig);

      if (m) setMenu(JSON.parse(m));
      else {
        await storageSet("site-menu", JSON.stringify(DEFAULT_MENU), true);
        setMenu(DEFAULT_MENU);
      }

      if (sm) setSongs(JSON.parse(sm));
      if (wg) setWidgets(JSON.parse(wg));
      setLoading(false);
    })();
  }, []);

  const flashSave = (msg) => {
    setSaveNote(msg);
    setTimeout(() => setSaveNote(""), 2000);
  };

  const persistConfig = async (next) => {
    setConfig(next);
    await storageSet("site-config", JSON.stringify(next), true);
    flashSave("Guardado");
  };
  const persistMenu = async (next) => {
    setMenu(next);
    await storageSet("site-menu", JSON.stringify(next), true);
    flashSave("Guardado");
  };
  const persistSongs = async (next) => {
    setSongs(next);
    await storageSet("songs-meta", JSON.stringify(next), true);
    flashSave("Guardado");
  };
  const persistWidgets = async (next) => {
    setWidgets(next);
    await storageSet("site-widgets", JSON.stringify(next), true);
    flashSave("Guardado");
  };

  const addToCart = (id) => {
    setCart((c) => (c.includes(id) ? c : [...c, id]));
    setCartOpen(true);
  };
  const removeFromCart = (id) => setCart((c) => c.filter((x) => x !== id));

  const cartSongs = songs.filter((s) => cart.includes(s.id));
  const cartTotal = cartSongs.reduce((sum, s) => sum + Number(s.price || 0), 0);

  const completePurchase = () => {
    setPurchased((p) => [...new Set([...p, ...cart])]);
    setCart([]);
    flashSave("¡Compra completada!");
  };

  // ---- player controls ----
  const currentSong = songs.find((s) => s.id === currentId) || null;
  const currentSrc = currentSong ? (currentSong.audioType === "upload" ? currentSong.audioData : currentSong.audioUrl) : null;

  const playSong = (id) => {
    if (id === currentId) {
      togglePlay();
    } else {
      setCurrentId(id);
      setPlaying(true);
    }
  };
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
  };
  const playableSongs = songs.filter((s) => (s.audioType === "upload" ? s.audioData : s.audioUrl));
  const stepSong = (dir) => {
    if (playableSongs.length === 0) return;
    const idx = playableSongs.findIndex((s) => s.id === currentId);
    const nextIdx = idx === -1 ? 0 : (idx + dir + playableSongs.length) % playableSongs.length;
    setCurrentId(playableSongs[nextIdx].id);
    setPlaying(true);
  };

  useEffect(() => {
    if (audioRef.current && currentSrc) {
      audioRef.current.play().catch(() => {});
    }
  }, [currentId]);

  // ---- assistant ----
  const handleAvatarClick = () => {
    const now = Date.now();
    tapTimes.current = [...tapTimes.current.filter((t) => now - t < 900), now];
    if (tapTimes.current.length >= 3) {
      tapTimes.current = [];
      setAssistantOpen((v) => !v);
    }
  };
  const sendAssistant = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: "user", content: text.trim() };
    const nextMsgs = [...assistantMsgs, userMsg];
    setAssistantMsgs(nextMsgs);
    setAssistantLoading(true);
    try {
      const reply = await askAssistant(nextMsgs);
      setAssistantMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setAssistantMsgs((m) => [...m, { role: "assistant", content: "Se me cruzaron los cables, ¿lo intentamos de nuevo?" }]);
    }
    setAssistantLoading(false);
  };

  const bgStyle = getBackgroundStyle(config.background);

  if (loading) {
    return (
      <div style={{ ...S.page, ...bgStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div style={{ color: "#E8B94B", fontFamily: "Inter, sans-serif" }}>Cargando…</div>
      </div>
    );
  }

  return (
    <div style={{ ...S.page, ...bgStyle }}>
      <style>{CSS}</style>

      <Header
        config={config}
        menu={menu}
        cartCount={cart.length}
        onCartClick={() => setCartOpen(true)}
        onAdminClick={() => setAdminOpen(true)}
      />

      {config.banner && config.banner.type === "image" && config.banner.value && (
        <div style={S.bannerWrap}>
          <img src={config.banner.value} alt="Banner" style={S.bannerImg} />
        </div>
      )}

      <Hero config={config} />

      <SongsSection songs={songs} purchased={purchased} onAddToCart={addToCart} onPlay={playSong} currentId={currentId} playing={playing} />

      <PlayerSection
        songs={playableSongs}
        currentSong={currentSong}
        currentId={currentId}
        playing={playing}
        search={search}
        setSearch={setSearch}
        onPlay={playSong}
        onToggle={togglePlay}
        onStep={stepSong}
      />

      <WidgetsSection widgets={widgets} isAdmin={isAdmin} editWidgets={editWidgets} onChange={persistWidgets} />

      <AboutSection config={config} />
      <ContactSection config={config} />
      <Footer config={config} onAdminClick={() => setAdminOpen(true)} />

      {currentSrc && (
        <audio
          ref={audioRef}
          src={currentSrc}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => stepSong(1)}
          style={{ display: "none" }}
        />
      )}

      {cartOpen && (
        <CartPanel
          items={cartSongs}
          total={cartTotal}
          currency={config.currency}
          paypalClientId={config.paypalClientId}
          onClose={() => setCartOpen(false)}
          onRemove={removeFromCart}
          onComplete={completePurchase}
        />
      )}

      {adminOpen && !isAdmin && (
        <LoginModal config={config} onClose={() => setAdminOpen(false)} onSuccess={() => setIsAdmin(true)} />
      )}

      {adminOpen && isAdmin && (
        <AdminPanel
          config={config}
          menu={menu}
          songs={songs}
          widgets={widgets}
          editWidgets={editWidgets}
          onToggleEditWidgets={() => setEditWidgets((v) => !v)}
          onConfigChange={persistConfig}
          onMenuChange={persistMenu}
          onSongsChange={persistSongs}
          onWidgetsChange={persistWidgets}
          onClose={() => setAdminOpen(false)}
          onLogout={() => {
            setIsAdmin(false);
            setAdminOpen(false);
            setEditWidgets(false);
          }}
        />
      )}

      <AssistantAvatar onClick={handleAvatarClick} />
      {assistantOpen && (
        <AssistantChat
          messages={assistantMsgs}
          loading={assistantLoading}
          onSend={sendAssistant}
          onClose={() => setAssistantOpen(false)}
        />
      )}

      {saveNote && <div style={S.toast}>{saveNote}</div>}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function getBackgroundStyle(bg) {
  if (bg && bg.type === "image" && bg.value) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(15,8,26,.72), rgba(15,8,26,.88)), url(${bg.value})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    };
  }
  return {
    background:
      "radial-gradient(1200px 600px at 15% -10%, #3a1a5c 0%, transparent 60%), radial-gradient(1000px 500px at 100% 0%, #4a1240 0%, transparent 55%), linear-gradient(180deg, #160B24 0%, #1c0e30 40%, #14091f 100%)",
  };
}

function EqualizerBars({ size = 18 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: size }}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`eqbar eqbar-${i}`} />
      ))}
    </span>
  );
}

function Vinyl({ size = 46, spinning }) {
  return (
    <div className={spinning ? "vinyl spinning" : "vinyl"} style={{ width: size, height: size }}>
      <div className="vinyl-hole" />
    </div>
  );
}

/* ---------------- layout pieces ---------------- */

function Header({ config, menu, cartCount, onCartClick, onAdminClick }) {
  const [openSub, setOpenSub] = useState(null);
  return (
    <header style={S.header}>
      <a href="#inicio" style={S.brand}>
        <Vinyl size={30} />
        <span style={S.brandName}>{config.siteName}</span>
      </a>
      <nav style={S.nav}>
        {menu.map((item) => (
          <div key={item.id} style={{ position: "relative" }} onMouseEnter={() => setOpenSub(item.id)} onMouseLeave={() => setOpenSub(null)}>
            <a href={item.url || "#"} style={S.navLink} target={item.url && item.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {item.label}
              {item.submenu && item.submenu.length > 0 ? " ▾" : ""}
            </a>
            {item.submenu && item.submenu.length > 0 && openSub === item.id && (
              <div style={S.submenu}>
                {item.submenu.map((sub) => (
                  <a key={sub.id} href={sub.url || "#"} style={S.submenuLink} target={sub.url && sub.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                    {sub.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onCartClick} style={S.cartBtn}>
          🛒 {cartCount > 0 && <span style={S.cartBadge}>{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}

function Hero({ config }) {
  return (
    <section id="inicio" style={S.hero}>
      <EqualizerBars size={40} />
      <h1 style={S.heroTitle}>{config.siteName}</h1>
      <p style={S.heroTagline}>{config.tagline}</p>
      <a href="#canciones" style={S.heroCta}>Explorar canciones</a>
    </section>
  );
}

function SongsSection({ songs, purchased, onAddToCart, onPlay, currentId, playing }) {
  return (
    <section id="canciones" style={S.section}>
      <h2 style={S.sectionTitle}>Canciones</h2>
      {songs.length === 0 ? (
        <div style={S.emptyState}>Aún no hay canciones publicadas. El administrador puede añadir la primera desde el panel.</div>
      ) : (
        <div style={S.grid}>
          {songs.map((s) => (
            <SongCard key={s.id} song={s} owned={purchased.includes(s.id)} onAddToCart={onAddToCart} onPlay={onPlay} isCurrent={s.id === currentId} playing={playing} />
          ))}
        </div>
      )}
    </section>
  );
}

function SongCard({ song, owned, onAddToCart, onPlay, isCurrent, playing }) {
  const audioSrc = song.audioType === "upload" ? song.audioData : song.audioUrl;
  const active = isCurrent && playing;
  return (
    <div style={S.card}>
      <div style={S.cardArt}>
        {song.cover ? <img src={song.cover} alt={song.title} style={S.cardCoverImg} /> : <Vinyl size={90} spinning={active} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={S.cardTitle}>{song.title || "Sin título"}</div>
        <div style={S.cardArtist}>{song.artist || ""}</div>
        <div style={S.cardRow}>
          {audioSrc ? (
            <button style={S.playBtn} onClick={() => onPlay(song.id)}>
              {active ? "❚❚ Pausa" : "▶ Escuchar"}
            </button>
          ) : (
            <span style={S.noAudio}>Sin audio aún</span>
          )}
          <span style={S.price}>${Number(song.price || 0).toFixed(2)}</span>
        </div>
        <div style={S.cardActions}>
          {owned ? (
            <a href={audioSrc} download={`${song.title || "cancion"}.mp3`} style={S.downloadBtn}>⬇ Descargar</a>
          ) : (
            <button style={S.addBtn} onClick={() => onAddToCart(song.id)}>Añadir al carrito</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- reproductor central ---------------- */

function PlayerSection({ songs, currentSong, currentId, playing, search, setSearch, onPlay, onToggle, onStep }) {
  const filtered = songs.filter((s) => (s.title || "").toLowerCase().includes(search.toLowerCase()) || (s.artist || "").toLowerCase().includes(search.toLowerCase()));
  return (
    <section style={S.playerSection}>
      <h2 style={S.sectionTitle}>Reproductor</h2>
      <div style={S.playerWrap}>
        <div style={S.playerLeft}>
          <div style={S.playerCover}>
            {currentSong && currentSong.cover ? <img src={currentSong.cover} alt="" style={S.cardCoverImg} /> : <Vinyl size={110} spinning={playing} />}
          </div>
          <div style={S.playerTitle}>{currentSong ? currentSong.title : "Elige una canción"}</div>
          <div style={S.cardArtist}>{currentSong ? currentSong.artist : ""}</div>
          <div style={S.playerControls}>
            <button style={S.ctrlBtn} onClick={() => onStep(-1)}>⏮</button>
            <button style={S.ctrlBtnMain} onClick={onToggle} disabled={!currentSong}>{playing ? "❚❚" : "▶"}</button>
            <button style={S.ctrlBtn} onClick={() => onStep(1)}>⏭</button>
          </div>
        </div>
        <div style={S.playerRight}>
          <div style={S.searchRow}>
            <span>🔍</span>
            <input style={S.searchInput} placeholder="Buscar canción o artista…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={S.playlist}>
            {filtered.length === 0 && <div style={S.hint}>No hay canciones que coincidan.</div>}
            {filtered.map((s) => (
              <div key={s.id} style={s.id === currentId ? S.playlistItemActive : S.playlistItem} onClick={() => onPlay(s.id)}>
                <span>{s.id === currentId && playing ? "🔊" : "🎵"} {s.title}</span>
                <span style={S.hint}>{s.artist}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- apps / widgets ---------------- */

function WidgetsSection({ widgets, isAdmin, editWidgets, onChange }) {
  const updateWidget = (id, patch) => {
    onChange(widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };
  return (
    <section id="apps" style={S.appsSection}>
      <h2 style={S.sectionTitle}>Apps</h2>
      {isAdmin && (
        <p style={S.hint}>
          {editWidgets ? "Modo edición activo: arrastra las apps por su barra superior. Usa el candado para bloquearlas." : "Activa el modo edición desde el panel para mover las apps."}
        </p>
      )}
      <div style={S.appsCanvas}>
        {widgets.length === 0 && <div style={S.emptyState}>Aún no hay apps añadidas. El administrador puede agregar una desde el panel.</div>}
        {widgets.map((w) => (
          <WidgetBox key={w.id} widget={w} draggable={isAdmin && editWidgets} onUpdate={(patch) => updateWidget(w.id, patch)} />
        ))}
      </div>
    </section>
  );
}

function WidgetBox({ widget, draggable, onUpdate }) {
  const boxRef = useRef(null);
  const dragInfo = useRef(null);

  const onPointerDown = (e) => {
    if (!draggable || widget.locked) return;
    dragInfo.current = { startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };
  const onPointerMove = (e) => {
    if (!dragInfo.current) return;
    const dx = e.clientX - dragInfo.current.startX;
    const dy = e.clientY - dragInfo.current.startY;
    if (boxRef.current) {
      boxRef.current.style.left = dragInfo.current.origX + dx + "px";
      boxRef.current.style.top = dragInfo.current.origY + dy + "px";
    }
  };
  const onPointerUp = (e) => {
    if (!dragInfo.current) return;
    const dx = e.clientX - dragInfo.current.startX;
    const dy = e.clientY - dragInfo.current.startY;
    onUpdate({ x: dragInfo.current.origX + dx, y: dragInfo.current.origY + dy });
    dragInfo.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  return (
    <div ref={boxRef} style={{ ...S.widgetBox, left: widget.x, top: widget.y, width: widget.w, height: widget.h }}>
      {draggable && (
        <div style={S.widgetHandle} onPointerDown={onPointerDown}>
          <span>⠿ {widget.name}</span>
          <button style={S.lockBtn} onClick={() => onUpdate({ locked: !widget.locked })}>
            {widget.locked ? "🔒" : "🔓"}
          </button>
        </div>
      )}
      <iframe title={widget.name} srcDoc={widget.code} style={S.widgetFrame} sandbox="allow-scripts allow-forms allow-popups" />
    </div>
  );
}

function AboutSection({ config }) {
  return (
    <section id="nosotros" style={S.section}>
      <h2 style={S.sectionTitle}>Nosotros</h2>
      <p style={S.aboutText}>{config.aboutText || `${config.siteName} es un espacio para descubrir y coleccionar música original. Cada canción está disponible para escuchar y, tras la compra, para descargar y conservar.`}</p>
    </section>
  );
}

function ContactSection({ config }) {
  return (
    <section id="contacto" style={S.section}>
      <h2 style={S.sectionTitle}>Contacto</h2>
      <p style={S.aboutText}>{config.contactText || "Escríbenos para colaboraciones, licencias o soporte."}</p>
    </section>
  );
}

function Footer({ config, onAdminClick }) {
  return (
    <footer style={S.footer}>
      <span>© {new Date().getFullYear()} {config.siteName}</span>
      <button onClick={onAdminClick} style={S.adminLink}>Acceso administrador</button>
    </footer>
  );
}

/* ---------------- cart / checkout ---------------- */

function CartPanel({ items, total, currency, paypalClientId, onClose, onRemove, onComplete }) {
  const paypalRef = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!paypalClientId || items.length === 0) return;
    const existing = document.getElementById("paypal-sdk-script");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "paypal-sdk-script";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=${currency || "USD"}`;
    script.onload = () => setSdkReady(true);
    document.body.appendChild(script);
    return () => {
      script.remove();
      setSdkReady(false);
    };
  }, [paypalClientId, items.length, currency]);

  useEffect(() => {
    if (sdkReady && window.paypal && paypalRef.current) {
      paypalRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          createOrder: (data, actions) => actions.order.create({ purchase_units: [{ amount: { value: total.toFixed(2) } }] }),
          onApprove: (data, actions) => actions.order.capture().then(() => onComplete()),
        })
        .render(paypalRef.current);
    }
  }, [sdkReady, total, onComplete]);

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.panel} onClick={(e) => e.stopPropagation()}>
        <div style={S.panelHeader}>
          <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif" }}>Tu carrito</h3>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        {items.length === 0 ? (
          <p style={{ color: "#cbb9dd" }}>Tu carrito está vacío.</p>
        ) : (
          <>
            {items.map((s) => (
              <div key={s.id} style={S.cartItem}>
                <span>{s.title}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  ${Number(s.price || 0).toFixed(2)}
                  <button style={S.removeBtn} onClick={() => onRemove(s.id)}>✕</button>
                </span>
              </div>
            ))}
            <div style={S.cartTotalRow}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            {paypalClientId ? (
              <div ref={paypalRef} style={{ marginTop: 14 }} />
            ) : (
              <div>
                <p style={S.warnText}>El administrador aún no configuró un PayPal Client ID real. Este botón es una simulación de pago.</p>
                <button style={S.payDemoBtn} onClick={onComplete}>Pagar (demo) — ${total.toFixed(2)}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- admin: login ---------------- */

function LoginModal({ config, onClose, onSuccess }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const u = user.trim().toLowerCase();
    const p = pass.trim();
    const expectedUser = (config.adminUser || "").trim().toLowerCase();
    const validByHash = u === expectedUser && simpleHash(p) === config.adminPassHash;
    const validByDefault = u === "administrador" && p === "20192920" && !config.adminPassHash;
    if (validByHash || validByDefault) onSuccess();
    else setError("Usuario o clave incorrectos.");
  };
  const onKeyDown = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.loginBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, fontFamily: "'Playfair Display', serif", color: "#E8B94B" }}>Acceso administrador</h3>
        <input style={S.input} placeholder="Usuario" value={user} onChange={(e) => setUser(e.target.value)} onKeyDown={onKeyDown} autoFocus />
        <input style={S.input} placeholder="Contraseña" type="password" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={onKeyDown} />
        {error && <p style={{ color: "#ff6b81", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button type="button" style={S.primaryBtn} onClick={submit}>Entrar</button>
          <button type="button" style={S.secondaryBtn} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- admin: panel ---------------- */

function AdminPanel({ config, menu, songs, widgets, editWidgets, onToggleEditWidgets, onConfigChange, onMenuChange, onSongsChange, onWidgetsChange, onClose, onLogout }) {
  const [tab, setTab] = useState("canciones");
  const tabs = [
    { id: "canciones", label: "Canciones" },
    { id: "menu", label: "Menú" },
    { id: "apariencia", label: "Apariencia" },
    { id: "apps", label: "Apps" },
    { id: "pagos", label: "Pagos" },
    { id: "general", label: "General" },
  ];
  return (
    <div style={S.overlay}>
      <div style={S.adminBox}>
        <div style={S.panelHeader}>
          <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", color: "#E8B94B" }}>Panel de administración</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.secondaryBtn} onClick={onLogout}>Cerrar sesión</button>
            <button onClick={onClose} style={S.closeBtn}>✕</button>
          </div>
        </div>
        <div style={S.tabBar}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={t.id === tab ? S.tabBtnActive : S.tabBtn}>{t.label}</button>
          ))}
        </div>
        <div style={S.tabBody}>
          {tab === "canciones" && <SongsAdmin songs={songs} onChange={onSongsChange} />}
          {tab === "menu" && <MenuAdmin menu={menu} onChange={onMenuChange} />}
          {tab === "apariencia" && <AppearanceAdmin config={config} onChange={onConfigChange} />}
          {tab === "apps" && <WidgetsAdmin widgets={widgets} onChange={onWidgetsChange} editWidgets={editWidgets} onToggleEditWidgets={onToggleEditWidgets} />}
          {tab === "pagos" && <PaymentsAdmin config={config} onChange={onConfigChange} />}
          {tab === "general" && <GeneralAdmin config={config} onChange={onConfigChange} />}
        </div>
      </div>
    </div>
  );
}

function SongsAdmin({ songs, onChange }) {
  const [draft, setDraft] = useState({ title: "", artist: "", price: "", cover: "", audioType: "upload" });
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrlInput, setAudioUrlInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const addSong = async () => {
    setError("");
    if (!draft.title.trim()) { setError("Ponle un título a la canción."); return; }
    setBusy(true);
    const song = { id: uid(), title: draft.title.trim(), artist: draft.artist.trim(), price: Number(draft.price) || 0, cover: draft.cover.trim(), audioType: draft.audioType };
    if (draft.audioType === "upload" && audioFile) {
      try {
        const dataUrl = await fileToDataUrl(audioFile);
        if (dataUrl.length > 5_000_000) { setError("El archivo de audio pesa demasiado (límite ~5 MB). Comprime la canción o usa una URL."); setBusy(false); return; }
        song.audioData = dataUrl;
      } catch { setError("No se pudo leer el archivo de audio."); setBusy(false); return; }
    } else if (draft.audioType === "url") {
      song.audioUrl = audioUrlInput.trim();
    }
    onChange([...songs, song]);
    setDraft({ title: "", artist: "", price: "", cover: "", audioType: "upload" });
    setAudioFile(null);
    setAudioUrlInput("");
    setBusy(false);
  };
  const updateSong = (id, patch) => onChange(songs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const deleteSong = (id) => onChange(songs.filter((s) => s.id !== id));

  return (
    <div>
      <h4 style={S.adminH4}>Añadir canción</h4>
      <div style={S.formGrid}>
        <input style={S.input} placeholder="Título" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input style={S.input} placeholder="Artista (opcional)" value={draft.artist} onChange={(e) => setDraft({ ...draft, artist: e.target.value })} />
        <input style={S.input} placeholder="Precio (USD)" type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        <input style={S.input} placeholder="URL de portada (opcional)" value={draft.cover} onChange={(e) => setDraft({ ...draft, cover: e.target.value })} />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center" }}>
        <label style={S.radioLabel}><input type="radio" checked={draft.audioType === "upload"} onChange={() => setDraft({ ...draft, audioType: "upload" })} /> Subir archivo</label>
        <label style={S.radioLabel}><input type="radio" checked={draft.audioType === "url"} onChange={() => setDraft({ ...draft, audioType: "url" })} /> Usar URL</label>
      </div>
      {draft.audioType === "upload" ? (
        <div style={{ marginTop: 8 }}>
          <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} />
          <p style={S.hint}>Máximo aprox. 5 MB por canción (funciona desde PC o móvil).</p>
        </div>
      ) : (
        <input style={{ ...S.input, marginTop: 8 }} placeholder="https://enlace-directo-al-audio.mp3" value={audioUrlInput} onChange={(e) => setAudioUrlInput(e.target.value)} />
      )}
      {error && <p style={{ color: "#ff6b81", fontSize: 13 }}>{error}</p>}
      <button style={{ ...S.primaryBtn, marginTop: 10 }} onClick={addSong} disabled={busy}>{busy ? "Guardando…" : "+ Añadir canción"}</button>

      <h4 style={S.adminH4}>Canciones publicadas ({songs.length})</h4>
      {songs.length === 0 && <p style={S.hint}>Ninguna todavía.</p>}
      {songs.map((s) => (
        <div key={s.id} style={S.adminRow}>
          <input style={S.inputSmall} value={s.title} onChange={(e) => updateSong(s.id, { title: e.target.value })} />
          <input style={{ ...S.inputSmall, width: 90 }} type="number" step="0.01" value={s.price} onChange={(e) => updateSong(s.id, { price: Number(e.target.value) })} />
          <span style={S.hint}>{s.audioType === "upload" ? (s.audioData ? "audio cargado" : "sin audio") : s.audioUrl ? "vía URL" : "sin audio"}</span>
          <button style={S.dangerBtn} onClick={() => deleteSong(s.id)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
}

function MenuAdmin({ menu, onChange }) {
  const addItem = () => onChange([...menu, { id: uid(), label: "Nuevo", url: "#", submenu: [] }]);
  const updateItem = (id, patch) => onChange(menu.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const deleteItem = (id) => onChange(menu.filter((m) => m.id !== id));
  const addSub = (id) => onChange(menu.map((m) => (m.id === id ? { ...m, submenu: [...(m.submenu || []), { id: uid(), label: "Subelemento", url: "#" }] } : m)));
  const updateSub = (mid, sid, patch) => onChange(menu.map((m) => (m.id === mid ? { ...m, submenu: m.submenu.map((s) => (s.id === sid ? { ...s, ...patch } : s)) } : m)));
  const deleteSub = (mid, sid) => onChange(menu.map((m) => (m.id === mid ? { ...m, submenu: m.submenu.filter((s) => s.id !== sid) } : m)));

  return (
    <div>
      <h4 style={S.adminH4}>Elementos del menú</h4>
      <p style={S.hint}>En "Enlace" puedes usar #seccion (para ir a una parte de esta misma página) o una URL completa como https://tu-sitio.com para llevar a otra página.</p>
      {menu.map((m) => (
        <div key={m.id} style={S.menuEditRow}>
          <div style={S.adminRow}>
            <input style={S.inputSmall} value={m.label} onChange={(e) => updateItem(m.id, { label: e.target.value })} placeholder="Nombre" />
            <input style={S.inputSmall} value={m.url} onChange={(e) => updateItem(m.id, { url: e.target.value })} placeholder="Enlace (#seccion o https://...)" />
            <button style={S.secondaryBtnSmall} onClick={() => addSub(m.id)}>+ Submenú</button>
            <button style={S.dangerBtn} onClick={() => deleteItem(m.id)}>Eliminar</button>
          </div>
          {m.submenu && m.submenu.length > 0 && (
            <div style={{ marginLeft: 20 }}>
              {m.submenu.map((s) => (
                <div key={s.id} style={S.adminRow}>
                  <input style={S.inputSmall} value={s.label} onChange={(e) => updateSub(m.id, s.id, { label: e.target.value })} />
                  <input style={S.inputSmall} value={s.url} onChange={(e) => updateSub(m.id, s.id, { url: e.target.value })} />
                  <button style={S.dangerBtn} onClick={() => deleteSub(m.id, s.id)}>Eliminar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <button style={S.primaryBtn} onClick={addItem}>+ Añadir elemento de menú</button>
    </div>
  );
}

function AppearanceAdmin({ config, onChange }) {
  const [urlInput, setUrlInput] = useState(config.background?.type === "image" ? config.background.value : "");
  const [bannerUrlInput, setBannerUrlInput] = useState(config.banner?.type === "image" ? config.banner.value : "");
  const [error, setError] = useState("");
  const [bannerError, setBannerError] = useState("");

  const setImageFromFile = async (file) => {
    setError("");
    try {
      const dataUrl = await fileToDataUrl(file);
      if (dataUrl.length > 5_000_000) { setError("La imagen pesa demasiado (límite ~5 MB). Prueba con una más liviana o usa una URL."); return; }
      onChange({ ...config, background: { type: "image", value: dataUrl } });
    } catch { setError("No se pudo leer la imagen."); }
  };
  const setImageFromUrl = () => { if (urlInput.trim()) onChange({ ...config, background: { type: "image", value: urlInput.trim() } }); };
  const resetBg = () => onChange({ ...config, background: { type: "gradient", value: "" } });

  const setBannerFromFile = async (file) => {
    setBannerError("");
    try {
      const dataUrl = await fileToDataUrl(file);
      if (dataUrl.length > 5_000_000) { setBannerError("La imagen pesa demasiado (límite ~5 MB). Prueba con una más liviana o usa una URL."); return; }
      onChange({ ...config, banner: { type: "image", value: dataUrl } });
    } catch { setBannerError("No se pudo leer la imagen."); }
  };
  const setBannerFromUrl = () => { if (bannerUrlInput.trim()) onChange({ ...config, banner: { type: "image", value: bannerUrlInput.trim() } }); };
  const resetBanner = () => onChange({ ...config, banner: { type: "none", value: "" } });

  return (
    <div>
      <h4 style={S.adminH4}>Banner (franja superior)</h4>
      <p style={S.hint}>Sube una imagen ancha desde tu PC (Windows) o tu móvil (Android/iOS), o pega la URL de una imagen.</p>
      <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && setBannerFromFile(e.target.files[0])} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input style={S.input} placeholder="https://... url del banner" value={bannerUrlInput} onChange={(e) => setBannerUrlInput(e.target.value)} />
        <button style={S.secondaryBtn} onClick={setBannerFromUrl}>Usar URL</button>
      </div>
      {bannerError && <p style={{ color: "#ff6b81", fontSize: 13 }}>{bannerError}</p>}
      <button style={{ ...S.secondaryBtn, marginTop: 10 }} onClick={resetBanner}>Quitar banner</button>

      <h4 style={S.adminH4}>Fondo del sitio</h4>
      <p style={S.hint}>Sube una imagen desde tu PC o móvil, o pega la URL de una imagen.</p>
      <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && setImageFromFile(e.target.files[0])} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input style={S.input} placeholder="https://... url de imagen" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
        <button style={S.secondaryBtn} onClick={setImageFromUrl}>Usar URL</button>
      </div>
      {error && <p style={{ color: "#ff6b81", fontSize: 13 }}>{error}</p>}
      <button style={{ ...S.secondaryBtn, marginTop: 10 }} onClick={resetBg}>Restablecer fondo elegante por defecto</button>

      <h4 style={S.adminH4}>Textos</h4>
      <textarea style={S.textarea} placeholder="Texto de la sección Nosotros" value={config.aboutText || ""} onChange={(e) => onChange({ ...config, aboutText: e.target.value })} />
      <textarea style={S.textarea} placeholder="Texto de la sección Contacto" value={config.contactText || ""} onChange={(e) => onChange({ ...config, contactText: e.target.value })} />
    </div>
  );
}

function WidgetsAdmin({ widgets, onChange, editWidgets, onToggleEditWidgets }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const addWidget = () => {
    setError("");
    if (!name.trim()) { setError("Ponle un nombre a la app."); return; }
    if (!code.trim()) { setError("Pega el código HTML/CSS/JS de la app."); return; }
    const w = { id: uid(), name: name.trim(), code, x: 20, y: 20, w: 320, h: 240, locked: false };
    onChange([...widgets, w]);
    setName("");
    setCode("");
  };
  const deleteWidget = (id) => onChange(widgets.filter((w) => w.id !== id));
  const toggleLock = (id) => onChange(widgets.map((w) => (w.id === id ? { ...w, locked: !w.locked } : w)));

  return (
    <div>
      <h4 style={S.adminH4}>Modo edición de apps</h4>
      <p style={S.hint}>Actívalo para poder arrastrar las apps en la sección "Apps" del sitio. Desactívalo cuando termines de acomodarlas.</p>
      <button style={editWidgets ? S.primaryBtn : S.secondaryBtn} onClick={onToggleEditWidgets}>
        {editWidgets ? "Modo edición: activado" : "Modo edición: desactivado"}
      </button>

      <h4 style={S.adminH4}>Añadir nueva app</h4>
      <input style={S.input} placeholder="Nombre de la app" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea
        style={{ ...S.textarea, minHeight: 120, fontFamily: "monospace" }}
        placeholder="Pega aquí el código HTML/CSS/JS de tu app (por ejemplo un widget, calculadora, mini-juego, etc.)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {error && <p style={{ color: "#ff6b81", fontSize: 13 }}>{error}</p>}
      <button style={{ ...S.primaryBtn, marginTop: 10 }} onClick={addWidget}>+ Añadir app al sitio</button>

      <h4 style={S.adminH4}>Apps en el sitio ({widgets.length})</h4>
      {widgets.length === 0 && <p style={S.hint}>Ninguna todavía.</p>}
      {widgets.map((w) => (
        <div key={w.id} style={S.adminRow}>
          <span style={{ flex: 1 }}>{w.name}</span>
          <button style={S.secondaryBtnSmall} onClick={() => toggleLock(w.id)}>{w.locked ? "🔒 Bloqueada" : "🔓 Libre"}</button>
          <button style={S.dangerBtn} onClick={() => deleteWidget(w.id)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
}

function PaymentsAdmin({ config, onChange }) {
  const [clientId, setClientId] = useState(config.paypalClientId || "");
  const [currency, setCurrency] = useState(config.currency || "USD");
  const save = () => onChange({ ...config, paypalClientId: clientId.trim(), currency });
  return (
    <div>
      <h4 style={S.adminH4}>Configuración de PayPal</h4>
      <p style={S.hint}>Consigue tu Client ID en developer.paypal.com (cuenta Business). Mientras no lo configures, el sitio mostrará un botón de pago simulado.</p>
      <input style={S.input} placeholder="PayPal Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} />
      <select style={{ ...S.input, marginTop: 8 }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
        <option value="USD">USD — Dólar</option>
        <option value="EUR">EUR — Euro</option>
        <option value="MXN">MXN — Peso mexicano</option>
        <option value="COP">COP — Peso colombiano</option>
        <option value="ARS">ARS — Peso argentino</option>
      </select>
      <button style={{ ...S.primaryBtn, marginTop: 10 }} onClick={save}>Guardar configuración de pagos</button>
    </div>
  );
}

function GeneralAdmin({ config, onChange }) {
  const [siteName, setSiteName] = useState(config.siteName);
  const [tagline, setTagline] = useState(config.tagline);
  const [newUser, setNewUser] = useState(config.adminUser);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");

  const saveGeneral = () => onChange({ ...config, siteName, tagline });
  const saveCredentials = () => {
    if (simpleHash(currentPass) !== config.adminPassHash) { setMsg("La contraseña actual no coincide."); return; }
    const patch = { adminUser: newUser.trim() || config.adminUser };
    if (newPass.trim()) patch.adminPassHash = simpleHash(newPass.trim());
    onChange({ ...config, ...patch });
    setMsg("Credenciales actualizadas.");
    setCurrentPass("");
    setNewPass("");
  };

  return (
    <div>
      <h4 style={S.adminH4}>Datos del sitio</h4>
      <input style={S.input} value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Nombre del sitio" />
      <input style={{ ...S.input, marginTop: 8 }} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Eslogan" />
      <button style={{ ...S.primaryBtn, marginTop: 10 }} onClick={saveGeneral}>Guardar</button>

      <h4 style={S.adminH4}>Usuario y clave de administrador</h4>
      <p style={S.hint}>Nota: esta protección es solo a nivel de interfaz (no hay servidor). Suficiente para una plantilla personal, pero no equivale a un sistema bancario real.</p>
      <input style={S.input} value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Nuevo usuario" />
      <input style={{ ...S.input, marginTop: 8 }} type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} placeholder="Contraseña actual" />
      <input style={{ ...S.input, marginTop: 8 }} type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Nueva contraseña (opcional)" />
      {msg && <p style={{ color: msg.includes("actual") ? "#ff6b81" : "#7CE7C9", fontSize: 13 }}>{msg}</p>}
      <button style={{ ...S.primaryBtn, marginTop: 10 }} onClick={saveCredentials}>Actualizar credenciales</button>
    </div>
  );
}

/* ---------------- asistente virtual ---------------- */

function AssistantAvatar({ onClick }) {
  return (
    <button style={S.avatarBtn} onClick={onClick} title="Tócame 3 veces">
      <span style={{ fontSize: 26 }}>🎧</span>
    </button>
  );
}

function AssistantChat({ messages, loading, onSend, onClose }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };
  const onKeyDown = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div style={S.assistantCloud}>
      <div style={S.assistantHeader}>
        <span>🎧 Asistente</span>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div ref={listRef} style={S.assistantMsgs}>
        {messages.length === 0 && <p style={S.hint}>¡Hola! Soy tu asistente. Pregúntame lo que quieras 😊</p>}
        {messages.map((m, i) => (
          <div key={i} style={m.role === "user" ? S.msgUser : S.msgBot}>{m.content}</div>
        ))}
        {loading && <div style={S.msgBot}>Escribiendo…</div>}
      </div>
      <div style={S.assistantInputRow}>
        <input style={S.inputSmall} placeholder="Escribe algo…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} />
        <button style={S.primaryBtn} onClick={submit}>➤</button>
      </div>
    </div>
  );
}

/* ---------------- styles ---------------- */

const S = {
  page: { minHeight: "100vh", fontFamily: "Inter, sans-serif", color: "#F5EFE6", position: "relative" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "sticky", top: 0, zIndex: 20, background: "rgba(20,10,32,0.55)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(232,185,75,0.18)", flexWrap: "wrap", gap: 10 },
  brand: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#F5EFE6" },
  brandName: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, letterSpacing: 0.5 },
  nav: { display: "flex", gap: 22, flexWrap: "wrap" },
  navLink: { color: "#E9DEF5", textDecoration: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" },
  submenu: { position: "absolute", top: "100%", left: 0, background: "#20122f", border: "1px solid rgba(232,185,75,0.25)", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", minWidth: 150, zIndex: 30 },
  submenuLink: { color: "#E9DEF5", textDecoration: "none", fontSize: 13, padding: "6px 8px" },
  cartBtn: { position: "relative", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(232,185,75,0.3)", borderRadius: 10, padding: "8px 12px", color: "#F5EFE6", fontSize: 16, cursor: "pointer" },
  cartBadge: { position: "absolute", top: -6, right: -6, background: "#FF3D81", borderRadius: 10, fontSize: 11, padding: "1px 6px" },
  bannerWrap: { width: "100%", maxHeight: 260, overflow: "hidden" },
  bannerImg: { width: "100%", objectFit: "cover", display: "block", maxHeight: 260 },
  hero: { textAlign: "center", padding: "90px 20px 70px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 },
  heroTitle: { fontFamily: "'Playfair Display', serif", fontSize: "clamp(38px, 7vw, 68px)", margin: "6px 0", background: "linear-gradient(90deg,#E8B94B,#FF3D81 60%,#33D9C7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  heroTagline: { fontSize: 17, color: "#D8C6E8", maxWidth: 520 },
  heroCta: { marginTop: 10, background: "linear-gradient(90deg,#E8B94B,#FF3D81)", color: "#160B24", fontWeight: 700, padding: "12px 26px", borderRadius: 999, textDecoration: "none" },
  section: { padding: "60px 28px", maxWidth: 1100, margin: "0 auto" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: 32, marginBottom: 24, color: "#F0E4FA", borderLeft: "4px solid #E8B94B", paddingLeft: 14 },
  emptyState: { border: "1px dashed rgba(232,185,75,0.35)", borderRadius: 14, padding: 40, textAlign: "center", color: "#C9B7DB" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 },
  card: { display: "flex", gap: 16, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(232,185,75,0.16)", borderRadius: 16, padding: 16 },
  cardArt: { width: 90, height: 90, flexShrink: 0, borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)" },
  cardCoverImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardTitle: { fontWeight: 700, fontSize: 16 },
  cardArtist: { fontSize: 13, color: "#C9B7DB", marginBottom: 8 },
  cardRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  playBtn: { background: "rgba(51,217,199,0.15)", border: "1px solid #33D9C7", color: "#33D9C7", borderRadius: 999, padding: "6px 14px", fontSize: 13, cursor: "pointer" },
  noAudio: { fontSize: 12, color: "#9c86ae" },
  price: { fontWeight: 700, color: "#E8B94B" },
  cardActions: { marginTop: 10 },
  addBtn: { width: "100%", background: "linear-gradient(90deg,#E8B94B,#FF3D81)", border: "none", borderRadius: 10, padding: "9px 0", fontWeight: 700, color: "#160B24", cursor: "pointer" },
  downloadBtn: { display: "block", textAlign: "center", width: "100%", background: "rgba(124,231,201,0.15)", border: "1px solid #7CE7C9", borderRadius: 10, padding: "9px 0", fontWeight: 700, color: "#7CE7C9", textDecoration: "none" },
  playerSection: { padding: "60px 28px", maxWidth: 1100, margin: "0 auto" },
  playerWrap: { display: "flex", gap: 24, flexWrap: "wrap", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(232,185,75,0.16)", borderRadius: 20, padding: 24 },
  playerLeft: { flex: "0 0 220px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" },
  playerCover: { width: 130, height: 130, borderRadius: 14, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)" },
  playerTitle: { fontWeight: 700, fontSize: 16, marginTop: 6 },
  playerControls: { display: "flex", gap: 14, alignItems: "center", marginTop: 10 },
  ctrlBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(232,185,75,0.3)", borderRadius: "50%", width: 38, height: 38, color: "#F5EFE6", cursor: "pointer", fontSize: 16 },
  ctrlBtnMain: { background: "linear-gradient(90deg,#E8B94B,#FF3D81)", border: "none", borderRadius: "50%", width: 52, height: 52, color: "#160B24", cursor: "pointer", fontSize: 20, fontWeight: 700 },
  playerRight: { flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 10, minWidth: 240 },
  searchRow: { display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(232,185,75,0.25)", borderRadius: 10, padding: "6px 12px" },
  searchInput: { flex: 1, background: "none", border: "none", outline: "none", color: "#F5EFE6", fontSize: 14 },
  playlist: { maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 },
  playlistItem: { display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13 },
  playlistItemActive: { display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, background: "rgba(232,185,75,0.15)", border: "1px solid rgba(232,185,75,0.35)" },
  appsSection: { padding: "60px 28px", maxWidth: 1100, margin: "0 auto" },
  appsCanvas: { position: "relative", minHeight: 320, border: "1px dashed rgba(232,185,75,0.2)", borderRadius: 16, overflow: "hidden" },
  widgetBox: { position: "absolute", background: "#1c0e30", border: "1px solid rgba(232,185,75,0.3)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" },
  widgetHandle: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(232,185,75,0.15)", padding: "4px 8px", fontSize: 11, cursor: "grab", userSelect: "none" },
  lockBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13 },
  widgetFrame: { flex: 1, border: "none", width: "100%", background: "#fff" },
  aboutText: { color: "#D8C6E8", lineHeight: 1.7, maxWidth: 720 },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 28px", borderTop: "1px solid rgba(232,185,75,0.15)", color: "#9c86ae", fontSize: 13, flexWrap: "wrap", gap: 10 },
  adminLink: { background: "none", border: "none", color: "#6f5c82", fontSize: 12, cursor: "pointer", textDecoration: "underline" },
  overlay: { position: "fixed", inset: 0, background: "rgba(10,5,18,0.65)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  panel: { background: "#1c0e30", border: "1px solid rgba(232,185,75,0.25)", borderRadius: 16, padding: 22, width: 380, maxWidth: "100%", maxHeight: "85vh", overflowY: "auto" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  closeBtn: { background: "none", border: "none", color: "#F5EFE6", fontSize: 18, cursor: "pointer" },
  cartItem: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14 },
  removeBtn: { background: "none", border: "none", color: "#ff6b81", cursor: "pointer" },
  cartTotalRow: { display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 12, fontSize: 16 },
  warnText: { fontSize: 12, color: "#f0c674", marginTop: 10 },
  payDemoBtn: { width: "100%", marginTop: 8, background: "linear-gradient(90deg,#E8B94B,#FF3D81)", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 700, color: "#160B24", cursor: "pointer" },
  loginBox: { background: "#1c0e30", border: "1px solid rgba(232,185,75,0.25)", borderRadius: 16, padding: 24, width: 320, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 10 },
  input: { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(232,185,75,0.25)", borderRadius: 8, padding: "9px 12px", color: "#F5EFE6", fontSize: 14, marginBottom: 0 },
  inputSmall: { flex: 1, minWidth: 90, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(232,185,75,0.2)", borderRadius: 8, padding: "7px 10px", color: "#F5EFE6", fontSize: 13 },
  textarea: { width: "100%", boxSizing: "border-box", minHeight: 70, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(232,185,75,0.25)", borderRadius: 8, padding: "9px 12px", color: "#F5EFE6", fontSize: 13, marginTop: 8, fontFamily: "inherit" },
  primaryBtn: { background: "linear-gradient(90deg,#E8B94B,#FF3D81)", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, color: "#160B24", cursor: "pointer" },
  secondaryBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(232,185,75,0.3)", borderRadius: 10, padding: "10px 16px", color: "#F5EFE6", cursor: "pointer" },
  secondaryBtnSmall: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(232,185,75,0.3)", borderRadius: 8, padding: "6px 10px", color: "#F5EFE6", cursor: "pointer", fontSize: 12 },
  dangerBtn: { background: "rgba(255,107,129,0.12)", border: "1px solid #ff6b81", borderRadius: 8, padding: "6px 10px", color: "#ff6b81", cursor: "pointer", fontSize: 12 },
  adminBox: { background: "#1c0e30", border: "1px solid rgba(232,185,75,0.25)", borderRadius: 16, padding: 22, width: 640, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto" },
  tabBar: { display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10, marginBottom: 16 },
  tabBtn: { background: "none", border: "1px solid transparent", borderRadius: 8, padding: "7px 12px", color: "#C9B7DB", cursor: "pointer", fontSize: 13 },
  tabBtnActive: { background: "rgba(232,185,75,0.15)", border: "1px solid #E8B94B", borderRadius: 8, padding: "7px 12px", color: "#E8B94B", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  tabBody: { fontSize: 14 },
  adminH4: { fontFamily: "'Playfair Display', serif", color: "#E8B94B", marginTop: 22, marginBottom: 8 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  hint: { fontSize: 12, color: "#9c86ae", margin: "4px 0" },
  adminRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" },
  menuEditRow: { borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10, marginBottom: 10 },
  radioLabel: { fontSize: 13, color: "#D8C6E8", display: "flex", alignItems: "center", gap: 4 },
  toast: { position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#E8B94B", color: "#160B24", padding: "8px 18px", borderRadius: 999, fontWeight: 700, fontSize: 13, zIndex: 200 },
  avatarBtn: { position: "fixed", bottom: 24, right: 24, width: 58, height: 58, borderRadius: "50%", background: "linear-gradient(135deg,#E8B94B,#FF3D81)", border: "none", boxShadow: "0 6px 18px rgba(0,0,0,0.4)", cursor: "pointer", zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center" },
  assistantCloud: { position: "fixed", bottom: 92, right: 24, width: 300, maxWidth: "90vw", height: 380, background: "#20122f", border: "1px solid rgba(232,185,75,0.3)", borderRadius: "24px 24px 6px 24px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 150, display: "flex", flexDirection: "column", overflow: "hidden" },
  assistantHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(232,185,75,0.12)", fontWeight: 700, fontSize: 14 },
  assistantMsgs: { flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 },
  msgUser: { alignSelf: "flex-end", background: "linear-gradient(90deg,#E8B94B,#FF3D81)", color: "#160B24", padding: "8px 12px", borderRadius: "14px 14px 2px 14px", fontSize: 13, maxWidth: "85%" },
  msgBot: { alignSelf: "flex-start", background: "rgba(255,255,255,0.08)", color: "#F5EFE6", padding: "8px 12px", borderRadius: "14px 14px 14px 2px", fontSize: 13, maxWidth: "85%" },
  assistantInputRow: { display: "flex", gap: 6, padding: 10, borderTop: "1px solid rgba(255,255,255,0.08)" },
};

const CSS = `
  * { box-sizing: border-box; }
  a:hover { opacity: 0.85; }
  button:hover { opacity: 0.9; }
  .vinyl { border-radius: 50%; background: repeating-radial-gradient(circle, #2a1640 0 3px, #1c0e30 3px 6px); border: 2px solid #E8B94B; position: relative; flex-shrink: 0; }
  .vinyl-hole { position: absolute; top: 50%; left: 50%; width: 22%; height: 22%; background: #E8B94B; border-radius: 50%; transform: translate(-50%,-50%); }
  .vinyl.spinning { animation: spin 3s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .eqbar { display: inline-block; width: 4px; border-radius: 2px; background: linear-gradient(180deg,#E8B94B,#FF3D81); animation: eq 1s ease-in-out infinite; }
  .eqbar-0 { height: 40%; animation-delay: 0s; }
  .eqbar-1 { height: 90%; animation-delay: .15s; }
  .eqbar-2 { height: 60%; animation-delay: .3s; }
  .eqbar-3 { height: 75%; animation-delay: .45s; }
  @keyframes eq { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
  @media (prefers-reduced-motion: reduce) { .vinyl.spinning, .eqbar { animation: none !important; } }
`;
