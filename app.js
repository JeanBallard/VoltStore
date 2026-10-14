/**
 * VoltStore — учебный демонстрационный проект.
 * Данные хранятся локально в браузере (localStorage).
 * Платежи и переписка не подключены к реальным сервисам.
 *
 * Порядок чтения: данные → хранилище → интерфейс → события → запуск.
 */

"use strict";
/* ===== данные: магазин ===== */
const IMG = {
    i17: "https://www.apple.com/newsroom/images/2025/09/apple-debuts-iphone-17/geo/article/Apple-iPhone-17-hero-250909_inline.jpg.large.jpg",
    i15: "https://www.apple.com/newsroom/images/2023/09/apple-unveils-iphone-15-pro-and-iphone-15-pro-max/article/Apple-iPhone-15-Pro-lineup-hero-230912_Full-Bleed-Image.jpg.large.jpg",
    s24: "https://images.samsung.com/kz_ru/smartphones/galaxy-s24-ultra/images/galaxy-s24-ultra-highlights-kv.jpg?imbypass=true",
    x17: "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-17/pc/cbsuibuswegr87t387t76tfsvcshvaygu.png?q=85"
};
const K = ["Год выхода", "Экран", "Процессор", "Память (ОЗУ / ROM)", "Основная камера", "Фронтальная камера", "Батарея", "Зарядка", "ОС и обновления", "Защита", "Связь", "Корпус", "Вес"];
const S = a => Object.fromEntries(K.map((k, i) => [k, a[i]]));
const CAM17 = "48 МП осн. + 48 МП ультраширик + 48 МП tele (4×)";
/* t: g — игровой, c — камерафон, h — гибрид (универсал) */
const DEF = [
    { id: 1, brand: "Apple", name: "iPhone 17 Pro Max", price: 899990, stock: 5, rating: 4.9, hot: 1, t: ["c", "g"], img: "", desc: "A19 Pro · 12 ГБ · 6.9″ · 39 ч видео",
        s: S(["2025", "6.9″ LTPO OLED, 120 Гц, до 3000 нит", "Apple A19 Pro", '12 ГБ / 256 ГБ', CAM17, "18 МП", "до 39 ч видео", "40 Вт, Qi2 25 Вт", "iOS 26", "IP68", "5G, Wi‑Fi 7, Bluetooth 6", "Алюминий unibody, Ceramic Shield 2", "233 г"]),
        pro: ["Лучшая автономность у iPhone", "Топовое видео и зум", "Мощный чип и охлаждение"], con: ["Очень высокая цена", "Тяжёлый и крупный"] },
    { id: 2, brand: "Apple", name: "iPhone 17 Pro", price: 779990, stock: 8, rating: 4.8, t: ["c"], img: "", desc: "A19 Pro · 12 ГБ · 6.3″ · 3 камеры 48 МП",
        s: S(["2025", "6.3″ LTPO OLED, 120 Гц, до 3000 нит", "Apple A19 Pro", '12 ГБ / 256 ГБ', CAM17, "18 МП", "до 33 ч видео", "40 Вт, Qi2 25 Вт", "iOS 26", "IP68", "5G, Wi‑Fi 7, Bluetooth 6", "Алюминий unibody, Ceramic Shield 2", "206 г"]),
        pro: ["Компактный флагман", "Три камеры по 48 МП", "Быстрая память и чип"], con: ["Дорого за 256 ГБ", "Зарядка медленнее Android"] },
    { id: 3, brand: "Apple", name: "iPhone Air", price: 699990, stock: 4, rating: 4.5, t: ["h"], img: "", desc: "A19 Pro · 5.6 мм · 165 г · титан",
        s: S(["2025", "6.5″ OLED, 120 Гц", "Apple A19 Pro", '12 ГБ / 256 ГБ', "48 МП (одна камера)", "18 МП", "до 27 ч видео", "~20 Вт, MagSafe", "iOS 26", "IP68", "5G, Wi‑Fi 7, только eSIM", "Титан, толщина 5.6 мм", "165 г"]),
        pro: ["Невероятно тонкий и лёгкий", "Титановый корпус", "Красивый дизайн"], con: ["Одна камера", "Батарея меньше, чем у Pro"] },
    { id: 4, brand: "Apple", name: "iPhone 17", price: 549990, stock: 12, rating: 4.8, t: ["h"], img: IMG.i17, desc: "A19 · 8 ГБ · OLED 120 Гц",
        s: S(["2025", "6.3″ OLED, 120 Гц", "Apple A19", '8 ГБ / 256 ГБ', "48 МП осн. + 48 МП ультраширик", "18 МП", "до 30 ч видео", "40 Вт, MagSafe", "iOS 26", "IP68", "5G, Wi‑Fi 7", "Алюминий, Ceramic Shield 2", "177 г"]),
        pro: ["Лучший баланс цены и качества", "120 Гц во всей линейке", "Долгая поддержка обновлений"], con: ["Нет телеобъектива", "Зарядка медленнее Android"] },
    { id: 5, brand: "Samsung", name: "Galaxy S25 Ultra", price: 649990, old: 699990, stock: 9, rating: 4.9, hot: 1, t: ["c", "g"], img: "", desc: "Snapdragon 8 Elite · 200 МП · S Pen",
        s: S(["2025", "6.9″ Dynamic AMOLED 2X, 120 Гц, до 2600 нит", "Snapdragon 8 Elite for Galaxy", '12 ГБ / 256 ГБ', "200 МП + 50 МП ультраширик + 50 МП (5×) + 10 МП (3×)", "12 МП", "5000 мА·ч", "45 Вт, беспроводная 15 Вт", "Android 15 / One UI 7, 7 лет", "IP68, поддержка S Pen", "5G, Wi‑Fi 7", "Титановая рама, Gorilla Armor 2", "218 г"]),
        pro: ["Универсальная камера с зумом", "S Pen в комплекте", "7 лет обновлений"], con: ["Крупный и тяжёлый", "Зарядка не самая быстрая"] },
    { id: 6, brand: "Samsung", name: "Galaxy Z Fold7", price: 1199990, stock: 3, rating: 4.7, t: ["h"], img: "", desc: "Складной · 8″ экран · 215 г",
        s: S(["2025", "8.0″ Dynamic AMOLED 2X внутри + 6.5″ снаружи, 120 Гц", "Snapdragon 8 Elite for Galaxy", '12 ГБ / 256 ГБ', "200 МП + 12 МП ультраширик + 10 МП (3×)", "10 МП (внеш.) + 10 МП (внутр.)", "4400 мА·ч", "25 Вт, беспроводная 15 Вт", "Android 16 / One UI 8, 7 лет", "IP48", "5G, Wi‑Fi 7", "Armor Aluminum, 4.2 мм в раскрытом виде", "215 г"]),
        pro: ["Планшет в кармане", "Очень тонкий для складного", "Мощное железо"], con: ["Самая высокая цена", "Слабая защита от пыли (IP48)"] },
    { id: 7, brand: "Google", name: "Pixel 10 Pro", price: 629990, stock: 6, rating: 4.6, t: ["c"], img: "", desc: "Tensor G5 · 16 ГБ · ИИ-камера",
        s: S(["2025", "6.3″ LTPO OLED, 120 Гц, до 3300 нит", "Google Tensor G5", '16 ГБ / 256 ГБ', "50 МП + 48 МП ультраширик + 48 МП (5×)", "42 МП", "4870 мА·ч", "30 Вт, Qi2 15 Вт", "Android 16, 7 лет", "IP68", "5G, Wi‑Fi 7", "Алюминий, Gorilla Glass Victus 2", "207 г"]),
        pro: ["Лучшая программная обработка фото", "Чистый Android", "16 ГБ ОЗУ и 42 МП селфи"], con: ["Слабее в тяжёлых играх", "Зарядка медленная"] },
    { id: 8, brand: "Xiaomi", name: "Xiaomi 15 Ultra", price: 699990, stock: 7, rating: 4.8, t: ["c"], img: "", desc: "1″ сенсор · 200 МП перископ · Leica",
        s: S(["2025", "6.73″ LTPO AMOLED QHD+, 120 Гц, до 3200 нит", "Snapdragon 8 Elite", '16 ГБ / 512 ГБ', "50 МП (1″) + 50 МП (3×) + 200 МП (4.3×) + 50 МП ультраширик, Leica", "32 МП", "5410 мА·ч", "90 Вт проводная, 80 Вт беспроводная", "HyperOS 2 (Android 15)", "IP68", "5G, Wi‑Fi 7", "Алюминий, стекло / эко-кожа", "226 г"]),
        pro: ["Лучший камерафон для съёмки", "Очень быстрая зарядка", "512 ГБ по умолчанию"], con: ["Оболочка с рекламой", "Меньше лет обновлений"] },
    { id: 9, brand: "Xiaomi", name: "Xiaomi 17", price: 499990, stock: 14, rating: 4.7, t: ["h", "g"], img: IMG.x17, desc: "Snapdragon 8 Elite Gen 5 · 512 ГБ · Leica",
        s: S(["2025", "6.3″ LTPO AMOLED, 120 Гц", "Snapdragon 8 Elite Gen 5", '12 ГБ / 512 ГБ', "50 МП + 50 МП (2.6×) + 50 МП ультраширик, Leica", "50 МП", "до 7000 мА·ч (зависит от версии)", "100 Вт проводная, 50 Вт беспроводная", "HyperOS 3 (Android 16)", "IP68", "5G, Wi‑Fi 7", "Алюминий, стекло", "191 г"]),
        pro: ["Огромная батарея", "Очень быстрая зарядка", "Мощный чип за небольшие деньги"], con: ["Реклама в оболочке", "Обновления короче, чем у Samsung/Google"] },
    { id: 10, brand: "RedMagic", name: "RedMagic 10 Pro", price: 449990, stock: 6, rating: 4.7, t: ["g"], img: "", desc: "144 Гц · вентилятор · 7050 мА·ч",
        s: S(["2025", "6.85″ AMOLED, 144 Гц, без выреза", "Snapdragon 8 Elite + Red Core R3", '16 ГБ / 512 ГБ', "50 МП + 50 МП ультраширик + 2 МП макро", "16 МП (под экраном)", "7050 мА·ч", "100 Вт", "RedMagic OS 10 (Android 15)", "Нет официальной защиты от воды", "5G, Wi‑Fi 7, триггеры 520 Гц", "Алюминий, активное охлаждение", "229 г"]),
        pro: ["Лучший для игр: вентилятор и триггеры", "Экран без выреза", "Огромная батарея"], con: ["Слабая камера", "Нет влагозащиты"] },
    { id: 11, brand: "OnePlus", name: "OnePlus 13", price: 459990, stock: 10, rating: 4.7, t: ["g", "h"], img: "", desc: "Snapdragon 8 Elite · 6000 мА·ч · Hasselblad",
        s: S(["2025", "6.82″ LTPO AMOLED QHD+, 120 Гц, до 4500 нит", "Snapdragon 8 Elite", '12 ГБ / 256 ГБ', "50 МП + 50 МП (3×) + 50 МП ультраширик, Hasselblad", "32 МП", "6000 мА·ч", "100 Вт, беспроводная 50 Вт", "OxygenOS 15 (Android 15)", "IP68 / IP69", "5G, Wi‑Fi 7", "Алюминий, стекло", "210 г"]),
        pro: ["Топ железо за адекватные деньги", "Быстрая проводная и беспроводная зарядка", "Влагозащита IP69"], con: ["Камера чуть слабее Ultra-моделей", "Нет официального Qi2"] }
];
let P = JSON.parse(JSON.stringify(DEF));
const TYPE = { g: "🎮 Игровой", c: "📷 Камерафон", h: "⚡ Гибрид" };
/* ===== данные: ресейл ===== */
const DAY = 864e5, now = Date.now();
const SELL = [{ id: "s1", name: "Данияр К.", city: "Алматы", since: 2023, phone: "+7 701 555 12 34" }, { id: "s2", name: "Алина М.", city: "Астана", since: 2022, phone: "+7 702 555 45 67" }, { id: "s3", name: "Тимур Б.", city: "Алматы", since: 2024, phone: "+7 705 555 78 90" }, { id: "s4", name: "Мадина С.", city: "Шымкент", since: 2021, phone: "+7 707 555 21 43" }];
const REV0 = [{ s: "s1", a: "Ерлан", st: 5, t: "Телефон как в описании, встретились быстро.", d: now - 40 * DAY }, { s: "s1", a: "Аружан", st: 5, t: "Всё честно, батарея ровно как заявлено.", d: now - 15 * DAY }, { s: "s2", a: "Нурлан", st: 4, t: "Небольшие царапины, но продавец предупредил.", d: now - 30 * DAY }, { s: "s3", a: "Сабина", st: 5, t: "Отличный продавец, скинул цену.", d: now - 9 * DAY }, { s: "s4", a: "Али", st: 4, t: "Всё хорошо, немного задержалась с ответом.", d: now - 60 * DAY }];
const AD0 = [
    { id: "a1", sid: "s1", model: "iPhone 15 Pro", mem: "256 ГБ", price: 389990, cond: "Отличное", bat: 91, city: "Алматы", img: IMG.i15, note: "Полный комплект, без царапин, чехол в подарок.", d: now - 1 * DAY },
    { id: "a2", sid: "s2", model: "Galaxy S24 Ultra", mem: "256 ГБ", price: 410000, cond: "Хорошее", bat: 88, city: "Астана", img: IMG.s24, note: "Небольшие следы на рамке, экран идеальный.", d: now - 2 * DAY },
    { id: "a3", sid: "s3", model: "iPhone 16 Pro", mem: "512 ГБ", price: 560000, cond: "Как новое", bat: 98, city: "Алматы", img: "", note: "Куплен 3 месяца назад, чек и гарантия есть.", d: now - 3 * DAY },
    { id: "a4", sid: "s4", model: "Pixel 9 Pro", mem: "256 ГБ", price: 330000, cond: "Отличное", bat: 94, city: "Шымкент", img: "", note: "Оригинальная коробка, без вскрытий.", d: now - 5 * DAY },
    { id: "a5", sid: "s1", model: "iPhone 13", mem: "128 ГБ", price: 170000, cond: "Хорошее", bat: 84, city: "Алматы", img: "", note: "Рабочая лошадка, батарея менялась в сервисе Apple.", d: now - 7 * DAY },
    { id: "a6", sid: "s3", model: "Xiaomi 14T Pro", mem: "512 ГБ", price: 210000, cond: "Как новое", bat: 97, city: "Алматы", img: "", note: "Пользовался 2 месяца, всё в комплекте.", d: now - 8 * DAY }
];
/* ===== хранилище ===== */
const $ = s => document.querySelector(s), money = n => "₸" + Number(n).toLocaleString("ru-RU"), esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const store = { get(k, d) { try {
        return JSON.parse(localStorage.getItem(k)) ?? d;
    }
    catch {
        return d;
    } }, set(k, v) { try {
        localStorage.setItem(k, JSON.stringify(v));
    }
    catch { } } };
