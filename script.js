// ── CONFIG ────────────────────────────────────────────────────────────────────
const API_KEY = "9f53fcb90d5e4ad5a8673831262704";

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const searchInput       = document.getElementById("search-input");
const searchDropdown    = document.getElementById("search-dropdown");
const locationDisplay   = document.getElementById("location-display");
const forecastContainer = document.getElementById("forecast-container");
const statusText        = document.getElementById("status-text");
const rainBars          = document.getElementById("rain-bars");
const rainHours         = document.getElementById("rain-hours");
const citiesScroll      = document.getElementById("cities-scroll");

// ── ICON MAP ──────────────────────────────────────────────────────────────────
const iconMapping = {
  "Sunny":                       "https://img.icons8.com/3d-fluency/94/summer.png",
  "Clear":                       "https://img.icons8.com/3d-fluency/94/summer.png",
  "Partly cloudy":               "https://img.icons8.com/3d-fluency/94/partly-cloudy-day.png",
  "Cloudy":                      "https://img.icons8.com/3d-fluency/94/cloud.png",
  "Overcast":                    "https://img.icons8.com/3d-fluency/94/cloud.png",
  "Patchy rain possible":        "https://img.icons8.com/3d-fluency/94/light-rain.png",
  "Light rain":                  "https://img.icons8.com/3d-fluency/94/rain.png",
  "Moderate rain":               "https://img.icons8.com/?size=100&id=SpZSUswN9tJs&format=png",
  "Heavy rain":                  "https://img.icons8.com/3d-fluency/94/storm.png",
  "Thundery outbreaks possible": "https://img.icons8.com/3d-fluency/94/storm.png",
  "Snow":                        "https://img.icons8.com/3d-fluency/94/snowstorm.png",
  "Blowing snow":                "https://img.icons8.com/3d-fluency/94/snowstorm.png",
  "Blizzard":                    "https://img.icons8.com/3d-fluency/94/snowstorm.png",
  "Fog":                         "https://img.icons8.com/?size=100&id=qHIFUjYhnsFU&format=png&color=000000",
  "Freezing fog":                "https://img.icons8.com/?size=100&id=qHIFUjYhnsFU&format=png&color=000000",
  "Mist":                        "https://img.icons8.com/?size=100&id=qHIFUjYhnsFU&format=png&color=000000",
};
const fallbackIcon = "https://img.icons8.com/3d-fluency/94/partly-cloudy-day.png";
const getIcon = c => iconMapping[c] ?? fallbackIcon;

// ── DEFAULT CITIES ────────────────────────────────────────────────────────────
const DEFAULT_CITIES = ["New York", "London", "Tokyo", "Dubai", "Sydney", "Paris", "Singapore", "Mumbai"];

// ── STATE ─────────────────────────────────────────────────────────────────────
let currentData = null;
let activeTab   = "today";
let isDark      = true;
let mapSvgEl    = null;
let wideSvgEl   = null;

// ── STATUS ────────────────────────────────────────────────────────────────────
function setStatus(msg, loading = false) {
  statusText.innerHTML = loading
    ? `<span class="spinner"></span>&nbsp;<span>${msg}</span>`
    : msg;
}

// ── THEME TOGGLE ──────────────────────────────────────────────────────────────
const btnLight = document.getElementById("btn-light");
const btnDark  = document.getElementById("btn-dark");

function applyTheme(dark) {
  isDark = dark;
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  btnDark.style.background  = dark  ? "var(--accent)"    : "transparent";
  btnDark.style.color       = dark  ? "white"             : "var(--text-sec)";
  btnLight.style.background = !dark ? "var(--accent)"    : "transparent";
  btnLight.style.color      = !dark ? "white"             : "var(--text-sec)";
  if (mapSvgEl) {
    mapSvgEl.querySelectorAll("path,polygon").forEach(el => {
      if (el.dataset.active === "1") return;
      el.style.fill   = "var(--map-land)";
      el.style.stroke = "var(--map-stroke)";
    });
  }
}

btnLight.addEventListener("click", () => applyTheme(false));
btnDark.addEventListener("click",  () => applyTheme(true));

