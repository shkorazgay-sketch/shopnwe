import { useState, useEffect, useMemo, useRef } from "react";
import {
  Smartphone,
  Camera,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Lock,
  ShieldCheck,
  LogOut,
  ImageOff,
  PackageX,
  Cable,
  HardDrive,
  Filter,
  Check,
  AlertTriangle,
  ImagePlus,
  Loader2,
} from "lucide-react";

const ADMIN_PASSWORD = "lenz2026";

const CATEGORIES = [
  {
    id: "mobile",
    label: "مۆبایل و ئێکسسوارات",
    short: "مۆبایل",
    icon: Smartphone,
    accent: "#48D1E0",
    accentSoft: "rgba(72,209,224,0.14)",
    hint: "بەرگ، کێبڵ، کەللە شەحن، درع، ستاند...",
  },
  {
    id: "cctv",
    label: "کامێرای چاودێری",
    short: "چاودێری",
    icon: Camera,
    accent: "#FF6B7A",
    accentSoft: "rgba(255,107,122,0.14)",
    hint: "کامێرا، DVR، هارد، وایەر، ماوس...",
  },
];

const CURRENCIES = { IQD: "د.ع", USD: "$" };

function formatPrice(price, currency) {
  const n = Number(price || 0);
  const formatted = n.toLocaleString("en-US");
  return currency === "USD" ? `${formatted} $` : `${formatted} د.ع`;
}

function uid() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Reads an uploaded image file, shrinks it down, and returns a base64 data URL
// so it can be stored directly as text (no external hosting needed).
function fileToCompressedDataUrl(file, maxDim = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode-failed"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function emptyForm() {
  return {
    id: "",
    name: "",
    category: "mobile",
    subcategory: "",
    price: "",
    currency: "IQD",
    stock: "available",
    description: "",
    image: "",
  };
}