let cart, cmp, USERS, ORD, bans, ADS, U, revs, chats, sold, bought, ty = [], rv = { p: "list", sid: null, tab: "ads", f: { q: "", city: "", sort: "new" } }, phShown = {};
function load() {
    const c = store.get("vs_cat", null);
    P = Array.isArray(c) && c.length > 1 ? c.filter(p => p && p.id && p.s && Array.isArray(p.t) && Array.isArray(p.pro) && Array.isArray(p.con)) : JSON.parse(JSON.stringify(DEF));
    cart = store.get("vs_cart", []).filter(i => byId(i.id));
    cmp = store.get("vs_cmp", []).filter(byId).slice(0, 3);
    USERS = store.get("vs_users", []);
    ORD = store.get("vs_orders", []);
    bans = store.get("vs_bans", {});
    ADS = store.get("vs_ads2", null) || JSON.parse(JSON.stringify(AD0));
    const sid0 = store.get("vs_sess", null);
    U = USERS.find(u => u.id === sid0 && !bans[u.id]) || null;
    revs = store.get("vs_revs", []);
    chats = store.get("vs_chats2", {});
    sold = store.get("vs_sold", []);
    bought = store.get("vs_bought", []);
}
const byId = id => P.find(p => p.id === id);
function save() { store.set("vs_cart", cart); store.set("vs_cmp", cmp); store.set("vs_users", USERS); store.set("vs_orders", ORD); store.set("vs_bans", bans); store.set("vs_ads2", ADS); store.set("vs_revs", revs); store.set("vs_chats2", chats); store.set("vs_sold", sold); store.set("vs_bought", bought); badges(); }
function badges() {
    acctBtn();
    $("#nCart").textContent = cart.reduce((n, i) => n + i.qty, 0);
    $("#nCmp").textContent = cmp.length;
    const b = $("#cmpbar");
    b.style.display = cmp.length && !/^#(resale|admin)/.test(location.hash) ? "flex" : "none";
    $("#cmpTxt").textContent = "Сравнение: " + cmp.length + " из 3";
    const n = Object.keys(chats).length, c = $("#nChat");
    c.hidden = !n;
    c.textContent = n;
}
/* ===== общее ===== */
function pic(src, name) { return `<div class="pic">${src ? `<img src="${esc(src)}" alt="${esc(name)}" loading="lazy" decoding="async">` : `<div class="fb">${esc(name)}</div>`}</div>`; }
addEventListener("error", e => { const t = e.target; if (t.tagName === "IMG" && !t.dataset.x) {
    t.dataset.x = 1;
    t.outerHTML = `<div class="fb">${esc(t.alt)}</div>`;
} }, true);
let tt;
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("show"), 2200); }
function open(html) { const m = $("#modal"); m.innerHTML = html; m.scrollTop = 0; m.classList.add("show"); $("#ov").classList.add("show"); document.body.classList.add("lock"); }
function closeM() { $("#modal").classList.remove("show"); $("#ov").classList.remove("show"); document.body.classList.remove("lock"); }
const head = t => `<div class="mh"><h2>${t}</h2><button class="x" data-a="close" aria-label="Закрыть">×</button></div>`;
const stars = n => `<span class="stars">${"★".repeat(Math.round(n))}${"☆".repeat(5 - Math.round(n))}</span>`;
const ago = t => { const d = Math.floor((Date.now() - t) / DAY); return d < 1 ? "сегодня" : d === 1 ? "вчера" : d + " дн. назад"; };
/* ===== каталог ===== */
let bkey = "";
// Дополнительный фильтр бюджета из формы каталога.
let maxCatalogPrice = 1300000;
function fillBrands() { const l = [...new Set(P.map(p => p.brand))], k = l.join("|"), sel = $("#brand"); if (k === bkey)
    return; bkey = k; const cur = sel.value; sel.innerHTML = '<option value="">Все бренды</option>' + l.map(b => `<option>${esc(b)}</option>`).join(""); sel.value = l.includes(cur) ? cur : ""; }