// ── FETCH WEATHER ─────────────────────────────────────────────────────────────
async function updateWeather(query) {
  setStatus("Loading…", true);
  try {
    const url  = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=7&aqi=no&alerts=no`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) { setStatus("City not found"); return; }
    currentData = data;
    setStatus("");
    renderAll(data);
  } catch (e) {
    console.error(e);
    setStatus("Network error");
  }
}

// ── RENDER ALL ────────────────────────────────────────────────────────────────
function renderAll(data) {
  locationDisplay.textContent = `${data.location.name}, ${data.location.country}`;
  if      (activeTab === "today")    renderTodayForecast(data);
  else if (activeTab === "tomorrow") renderSingleDayForecast(data.forecast.forecastday[1]);
  else                               renderWeekForecast(data.forecast.forecastday);
  renderRainChart(data);
  updateLocationPin(data);
  highlightMapCountry(data.location.country);
}

// ── TODAY CARD ────────────────────────────────────────────────────────────────
function renderTodayForecast(data) {
  const cur   = data.current;
  const today = data.forecast.forecastday[0];
  const now   = new Date(data.location.localtime);
  const day   = now.toLocaleDateString("en-US", { weekday: "long" });
  const time  = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const icon  = getIcon(cur.condition.text);

  let html = `
    <div class="flex flex-col gap-4 bg-[#c0d8f0] rounded-3xl p-6 text-[#1a1a1a] shadow-xl flex-shrink-0 font-sans" style="min-width:16rem;width:16rem;height:315px">
      <div class="flex justify-between items-center bg-[#94b2d1] rounded-t-3xl px-4 py-2 -mt-6 -mx-6">
        <span class="font-bold text-base">${day}</span>
        <span class="font-bold my-font text-base">${time}</span>
      </div>
      <div class="flex justify-between items-center py-2">
        <span class="text-7xl font-bold my-font tracking-tighter">${Math.round(cur.temp_c)}°</span>
        <img width="76" height="76" src="${icon}" alt="${cur.condition.text}" class="drop-shadow-lg" />
      </div>
      <div class="grid grid-cols-2 gap-y-2 text-[12px] leading-tight font-medium">
        <div class="flex flex-col"><span class="opacity-60">Real Feel</span><span class="font-bold my-font">${Math.round(cur.feelslike_c)}°</span></div>
        <div class="flex flex-col"><span class="opacity-60">Wind</span><span class="font-bold my-font">${cur.wind_dir}, ${cur.wind_kph} km/h</span></div>
        <div class="flex flex-col"><span class="opacity-60">Pressure</span><span class="font-bold my-font">${cur.pressure_mb}MB</span></div>
        <div class="flex flex-col"><span class="opacity-60">Sunrise</span><span class="font-bold my-font">${today.astro.sunrise}</span></div>
        <div class="flex flex-col"><span class="opacity-60">Humidity</span><span class="font-bold my-font">${cur.humidity}%</span></div>
        <div class="flex flex-col"><span class="opacity-60">Sunset</span><span class="font-bold my-font">${today.astro.sunset}</span></div>
      </div>
    </div>`;

  data.forecast.forecastday.slice(1).forEach(d => { html += buildMiniCard(d); });
  forecastContainer.innerHTML = html;
}

// ── TOMORROW CARD ─────────────────────────────────────────────────────────────
function renderSingleDayForecast(d) {
  if (!d) return;
  const date = new Date(d.date);
  const day  = date.toLocaleDateString("en-US", { weekday: "long" });
  const icon = getIcon(d.day.condition.text);

  forecastContainer.innerHTML = `
    <div class="flex flex-col gap-4 bg-[#c0d8f0] rounded-3xl p-6 text-[#1a1a1a] shadow-xl flex-shrink-0 font-" style="min-width:16rem;width:16rem;">
      <div class="flex justify-between items-center bg-[#94b2d1] rounded-t-3xl px-4 py-2 -mt-6 -mx-6">
        <span class="font-bold text-base">${day}</span>
        <span class="font-bold my-font text-base">Tomorrow</span>
      </div>
      <div class="flex justify-between items-center py-2">
        <span class="text-7xl font-bold my-font tracking-tighter">${Math.round(d.day.avgtemp_c)}°</span>
        <img width="76" height="76" src="${icon}" alt="${d.day.condition.text}" class="drop-shadow-lg" />
      </div>
      <div class="grid grid-cols-2 gap-y-2 text-[12px] leading-tight font-medium">
        <div class="flex flex-col"><span class="opacity-60">Max</span><span class="font-bold my-font">${Math.round(d.day.maxtemp_c)}°</span></div>
        <div class="flex flex-col"><span class="opacity-60">Min</span><span class="font-bold my-font">${Math.round(d.day.mintemp_c)}°</span></div>
        <div class="flex flex-col"><span class="opacity-60">Humidity</span><span class="font-bold my-font">${d.day.avghumidity}%</span></div>
        <div class="flex flex-col"><span class="opacity-60">Wind</span><span class="font-bold my-font">${d.day.maxwind_kph} km/h</span></div>
        <div class="flex flex-col"><span class="opacity-60">Sunrise</span><span class="font-bold my-font">${d.astro.sunrise}</span></div>
        <div class="flex flex-col"><span class="opacity-60">Sunset</span><span class="font-bold my-font">${d.astro.sunset}</span></div>
      </div>
    </div>`;
}

// ── WEEK FORECAST ─────────────────────────────────────────────────────────────
function renderWeekForecast(days) {
  forecastContainer.innerHTML = days.map(buildMiniCard).join("");
}

// ── MINI CARD ─────────────────────────────────────────────────────────────────
function buildMiniCard(d) {
  const date = new Date(d.date + "T12:00:00");
  const day  = date.toLocaleDateString("en-US", { weekday: "short" });
  const icon = getIcon(d.day.condition.text);
  return `
    <div class="mini-card flex flex-col items-center justify-between rounded-[2.5rem] py-7 px-3 shadow-md flex-shrink-0" style="min-width:80px;width:84px;min-height:180px;height:320px">
      <div class="flex flex-col items-center gap-2">
        <span class="day-label text-[13px] font-semibold uppercase tracking-wider">${day}</span>
        <div style="width:36px;border-top:1px solid var(--border)"></div>
      </div>
      <img src="${icon}" alt="${d.day.condition.text}" style="width:44px;height:44px;object-fit:contain;" />
      <span class="text-2xl font-bold tracking-tight my-font">${Math.round(d.day.avgtemp_c)}°</span>
    </div>`;
}

// ── RAIN CHART ────────────────────────────────────────────────────────────────
function renderRainChart(data) {
  const hours         = data.forecast.forecastday[0].hour;
  const pickedIndices = [10, 11, 12, 13, 14, 15];
  const picked        = pickedIndices.map(i => hours[i] || hours[hours.length - 1]);

  rainBars.innerHTML = picked.map(h => {
    const pct = h.chance_of_rain;
    const heightPct = Math.max(4, pct);
    return `<div class="rain-bar-col"><div class="rain-bar" style="height:${heightPct}%;" title="${pct}% chance of rain"></div></div>`;
  }).join("");

  rainHours.innerHTML = picked.map(h => {
    const t = new Date(h.time);
    return `<span>${t.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })}</span>`;
  }).join("");
}

// ── CITIES PANEL ──────────────────────────────────────────────────────────────
async function loadCities(citiesToLoad) {
  citiesScroll.innerHTML = `<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:8px;">Loading…</div>`;
  const results = await Promise.allSettled(
    citiesToLoad.map(city =>
      fetch(`https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${encodeURIComponent(city)}&aqi=no`)
        .then(r => r.json())
    )
  );
  citiesScroll.innerHTML = "";
  results.forEach(r => {
    if (r.status !== "fulfilled" || r.value.error) return;
    const d    = r.value;
    const icon = getIcon(d.current.condition.text);
    const div  = document.createElement("div");
    div.className = "city-card flex items-center justify-between rounded-xl px-3 py-2.5";
    div.innerHTML = `
      <div class="flex flex-col gap-0.5">
        <span style="font-size:10px;color:var(--text-muted);">${d.location.country}</span>
        <span class="font-semibold text-sm">${d.location.name}</span>
        <span style="font-size:10px;color:var(--text-sec);">${d.current.condition.text}</span>
      </div>
      <div class="flex items-center gap-2">
        <img src="${icon}" style="width:32px;height:32px;object-fit:contain;" />
        <span class="font-bold my-font text-lg">${Math.round(d.current.temp_c)}°</span>
      </div>`;
    div.addEventListener("click", () => {
      searchInput.value = d.location.name;
      updateWeather(d.location.name);
    });
    citiesScroll.appendChild(div);
  });
}

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
["tab-today", "tab-tomorrow", "tab-week"].forEach(id => {
  document.getElementById(id).addEventListener("click", () => {
    const tabMap = { "tab-today": "today", "tab-tomorrow": "tomorrow", "tab-week": "week" };
    activeTab = tabMap[id];
    ["tab-today", "tab-tomorrow", "tab-week"].forEach(tid => {
      const btn = document.getElementById(tid);
      btn.style.color       = "var(--text-sec)";
      btn.style.fontWeight  = "normal";
      btn.style.borderColor = "transparent";
    });
    const active = document.getElementById(id);
    active.style.color       = "var(--text-pri)";
    active.style.fontWeight  = "bold";
    active.style.borderColor = "var(--accent)";
    if (currentData) renderAll(currentData);
  });
});