export default function ShopStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageOk, setStorageOk] = useState(true);

  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSub, setActiveSub] = useState("all");
  const [query, setQuery] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formMode, setFormMode] = useState("add");
  const [formError, setFormError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [toast, setToast] = useState(null);
  const [logoImage, setLogoImage] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await window.storage.get("products", true);
        if (!cancelled) {
          const list = res && res.value ? JSON.parse(res.value) : [];
          setProducts(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
      try {
        const logoRes = await window.storage.get("logo", true);
        if (!cancelled && logoRes && logoRes.value) setLogoImage(logoRes.value);
      } catch (e) {
        // no custom logo saved yet — fine, fallback icon is used
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  async function persist(nextList) {
    setProducts(nextList);
    try {
      const res = await window.storage.set(
        "products",
        JSON.stringify(nextList),
        true
      );
      if (!res) {
        setStorageOk(false);
        showToast("پاشەکەوتکردن سەرکەوتوو نەبوو، دووبارە هەوڵ بدەرەوە", "error");
      } else {
        setStorageOk(true);
      }
    } catch (e) {
      setStorageOk(false);
      showToast("کێشەیەک ڕوویدا لە پاشەکەوتکردن", "error");
    }
  }

  const subOptions = useMemo(() => {
    const pool = products.filter(
      (p) => activeCategory === "all" || p.category === activeCategory
    );
    const set = new Set();
    pool.forEach((p) => {
      if (p.subcategory && p.subcategory.trim()) set.add(p.subcategory.trim());
    });
    return Array.from(set);
  }, [products, activeCategory]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (activeSub !== "all" && (p.subcategory || "") !== activeSub) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${p.name} ${p.subcategory} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, activeCategory, activeSub, query]);

  async function persistLogo(dataUrl) {
    setLogoImage(dataUrl);
    try {
      const res = await window.storage.set("logo", dataUrl, true);
      if (!res) {
        showToast("پاشەکەوتکردنی لۆگۆ سەرکەوتوو نەبوو", "error");
      } else {
        showToast("لۆگۆکە نوێکرایەوە");
      }
    } catch (e) {
      showToast("کێشەیەک ڕوویدا لە پاشەکەوتکردنی لۆگۆ", "error");
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("تکایە تەنها فایلی وێنە هەڵبژێرە", "error");
      return;
    }
    setLogoUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 300, 0.85);
      await persistLogo(dataUrl);
    } catch (err) {
      showToast("نەتوانرا لۆگۆکە باربکرێت", "error");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("تکایە تەنها فایلی وێنە هەڵبژێرە", "error");
      return;
    }
    setImageUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setForm((f) => ({ ...f, image: dataUrl }));
    } catch (err) {
      showToast("نەتوانرا وێنەکە باربکرێت", "error");
    } finally {
      setImageUploading(false);
    }
  }

  function openAdd() {
    setForm(emptyForm());
    setFormMode("add");
    setFormError("");
    setShowForm(true);
  }

  function openEdit(p) {
    setForm({ ...p, price: String(p.price) });
    setFormMode("edit");
    setFormError("");
    setShowForm(true);
  }

  function handleLogin() {
    if (pwInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPwInput("");
      setLoginError("");
      showToast("بەخێربێیت، بەڕێوەبەر");
    } else {
      setLoginError("وشەی نهێنی هەڵەیە");
    }
  }

  function handleLogout() {
    setIsAdmin(false);
    showToast("چوویتە دەرەوە لە بەشی بەڕێوەبردن");
  }

  function validateForm() {
    if (!form.name.trim()) return "ناوی کاڵا پێویستە";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      return "نرخ پێویستە ژمارەیەکی دروست بێت";
    return "";
  }

  async function handleSaveForm() {
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    if (formMode === "add") {
      const newProduct = { ...form, id: uid(), price: Number(form.price) };
      await persist([newProduct, ...products]);
      showToast("کاڵاکە زیادکرا");
    } else {
      const updated = products.map((p) =>
        p.id === form.id ? { ...form, price: Number(form.price) } : p
      );
      await persist(updated);
      showToast("کاڵاکە نوێکرایەوە");
    }
    setShowForm(false);
  }

  async function handleDelete(id) {
    await persist(products.filter((p) => p.id !== id));
    setConfirmDelete(null);
    showToast("کاڵاکە سڕایەوە");
  }

  function scrollToProducts() {
    document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div dir="rtl" style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700;800&family=Vazirmatn:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body, html { margin:0; padding:0; }
        .lenz-root { font-family: 'Vazirmatn', sans-serif; }
        .lenz-display { font-family: 'Noto Kufi Arabic', sans-serif; }
        @keyframes sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulseRing { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes floatUp { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes fadeIn { from { opacity:0; transform: translateY(8px);} to { opacity:1; transform:translateY(0);} }
        .fade-in { animation: fadeIn 0.35s ease both; }
        .lenz-card { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
        .lenz-card:hover { transform: translateY(-4px); }
        .scan-lines::before {
          content: "";
          position: absolute; inset: 0;
          background: repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px);
          pointer-events: none;
        }
        .lenz-btn { transition: filter 0.2s ease, transform 0.15s ease; }
        .lenz-btn:hover { filter: brightness(1.12); }
        .lenz-btn:active { transform: scale(0.97); }
        .chip { transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 8px; }
        input::placeholder, textarea::placeholder { color: #6b7690; }
        .focus-ring:focus-visible { outline: 2px solid #B983FF; outline-offset: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 0.9s linear infinite; }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            <label
              style={{
                ...styles.logoWrap,
                cursor: isAdmin ? "pointer" : "default",
              }}
              title={isAdmin ? "کلیک بکە بۆ گۆڕینی لۆگۆ" : undefined}
            >
              <LensMark image={logoImage} />
              {isAdmin && (
                <span style={styles.logoEditBadge}>
                  {logoUploading ? (
                    <Loader2 size={11} className="spin-icon" />
                  ) : (
                    <Pencil size={11} />
                  )}
                </span>
              )}
              {isAdmin && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                  style={{ display: "none" }}
                />
              )}
            </label>
            <div>
              <div className="lenz-display" style={styles.brandName}>لێنز</div>
              <div style={styles.brandSub}>LENZ · دوکانی مۆبایل و چاودێری</div>
            </div>
          </div>

          <div style={styles.searchWrap}>
            <Search size={17} color="#8892a8" style={{ flexShrink: 0 }} />
            <input
              className="focus-ring"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="گەڕان بەدوای کاڵادا..."
              style={styles.searchInput}
            />
          </div>

          {!isAdmin ? (
            <button
              className="lenz-btn focus-ring"
              onClick={() => setShowLogin(true)}
              style={styles.adminBtn}
            >
              <Lock size={16} />
              <span style={{ fontSize: 13.5 }}>بەڕێوەبردن</span>
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="lenz-btn focus-ring" onClick={openAdd} style={styles.addBtn}>
                <Plus size={16} />
                <span style={{ fontSize: 13.5 }}>کاڵای نوێ</span>
              </button>
              <button className="lenz-btn focus-ring" onClick={handleLogout} style={styles.logoutBtn}>
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section style={styles.hero} ref={heroRef}>
        <div style={styles.heroGlow1} />
        <div style={styles.heroGlow2} />
        <div style={styles.heroInner}>
          <div style={styles.radarWrap}>
            <div style={{ ...styles.radarRing, animation: "pulseRing 2.4s ease-out infinite" }} />
            <div style={{ ...styles.radarRing, animation: "pulseRing 2.4s ease-out infinite 0.8s" }} />
            <div style={styles.radarCore}>
              <div style={{ ...styles.radarSweep, animation: "sweep 3.2s linear infinite" }} />
              <Camera size={22} color="#0A0E1A" style={{ position: "relative", zIndex: 2 }} />
            </div>
          </div>

          <h1 className="lenz-display" style={styles.heroTitle}>
            هەموو کاڵای مۆبایل و چاودێری،
            <br />
            لە یەک شوێن
          </h1>
          <p style={styles.heroText}>
            بەرگ و کێبڵ و شەحنکەرەوەی مۆبایل، هەروەها کامێرای چاودێری و هارد و
            DVR — کاڵا ڕەسەنەکان بە باشترین نرخ.
          </p>

          <div style={styles.heroCta}>
            <button
              className="lenz-btn focus-ring"
              onClick={() => {
                setActiveCategory("mobile");
                setActiveSub("all");
                scrollToProducts();
              }}
              style={{ ...styles.catCta, borderColor: "rgba(72,209,224,0.4)" }}
            >
              <Smartphone size={17} color="#48D1E0" />
              <span>مۆبایل و ئێکسسوارات</span>
            </button>
            <button
              className="lenz-btn focus-ring"
              onClick={() => {
                setActiveCategory("cctv");
                setActiveSub("all");
                scrollToProducts();
              }}
              style={{ ...styles.catCta, borderColor: "rgba(255,107,122,0.4)" }}
            >
              <Camera size={17} color="#FF6B7A" />
              <span>کامێرای چاودێری</span>
            </button>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products-section" style={styles.productsSection}>
        <div style={styles.filterBar}>
          <div style={styles.catTabs}>
            <button
              className="chip focus-ring"
              onClick={() => {
                setActiveCategory("all");
                setActiveSub("all");
              }}
              style={{
                ...styles.catTab,
                ...(activeCategory === "all" ? styles.catTabActiveNeutral : {}),
              }}
            >
              هەمووی
            </button>
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  className="chip focus-ring"
                  onClick={() => {
                    setActiveCategory(c.id);
                    setActiveSub("all");
                  }}
                  style={{
                    ...styles.catTab,
                    ...(active
                      ? { background: c.accentSoft, borderColor: c.accent, color: c.accent }
                      : {}),
                  }}
                >
                  <Icon size={15} />
                  {c.short}
                </button>
              );
            })}
          </div>

          {subOptions.length > 0 && (
            <div style={styles.subRow}>
              <Filter size={13} color="#6b7690" />
              <button
                className="chip focus-ring"
                onClick={() => setActiveSub("all")}
                style={{ ...styles.subChip, ...(activeSub === "all" ? styles.subChipActive : {}) }}
              >
                هەموو جۆرەکان
              </button>
              {subOptions.map((s) => (
                <button
                  key={s}
                  className="chip focus-ring"
                  onClick={() => setActiveSub(s)}
                  style={{ ...styles.subChip, ...(activeSub === s ? styles.subChipActive : {}) }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {!storageOk && (
          <div style={styles.warnBanner}>
            <AlertTriangle size={15} color="#FFC24B" />
            کێشەیەک هەیە لە پەیوەندیکردن بە هەڵگرتنەوە، تکایە دووبارە هەوڵ بدەرەوە.
          </div>
        )}

        {loading ? (
          <div style={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ ...styles.card, ...styles.skeleton }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <PackageX size={40} color="#4a5570" />
            <p style={styles.emptyTitle}>هیچ کاڵایەک نەدۆزرایەوە</p>
            <p style={styles.emptyText}>
              {isAdmin
                ? "دەستپێبکە بە زیادکردنی یەکەم کاڵای دوکانەکەت"
                : "تکایە هەوڵی گەڕانێکی تر بدە یان بەشێکی تر ببینە"}
            </p>
            {isAdmin && (
              <button className="lenz-btn focus-ring" onClick={openAdd} style={styles.addBtnLg}>
                <Plus size={16} /> زیادکردنی کاڵا
              </button>
            )}
          </div>
        ) : (
          <div style={styles.grid}>
            {filtered.map((p) => {
              const cat = CATEGORIES.find((c) => c.id === p.category) || CATEGORIES[0];
              return (
                <div key={p.id} className="lenz-card fade-in" style={styles.card}>
                  <div
                    style={styles.cardImgWrap}
                    onClick={() => setViewProduct(p)}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        style={styles.cardImg}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="scan-lines"
                      style={{
                        ...styles.cardImgFallback,
                        display: p.image ? "none" : "flex",
                        background: `linear-gradient(135deg, ${cat.accentSoft}, rgba(255,255,255,0.02))`,
                      }}
                    >
                      {p.category === "cctv" ? (
                        <Camera size={32} color={cat.accent} style={{ opacity: 0.6 }} />
                      ) : (
                        <Smartphone size={32} color={cat.accent} style={{ opacity: 0.6 }} />
                      )}
                    </div>
                    <span
                      style={{
                        ...styles.stockBadge,
                        ...(p.stock === "out"
                          ? { background: "rgba(255,107,122,0.16)", color: "#FF6B7A" }
                          : { background: "rgba(120,220,150,0.14)", color: "#7EDC96" }),
                      }}
                    >
                      {p.stock === "out" ? "نەماوە" : "بەردەستە"}
                    </span>
                  </div>

                  <div style={styles.cardBody} onClick={() => setViewProduct(p)}>
                    <div style={{ ...styles.catBadge, color: cat.accent, borderColor: cat.accent + "55" }}>
                      {p.subcategory || cat.short}
                    </div>
                    <div style={styles.cardName}>{p.name}</div>
                    <div style={styles.cardPrice}>{formatPrice(p.price, p.currency)}</div>
                  </div>

                  {isAdmin && (
                    <div style={styles.cardAdminRow}>
                      <button
                        className="lenz-btn focus-ring"
                        onClick={() => openEdit(p)}
                        style={styles.iconBtn}
                        title="دەستکاریکردن"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="lenz-btn focus-ring"
                        onClick={() => setConfirmDelete(p.id)}
                        style={{ ...styles.iconBtn, color: "#FF6B7A" }}
                        title="سڕینەوە"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LensMark small image={logoImage} />
            <span className="lenz-display" style={{ fontSize: 15 }}>R-Center</span>
          </div>
          <p style={styles.footerText}>دوکانی کاڵای مۆبایل و کامێرای چاودێری</p>
           <p style={styles.footerText}>07501165636  & 07501516644</p>
        </div>
      </footer>

      {/* Toast */}
      {toast && (
        <div
          className="fade-in"
          style={{
            ...styles.toast,
            borderColor: toast.type === "error" ? "#FF6B7A55" : "#7EDC9655",
          }}
        >
          {toast.type === "error" ? (
            <AlertTriangle size={15} color="#FF6B7A" />
          ) : (
            <Check size={15} color="#7EDC96" />
          )}
          {toast.message}
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <Modal onClose={() => setShowLogin(false)}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={styles.modalIconWrap}>
              <ShieldCheck size={22} color="#B983FF" />
            </div>
            <h3 className="lenz-display" style={styles.modalTitle}>چوونەژوورەوەی بەڕێوەبەر</h3>
            <p style={styles.modalSub}>وشەی نهێنی بنووسە بۆ بەڕێوەبردنی کاڵاکان</p>
          </div>
          <input
            className="focus-ring"
            type="password"
            value={pwInput}
            onChange={(e) => {
              setPwInput(e.target.value);
              setLoginError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="وشەی نهێنی"
            style={styles.input}
            autoFocus
          />
          {loginError && <p style={styles.errorText}>{loginError}</p>}
          <button className="lenz-btn focus-ring" onClick={handleLogin} style={styles.primaryBtn}>
            چوونەژوورەوە
          </button>
        </Modal>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} wide>
          <h3 className="lenz-display" style={styles.modalTitle}>
            {formMode === "add" ? "زیادکردنی کاڵای نوێ" : "دەستکاریکردنی کاڵا"}
          </h3>

          <div style={styles.formGrid}>
            <Field label="ناوی کاڵا *">
              <input
                className="focus-ring"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={styles.input}
                placeholder="بۆ نموونە: کێبڵی سریع تایپ سی"
              />
            </Field>

            <Field label="بەش *">
              <select
                className="focus-ring"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={styles.input}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="جۆر (وردەکاری)">
              <input
                className="focus-ring"
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                style={styles.input}
                placeholder={
                  CATEGORIES.find((c) => c.id === form.category)?.hint || ""
                }
              />
            </Field>

            <div style={{ display: "flex", gap: 10 }}>
              <Field label="نرخ *" style={{ flex: 1 }}>
                <input
                  className="focus-ring"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  style={styles.input}
                  placeholder="0"
                  inputMode="numeric"
                />
              </Field>
              <Field label="دراو" style={{ width: 100 }}>
                <select
                  className="focus-ring"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  style={styles.input}
                >
                  <option value="IQD">د.ع</option>
                  <option value="USD">$</option>
                </select>
              </Field>
            </div>

            <Field label="بەردەستی">
              <select
                className="focus-ring"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                style={styles.input}
              >
                <option value="available">بەردەستە</option>
                <option value="out">نەماوە</option>
              </select>
            </Field>

            <Field label="وێنەی کاڵا (ئارەزوومەندانە)">
              <div style={styles.uploadRow}>
                {form.image ? (
                  <div style={styles.uploadPreviewWrap}>
                    <img src={form.image} alt="preview" style={styles.uploadPreviewImg} />
                    <button
                      type="button"
                      className="lenz-btn focus-ring"
                      onClick={() => setForm((f) => ({ ...f, image: "" }))}
                      style={styles.uploadRemoveBtn}
                      title="سڕینەوەی وێنە"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div style={styles.uploadPreviewEmpty}>
                    <ImageOff size={20} color="#4a5570" />
                  </div>
                )}

                <label className="lenz-btn focus-ring" style={styles.uploadBtn}>
                  {imageUploading ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>بارکردن...</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus size={15} />
                      <span>{form.image ? "گۆڕینی وێنە" : "ئەپڵۆدکردنی وێنە"}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </Field>

            <Field label="وردەکاری کاڵا">
              <textarea
                className="focus-ring"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
                placeholder="زانیاری زیاتر لەسەر کاڵاکە..."
              />
            </Field>
          </div>

          {formError && <p style={styles.errorText}>{formError}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button className="lenz-btn focus-ring" onClick={handleSaveForm} style={{ ...styles.primaryBtn, flex: 1 }}>
              {formMode === "add" ? "زیادکردنی کاڵا" : "پاشەکەوتکردن"}
            </button>
            <button
              className="lenz-btn focus-ring"
              onClick={() => setShowForm(false)}
              style={{ ...styles.secondaryBtn, flex: 1 }}
            >
              پاشگەزبوونەوە
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ ...styles.modalIconWrap, background: "rgba(255,107,122,0.14)" }}>
              <Trash2 size={20} color="#FF6B7A" />
            </div>
            <h3 className="lenz-display" style={styles.modalTitle}>دڵنیایت لە سڕینەوە؟</h3>
            <p style={styles.modalSub}>ئەم کارە ناتوانرێت پاشگەز بکرێتەوە</p>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              className="lenz-btn focus-ring"
              onClick={() => handleDelete(confirmDelete)}
              style={{ ...styles.primaryBtn, flex: 1, background: "#FF6B7A" }}
            >
              بەڵێ، بیسڕەوە
            </button>
            <button
              className="lenz-btn focus-ring"
              onClick={() => setConfirmDelete(null)}
              style={{ ...styles.secondaryBtn, flex: 1 }}
            >
              گەڕانەوە
            </button>
          </div>
        </Modal>
      )}

      {/* View product */}
      {viewProduct && (
        <Modal onClose={() => setViewProduct(null)} wide>
          <div style={styles.viewImgWrap}>
            {viewProduct.image ? (
              <img src={viewProduct.image} alt={viewProduct.name} style={styles.viewImg} />
            ) : (
              <div style={styles.viewImgFallback}>
                <ImageOff size={30} color="#4a5570" />
              </div>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                ...styles.catBadge,
                color: CATEGORIES.find((c) => c.id === viewProduct.category)?.accent,
                borderColor:
                  (CATEGORIES.find((c) => c.id === viewProduct.category)?.accent || "#fff") + "55",
              }}
            >
              {viewProduct.subcategory ||
                CATEGORIES.find((c) => c.id === viewProduct.category)?.short}
            </div>
            <h3 className="lenz-display" style={{ ...styles.modalTitle, textAlign: "right", marginTop: 8 }}>
              {viewProduct.name}
            </h3>
            <p style={styles.viewPrice}>{formatPrice(viewProduct.price, viewProduct.currency)}</p>
            {viewProduct.description && (
              <p style={styles.viewDesc}>{viewProduct.description}</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        className="fade-in"
        style={{ ...styles.modal, maxWidth: wide ? 480 : 380 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="lenz-btn focus-ring" onClick={onClose} style={styles.closeBtn}>
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

function LensMark({ small, image }) {
  const size = small ? 30 : 40;
  if (image) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          background: "#0A0E1A",
        }}
      >
        <img
          src={image}
          alt="لۆگۆ"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #48D1E0, #B983FF 55%, #FF6B7A)",
          padding: 2,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "#0A0E1A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: small ? 10 : 14,
              height: small ? 10 : 14,
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #fff, #B983FF 60%, #6B3FA0)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(139,92,246,0.10), transparent), radial-gradient(ellipse 60% 50% at 90% 10%, rgba(72,209,224,0.08), transparent), #0A0E1A",
    color: "#EEF1F8",
    fontFamily: "'Vazirmatn', sans-serif",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 40,
    background: "rgba(10,14,26,0.72)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  headerInner: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoWrap: { position: "relative", display: "flex", flexShrink: 0 },
  logoEditBadge: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 17,
    height: 17,
    borderRadius: "50%",
    background: "#8B5CF6",
    border: "2px solid #0A0E1A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    pointerEvents: "none",
  },
  brandName: { fontSize: 20, fontWeight: 800, lineHeight: 1.1, letterSpacing: 0.5 },
  brandSub: { fontSize: 11, color: "#8892a8", marginTop: 2 },
  searchWrap: {
    flex: 1,
    minWidth: 180,
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 999,
    padding: "9px 16px",
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#EEF1F8",
    fontSize: 13.5,
    fontFamily: "inherit",
  },
  adminBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#EEF1F8",
    borderRadius: 999,
    padding: "9px 16px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "linear-gradient(135deg, #B983FF, #8B5CF6)",
    border: "none",
    color: "#fff",
    borderRadius: 999,
    padding: "9px 16px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,107,122,0.12)",
    border: "1px solid rgba(255,107,122,0.3)",
    color: "#FF6B7A",
    borderRadius: 999,
    width: 36,
    height: 36,
    cursor: "pointer",
  },
  hero: {
    position: "relative",
    padding: "72px 20px 56px",
    overflow: "hidden",
    textAlign: "center",
  },
  heroGlow1: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "rgba(139,92,246,0.18)",
    filter: "blur(70px)",
    pointerEvents: "none",
  },
  heroGlow2: {
    position: "absolute",
    bottom: -140,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "rgba(255,107,122,0.13)",
    filter: "blur(80px)",
    pointerEvents: "none",
  },
  heroInner: { maxWidth: 640, margin: "0 auto", position: "relative", zIndex: 1 },
  radarWrap: {
    position: "relative",
    width: 78,
    height: 78,
    margin: "0 auto 26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  radarRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: "1.5px solid rgba(185,131,255,0.5)",
  },
  radarCore: {
    position: "relative",
    width: 46,
    height: 46,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #48D1E0, #B983FF)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    boxShadow: "0 0 24px rgba(185,131,255,0.5)",
  },
  radarSweep: {
    position: "absolute",
    inset: 0,
    background:
      "conic-gradient(from 0deg, rgba(255,255,255,0.55), transparent 55%)",
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1.35,
    margin: "0 0 16px",
    background: "linear-gradient(90deg, #EEF1F8, #C9CEDC)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroText: { fontSize: 15.5, color: "#9aa4bd", lineHeight: 1.9, margin: "0 0 30px" },
  heroCta: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  catCta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid",
    color: "#EEF1F8",
    borderRadius: 14,
    padding: "13px 22px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  productsSection: { maxWidth: 1180, margin: "0 auto", padding: "8px 20px 80px" },
  filterBar: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 },
  catTabs: { display: "flex", gap: 8, flexWrap: "wrap" },
  catTab: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#9aa4bd",
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 13.5,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  catTabActiveNeutral: {
    background: "rgba(255,255,255,0.1)",
    color: "#EEF1F8",
    borderColor: "rgba(255,255,255,0.25)",
  },
  subRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  subChip: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#7b869e",
    borderRadius: 999,
    padding: "5px 13px",
    fontSize: 12.5,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  subChipActive: {
    background: "rgba(185,131,255,0.14)",
    borderColor: "rgba(185,131,255,0.5)",
    color: "#C9A6FF",
  },
  warnBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,194,75,0.08)",
    border: "1px solid rgba(255,194,75,0.25)",
    color: "#FFC24B",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 18,
  },
  card: {
    position: "relative",
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 18,
    overflow: "hidden",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    cursor: "pointer",
  },
  skeleton: {
    height: 240,
    background:
      "linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
    backgroundSize: "200% 100%",
    animation: "sweep 1.6s linear infinite",
    cursor: "default",
  },
  cardImgWrap: { position: "relative", width: "100%", height: 150, background: "#0d1322" },
  cardImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardImgFallback: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  stockBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    fontSize: 10.5,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 999,
  },
  cardBody: { padding: "13px 14px 15px" },
  catBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid",
    borderRadius: 999,
    padding: "3px 10px",
    marginBottom: 8,
  },
  cardName: { fontSize: 14.5, fontWeight: 600, color: "#EEF1F8", marginBottom: 6, lineHeight: 1.4 },
  cardPrice: { fontSize: 15, fontWeight: 700, color: "#B983FF" },
  cardAdminRow: {
    display: "flex",
    gap: 8,
    padding: "0 14px 14px",
  },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    flex: 1,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#c9ceda",
    borderRadius: 10,
    padding: "7px",
    cursor: "pointer",
    fontSize: 12,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "70px 20px",
    textAlign: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "#c9ceda", margin: "4px 0 0" },
  emptyText: { fontSize: 13.5, color: "#6b7690", margin: 0, maxWidth: 320 },
  addBtnLg: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "linear-gradient(135deg, #B983FF, #8B5CF6)",
    border: "none",
    color: "#fff",
    borderRadius: 12,
    padding: "11px 22px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
    marginTop: 10,
  },
  footer: { borderTop: "1px solid rgba(255,255,255,0.08)", padding: "28px 20px" },
  footerInner: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  footerText: { fontSize: 12.5, color: "#6b7690", margin: 0 },
  toast: {
    position: "fixed",
    bottom: 22,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(20,25,40,0.95)",
    border: "1px solid",
    color: "#EEF1F8",
    borderRadius: 12,
    padding: "11px 18px",
    fontSize: 13.5,
    zIndex: 100,
    backdropFilter: "blur(10px)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(6,8,16,0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 90,
    padding: 20,
  },
  modal: {
    position: "relative",
    width: "100%",
    background: "#131829",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 26,
    maxHeight: "88vh",
    overflowY: "auto",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#c9ceda",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "rgba(185,131,255,0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
  },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 6px", textAlign: "center" },
  modalSub: { fontSize: 13, color: "#8892a8", margin: 0, textAlign: "center" },
  formGrid: { display: "flex", flexDirection: "column", gap: 14, marginTop: 6 },
  label: { fontSize: 12.5, color: "#9aa4bd", fontWeight: 500 },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "10px 13px",
    color: "#EEF1F8",
    fontSize: 13.5,
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
  },
  errorText: { color: "#FF6B7A", fontSize: 12.5, marginTop: 8, textAlign: "center" },
  primaryBtn: {
    background: "linear-gradient(135deg, #B983FF, #8B5CF6)",
    border: "none",
    color: "#fff",
    borderRadius: 12,
    padding: "12px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 16,
    width: "100%",
  },
  secondaryBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#c9ceda",
    borderRadius: 12,
    padding: "12px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  uploadRow: { display: "flex", alignItems: "center", gap: 12 },
  uploadPreviewWrap: {
    position: "relative",
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    flexShrink: 0,
    background: "#0d1322",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  uploadPreviewImg: { width: "100%", height: "100%", objectFit: "cover" },
  uploadPreviewEmpty: {
    width: 64,
    height: 64,
    borderRadius: 12,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0d1322",
    border: "1px dashed rgba(255,255,255,0.15)",
  },
  uploadRemoveBtn: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "rgba(6,8,16,0.75)",
    border: "none",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  uploadBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#c9ceda",
    borderRadius: 10,
    padding: "9px 14px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  viewImgWrap: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    background: "#0d1322",
  },
  viewImg: { width: "100%", height: "100%", objectFit: "cover" },
  viewImgFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  viewPrice: { fontSize: 20, fontWeight: 800, color: "#B983FF", margin: "8px 0 12px" },
  viewDesc: { fontSize: 13.5, color: "#9aa4bd", lineHeight: 1.8, margin: 0 },
};