function renderCatalog() {
    fillBrands();
    const q = $("#q").value.trim().toLowerCase(), b = $("#brand").value, s = $("#sort").value;
    let l = P.filter(p => (!b || p.brand === b) && (!ty.length || ty.some(k => p.t.includes(k))) && p.price <= maxCatalogPrice && (!q || (p.name + p.brand + p.desc).toLowerCase().includes(q)));
    if (s === "1")
        l.sort((a, c) => a.price - c.price);
    if (s === "2")
        l.sort((a, c) => c.price - a.price);
    if (s === "3")
        l.sort((a, c) => c.rating - a.rating);
    // Счётчик найденных моделей и подпись бюджета обновляются при каждом фильтре.
    const count = $("#resultCount");
    if (count) count.textContent = `Найдено моделей: ${l.length}`;
    const budget = $("#priceValue");
    if (budget) budget.textContent = money(maxCatalogPrice);
    document.querySelectorAll("#types .btn").forEach(x => x.classList.toggle("on", ty.includes(x.dataset.k)));
    $("#grid").innerHTML = l.length ? l.map(p => `<article class="card glass"><span class="badge">${p.old ? "SALE" : p.hot ? "ХИТ" : "NEW"}</span>${pic(p.img, p.name)}
 <div class="info"><div class="cat">${p.brand} · ★ ${p.rating}</div><div class="name">${esc(p.name)}</div><div class="tags">${p.t.map(k => `<span class="tg">${TYPE[k]}</span>`).join("")}</div><div class="desc">${esc(p.desc)}</div>
 <div class="price">${money(p.price)}${p.old ? `<span class="old">${money(p.old)}</span>` : ""}</div>
 <div class="ok ${p.stock ? "" : "out"}">${p.stock ? "✓ Завоз 2025–26 · " + p.stock + " шт." : "✕ Нет в наличии"}</div>
 <div class="row"><button class="btn" data-a="open" data-id="${p.id}">Подробнее</button><button class="btn ${cmp.includes(p.id) ? "on" : ""}" data-a="tcmp" data-id="${p.id}">${cmp.includes(p.id) ? "✓ В сравнении" : "⇄ Сравнить"}</button></div>
 <button class="btn primary mt" style="width:100%" data-a="add" data-id="${p.id}" ${p.stock ? "" : "disabled"}>В корзину</button></div></article>`).join("") : `<div class="empty">Ничего не найдено. Попробуйте другой запрос.</div>`;
}
function alt(p) { return P.filter(x => x.id !== p.id).sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))[0]; }
const specTable = o => `<table>${Object.entries(o).map(([k, v]) => `<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join("")}</table>`;
const ul = (l, c) => `<ul>${l.map(x => `<li class="${c}">${esc(x)}</li>`).join("")}</ul>`;
function openProduct(id) {
    const p = byId(id), a = alt(p), d = a.price - p.price, dt = d === 0 ? "цена одинаковая" : (d > 0 ? `на ${money(d)} дороже` : `на ${money(-d)} дешевле`);
    open(head(esc(p.name)) + `<div class="two"><div>${pic(p.img, p.name)}<div class="tags">${p.t.map(k => `<span class="tg">${TYPE[k]}</span>`).join("")}</div><div class="price">${money(p.price)}${p.old ? `<span class="old">${money(p.old)}</span>` : ""}</div>
 <div class="row mt"><button class="btn primary" data-a="add" data-id="${p.id}" ${p.stock ? "" : "disabled"}>В корзину</button><button class="btn" data-a="tcmp" data-id="${p.id}" data-keep="1">⇄ Сравнить</button></div></div>
 <div><h3 style="margin-top:0">Характеристики</h3>${specTable(p.s)}</div></div>
 <h3>За те же деньги: ${esc(a.name)} (${dt})</h3><div class="cmp">
 <div><b>${esc(p.name)}</b> — плюсы${ul(p.pro, "p")}Минусы${ul(p.con, "c")}</div>
 <div><b>${esc(a.name)}</b> — плюсы${ul(a.pro, "p")}Минусы${ul(a.con, "c")}<button class="btn mt" data-a="open" data-id="${a.id}">Открыть ${esc(a.name)}</button></div></div>
 <h3>Сравнение характеристик</h3><div style="overflow:auto"><table><tr><th></th><th>${esc(p.name)}</th><th>${esc(a.name)}</th></tr>${K.map(k => `<tr><td>${k}</td><td>${esc(p.s[k])}</td><td>${esc(a.s[k])}</td></tr>`).join("")}</table></div>`);
}
function openCompare() {
    if (!cmp.length) {
        open(head("Сравнение") + `<p class="note">Пока пусто. Нажмите «⇄ Сравнить» на карточках телефонов (до 3 шт.).</p>`);
        return;
    }
    const l = cmp.map(byId);
    open(head("Сравнение телефонов") + `<div style="overflow:auto"><table><tr><th></th>${l.map(p => `<th>${esc(p.name)}<div class="note">${money(p.price)}</div></th>`).join("")}</tr>
 ${K.map(k => `<tr><td>${k}</td>${l.map(p => `<td>${esc(p.s[k])}</td>`).join("")}</tr>`).join("")}
 <tr><td>Плюсы</td>${l.map(p => `<td>${p.pro.map(x => "＋ " + esc(x)).join("<br>")}</td>`).join("")}</tr>
 <tr><td>Минусы</td>${l.map(p => `<td>${p.con.map(x => "− " + esc(x)).join("<br>")}</td>`).join("")}</tr>
 <tr><td></td>${l.map(p => `<td><button class="btn" data-a="tcmp" data-id="${p.id}" data-keep="cmp">Убрать</button></td>`).join("")}</tr></table></div>`);
}
function openCart() {
    if (!cart.length) {
        open(head("Корзина") + `<p class="note">Корзина пуста.</p>`);
        return;
    }
    const sum = cart.reduce((s, i) => s + byId(i.id).price * i.qty, 0);
    open(head("Корзина") + cart.map(i => {
        const p = byId(i.id);
        return `<div class="cl">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}">` : ""}<div class="g"><b>${esc(p.name)}</b><div class="note">${money(p.price)}</div></div>
 <div class="q"><button data-a="qty" data-id="${p.id}" data-d="-1">−</button><b>${i.qty}</b><button data-a="qty" data-id="${p.id}" data-d="1">+</button></div><button class="x" data-a="del" data-id="${p.id}">×</button></div>`;
    }).join("") +
        `<div class="price">Итого: ${money(sum)}</div><button class="btn primary" style="width:100%" data-a="order">Оформить заказ</button>`);
}
/* ===== ресейл ===== */
const allAds = () => ADS, ad = id => allAds().find(a => a.id === id), live = () => allAds().filter(a => !sold.includes(a.id) && !bans[a.sid]);
const seller = id => SELL.find(s => s.id === id) || USERS.find(u => u.id === id) || { id, name: "Удалён", city: "—", since: "—", phone: "—" }, allRevs = () => [...REV0, ...revs];
const rl = sid => allRevs().filter(r => r.s === sid).sort((a, b) => b.d - a.d);
const rate = sid => { const l = rl(sid); return l.length ? l.reduce((s, r) => s + r.st, 0) / l.length : 0; };
const rtxt = sid => { const n = rl(sid).length; return n ? `${stars(rate(sid))} ${rate(sid).toFixed(1)} · ${n} отз.` : "Нет отзывов"; };
const tags = a => `<div class="chips"><span class="chip">${esc(a.mem)}</span><span class="chip">${esc(a.cond)}</span>${a.bat ? `<span class="chip">🔋 ${a.bat}%</span>` : ""}<span class="chip">📍 ${esc(a.city)}</span></div>`;
function adCard(a, mineBtn) {
    const s = seller(a.sid);
    return `<article class="card glass">${pic(a.img, a.model)}<div class="info"><div class="name">${esc(a.model)}</div>${tags(a)}<div class="price">${money(a.price)}</div>
 <div class="note">${ago(a.d)}</div><div class="seller"><div class="av">${esc(s.name[0])}</div><div><b>${esc(s.name)}</b><small>${rtxt(s.id)}</small></div></div>
 <div class="row mt"><button class="btn primary" data-a="ad" data-id="${a.id}">Смотреть</button>${mineBtn ? `<button class="btn" data-a="rdel" data-id="${a.id}">Снять</button>` : ""}</div></div></article>`;
}
function renderRS() {
    const m = $("#rsMain");
    document.title = "VoltResale — б/у телефоны";
    if (rv.p === "list") {
        const cities = [...new Set(live().map(a => a.city))];
        m.innerHTML = `<section><h2>Б/у телефоны</h2><p class="sub">Объявления, профили и отзывы продавцов. Перед покупкой проверяйте устройство лично.</p>
  <div class="tools"><input data-f="q" placeholder="Поиск по модели…" value="${esc(rv.f.q)}"><select data-f="city"><option value="">Все города</option>${cities.map(c => `<option ${rv.f.city === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
  <select data-f="sort">${[["new", "Сначала новые"], ["up", "Цена ↑"], ["down", "Цена ↓"]].map(([k, t]) => `<option value="${k}" ${rv.f.sort === k ? "selected" : ""}>${t}</option>`).join("")}</select></div><div id="adGrid" class="grid"></div></section>`;
        adGrid();
    }
    else if (rv.p === "prof")
        m.innerHTML = profPage(rv.sid);
    else
        m.innerHTML = inboxPage();
    badges();
}
function adGrid() {
    const f = rv.f, q = f.q.trim().toLowerCase();
    let l = live().filter(a => (!q || a.model.toLowerCase().includes(q)) && (!f.city || a.city === f.city));
    l.sort(f.sort === "up" ? (a, b) => a.price - b.price : f.sort === "down" ? (a, b) => b.price - a.price : (a, b) => b.d - a.d);
    $("#adGrid").innerHTML = l.length ? l.map(a => adCard(a)).join("") : `<div class="empty">Объявлений не найдено.</div>`;
}
function profPage(sid) {
    const s = seller(sid), mine = !!U && sid === U.id, ads = live().filter(a => a.sid === sid), rs = rl(sid);
    return `<section>${bans[sid] ? `<div class="rv" style="border-color:#ff7f9e">🚫 Профиль заблокирован администратором</div>` : ""}<div class="pf"><div class="glass side"><div class="bigav">${esc(s.name[0])}</div><h3 style="margin:0">${esc(s.name)}</h3><p class="note">📍 ${esc(s.city)}<br>На VoltResale с ${s.since} г.</p><p>${rtxt(sid)}</p><p class="note">Активных объявлений: ${ads.length}</p>
 <button class="btn mt" style="width:100%" data-a="ph" data-id="${sid}">📞 Показать телефон</button>
 ${mine ? `<button class="btn mt" style="width:100%" data-a="pedit">✎ Редактировать профиль</button>` : `<button class="btn primary mt" style="width:100%" data-a="rev" data-id="${sid}">★ Оставить отзыв</button>`}</div>
 <div><div class="tabs" style="margin-top:0"><button class="btn ${rv.tab === "ads" ? "on" : ""}" data-a="ptab" data-k="ads">Объявления (${ads.length})</button><button class="btn ${rv.tab === "rev" ? "on" : ""}" data-a="ptab" data-k="rev">Отзывы (${rs.length})</button></div>
 ${rv.tab === "ads" ? `<div class="grid">${ads.length ? ads.map(a => adCard(a, mine)).join("") : `<div class="empty">Нет активных объявлений. ${mine ? "Нажмите «Подать объявление»." : ""}</div>`}</div>` :
        (rs.length ? rs.map(r => `<div class="rv"><b>${esc(r.a)}</b> ${stars(r.st)} <small>· ${new Date(r.d).toLocaleDateString("ru-RU")}</small><p style="margin:6px 0 0">${esc(r.t)}</p></div>`).join("") : `<div class="empty">Отзывов пока нет.</div>`)}</div></div></section>`;
}
function inboxPage() {
    const l = Object.entries(chats).filter(([id]) => ad(id)).reverse();
    return `<section><h2>Чаты</h2><p class="sub">Переписка с продавцами и покупателями.</p>${l.length ? l.map(([id, c]) => { const a = ad(id), last = c.m[c.m.length - 1]; return `<button class="glass ib" data-a="chat" data-id="${id}" style="color:inherit">${a.img ? `<img src="${esc(a.img)}" alt="">` : `<div class="av">${esc(c.with[0])}</div>`}<div><b>${esc(c.with)}</b> · ${esc(a.model)}<div class="note">${last.me ? "Вы: " : ""}${esc(last.t)}</div></div></button>`; }).join("") : `<div class="empty">Пока нет переписок. Откройте объявление и нажмите «Написать».</div>`}</section>`;
}
function openAd(id) {
    const a = ad(id);
    if (!a)
        return;
    const s = seller(a.sid), mine = !!U && a.sid === U.id;
    open(head(esc(a.model)) + `<div class="two"><div>${pic(a.img, a.model)}<div class="price">${money(a.price)}</div><div class="note">Опубликовано ${ago(a.d)}</div></div>
 <div>${tags(a)}<h3 style="margin-top:8px">Описание</h3><p>${esc(a.note || "Продавец не добавил описание.")}</p>
 <div class="seller"><div class="av">${esc(s.name[0])}</div><div style="flex:1"><b>${esc(s.name)}</b><small>${rtxt(s.id)}</small></div><button class="btn" data-a="prof" data-id="${s.id}">Профиль</button></div>
 <div class="row mt">${mine ? `<button class="btn" data-a="rdel" data-id="${a.id}">Снять с продажи</button>` : `<button class="btn primary" data-a="chat" data-id="${a.id}">💬 Написать</button><button class="btn" data-a="ph" data-id="${s.id}">📞 Телефон</button><button class="btn" data-a="rbuy" data-id="${a.id}">Купить</button>`}</div></div></div>`);
}
const paint = id => { const b = $("#chatBox"); if (b) {
    b.innerHTML = chats[id].m.map(x => `<div class="m ${x.me ? "me" : ""}">${esc(x.t)}</div>`).join("");
    b.scrollTop = b.scrollHeight;
} };
function openChat(id) {
    const a = ad(id);
    if (!a || !need("Войдите, чтобы написать продавцу.", () => openChat(id)))
        return;
    if (bans[a.sid])
        return toast("Продавец заблокирован");
    if (!chats[id]) {
        chats[id] = { with: seller(a.sid).name, sid: a.sid, m: [{ me: 1, t: "Здравствуйте! Телефон ещё в продаже?" }] };
        save();
        setTimeout(() => say(id, "Здравствуйте! Да, в продаже 🙂", 0), 900);
    }
    open(head("Чат: " + esc(chats[id].with)) + `<p class="note">${esc(a.model)} · ${money(a.price)}</p><div class="chat" id="chatBox"></div><form id="chatForm" data-id="${id}" class="row mt"><input name="t" placeholder="Сообщение…" autocomplete="off" required maxlength="300" style="flex:3"><button class="btn primary">Отправить</button></form>`);
    paint(id);
}
function say(id, t, me) {
    const c = chats[id];
    if (!c)
        return;
    c.m.push({ me, t });
    save();
    const f = $("#chatForm");
    if (f && f.dataset.id === id && $("#modal").classList.contains("show"))
        paint(id);
    else if (!me)
        toast("💬 Новое сообщение: " + c.with);
    if (!$("#rs").hidden && rv.p === "inbox")
        renderRS();
}
function openPublish() {
    if (!need("Войдите, чтобы подать объявление.", openPublish))
        return;
    open(head("Подать объявление") + `<form id="pubForm" class="form"><label>Модель телефона<input name="model" required maxlength="40" list="mdl" placeholder="Например, iPhone 15 Pro"></label><datalist id="mdl">${P.map(p => `<option value="${esc(p.name)}">`).join("")}</datalist>
 <label>Память<select name="mem"><option>128 ГБ</option><option selected>256 ГБ</option><option>512 ГБ</option><option>1 ТБ</option></select></label><label>Состояние<select name="cond"><option>Как новое</option><option>Отличное</option><option>Хорошее</option><option>Есть следы использования</option></select></label>
 <label>Здоровье батареи, % (необязательно)<input name="bat" type="number" min="1" max="100"></label><label>Цена, ₸<input name="price" required type="number" min="10000" max="5000000"></label><label>Город<input name="city" required maxlength="30" value="${esc(U.city)}"></label>
 <label class="full">Фото (ссылка, необязательно)<input name="img" type="url" placeholder="https://..."></label><label class="full">Описание<textarea name="note" maxlength="300" placeholder="Комплект, состояние, что менялось…"></textarea></label><button class="btn primary full">Опубликовать</button></form>`);
}
/* ===== действия ===== */
const go = (p, sid) => { rv.p = p; rv.sid = sid || null; rv.tab = "ads"; closeM(); renderRS(); scrollTo(0, 0); };
const A = {
    close: closeM, cart: openCart, cmp: openCompare, pub: openPublish, order: openOrder,
    open: e => openProduct(+e.id), ad: e => openAd(e.id), chat: e => openChat(e.id),
    ty: e => { const i = ty.indexOf(e.k); i < 0 ? ty.push(e.k) : ty.splice(i, 1); renderCatalog(); },
    add: e => { const p = byId(+e.id), i = cart.find(x => x.id === p.id); if (i && i.qty >= p.stock)
        return toast("Больше нет в наличии"); i ? i.qty++ : cart.push({ id: p.id, qty: 1 }); save(); toast(p.name + " — в корзине"); },
    qty: e => { const i = cart.find(x => x.id === +e.id), p = byId(+e.id); i.qty += +e.d; if (i.qty > p.stock)
        i.qty = p.stock; if (i.qty < 1)
        cart = cart.filter(x => x !== i); save(); openCart(); },
    del: e => { cart = cart.filter(x => x.id !== +e.id); save(); openCart(); },
    tcmp: e => {
        const id = +e.id, i = cmp.indexOf(id);
        if (i >= 0)
            cmp.splice(i, 1);
        else if (cmp.length >= 3)
            return toast("В сравнении максимум 3 телефона");
        else
            cmp.push(id);
        save();
        renderCatalog();
        if (e.keep === "cmp")
            openCompare();
        else if (e.keep && i < 0)
            toast("Добавлено в сравнение");
    },
    cmpclear: () => { cmp = []; save(); renderCatalog(); },
    rlist: () => go("list"), inbox: () => go("inbox"), prof: e => { if (e.id === "me") {
        if (!need())
            return;
        return go("prof", U.id);
    } go("prof", e.id); },
    ptab: e => { rv.tab = e.k; renderRS(); },
    ph: (e, el) => { el.textContent = "📞 " + seller(e.id).phone; },
    pedit: () => { if (!need())
        return; open(head("Изменить данные") + `<form id="profForm" class="form"><label>Имя<input name="name" required maxlength="40" value="${esc(U.name)}"></label><label>Страна / город<input name="city" required maxlength="30" value="${esc(U.city)}"></label><label class="full">Телефон<input name="phone" required maxlength="20" value="${esc(U.phone)}"></label><button class="btn primary full">Сохранить</button></form>`); },
    rev: e => {
        if (!need("Войдите, чтобы оставить отзыв.", () => A.rev(e)))
            return;
        const s = seller(e.id);
        if (e.id === U.id)
            return toast("Нельзя оставить отзыв себе");
        if (!Object.values(chats).some(c => c.sid === e.id) && !bought.includes(e.id))
            return toast("Сначала напишите продавцу или купите у него");
        open(head("Отзыв о " + esc(s.name)) + `<form id="revForm" data-sid="${e.id}" class="form"><label class="full">Оценка<select name="st"><option value="5">★★★★★ Отлично</option><option value="4">★★★★ Хорошо</option><option value="3">★★★ Нормально</option><option value="2">★★ Плохо</option><option value="1">★ Ужасно</option></select></label><label class="full">Текст отзыва<textarea name="t" required minlength="3" maxlength="300"></textarea></label><button class="btn primary full">Отправить отзыв</button></form>`);
    },
    rbuy: e => {
        const a = ad(e.id);
        if (!a || !need("Войдите, чтобы купить.", () => A.rbuy(e)))
            return;
        if (a.sid === U.id)
            return toast("Это ваше объявление");
        sold.push(a.id);
        bought.push(a.sid);
        save();
        renderRS();
        open(head("Заявка отправлена") + `<p>Вы забронировали <b>${esc(a.model)}</b> за ${money(a.price)}. ${esc(seller(a.sid).name)} свяжется с вами. Проверяйте телефон при встрече в безопасном месте.</p><div class="row"><button class="btn primary" data-a="rev" data-id="${a.sid}">Оставить отзыв</button><button class="btn" data-a="close">Закрыть</button></div>`);
    },
    acct: openAcct, authtab: e => openAuth(e.k), myord: e => orderView(e.id, false),
    ulogout: () => { U = null; store.set("vs_sess", null); closeM(); acctBtn(); if (!$("#rs").hidden)
        renderRS(); toast("Вы вышли из аккаунта"); },
    atab: e => { at = e.k; renderAdm(); }, ofil: e => { of = e.k; renderAdm(); }, ufil: e => { uf = e.k; renderAdm(); }, oopen: e => orderView(e.id, true),
    oship: e => { const o = ORD.find(x => x.id === +e.id); if (!o || o.status !== "paid")
        return; o.status = "shipped"; o.track = "VS" + Math.floor(1e8 + Math.random() * 9e8); save(); renderAdm(); orderView(o.id, true); toast("Товар отправлен, трек " + o.track); },
    ocancel: e => { const o = ORD.find(x => x.id === +e.id); if (!o || o.status !== "paid")
        return; o.items.forEach(i => { const p = byId(i.id); if (p)
        p.stock += i.qty; }); o.status = "cancelled"; saveCat(); renderAdm(); orderView(o.id, true); toast("Заказ отменён, деньги возвращены"); },
    aedit: e => {
        const a = ad(e.id);
        if (!a)
            return;
        open(head("Объявление: " + esc(a.model)) + `<form id="adForm" data-id="${a.id}" class="form"><label>Модель<input name="model" required maxlength="40" value="${esc(a.model)}"></label><label>Память<select name="mem">${["128 ГБ", "256 ГБ", "512 ГБ", "1 ТБ"].map(x => `<option ${x === a.mem ? "selected" : ""}>${x}</option>`).join("")}</select></label>
  <label>Состояние<select name="cond">${["Как новое", "Отличное", "Хорошее", "Есть следы использования"].map(x => `<option ${x === a.cond ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Батарея, %<input name="bat" type="number" min="0" max="100" value="${a.bat || ""}"></label>
  <label>Цена, ₸<input name="price" required type="number" min="1" value="${a.price}"></label><label>Город<input name="city" required maxlength="30" value="${esc(a.city)}"></label><label class="full">Фото (URL)<input name="img" type="url" value="${esc(a.img)}"></label>
  <label class="full">Описание<textarea name="note" maxlength="300">${esc(a.note)}</textarea></label><label class="full">Статус<select name="st"><option value="sale">В продаже</option><option value="sold" ${sold.includes(a.id) ? "selected" : ""}>Продано (скрыто)</option></select></label><button class="btn primary full">Сохранить</button></form>`);
    },
    adel: e => open(head("Удалить объявление?") + `<div class="row"><button class="btn primary" data-a="adelok" data-id="${e.id}">Удалить</button><button class="btn" data-a="close">Отмена</button></div>`),
    adelok: e => { ADS = ADS.filter(a => a.id !== e.id); save(); closeM(); renderAdm(); toast("Объявление удалено"); },
    ban: e => { const u = seller(e.id); open(head("Забанить: " + esc(u.name)) + `<form id="banForm" data-id="${e.id}" class="form" style="grid-template-columns:1fr"><label>Причина<select name="r"><option>Мошенничество</option><option>Спам</option><option>Оскорбления</option><option>Запрещённый товар</option><option>Другое</option></select></label><label>Комментарий (необязательно)<input name="c" maxlength="100"></label><button class="btn primary">Забанить</button></form>`); },
    unban: e => { delete bans[e.id]; save(); renderAdm(); toast("Пользователь разбанен"); },
    logout: () => { admMem = false; try {
        sessionStorage.removeItem("vs_adm");
    }
    catch { } renderAdm(); },
    pnew: () => openProdForm(0), pedit2: e => openProdForm(+e.id),
    pdel: e => { if (P.length <= 2)
        return toast("В каталоге должно остаться минимум 2 товара"); const p = byId(+e.id); open(head("Удалить товар?") + `<p>«${esc(p.name)}» исчезнет из каталога и корзины.</p><div class="row"><button class="btn primary" data-a="pdelok" data-id="${p.id}">Удалить</button><button class="btn" data-a="close">Отмена</button></div>`); },
    pdelok: e => { P = P.filter(p => p.id !== +e.id); saveCat(); closeM(); renderAdm(); toast("Товар удалён"); },
    preset: () => open(head("Сбросить каталог?") + `<p>Все изменения товаров будут отменены, вернётся исходный каталог.</p><div class="row"><button class="btn primary" data-a="presetok">Сбросить</button><button class="btn" data-a="close">Отмена</button></div>`),
    presetok: () => { try {
        localStorage.removeItem("vs_cat");
    }
    catch { } P = JSON.parse(JSON.stringify(DEF)); saveCat(); closeM(); renderAdm(); toast("Каталог сброшен"); },
    rdel: e => { const a = ad(e.id); if (!a || !U || a.sid !== U.id)
        return; ADS = ADS.filter(x => x.id !== e.id); save(); closeM(); renderRS(); toast("Объявление снято"); }
};
document.addEventListener("click", ev => {
    if (ev.target.id === "resetFilters") {
        $("#q").value = "";
        $("#brand").value = "";
        $("#sort").value = "0";
        $("#maxPrice").value = "1300000";
        maxCatalogPrice = 1300000;
        ty = [];
        renderCatalog();
        return;
    }
    if (ev.target.id === "ov")
        return closeM();
    const el = ev.target.closest("[data-a]");
    if (el && A[el.dataset.a])
        A[el.dataset.a](el.dataset, el);
});
document.addEventListener("input", ev => {
    if (ev.target.id === "maxPrice") {
        maxCatalogPrice = Number(ev.target.value);
        renderCatalog();
        return;
    }
    const t = ev.target, k = t.dataset.f;
    if (k) {
        rv.f[k] = t.value;
        adGrid();
    }
    if (t.dataset.fmt === "card")
        t.value = t.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
    if (t.dataset.fmt === "exp") {
        const v = t.value.replace(/\D/g, "").slice(0, 4);
        t.value = v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v;
    }
    if (t.dataset.fmt === "cvc")
        t.value = t.value.replace(/\D/g, "");
    if (t.id === "aq") {
        aq = t.value.trim().toLowerCase();
        admList();
    }
    if (t.name === "img" && t.form && t.form.id === "prodForm") {
        const i = $("#prev");
        i.hidden = !t.value;
        i.src = t.value;
    }
});
document.addEventListener("change", ev => {
    const t = ev.target, k = t.dataset.inl;
    if (!k)
        return;
    const p = byId(+t.dataset.id), v = Math.round(+t.value);
    if (!p || !(v >= (k === "price" ? 1 : 0))) {
        toast("Некорректное значение");
        t.value = p ? p[k] : "";
        return;
    }
    p[k] = v;
    if (k === "price" && p.old && p.old <= v)
        p.old = null;
    saveCat();
    admStats();
    toast("Сохранено, уже на сайте");
});
document.addEventListener("submit", ev => {
    ev.preventDefault();
    const f = ev.target, d = Object.fromEntries(new FormData(f));
    if (f.id === "admLogin") {
        if (h53(d.l) === HL && h53(d.p) === HP) {
            admMem = true;
            try {
                sessionStorage.setItem("vs_adm", "1");
            }
            catch { }
            renderAdm();
        }
        else {
            $("#admErr").textContent = "Неверный логин или пароль";
            f.p.value = "";
        }
    }
    if (f.id === "prodForm") {
        const id = +f.dataset.id, t = new FormData(f).getAll("t"), price = Math.round(+d.price), old = Math.round(+d.old) || null;
        if (!t.length)
            return toast("Выберите хотя бы один тип");
        if (old && old <= price)
            return toast("Старая цена должна быть больше текущей");
        const L = x => { const l = x.split("\n").map(y => y.trim()).filter(Boolean); return l.length ? l : ["—"]; };
        const o = { id: id || Math.max(0, ...P.map(x => x.id)) + 1, name: d.name.trim(), brand: d.brand.trim(), price, old, stock: Math.max(0, Math.round(+d.stock) || 0), rating: Math.min(5, Math.max(1, +d.rating || 4.5)), hot: d.hot ? 1 : 0, t, img: d.img.trim(), desc: d.desc.trim(), pro: L(d.pro), con: L(d.con), s: S(K.map((k, i) => d["s" + i].trim() || "—")) };
        id ? P[P.findIndex(x => x.id === id)] = o : P.push(o);
        saveCat();
        closeM();
        renderAdm();
        toast(id ? "Товар обновлён" : "Товар добавлен");
    }
    if (f.id === "loginForm") {
        const u = USERS.find(x => x.email === d.email.trim().toLowerCase());
        if (!u || u.pw !== h53(d.pw)) {
            $("#authErr").textContent = "Неверный email или пароль";
            return;
        }
        if (bans[u.id]) {
            $("#authErr").textContent = "Аккаунт заблокирован. Причина: " + bans[u.id].reason;
            return;
        }
        startSess(u);
    }
    if (f.id === "regForm") {
        const em = d.email.trim().toLowerCase(), er = $("#authErr");
        if (USERS.some(x => x.email === em))
            return er.textContent = "Этот email уже зарегистрирован";
        if (d.name.trim().length < 2 || d.phone.replace(/\D/g, "").length < 10)
            return er.textContent = "Проверьте имя и номер телефона";
        const u = { id: "u" + Date.now(), name: d.name.trim(), email: em, phone: d.phone.trim(), country: d.country, city: d.country, since: new Date().getFullYear(), pw: h53(d.pw) };
        USERS.push(u);
        startSess(u);
    }
    if (f.id === "orderForm") {
        if (!need())
            return;
        const cn = d.cn.replace(/\s/g, ""), m = /^(\d\d)\/(\d\d)$/.exec(d.ce || "");
        if (d.n.trim().length < 2)
            return toast("Введите имя");
        if (d.t.replace(/\D/g, "").length < 10)
            return toast("Введите корректный номер телефона");
        if (!/^\d{16}$/.test(cn))
            return toast("Номер карты — 16 цифр");
        if (!m || +m[1] < 1 || +m[1] > 12 || new Date(2000 + +m[2], +m[1], 1) <= new Date())
            return toast("Проверьте срок действия карты");
        if (!/^\d{3}$/.test(d.cv))
            return toast("CVC — 3 цифры");
        if (!d.ag)
            return toast("Нужно согласие с условиями");
        for (const i of cart) {
            const p = byId(i.id);
            if (!p || p.stock < i.qty) {
                toast("Товара уже нет в нужном количестве");
                return openCart();
            }
        }
        const items = cart.map(i => { const p = byId(i.id); p.stock -= i.qty; return { id: p.id, name: p.name, price: p.price, qty: i.qty }; });
        const o = { id: ORD.reduce((n, x) => Math.max(n, x.id), 1000) + 1, uid: U.id, email: U.email, name: d.n.trim(), phone: d.t.trim(), country: d.c, addr: d.a.trim(), items, total: items.reduce((t, i) => t + i.price * i.qty, 0), card: cn.slice(-4), status: "paid", ts: Date.now() };
        ORD.push(o);
        cart = [];
        store.set("vs_cat", P);
        save();
        renderCatalog();
        open(head("Заказ оплачен ✓") + `<p>Спасибо, ${esc(o.name)}! Заказ <b>№${o.id}</b> на ${money(o.total)} оплачен картой •••• ${o.card}. Администратор подтвердит оплату и отправит товар, статус виден в профиле.</p><div class="row"><button class="btn primary" data-a="acct">Мои заказы</button><button class="btn" data-a="close">Закрыть</button></div>`);
    }
    if (f.id === "adForm") {
        const a = ad(f.dataset.id);
        if (!a)
            return;
        Object.assign(a, { model: d.model.trim(), mem: d.mem, cond: d.cond, bat: +d.bat || 0, price: Math.round(+d.price), city: d.city.trim(), img: d.img.trim(), note: d.note.trim() });
        d.st === "sold" ? sold.includes(a.id) || sold.push(a.id) : sold = sold.filter(x => x !== a.id);
        save();
        closeM();
        renderAdm();
        toast("Объявление обновлено");
    }
    if (f.id === "banForm") {
        const id = f.dataset.id;
        bans[id] = { reason: d.r + (d.c.trim() ? ": " + d.c.trim() : ""), ts: Date.now() };
        if (U && U.id === id) {
            U = null;
            store.set("vs_sess", null);
        }
        save();
        closeM();
        renderAdm();
        toast("Пользователь заблокирован");
    }
    if (f.id === "pubForm") {
        if (!need())
            return;
        const id = "m" + Date.now();
        ADS.unshift({ id, sid: U.id, model: d.model.trim(), mem: d.mem, price: +d.price, cond: d.cond, bat: +d.bat || 0, city: d.city.trim(), img: d.img.trim(), note: d.note.trim(), d: Date.now() });
        save();
        rv.p = "prof";
        rv.sid = U.id;
        rv.tab = "ads";
        closeM();
        renderRS();
        toast("Объявление опубликовано");
        setTimeout(() => { if (!ADS.some(a => a.id === id))
            return; chats[id] = { with: "Руслан (покупатель)", sid: "buyer", m: [{ me: 0, t: "Здравствуйте! Торг возможен?" }] }; save(); toast("💬 Новое сообщение от покупателя"); if (!$("#rs").hidden && rv.p === "inbox")
            renderRS(); }, 4000);
    }
    if (f.id === "chatForm") {
        const id = f.dataset.id;
        say(id, d.t.trim(), 1);
        f.reset();
        setTimeout(() => say(id, "Принято, отвечу в ближайшее время 👍", 0), 900);
    }
    if (f.id === "profForm") {
        if (!U)
            return;
        Object.assign(U, { name: d.name.trim(), city: d.city.trim(), country: d.city.trim(), phone: d.phone.trim() });
        save();
        closeM();
        renderRS();
        toast("Профиль обновлён");
    }
    if (f.id === "revForm") {
        const s = f.dataset.sid;
        revs = revs.filter(r => !(r.s === s && r.a === U.name));
        revs.push({ s, a: U.name, st: +d.st, t: d.t.trim(), d: Date.now() });
        save();
        closeM();
        renderRS();
        toast("Спасибо за отзыв!");
    }
});
addEventListener("keydown", e => { if (e.key === "Escape")
    closeM(); });
["q", "sort", "brand"].forEach(i => $("#" + i).addEventListener("input", renderCatalog));
/* ===== админ-панель (#admin) ===== */
const h53 = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
} h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return 4294967296 * (2097151 & h2) + (h1 >>> 0); };
const HL = 4438336225204823, HP = 4123402621102807;
let admMem = false, aq = "";
const adminOK = () => { try {
    return admMem || sessionStorage.getItem("vs_adm") === "1";
}
catch {
    return admMem;
} };
/* сохранить каталог и сразу применить на сайте: корзина, сравнение, фильтр брендов */
function saveCat() { store.set("vs_cat", P); cart = cart.filter(i => byId(i.id)); cart.forEach(i => i.qty = Math.min(i.qty, byId(i.id).stock)); cart = cart.filter(i => i.qty > 0); cmp = cmp.filter(byId); save(); renderCatalog(); }
function admStats() { const e = $("#admStats"); if (e)
    e.innerHTML = `<div class="glass"><b>${P.length}</b><span class="note">товаров</span></div><div class="glass"><b>${P.reduce((n, p) => n + p.stock, 0)}</b><span class="note">штук на складе</span></div><div class="glass"><b>${money(P.reduce((n, p) => n + p.price * p.stock, 0))}</b><span class="note">стоимость склада</span></div>`; }
function admRow(p) {
    return `<div class="ar glass">${p.img ? `<img class="th" src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="th"></div>`}<div class="g"><b>${esc(p.name)}</b><div class="note">${esc(p.brand)} · ${p.t.map(k => TYPE[k]).join(", ")}</div></div>
 <label class="lab">Цена, ₸<input type="number" min="1" data-inl="price" data-id="${p.id}" value="${p.price}"></label><label class="lab">Остаток<input class="st" type="number" min="0" data-inl="stock" data-id="${p.id}" value="${p.stock}"></label>
 <button class="btn" data-a="pedit2" data-id="${p.id}">Изменить</button><button class="btn" data-a="pdel" data-id="${p.id}">Удалить</button></div>`;
}
function admList() { const l = P.filter(p => !aq || (p.name + p.brand).toLowerCase().includes(aq)); $("#admList").innerHTML = l.length ? l.map(admRow).join("") : `<div class="empty">Ничего не найдено.</div>`; }
function renderAdm() {
    const m = $("#admMain");
    if (!adminOK()) {
        $("#admOut").hidden = true;
        m.innerHTML = `<section style="max-width:400px;margin:60px auto"><div class="glass" style="padding:26px"><h2>Вход в админ-панель</h2><p class="sub">Только для администратора магазина.</p><form id="admLogin" class="form" style="grid-template-columns:1fr"><label>Логин<input name="l" required autocomplete="username"></label><label>Пароль<input name="p" type="password" required autocomplete="current-password"></label><div id="admErr" class="out" style="min-height:18px"></div><button class="btn primary">Войти</button></form></div></section>`;
        return;
    }
    $("#admOut").hidden = false;
    const nb = Object.keys(bans).length, no = ORD.filter(o => o.status === "paid").length;
    m.innerHTML = `<div class="tabs" style="margin-top:16px">${[["cat", "Каталог"], ["ord", "Заказы" + (no ? ` (${no} новых)` : "")], ["ads", "Ресейл"], ["usr", "Пользователи" + (nb ? ` · 🚫${nb}` : "")]].map(([k, t]) => `<button class="btn ${at === k ? "on" : ""}" data-a="atab" data-k="${k}">${t}</button>`).join("")}</div><div id="admBody"></div>`;
    ({ cat: admCat, ord: admOrd, ads: admAds, usr: admUsr }[at])($("#admBody"));
}
function admCat(b) {
    b.innerHTML = `<section><h2>Управление каталогом</h2><p class="sub">Любое изменение сразу появляется на сайте: в каталоге, карточке, сравнении и корзине.</p><div class="stats" id="admStats"></div>
 <div class="tools"><input id="aq" placeholder="Поиск товара…" value="${esc(aq)}"><button class="btn primary" data-a="pnew">＋ Добавить товар</button><button class="btn" data-a="preset">Сбросить каталог</button></div><div id="admList"></div></section>`;
    admStats();
    admList();
}
function openProdForm(id) {
    const p = id ? byId(id) : { name: "", brand: "", price: "", old: null, stock: 5, rating: 4.5, hot: 0, t: ["h"], img: "", desc: "", pro: [], con: [], s: S(K.map(() => "")) };
    open(head(id ? "Изменить: " + esc(p.name) : "Новый товар") + `<form id="prodForm" data-id="${id || 0}" class="form">
 <label>Название<input name="name" required maxlength="50" value="${esc(p.name)}"></label><label>Бренд<input name="brand" required maxlength="30" list="brl" value="${esc(p.brand)}"></label><datalist id="brl">${[...new Set(P.map(x => x.brand))].map(b => `<option value="${esc(b)}">`).join("")}</datalist>
 <label>Цена, ₸<input name="price" required type="number" min="1" value="${p.price}"></label><label>Старая цена (для акции, необязательно)<input name="old" type="number" min="0" value="${p.old || ""}"></label>
 <label>Остаток, шт.<input name="stock" required type="number" min="0" value="${p.stock}"></label><label>Рейтинг (1–5)<input name="rating" type="number" min="1" max="5" step="0.1" value="${p.rating}"></label>
 <label class="full">Ссылка на фото (URL)<input name="img" type="url" placeholder="https://..." value="${esc(p.img)}"></label><div class="full"><img class="prev" id="prev" alt="" ${p.img ? `src="${esc(p.img)}"` : "hidden"}></div>
 <label class="full">Краткое описание<input name="desc" maxlength="90" value="${esc(p.desc)}"></label>
 <div class="full chk">${Object.entries(TYPE).map(([k, t]) => `<label><input type="checkbox" name="t" value="${k}" ${p.t.includes(k) ? "checked" : ""}>${t}</label>`).join("")}<label><input type="checkbox" name="hot" ${p.hot ? "checked" : ""}>Хит</label></div>
 <label>Плюсы (по одному в строке)<textarea name="pro">${esc(p.pro.join("\n"))}</textarea></label><label>Минусы (по одному в строке)<textarea name="con">${esc(p.con.join("\n"))}</textarea></label>
 <h3 class="full" style="margin:6px 0 0">Характеристики</h3>${K.map((k, i) => `<label>${k}<input name="s${i}" maxlength="120" value="${esc(p.s[k] === "—" ? "" : p.s[k])}"></label>`).join("")}
 <button class="btn primary full">Сохранить и применить на сайте</button></form>`);
}
/* ===== аккаунты, заказы, админ-вкладки ===== */
const COUNTRIES = ["Казахстан", "Россия", "Узбекистан", "Кыргызстан", "Беларусь", "Таджикистан", "Азербайджан", "Грузия", "Армения", "Турция", "ОАЭ", "Другая страна"];
let authNext = null, at = "cat", of = "all", uf = "all";
const acctBtn = () => { const b = $("#acctBtn"); if (b)
    b.textContent = U ? "👤 " + U.name.split(" ")[0] : "👤 Войти"; };
function need(msg, next) { if (U)
    return U; authNext = next || null; openAuth("in", msg); return null; }
function startSess(u) { U = u; store.set("vs_sess", u.id); save(); closeM(); if (!$("#rs").hidden)
    renderRS(); toast("Добро пожаловать, " + u.name.split(" ")[0] + "!"); const n = authNext; authNext = null; if (n)
    n(); }
function openAuth(tab, msg) {
    open(head(tab === "in" ? "Вход" : "Регистрация") + (msg ? `<p class="note">${esc(msg)}</p>` : "") + `<div class="tabs" style="margin-top:0"><button class="btn ${tab === "in" ? "on" : ""}" data-a="authtab" data-k="in">Вход</button><button class="btn ${tab === "up" ? "on" : ""}" data-a="authtab" data-k="up">Регистрация</button></div>` + (tab === "in"
        ? `<form id="loginForm" class="form" style="grid-template-columns:1fr"><label>Email<input name="email" type="email" required autocomplete="username"></label><label>Пароль<input name="pw" type="password" required autocomplete="current-password"></label><div id="authErr" class="out" style="min-height:18px"></div><button class="btn primary">Войти</button></form>`
        : `<form id="regForm" class="form"><label>Имя и фамилия<input name="name" required maxlength="40"></label><label>Телефон<input name="phone" type="tel" required maxlength="20" placeholder="+7 ..."></label><label>Email<input name="email" type="email" required autocomplete="username"></label><label>Страна проживания<select name="country">${COUNTRIES.map(c => `<option>${c}</option>`).join("")}</select></label><label class="full">Пароль (от 6 символов)<input name="pw" type="password" required minlength="6" autocomplete="new-password"></label><div id="authErr" class="out full" style="min-height:18px"></div><button class="btn primary full">Создать аккаунт</button></form>`));
}
const ST = { paid: ["Оплачен · ждёт отправки", "#ffd166"], shipped: ["Отправлен", "#7fe0ac"], cancelled: ["Отменён · деньги возвращены", "#ff7f9e"] };
const chip = s => `<span class="chip" style="color:${ST[s][1]}">${ST[s][0]}</span>`, dt = t => new Date(t).toLocaleString("ru-RU");
function openAcct() {
    if (!need())
        return;
    const mo = ORD.filter(o => o.uid === U.id).sort((a, b) => b.ts - a.ts);
    open(head("Мой профиль") + `<div class="seller"><div class="av">${esc(U.name[0])}</div><div style="flex:1"><b>${esc(U.name)}</b><small>${esc(U.email)} · ${esc(U.phone)} · ${esc(U.country)} · с ${U.since} г.</small></div></div>
 <div class="row mt"><button class="btn" data-a="pedit">✎ Изменить данные</button><a class="btn" href="#resale" target="_blank" rel="noopener">Профиль в ресейле ↗</a><button class="btn" data-a="ulogout">Выйти</button></div>
 <h3>Мои заказы</h3>${mo.length ? mo.map(o => `<div class="cl"><div class="g"><b>№${o.id}</b> · ${money(o.total)}<div class="note">${dt(o.ts)}</div></div>${chip(o.status)}<button class="btn" data-a="myord" data-id="${o.id}">Открыть</button></div>`).join("") : `<p class="note">Заказов пока нет.</p>`}`);
}
function openOrder() {
    if (!need("Чтобы оформить заказ, войдите или зарегистрируйтесь.", openOrder))
        return;
    if (!cart.length)
        return openCart();
    const sum = cart.reduce((s, i) => s + byId(i.id).price * i.qty, 0);
    open(head("Оформление заказа") + cart.map(i => `<div class="cl"><div class="g">${esc(byId(i.id).name)} × ${i.qty}</div><b>${money(byId(i.id).price * i.qty)}</b></div>`).join("") +
        `<form id="orderForm" class="form mt"><label>Имя и фамилия<input name="n" required maxlength="40" value="${esc(U.name)}"></label><label>Номер телефона<input name="t" required type="tel" maxlength="20" value="${esc(U.phone)}"></label>
 <label>Страна проживания<select name="c">${COUNTRIES.map(c => `<option ${c === U.country ? "selected" : ""}>${c}</option>`).join("")}</select></label><label>Адрес доставки<input name="a" required maxlength="120" placeholder="Город, улица, дом"></label>
 <h3 class="full" style="margin:6px 0 0">Оплата картой</h3><label class="full">Номер карты<input name="cn" data-fmt="card" inputmode="numeric" required placeholder="4242 4242 4242 4242" autocomplete="off"></label><label>Срок (ММ/ГГ)<input name="ce" data-fmt="exp" inputmode="numeric" required placeholder="12/28" autocomplete="off"></label><label>CVC<input name="cv" data-fmt="cvc" inputmode="numeric" maxlength="3" required placeholder="123" type="password" autocomplete="off"></label>
 <p class="note full">Демо-оплата: реальные деньги не списываются, подойдёт любая тестовая карта. Номер карты не сохраняется — только последние 4 цифры.</p>
 <label class="full" style="display:flex;gap:8px;align-items:center;color:var(--text)"><input type="checkbox" name="ag" required style="width:auto">Я согласен с условиями покупки и обработкой персональных данных</label>
 <button class="btn primary full">Оплатить картой ${money(sum)}</button></form>`);
}
function orderView(id, adm) {
    const o = ORD.find(x => x.id === +id);
    if (!o || (!adm && (!U || o.uid !== U.id)))
        return;
    open(head("Заказ №" + o.id) + `<p>${chip(o.status)}</p><table><tr><td>Клиент</td><td>${esc(o.name)} · ${esc(o.email)}</td></tr><tr><td>Телефон</td><td>${esc(o.phone)}</td></tr><tr><td>Страна</td><td>${esc(o.country)}</td></tr><tr><td>Адрес</td><td>${esc(o.addr)}</td></tr>
 <tr><td>Оплата</td><td>Карта •••• ${esc(o.card)} · ${money(o.total)} ${o.status === "cancelled" ? "(возвращено)" : "(получено)"}</td></tr><tr><td>Создан</td><td>${dt(o.ts)}</td></tr>${o.track ? `<tr><td>Трек-номер</td><td>${esc(o.track)}</td></tr>` : ""}</table>
 <h3>Состав заказа</h3>${o.items.map(i => `<div class="cl"><div class="g"><b>${esc(i.name)}</b><div class="note">${money(i.price)} × ${i.qty}</div></div><b>${money(i.price * i.qty)}</b></div>`).join("")}<div class="price">Итого: ${money(o.total)}</div>
 ${adm && o.status === "paid" ? `<div class="row"><button class="btn primary" data-a="oship" data-id="${o.id}">📦 Оплата получена — отправить товар</button><button class="btn" data-a="ocancel" data-id="${o.id}">Отменить и вернуть деньги</button></div>` : ""}`);
}
const sbox = (n, t) => `<div class="glass"><b>${n}</b><span class="note">${t}</span></div>`, fbar = (k, cur, l) => `<div class="tabs" style="margin-top:0">${l.map(([v, t]) => `<button class="btn ${cur === v ? "on" : ""}" data-a="${k}" data-k="${v}">${t}</button>`).join("")}</div>`;
function admOrd(b) {
    const l = ORD.filter(o => of === "all" || o.status === of).sort((a, c) => c.ts - a.ts), rev = ORD.filter(o => o.status !== "cancelled").reduce((n, o) => n + o.total, 0);
    b.innerHTML = `<section><h2>Заказы</h2><p class="sub">Заказы из корзины сайта. Проверьте оплату и отправьте товар.</p><div class="stats">${sbox(ORD.length, "всего заказов")}${sbox(ORD.filter(o => o.status === "paid").length, "ждут отправки")}${sbox(money(rev), "выручка (без отмен)")}</div>
 ${fbar("ofil", of, [["all", "Все"], ["paid", "Ждут отправки"], ["shipped", "Отправленные"], ["cancelled", "Отменённые"]])}
 ${l.length ? l.map(o => `<div class="ar glass"><div class="g"><b>№${o.id}</b> · ${esc(o.name)}<div class="note">${dt(o.ts)} · ${esc(o.country)} · ${o.items.reduce((n, i) => n + i.qty, 0)} шт.</div></div>${chip(o.status)}<b>${money(o.total)}</b><button class="btn" data-a="oopen" data-id="${o.id}">Открыть</button></div>`).join("") : `<div class="empty">Заказов нет.</div>`}</section>`;
}
function admAds(b) {
    const l = [...ADS].sort((a, c) => c.d - a.d);
    b.innerHTML = `<section><h2>Ресейл — объявления</h2><p class="sub">Меняйте или удаляйте любые объявления. Объявления заблокированных продавцов скрыты от покупателей.</p>${l.length ? l.map(a => {
        const s = seller(a.sid), bn = bans[a.sid], sd = sold.includes(a.id);
        return `<div class="ar glass">${a.img ? `<img class="th" src="${esc(a.img)}" alt="">` : `<div class="th"></div>`}<div class="g"><b>${esc(a.model)}</b> · ${esc(a.mem)} · ${esc(a.cond)}<div class="note">${esc(s.name)} · ${esc(a.city)} · ${ago(a.d)}</div></div><span class="chip" style="color:${bn ? "#ff7f9e" : sd ? "#ffd166" : "#7fe0ac"}">${bn ? "скрыто (бан)" : sd ? "продано" : "в продаже"}</span><b>${money(a.price)}</b><button class="btn" data-a="aedit" data-id="${a.id}">Изменить</button><button class="btn" data-a="adel" data-id="${a.id}">Удалить</button></div>`;
    }).join("") : `<div class="empty">Объявлений нет.</div>`}</section>`;
}
function admUsr(b) {
    const all = [...SELL.map(s => ({ ...s, type: "Продавец" })), ...USERS.map(u => ({ ...u, type: "Покупатель" }))], nb = all.filter(u => bans[u.id]).length, l = all.filter(u => uf === "all" || (uf === "ban") === !!bans[u.id]);
    b.innerHTML = `<section><h2>Пользователи</h2><p class="sub">Бан скрывает объявления продавца и запрещает вход, заказы, отзывы и сообщения.</p><div class="stats">${sbox(all.length, "всего")}${sbox(all.length - nb, "активных")}${sbox(nb, "забанено")}</div>
 ${fbar("ufil", uf, [["all", "Все (" + all.length + ")"], ["act", "Активные (" + (all.length - nb) + ")"], ["ban", "Забанены (" + nb + ")"]])}
 ${l.length ? l.map(u => {
        const bn = bans[u.id];
        return `<div class="ar glass"><div class="av">${esc(u.name[0])}</div><div class="g"><b>${esc(u.name)}</b> <span class="chip">${u.type}</span><div class="note">${esc(u.city)} · с ${u.since} · объявлений: ${ADS.filter(a => a.sid === u.id).length} · заказов: ${ORD.filter(o => o.uid === u.id).length}${bn ? ` · причина: ${esc(bn.reason)} (${dt(bn.ts)})` : ""}</div></div>
 <span class="chip" style="color:${bn ? "#ff7f9e" : "#7fe0ac"}">${bn ? "🚫 забанен" : "активен"}</span>${bn ? `<button class="btn primary" data-a="unban" data-id="${u.id}">Разбанить</button>` : `<button class="btn" data-a="ban" data-id="${u.id}">Забанить</button>`}</div>`;
    }).join("") : `<div class="empty">Здесь никого нет.</div>`}</section>`;
}
/* ===== роутинг: #resale — отдельная вкладка ресейла ===== */
function route() {
    const r = location.hash.startsWith("#resale"), ad = location.hash.startsWith("#admin");
    $("#shop").hidden = r || ad;
    $("#rs").hidden = !r;
    $("#adm").hidden = !ad;
    closeM();
    if (ad) {
        document.title = "VoltStore — админ-панель";
        renderAdm();
        scrollTo(0, 0);
    }
    else if (r) {
        rv.p = "list";
        renderRS();
    }
    else {
        document.title = "VoltStore — флагманы 2025–2026";
        renderCatalog();
        const el = document.getElementById(location.hash.slice(1));
        el ? el.scrollIntoView() : scrollTo(0, 0);
    }
    badges();
}
addEventListener("hashchange", route);
addEventListener("storage", () => { load(); badges(); if ($("#modal").classList.contains("show"))
    return; const h = location.hash; h.startsWith("#admin") ? renderAdm() : h.startsWith("#resale") ? renderRS() : renderCatalog(); });
/* ===== старт ===== */
load();
route();