// ── SEARCH AUTOCOMPLETE ───────────────────────────────────────────────────────
let searchTimer = null;

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const v = searchInput.value.trim();
  if (v.length < 2) { searchDropdown.classList.add("hidden"); return; }
  searchTimer = setTimeout(() => fetchSuggestions(v), 300);
});

searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter")  { searchDropdown.classList.add("hidden"); if (searchInput.value.trim()) updateWeather(searchInput.value.trim()); }
  if (e.key === "Escape") searchDropdown.classList.add("hidden");
});

document.addEventListener("click", e => {
  if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target))
    searchDropdown.classList.add("hidden");
});

async function fetchSuggestions(q) {
  try {
    const res  = await fetch(`https://api.weatherapi.com/v1/search.json?key=${API_KEY}&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.length) { searchDropdown.classList.add("hidden"); return; }
    searchDropdown.innerHTML = data.slice(0, 6).map(loc => `
      <div class="suggestion-item px-4 py-3 text-sm cursor-pointer transition-colors" data-query="${loc.name}, ${loc.country}">
        <span class="font-medium">${loc.name}</span>
        <span style="color:var(--text-muted)" class="ml-1 text-xs">${loc.region ? loc.region + ", " : ""}${loc.country}</span>
      </div>`).join("");
    searchDropdown.classList.remove("hidden");
    searchDropdown.querySelectorAll(".suggestion-item").forEach(item => {
      item.addEventListener("click", () => {
        searchInput.value = item.dataset.query;
        searchDropdown.classList.add("hidden");
        updateWeather(item.dataset.query);
      });
    });
  } catch (e) { console.error(e); }
}

// ── WORLD MAP ─────────────────────────────────────────────────────────────────
const MAP_SVG_URL = "https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg";

function setupMapInteractivity(svg, tooltipEl, containerEl, countries) {
  countries.forEach(el => {
    const name = el.getAttribute("title") || el.getAttribute("inkscape:label") || el.getAttribute("id") || "";
    el.style.cursor      = "pointer";
    el.style.transition  = "fill 0.18s";
    el.style.fill        = "var(--map-land)";
    el.style.stroke      = "var(--map-stroke)";
    el.style.strokeWidth = "0.5";

    el.addEventListener("mousemove", e => {
      const rect = containerEl.getBoundingClientRect();
      tooltipEl.style.left    = (e.clientX - rect.left + 12) + "px";
      tooltipEl.style.top     = (e.clientY - rect.top - 28) + "px";
      tooltipEl.style.display = name ? "block" : "none";
      tooltipEl.textContent   = name;
    });
    el.addEventListener("mouseleave", () => { tooltipEl.style.display = "none"; });
    el.addEventListener("mouseenter", () => { if (el.dataset.active !== "1") el.style.fill = "var(--map-hover)"; });
    el.addEventListener("click", () => {
      if (!name) return;
      countries.forEach(c => { c.style.fill = "var(--map-land)"; c.dataset.active = "0"; });
      el.style.fill     = "var(--map-active)";
      el.dataset.active = "1";
      updateWeather(name);
      searchInput.value = name;
    });
  });
}

function makeZoomPan(svg) {
  let zoom = 1, px = 0, py = 0;
  let dragging = false, startX = 0, startY = 0, lastPx = 0, lastPy = 0;

  function applyTransform() {
    svg.style.transformOrigin = "0 0";
    svg.style.transform       = `translate(${px}px,${py}px) scale(${zoom})`;
  }

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoom = Math.min(8, Math.max(0.8, zoom * (e.deltaY > 0 ? 0.85 : 1.18)));
    applyTransform();
  }, { passive: false });

  svg.addEventListener("mousedown", e => {
    dragging = true; startX = e.clientX; startY = e.clientY; lastPx = px; lastPy = py;
    svg.style.cursor = "grabbing";
  });
  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    px = lastPx + (e.clientX - startX);
    py = lastPy + (e.clientY - startY);
    applyTransform();
  });
  document.addEventListener("mouseup", () => { dragging = false; svg.style.cursor = "default"; });

  return {
    zoomIn()  { zoom = Math.min(8, zoom * 1.25); applyTransform(); },
    zoomOut() { zoom = Math.max(0.8, zoom / 1.25); applyTransform(); },
    reset()   { zoom = 1; px = 0; py = 0; applyTransform(); },
  };
}

let smallMapControls = null;

async function loadMap() {
  const wrapper   = document.getElementById("map-svg-wrapper");
  const tooltipEl = document.getElementById("map-tooltip");
  const container = document.getElementById("world-map-container");

  try {
    const res  = await fetch(MAP_SVG_URL);
    const text = await res.text();
    wrapper.innerHTML = text;

    const svg = wrapper.querySelector("svg");
    if (!svg) throw new Error("No SVG found");

    // Remove hardcoded width/height so it fills the container via CSS
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width  = "100%";
    svg.style.height = "100%";
    svg.style.cursor = "default";

    // Ensure preserveAspectRatio fills properly
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    mapSvgEl = svg;
    const countries = Array.from(svg.querySelectorAll("path,polygon"));
    setupMapInteractivity(svg, tooltipEl, container, countries);
    smallMapControls = makeZoomPan(svg);

    document.getElementById("map-zoom-in").addEventListener("click",  () => smallMapControls.zoomIn());
    document.getElementById("map-zoom-out").addEventListener("click", () => smallMapControls.zoomOut());
    document.getElementById("map-reset-btn").addEventListener("click", () => smallMapControls.reset());
  } catch (err) {
    console.error("Map load failed:", err);
    wrapper.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;">Map unavailable — use search above</div>`;
  }
}

// ── WIDE MAP ──────────────────────────────────────────────────────────────────
let wideMapControls = null;

document.getElementById("view-wide-btn").addEventListener("click", async () => {
  const overlay = document.getElementById("map-wide-overlay");
  overlay.classList.add("open");

  const wideWrapper = document.getElementById("map-wide-svg");
  if (wideWrapper.querySelector("svg")) return; // already loaded

  const tooltipEl   = document.getElementById("map-wide-tooltip");
  const containerEl = document.getElementById("map-wide-inner");

  try {
    const res  = await fetch(MAP_SVG_URL);
    const text = await res.text();
    wideWrapper.innerHTML = text;

    const svg = wideWrapper.querySelector("svg");
    if (!svg) throw new Error("No SVG");

    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width  = "100%";
    svg.style.height = "100%";
    svg.style.cursor = "default";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    wideSvgEl = svg;
    const countries = Array.from(svg.querySelectorAll("path,polygon"));
    setupMapInteractivity(svg, tooltipEl, containerEl, countries);
    wideMapControls = makeZoomPan(svg);

    // If we already have a location, pin it in the wide map too
    if (currentData) {
      updateLocationPin(currentData);
      highlightMapCountry(currentData.location.country);
    }
  } catch (err) {
    console.error("Wide map failed:", err);
    wideWrapper.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);">Map unavailable</div>`;
  }
});

document.getElementById("close-wide-btn").addEventListener("click", () => {
  document.getElementById("map-wide-overlay").classList.remove("open");
});
document.getElementById("map-wide-overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("map-wide-overlay"))
    document.getElementById("map-wide-overlay").classList.remove("open");
});

// ── LOCATION PIN (placed as SVG elements so it moves with zoom/pan) ───────────
// The Wikipedia low-res world map SVG uses a Plate Carrée (Equirectangular) projection.
// Its viewBox is "0 0 2058 1050":
//   lon: -180..+180  →  svgX: 0..2058
//   lat:  +90..-90   →  svgY: 0..1050
function latLonToSvgCoords(svg, lat, lon) {
  const vb = svg.viewBox.baseVal;
  const W  = vb.width  || 2058;
  const H  = vb.height || 1050;
  const x0 = vb.x || 0;
  const y0 = vb.y || 0;
  return {
    x: x0 + ((lon + 180) / 360) * W,
    y: y0 + ((90 - lat) / 180) * H,
  };
}

function placePinInSvg(svg, lat, lon, label) {
  const old = svg.getElementById("loc-pin-group");
  if (old) old.remove();

  const { x, y } = latLonToSvgCoords(svg, lat, lon);
  const ns = "http://www.w3.org/2000/svg";
  const g  = document.createElementNS(ns, "g");
  g.id = "loc-pin-group";
  g.style.pointerEvents = "none";

  // Glow
  const glow = document.createElementNS(ns, "circle");
  glow.setAttribute("cx", x); glow.setAttribute("cy", y); glow.setAttribute("r", "12");
  glow.setAttribute("fill", "rgba(59,130,246,0.22)");

  // Dot
  const dot = document.createElementNS(ns, "circle");
  dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", "5");
  dot.setAttribute("fill", "#3b82f6"); dot.setAttribute("stroke", "white"); dot.setAttribute("stroke-width", "2");

  // Label
  const charW = 6.2;
  const textW = label.length * charW + 14;
  const textH = 16;
  const tx = x - textW / 2;
  const ty = y - 20;

  const rect = document.createElementNS(ns, "rect");
  rect.setAttribute("x", tx); rect.setAttribute("y", ty - textH + 4);
  rect.setAttribute("width", textW); rect.setAttribute("height", textH);
  rect.setAttribute("rx", "4"); rect.setAttribute("fill", "rgba(15,23,42,0.88)");

  const text = document.createElementNS(ns, "text");
  text.setAttribute("x", x); text.setAttribute("y", ty);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "10");
  text.setAttribute("font-family", "Inter, sans-serif");
  text.setAttribute("fill", "white");
  text.textContent = label;

  g.appendChild(glow); g.appendChild(rect); g.appendChild(text); g.appendChild(dot);
  svg.appendChild(g);
}

function updateLocationPin(data) {
  const lat  = data.location.lat;
  const lon  = data.location.lon;
  const name = `${data.location.name}, ${data.location.country}`;
  [mapSvgEl, wideSvgEl].forEach(svg => {
    if (!svg) return;
    placePinInSvg(svg, lat, lon, name);
  });
}

// ── HIGHLIGHT MAP COUNTRY ─────────────────────────────────────────────────────
function highlightMapCountry(countryName) {
  [mapSvgEl, wideSvgEl].forEach(svg => {
    if (!svg) return;
    svg.querySelectorAll("path,polygon").forEach(el => {
      const n     = (el.getAttribute("title") || el.getAttribute("inkscape:label") || el.getAttribute("id") || "").toLowerCase();
      const match = n === countryName.toLowerCase();
      el.style.fill     = match ? "var(--map-active)" : "var(--map-land)";
      el.dataset.active = match ? "1" : "0";
    });
  });
}

// ── LAYERS BTN ────────────────────────────────────────────────────────────────
let layersOn = false;
document.getElementById("map-layers-btn").addEventListener("click", () => {
  layersOn = !layersOn;
  document.getElementById("map-svg-wrapper").style.opacity = layersOn ? "0.7" : "1";
});

// ── INIT ──────────────────────────────────────────────────────────────────────
// Each async section is independent — a map failure won't break weather, and vice versa
loadMap().catch(console.error);
loadCities(DEFAULT_CITIES).catch(console.error);
updateWeather("Seattle");