/**
 * VoltStore · live.js — боевой режим на Supabase (этапы 02 и 03).
 *
 * Подключается ПОСЛЕ app.js. Если в config.js не заданы ключи Supabase, файл ничего не делает
 * и сайт работает в демо-режиме (localStorage), как раньше.
 *
 * Что делает в боевом режиме:
 *  • вход/регистрация через Supabase Auth, роли (admin) и баны хранятся в БД;
 *  • каталог, заказы, объявления, чаты, сделки, отзывы, жалобы — в PostgreSQL;
 *  • оплата заказов через платёжного провайдера, доставка с трек-номером;
 *  • загрузка фото объявлений в Supabase Storage, модерация объявлений.
 *
 * ВАЖНО: проверки в браузере — только для удобства. Реальная защита — политики RLS и функции в БД
 * (supabase/schema.sql): даже изменённый клиентский код не сможет обойти права доступа.
 */
"use strict";
(() => {
    const CFG = window.VOLT_CONFIG || {};
    const HP = new URLSearchParams((location.hash || "").replace(/^#/, ""));          // ссылки из писем Supabase: #type=recovery / signup / #error_code=...
    const AUTH_TYPE = HP.get("type") || "", AUTH_ERR = HP.get("error_code") || "";
    const SB = (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase)
        ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
    if (!SB) {
        console.info("VoltStore: демо-режим (localStorage). Чтобы включить Supabase, заполните config.js.");
        return;
    }
    window.VOLT_LIVE = true;
    let recoveryPending = AUTH_TYPE === "recovery", booted = false;
    SB.auth.onAuthStateChange(ev => {
        if (ev === "PASSWORD_RECOVERY") { recoveryPending = true; if (booted) setTimeout(() => openNewPassword(), 0); }
    });
    const isManual = () => CFG.paymentProvider === "manual";    // заказ без онлайн-оплаты: оплату подтверждает админ
    window.VOLT_DEBUG = { deals: () => DEALS, reports: () => REPORTS };   // только для отладки в консоли

    /* ===================== утилиты ===================== */
    const MSG = {
        auth_required: "Войдите в аккаунт", banned: "Аккаунт заблокирован", out_of_stock: "Нет в нужном количестве",
        bad_items: "Некорректный состав заказа", bad_delivery: "Выберите способ доставки", bad_contact: "Проверьте имя, телефон и адрес",
        not_found: "Не найдено", bad_status: "Сейчас это действие недоступно", forbidden: "Недостаточно прав",
        ad_unavailable: "Объявление недоступно", own_ad: "Это ваше объявление", duplicate: "Заявка уже отправлена",
        bad_track: "Укажите трек-номер", reason_required: "Укажите причину (от 3 символов)", bad_photo: "Недопустимое фото",
        self_ban: "Нельзя заблокировать себя", bad_action: "Неизвестное действие", amount_mismatch: "Сумма платежа не совпала"
    };
    const errText = e => {
        const m = String((e && e.message) || e || "");
        const [k, ...r] = m.split(":");
        if (MSG[k]) return MSG[k] + (r.length ? ": " + r.join(":").trim() : "");
        if (/Invalid login/i.test(m)) return "Неверный email или пароль";
        if (/already (been )?registered/i.test(m)) return "Этот email уже зарегистрирован";
        if (/Email not confirmed/i.test(m)) return "Подтвердите email — письмо отправлено на почту";
        if (/Password should|weak_password/i.test(m)) return "Слишком простой или короткий пароль";
        if (/rate limit|too many/i.test(m)) return "Слишком много попыток, подождите немного";
        if (/row-level security|permission denied/i.test(m)) return "Недостаточно прав";
        if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Нет связи с сервером";
        return m ? "Ошибка: " + m.slice(0, 140) : "Что-то пошло не так";
    };
    const ok = ({ data, error }) => { if (error) throw error; return data; };
    const rpc = (fn, args) => SB.rpc(fn, args).then(ok);
    const act = fn => async (...a) => { try { await fn(...a); } catch (e) { console.error(e); toast(errText(e)); } };
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const year = t => new Date(t).getFullYear();

    /* ===================== состояние ===================== */
    let DEALS = [], REPORTS = [], REVIEWED = new Set(), rt = null;
    let af = "pending", rf = "open";
    const isAdmin = () => !!U && U.role === "admin";
    const nameOf = id => (USERS.find(u => u.id === id) || { name: "Пользователь" }).name;
    const photoUrl = p => SB.storage.from("ad-photos").getPublicUrl(p).data.publicUrl;

    /* ===================== маппинг БД → формат app.js ===================== */
    const rowToProduct = r => ({
        id: +r.id, name: r.name, brand: r.brand, price: r.price, old: r.old_price || null, stock: r.stock, rating: +r.rating,
        hot: r.hot ? 1 : 0, t: r.types || [], img: r.img || "", desc: r.descr || "",
        pro: (r.pros && r.pros.length) ? r.pros : ["—"], con: (r.cons && r.cons.length) ? r.cons : ["—"], s: r.specs || {}
    });
    const rowToAd = r => ({
        id: r.id, sid: r.seller_id, model: r.model, mem: r.mem, price: r.price, cond: r.cond, bat: r.bat || 0, city: r.city,
        note: r.note || "", photos: (r.photos || []).map(photoUrl), img: (r.photos && r.photos.length) ? photoUrl(r.photos[0]) : "",
        d: Date.parse(r.created_at), status: r.status, reason: r.reject_reason || ""
    });
    const rowToUser = p => ({ id: p.id, name: p.name, city: p.city, country: p.city, since: year(p.created_at), phone: "—" });
    const mkUser = (p, email) => ({ id: p.id, name: p.name, email, phone: p.phone, country: p.country, city: p.city, since: year(p.created_at), role: p.role });
    const rowToOrder = o => ({
        id: o.id, uid: o.user_id, email: o.email, name: o.name, phone: o.phone, country: o.country, addr: o.addr,
        delivery: o.delivery_method, shipCost: o.delivery_cost, total: o.total, status: o.status, provider: o.payment_provider,
        track: o.track, carrier: o.carrier, note: o.admin_note, ts: Date.parse(o.created_at), paidAt: o.paid_at ? Date.parse(o.paid_at) : null,
        items: (o.order_items || []).map(i => ({ id: i.product_id, name: i.name, price: i.price, qty: i.qty })), card: ""
    });
    const rowToDeal = d => ({ id: d.id, adId: d.ad_id, buyer: d.buyer_id, seller: d.seller_id, model: d.model, price: d.price, status: d.status, bc: d.buyer_confirmed, sc: d.seller_confirmed, ts: Date.parse(d.created_at) });
    const rowToChat = c => {
        const partner = c.buyer_id === U.id ? c.seller_id : c.buyer_id;
        const msgs = (c.messages || []).slice().sort((a, b) => a.id - b.id);
        return { id: c.id, adId: c.ad_id, buyer: c.buyer_id, seller: c.seller_id, sid: partner, with: nameOf(partner), m: msgs.map(x => ({ id: x.id, me: x.sender_id === U.id ? 1 : 0, t: x.body })) };
    };

    /* ===================== загрузка данных ===================== */
    async function loadSession() {
        const { data } = await SB.auth.getSession();
        const s = data.session;
        U = null; admMem = false;
        if (!s) return { none: true };
        const { data: p, error } = await SB.from("profiles").select("*").eq("id", s.user.id).maybeSingle();
        if (error || !p) { await SB.auth.signOut(); return { missing: true }; }
        if (p.banned) { await SB.auth.signOut(); return { banned: p.ban_reason || "нарушение правил" }; }
        U = mkUser(p, s.user.email || "");
        admMem = p.role === "admin";
        return { ok: true };
    }

    async function hydratePublic() {
        const [prods, adRows, profs, rvs] = await Promise.all([
            SB.from("products").select("*").order("id").then(ok),
            SB.from("ads").select("*").order("created_at", { ascending: false }).limit(500).then(ok),
            SB.from("public_profiles").select("*").limit(1000).then(ok),
            SB.from("reviews").select("*").order("created_at", { ascending: false }).limit(1000).then(ok)
        ]);
        P = prods.map(rowToProduct);
        ADS = adRows.map(rowToAd);
        sold = ADS.filter(a => a.status !== "active").map(a => a.id);   // live() показывает только active
        USERS = profs.map(rowToUser);
        bans = {};
        profs.forEach(p => { if (p.banned) bans[p.id] = { reason: "Нарушение правил", ts: Date.parse(p.created_at) }; });
        if (U) USERS = USERS.filter(u => u.id !== U.id).concat(U);
        revs = rvs.map(r => ({ s: r.seller_id, a: r.author_name || "Покупатель", st: r.stars, t: r.body, d: Date.parse(r.created_at) }));
        REVIEWED = new Set(U ? rvs.filter(r => r.author_id === U.id).map(r => r.deal_id) : []);
        cart = cart.filter(i => byId(i.id)).map(i => ({ ...i, qty: Math.min(i.qty, byId(i.id).stock) })).filter(i => i.qty > 0);
        cmp = cmp.filter(byId).slice(0, 3);
    }

    async function loadAdmin() {
        const [profs, reps] = await Promise.all([
            SB.from("profiles").select("*").limit(2000).then(ok),
            SB.from("reports").select("*").order("created_at", { ascending: false }).limit(500).then(ok)
        ]);
        USERS = profs.map(p => ({ id: p.id, name: p.name, city: p.city, country: p.country, since: year(p.created_at), phone: p.phone, role: p.role }));
        bans = {};
        profs.forEach(p => { if (p.banned) bans[p.id] = { reason: p.ban_reason || "—", ts: Date.parse(p.banned_at || p.created_at) }; });
        REPORTS = reps.map(r => ({ id: r.id, by: r.reporter_id, type: r.target_type, target: r.target_id, reason: r.reason, details: r.details, status: r.status, ts: Date.parse(r.created_at) }));
    }

    async function hydratePrivate() {
        ORD = []; chats = {}; DEALS = []; REPORTS = [];
        if (!U) { unsub(); return; }
        const [ords, chs, dls] = await Promise.all([
            SB.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(500).then(ok),
            SB.from("chats").select("*, messages(id,sender_id,body,created_at)").limit(300).then(ok),
            SB.from("deals").select("*").order("created_at", { ascending: false }).limit(300).then(ok)
        ]);
        ORD = ords.map(rowToOrder);
        chs.filter(c => c.buyer_id === U.id || c.seller_id === U.id).forEach(c => { chats[c.id] = rowToChat(c); });
        DEALS = dls.map(rowToDeal);
        if (isAdmin()) await loadAdmin();
        if (!rt) subscribe();
    }

    async function reloadChats() {
        const chs = await SB.from("chats").select("*, messages(id,sender_id,body,created_at)").limit(300).then(ok);
        chats = {};
        chs.filter(c => c.buyer_id === U.id || c.seller_id === U.id).forEach(c => { chats[c.id] = rowToChat(c); });
    }

    function refresh() {
        const h = location.hash;
        if (h.startsWith("#admin")) renderAdm();
        else if (h.startsWith("#resale")) renderRS();
        else renderCatalog();
        badges();
    }
    async function refreshData() {
        const st = await loadSession();
        if (st.banned) toast("Аккаунт заблокирован: " + st.banned);
        await hydratePublic();
        await hydratePrivate();
        refresh();
    }

    /* ===================== realtime-чат ===================== */
    function unsub() { if (rt) { SB.removeChannel(rt); rt = null; } }
    function subscribe() {
        unsub();
        if (!U) return;
        rt = SB.channel("volt-messages")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, p => onMessage(p.new))
            .subscribe();
    }
    async function onMessage(m) {
        if (!U) return;
        let c = chats[m.chat_id];
        if (c && c.m.some(x => x.id === m.id)) return;
        if (!c) { await reloadChats(); c = chats[m.chat_id]; if (!c) return; }
        else c.m.push({ id: m.id, me: m.sender_id === U.id ? 1 : 0, t: m.body });
        const form = $("#chatForm");
        if (form && form.dataset.id === m.chat_id && $("#modal").classList.contains("show")) paint(m.chat_id);
        else if (m.sender_id !== U.id) toast("💬 Новое сообщение: " + c.with);
        if (!$("#rs").hidden && rv.p === "inbox") renderRS();
        badges();
    }

    /* ===================== базовые функции app.js → серверный режим ===================== */
    load = () => { cart = store.get("vs_cart", []); cmp = store.get("vs_cmp", []); };
    save = () => { store.set("vs_cart", cart); store.set("vs_cmp", cmp); badges(); };
    saveCat = () => {
        cart = cart.filter(i => byId(i.id)); cart.forEach(i => i.qty = Math.min(i.qty, byId(i.id).stock));
        cart = cart.filter(i => i.qty > 0); cmp = cmp.filter(byId); save(); renderCatalog();
    };
    badges = () => {
        acctBtn();
        $("#nCart").textContent = cart.reduce((n, i) => n + i.qty, 0);
        $("#nCmp").textContent = cmp.length;
        const b = $("#cmpbar");
        b.style.display = cmp.length && !/^#(resale|admin)/.test(location.hash) ? "flex" : "none";
        $("#cmpTxt").textContent = "Сравнение: " + cmp.length + " из 3";
        const n = U ? DEALS.filter(d => (d.seller === U.id && d.status === "requested")
            || (d.status === "accepted" && ((d.buyer === U.id && !d.bc) || (d.seller === U.id && !d.sc)))).length : 0;
        const c = $("#nChat"); c.hidden = !n; c.textContent = n;
    };

    /* ===================== вход, регистрация, профиль ===================== */
    function welcome() {
        closeM(); acctBtn(); refresh();
        toast("Добро пожаловать, " + U.name.split(" ")[0] + "!");
        const n = authNext; authNext = null; if (n) n();
    }
    async function finishAuth(errEl) {
        const st = await loadSession();
        if (st.banned) { errEl.textContent = "Аккаунт заблокирован. Причина: " + st.banned; return false; }
        if (!st.ok) { errEl.textContent = "Профиль не найден. Обратитесь в поддержку."; return false; }
        await hydratePublic(); await hydratePrivate();
        return true;
    }

    const FORMS = {};
    FORMS.loginForm = async (f, d) => {
        const er = $("#authErr");
        const { error } = await SB.auth.signInWithPassword({ email: d.email.trim().toLowerCase(), password: d.pw });
        if (error) { er.textContent = errText(error); return; }
        if (await finishAuth(er)) welcome();
    };
    FORMS.regForm = async (f, d) => {
        const er = $("#authErr"), name = d.name.trim(), phone = d.phone.trim(), email = d.email.trim().toLowerCase();
        if (name.length < 2 || phone.replace(/\D/g, "").length < 10) { er.textContent = "Проверьте имя и номер телефона"; return; }
        const { data, error } = await SB.auth.signUp({ email, password: d.pw, options: { data: { name, phone, country: d.country } } });
        if (error) { er.textContent = errText(error); return; }
        if (data.user && data.user.identities && data.user.identities.length === 0) { er.textContent = "Этот email уже зарегистрирован"; return; }
        if (!data.session) {
            open(head("Проверьте почту") + `<p>Мы отправили письмо на <b>${esc(email)}</b>. Подтвердите адрес по ссылке, затем войдите в аккаунт.</p><div class="row"><button class="btn primary" data-a="authtab" data-k="in">Войти</button><button class="btn" data-a="resend" data-email="${esc(email)}">Отправить письмо ещё раз</button></div>`);
            return;
        }
        if (await finishAuth(er)) welcome();
    };
    FORMS.profForm = async (f, d) => {
        if (!U) return;
        const patch = { name: d.name.trim(), city: d.city.trim(), country: d.city.trim(), phone: d.phone.trim() };
        const p = await SB.from("profiles").update(patch).eq("id", U.id).select().single().then(ok);
        U = mkUser(p, U.email);
        await hydratePublic();
        closeM(); refresh(); toast("Профиль обновлён");
    };
    A.ulogout = act(async () => {
        unsub(); await SB.auth.signOut();
        U = null; admMem = false; closeM();
        await hydratePublic(); await hydratePrivate();
        refresh(); toast("Вы вышли из аккаунта");
    });
    A.logout = A.ulogout;

    /* ===================== пароль: восстановление и смена ===================== */
    const _openAuth = openAuth;
    openAuth = function (tab, msg) {
        _openAuth(tab, msg);
        const f = $("#loginForm");
        if (f) f.insertAdjacentHTML("afterend", `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn" type="button" data-a="forgot">Забыли пароль?</button></div>`);
    };
    A.forgot = () => open(head("Восстановление пароля") + `<p class="note">Укажите email — отправим ссылку для создания нового пароля.</p><form id="forgotForm" class="form" style="grid-template-columns:1fr"><label>Email<input name="email" type="email" required autocomplete="username"></label><button class="btn primary">Отправить ссылку</button></form>`);
    FORMS.forgotForm = async (f, d) => {
        const email = d.email.trim().toLowerCase();
        const { error } = await SB.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        if (error && !/not found/i.test(error.message || "")) throw error;
        // Ответ одинаковый для существующих и несуществующих адресов — чтобы нельзя было перебирать чужие email.
        open(head("Проверьте почту") + `<p>Если аккаунт с адресом <b>${esc(email)}</b> существует, мы отправили письмо со ссылкой для нового пароля. Загляните и в папку «Спам».</p><div class="row"><button class="btn" data-a="close">Закрыть</button></div>`);
    };
    function openNewPassword(title) {
        open(head(title || "Новый пароль") + `<form id="newPassForm" class="form" style="grid-template-columns:1fr"><label>Новый пароль (от 8 символов)<input name="p1" type="password" required minlength="8" autocomplete="new-password"></label><label>Повторите пароль<input name="p2" type="password" required minlength="8" autocomplete="new-password"></label><button class="btn primary">Сохранить пароль</button></form>`);
    }
    FORMS.newPassForm = async (f, d) => {
        if (d.p1.length < 8) return toast("Пароль — от 8 символов");
        if (d.p1 !== d.p2) return toast("Пароли не совпадают");
        const { error } = await SB.auth.updateUser({ password: d.p1 });
        if (error) throw error;
        recoveryPending = false;
        await refreshData(); closeM(); toast("Пароль обновлён");
    };
    A.chpass = () => { if (need()) openNewPassword("Смена пароля"); };
    A.resend = act(async e => {
        const { error } = await SB.auth.resend({ type: "signup", email: e.email });
        if (error) throw error;
        toast("Письмо отправлено повторно");
    });

    /* ===================== каталог (админ) ===================== */
    async function reloadProducts() {
        P = (await SB.from("products").select("*").order("id").then(ok)).map(rowToProduct);
        saveCat();
    }
    FORMS.prodForm = async (f, d) => {
        const id = +f.dataset.id, t = new FormData(f).getAll("t"), price = Math.round(+d.price), old = Math.round(+d.old) || null;
        if (!t.length) return toast("Выберите хотя бы один тип");
        if (old && old <= price) return toast("Старая цена должна быть больше текущей");
        const L = x => { const l = String(x || "").split("\n").map(y => y.trim()).filter(Boolean); return l.length ? l : ["—"]; };
        const row = {
            name: d.name.trim(), brand: d.brand.trim(), price, old_price: old, stock: Math.max(0, Math.round(+d.stock) || 0),
            rating: Math.min(5, Math.max(1, +d.rating || 4.5)), hot: !!d.hot, types: t, img: d.img.trim(), descr: d.desc.trim(),
            pros: L(d.pro), cons: L(d.con), specs: S(K.map((k, i) => (d["s" + i] || "").trim() || "—"))
        };
        await (id ? SB.from("products").update(row).eq("id", id) : SB.from("products").insert(row)).then(ok);
        await reloadProducts(); closeM(); renderAdm(); toast(id ? "Товар обновлён" : "Товар добавлен");
    };
    A.pdelok = act(async e => {
        await SB.from("products").delete().eq("id", +e.id).then(ok);
        P = P.filter(p => p.id !== +e.id); saveCat(); closeM(); renderAdm(); toast("Товар удалён");
    });
    A.preset = () => toast("Сброс каталога отключён: данные хранятся в базе");
    const _admCat = admCat;
    admCat = b => { _admCat(b); const x = b.querySelector('[data-a="preset"]'); if (x) x.remove(); };
    // Быстрое редактирование цены/остатка в списке: перехватываем раньше app.js
    document.addEventListener("change", ev => {
        const t = ev.target, k = t.dataset && t.dataset.inl;
        if (!k) return;
        ev.stopImmediatePropagation();
        const p = byId(+t.dataset.id), v = Math.round(+t.value);
        if (!p || !(v >= (k === "price" ? 1 : 0))) { toast("Некорректное значение"); t.value = p ? p[k] : ""; return; }
        const dropOld = k === "price" && p.old && p.old <= v;
        const patch = k === "price" ? { price: v, ...(dropOld ? { old_price: null } : {}) } : { stock: v };
        SB.from("products").update(patch).eq("id", p.id).then(ok).then(() => {
            p[k] = v; if (dropOld) p.old = null;
            saveCat(); admStats(); toast("Сохранено, уже на сайте");
        }).catch(e => { toast(errText(e)); t.value = p[k]; });
    }, true);

    /* ===================== заказы: доставка + оплата ===================== */
    const shipCost = (m, country, goods) => m === "pickup" ? 0
        : m === "courier" ? (country === "Казахстан" ? (goods >= 300000 ? 0 : 2500) : 15000)
            : (country === "Казахстан" ? 1500 : 9000);          // дублирует calc_delivery в schema.sql (только показ; сервер считает сам)
    Object.assign(ST, {
        pending_payment: ["Ждёт оплаты", "#ffd166"], paid: ["Оплачен · ждёт отправки", "#ffd166"], shipped: ["Отправлен", "#7fe0ac"],
        delivered: ["Доставлен", "#7fe0ac"], cancelled: ["Отменён", "#ff7f9e"], refunded: ["Возврат оформлен", "#ff7f9e"]
    });
    const DLV = { courier: "Курьер", post: "Почта", pickup: "Самовывоз" };

    function updateShip() {
        const f = $("#orderForm"); if (!f) return;
        const goods = +f.dataset.goods, m = f.elements.dm.value, s = shipCost(m, f.elements.c.value, goods);
        f.elements.a.required = m !== "pickup";
        $("#addrRow").style.display = m === "pickup" ? "none" : "";
        $("#shipInfo").textContent = m === "pickup" ? "Самовывоз — бесплатно." : "Доставка: " + (s ? money(s) : "бесплатно");
        $("#ordTotal").textContent = "Итого: " + money(goods + s);
    }
    document.addEventListener("change", ev => { if (ev.target.closest && ev.target.closest("#orderForm")) updateShip(); });

    openOrder = function () {
        if (!need("Чтобы оформить заказ, войдите или зарегистрируйтесь.", openOrder)) return;
        if (!cart.length) return openCart();
        const goods = cart.reduce((s, i) => s + byId(i.id).price * i.qty, 0), demo = CFG.paymentProvider === "demo", man = isManual();
        open(head("Оформление заказа") + cart.map(i => `<div class="cl"><div class="g">${esc(byId(i.id).name)} × ${i.qty}</div><b>${money(byId(i.id).price * i.qty)}</b></div>`).join("") +
            `<form id="orderForm" class="form mt" data-goods="${goods}"><label>Имя и фамилия<input name="n" required maxlength="40" value="${esc(U.name)}"></label><label>Номер телефона<input name="t" required type="tel" maxlength="20" value="${esc(U.phone)}"></label>
 <label>Страна<select name="c">${COUNTRIES.map(c => `<option ${c === U.country ? "selected" : ""}>${c}</option>`).join("")}</select></label>
 <label>Доставка<select name="dm"><option value="courier">Курьер</option><option value="post">Почта</option><option value="pickup">Самовывоз</option></select></label>
 <label class="full" id="addrRow">Адрес доставки<input name="a" maxlength="120" placeholder="Город, улица, дом"></label>
 <div class="note full" id="shipInfo"></div>
 <p class="note full">${man ? "Онлайн-оплаты пока нет: после оформления менеджер свяжется по телефону, подтвердит заказ и согласует оплату." : demo ? "Тестовая оплата: деньги не списываются." : "Оплата проходит на защищённой странице платёжного провайдера — данные карты на нашем сайте не вводятся и не хранятся."}</p>
 <label class="full" style="display:flex;gap:8px;align-items:center;color:var(--text)"><input type="checkbox" name="ag" required style="width:auto">Я согласен с условиями покупки и обработкой персональных данных</label>
 <div class="price full" id="ordTotal"></div><button class="btn primary full">${man ? "Оформить заказ" : demo ? "Оплатить (тест)" : "Перейти к оплате"}</button></form>`);
        updateShip();
    };
    A.order = openOrder;

    async function pay(orderId) {
        if (isManual()) {
            await refreshData();
            return open(head("Заказ принят ✓") + `<p>Заказ <b>№${orderId}</b> оформлен. Менеджер свяжется с вами по указанному телефону, подтвердит наличие и согласует оплату. Статус виден в профиле.</p><div class="row"><button class="btn primary" data-a="acct">Мои заказы</button><button class="btn" data-a="close">Закрыть</button></div>`);
        }
        if (CFG.paymentProvider === "demo") {
            await rpc("demo_pay_order", { p_order: orderId });
            await refreshData();
            return open(head("Заказ оплачен ✓") + `<p>Заказ <b>№${orderId}</b> оплачен (тестовый режим). Статус и трек-номер появятся в профиле.</p><div class="row"><button class="btn primary" data-a="acct">Мои заказы</button><button class="btn" data-a="close">Закрыть</button></div>`);
        }
        const { data, error } = await SB.functions.invoke("create-payment", { body: { order_id: orderId } });
        if (error || !data || !/^https:\/\//.test(data.url || "")) throw new Error("Не удалось создать платёж. Заказ сохранён — оплатить можно в профиле.");
        toast("Переходим к оплате…");
        location.href = data.url;
    }
    FORMS.orderForm = async (f, d) => {
        if (!need()) return;
        if (!d.ag) return toast("Нужно согласие с условиями");
        const r = await rpc("place_order", {
            p_items: cart.map(i => ({ id: i.id, qty: i.qty })), p_name: d.n, p_phone: d.t, p_country: d.c, p_addr: d.a || "", p_delivery: d.dm
        });
        cart = []; save();
        try { await pay(r.order_id); }
        catch (e) {
            await refreshData();
            open(head("Заказ создан") + `<p>Заказ <b>№${r.order_id}</b> создан, но оплата не началась: ${esc(errText(e))}</p><div class="row"><button class="btn primary" data-a="paynow" data-id="${r.order_id}">Повторить оплату</button><button class="btn" data-a="acct">Мои заказы</button></div>`);
        }
    };
    A.paynow = act(async e => { await pay(+e.id); });
    A.opaid = act(async e => { await rpc("admin_set_order", { p_order: +e.id, p_action: "paid" }); await refreshData(); orderView(+e.id, true); toast("Оплата подтверждена"); });
    A.ocancelown = act(async e => { await rpc("cancel_order", { p_order: +e.id }); await refreshData(); closeM(); toast("Заказ отменён"); });

    const payTxt = o => o.status === "pending_payment" ? (isManual() ? "Ожидает подтверждения менеджером" : "Ожидает оплаты")
        : o.status === "cancelled" ? "Не оплачивался / отменён"
            : o.status === "refunded" ? "Оплата возвращена" + (o.note ? " · " + esc(o.note) : "")
                : `Оплачен ${o.paidAt ? dt(o.paidAt) : ""}${o.provider ? " · " + esc(o.provider) : ""} · ${money(o.total)}`;

    orderView = function (id, adm) {
        const o = ORD.find(x => x.id === +id);
        if (!o || (!adm && (!U || o.uid !== U.id))) return;
        let acts = "";
        if (adm) {
            if (o.status === "paid") acts += `<button class="btn primary" data-a="oship" data-id="${o.id}">📦 Отправить заказ</button>`;
            if (o.status === "shipped") acts += `<button class="btn primary" data-a="odeliver" data-id="${o.id}">✓ Отметить доставленным</button>`;
            if (o.status === "pending_payment" && isManual()) acts += `<button class="btn primary" data-a="opaid" data-id="${o.id}">✓ Подтвердить оплату</button>`;
            if (["pending_payment", "paid", "shipped"].includes(o.status)) acts += `<button class="btn" data-a="ocancel" data-id="${o.id}">Отменить / вернуть оплату</button>`;
        } else if (o.status === "pending_payment") {
            acts += (isManual() ? "" : `<button class="btn primary" data-a="paynow" data-id="${o.id}">Оплатить ${money(o.total)}</button>`) + `<button class="btn" data-a="ocancelown" data-id="${o.id}">Отменить заказ</button>`;
        }
        open(head("Заказ №" + o.id) + `<p>${chip(o.status)}</p><table><tr><td>Клиент</td><td>${esc(o.name)} · ${esc(o.email)}</td></tr><tr><td>Телефон</td><td>${esc(o.phone)}</td></tr>
 <tr><td>Страна</td><td>${esc(o.country)}</td></tr><tr><td>Доставка</td><td>${DLV[o.delivery] || ""} · ${o.shipCost ? money(o.shipCost) : "бесплатно"}</td></tr><tr><td>Адрес</td><td>${esc(o.addr || "—")}</td></tr>
 <tr><td>Оплата</td><td>${payTxt(o)}</td></tr><tr><td>Создан</td><td>${dt(o.ts)}</td></tr>${o.track ? `<tr><td>Трек-номер</td><td>${esc(o.carrier || "")} ${esc(o.track)}</td></tr>` : ""}</table>
 <h3>Состав заказа</h3>${o.items.map(i => `<div class="cl"><div class="g"><b>${esc(i.name)}</b><div class="note">${money(i.price)} × ${i.qty}</div></div><b>${money(i.price * i.qty)}</b></div>`).join("")}
 <div class="price">Итого: ${money(o.total)}</div>${acts ? `<div class="row">${acts}</div>` : ""}`);
    };

    openAcct = function () {
        if (!need()) return;
        const mo = ORD.filter(o => o.uid === U.id).sort((a, b) => b.ts - a.ts);
        open(head("Мой профиль") + `<div class="seller"><div class="av">${esc(U.name[0])}</div><div style="flex:1"><b>${esc(U.name)}</b><small>${esc(U.email)} · ${esc(U.phone)} · ${esc(U.country)} · с ${U.since} г.</small></div></div>
 <div class="row mt"><button class="btn" data-a="pedit">✎ Изменить данные</button><button class="btn" data-a="chpass">🔑 Сменить пароль</button><a class="btn" href="#resale" target="_blank" rel="noopener">Профиль в ресейле ↗</a>${isAdmin() ? `<a class="btn" href="#admin">Админ-панель</a>` : ""}<button class="btn" data-a="ulogout">Выйти</button></div>
 <h3>Мои заказы</h3>${mo.length ? mo.map(o => `<div class="cl"><div class="g"><b>№${o.id}</b> · ${money(o.total)}<div class="note">${dt(o.ts)}${o.track ? " · трек " + esc(o.track) : ""}</div></div>${chip(o.status)}<button class="btn" data-a="myord" data-id="${o.id}">Открыть</button></div>`).join("") : `<p class="note">Заказов пока нет.</p>`}`);
    };
    A.acct = openAcct;

    A.oship = e => {
        const o = ORD.find(x => x.id === +e.id); if (!o || o.status !== "paid") return;
        const pick = o.delivery === "pickup";
        open(head("Отправка заказа №" + o.id) + `<form id="shipForm" data-id="${o.id}" class="form" style="grid-template-columns:1fr"><label>Служба доставки<input name="carrier" maxlength="30" list="carr" value="${pick ? "Самовывоз" : ""}"><datalist id="carr"><option>Казпочта</option><option>СДЭК</option><option>Курьер магазина</option></datalist></label>
 <label>Трек-номер${pick ? " (необязательно)" : ""}<input name="track" maxlength="40" ${pick ? "" : "required"}></label><button class="btn primary">Отметить отправленным</button></form>`);
    };
    FORMS.shipForm = async (f, d) => {
        const id = +f.dataset.id;
        await rpc("admin_set_order", { p_order: id, p_action: "ship", p_carrier: d.carrier, p_track: d.track });
        await refreshData(); orderView(id, true); toast("Заказ отправлен");
    };
    A.odeliver = act(async e => { await rpc("admin_set_order", { p_order: +e.id, p_action: "deliver" }); await refreshData(); orderView(+e.id, true); toast("Заказ доставлен"); });
    A.ocancel = e => open(head("Отменить заказ №" + e.id + "?") + `<p>Остатки вернутся на склад. Если заказ уже оплачен, деньги нужно вернуть покупателю отдельно — в кабинете платёжного провайдера.</p><div class="row"><button class="btn primary" data-a="ocancelok" data-id="${e.id}">Отменить заказ</button><button class="btn" data-a="close">Назад</button></div>`);
    A.ocancelok = act(async e => { await rpc("admin_set_order", { p_order: +e.id, p_action: "cancel" }); await refreshData(); orderView(+e.id, true); toast("Заказ отменён"); });

    /* ===================== ресейл: объявления и фото ===================== */
    async function compress(file) {      // уменьшает фото и убирает EXIF (в т.ч. GPS-координаты)
        const bmp = await createImageBitmap(file);
        const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
        const c = document.createElement("canvas");
        c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
        c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
        return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("Не удалось обработать фото")), "image/jpeg", 0.82));
    }
    async function uploadPhotos(files) {
        const paths = [];
        for (const f of files) {
            if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error("Допустимы только JPG, PNG, WebP");
            if (f.size > 15 * 1024 * 1024) throw new Error("Фото больше 15 МБ");
            const path = `${U.id}/${crypto.randomUUID()}.jpg`;
            const { error } = await SB.storage.from("ad-photos").upload(path, await compress(f), { contentType: "image/jpeg", cacheControl: "31536000" });
            if (error) { if (paths.length) await SB.storage.from("ad-photos").remove(paths); throw error; }
            paths.push(path);
        }
        return paths;
    }
    openPublish = function () {
        if (!need("Войдите, чтобы подать объявление.", openPublish)) return;
        open(head("Подать объявление") + `<form id="pubForm" class="form"><label>Модель телефона<input name="model" required maxlength="40" list="mdl" placeholder="Например, iPhone 15 Pro"></label><datalist id="mdl">${P.map(p => `<option value="${esc(p.name)}">`).join("")}</datalist>
 <label>Память<select name="mem"><option>128 ГБ</option><option selected>256 ГБ</option><option>512 ГБ</option><option>1 ТБ</option></select></label><label>Состояние<select name="cond"><option>Как новое</option><option>Отличное</option><option>Хорошее</option><option>Есть следы использования</option></select></label>
 <label>Здоровье батареи, % (необязательно)<input name="bat" type="number" min="1" max="100"></label><label>Цена, ₸<input name="price" required type="number" min="10000" max="5000000"></label><label>Город<input name="city" required maxlength="30" value="${esc(U.city)}"></label>
 <label class="full">Фото (до 5 шт., JPG / PNG / WebP)<input name="files" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><label class="full">Описание<textarea name="note" maxlength="300" placeholder="Комплект, состояние, что менялось…"></textarea></label>
 <p class="note full">Объявление появится в ленте после проверки модератором. Из фото удаляются метаданные (геолокация).</p><button class="btn primary full">Отправить на модерацию</button></form>`);
    };
    A.pub = openPublish;
    FORMS.pubForm = async (f, d) => {
        if (!need()) return;
        const files = [...(f.elements.files ? f.elements.files.files : [])];
        if (files.length > 5) return toast("Не больше 5 фото");
        if (files.length) toast("Загружаем фото…");
        const photos = await uploadPhotos(files);
        const { error } = await SB.from("ads").insert({
            seller_id: U.id, model: d.model.trim(), mem: d.mem, cond: d.cond, bat: +d.bat || null,
            price: Math.round(+d.price), city: d.city.trim(), note: d.note.trim(), photos, status: "pending"
        });
        if (error) { if (photos.length) await SB.storage.from("ad-photos").remove(photos); throw error; }
        await hydratePublic();
        rv.p = "prof"; rv.sid = U.id; rv.tab = "ads"; closeM(); renderRS();
        toast("Отправлено на модерацию");
    };
    A.rdel = act(async e => {
        const a = ad(e.id); if (!a || !U || a.sid !== U.id) return;
        await SB.from("ads").update({ status: "removed" }).eq("id", e.id).then(ok);
        await hydratePublic(); closeM(); renderRS(); toast("Объявление снято");
    });

    const AST = {
        pending: ["На модерации", "#ffd166"], active: ["Опубликовано", "#7fe0ac"], reserved: ["Бронь (идёт сделка)", "#9ac0ff"],
        sold: ["Продано", "#b0c7e6"], rejected: ["Отклонено", "#ff7f9e"], removed: ["Снято", "#ff7f9e"]
    };
    const achip = s => `<span class="chip" style="color:${AST[s][1]}">${AST[s][0]}</span>`;
    const _prof = profPage;
    profPage = function (sid) {
        let html = _prof(sid), extra = "";
        if (U && sid === U.id) {
            const mine = ADS.filter(a => a.sid === U.id && !["active", "removed"].includes(a.status));
            if (mine.length) extra = `<section><h3>Мои объявления вне ленты</h3><div class="grid">${mine.map(a => `<article class="card glass">${pic(a.img, a.model)}<div class="info"><div class="name">${esc(a.model)}</div>${tags(a)}<div class="price">${money(a.price)}</div>
 <div class="mt">${achip(a.status)}</div>${a.reason ? `<div class="note">Причина: ${esc(a.reason)}</div>` : ""}<div class="row mt">${["pending", "rejected"].includes(a.status) ? `<button class="btn" data-a="rdel" data-id="${a.id}">Снять</button>` : `<button class="btn" data-a="inbox">Сделки</button>`}</div></div></article>`).join("")}</div></section>`;
        } else if (U) {
            html = html.replace("★ Оставить отзыв</button>", `★ Оставить отзыв</button><button class="btn mt" style="width:100%" data-a="report" data-t="user" data-id="${esc(sid)}">⚑ Пожаловаться</button>`);
        }
        return extra + html;
    };
    const _openAd = openAd;
    openAd = function (id) {
        _openAd(id);
        const a = ad(id); if (!a) return;
        let html = "";
        if (a.photos.length > 1) html += `<div class="row mt">${a.photos.map(u => `<img src="${esc(u)}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px;cursor:pointer" data-a="photo" data-u="${esc(u)}">`).join("")}</div>`;
        if (!U || a.sid !== U.id) html += `<div class="row mt"><button class="btn" data-a="report" data-t="ad" data-id="${esc(a.id)}">⚑ Пожаловаться на объявление</button></div>`;
        if (html) $("#modal").insertAdjacentHTML("beforeend", html);
    };
    A.photo = e => { const i = $("#modal .pic img"); if (i) i.src = e.u; };
    A.ph = act(async (e, el) => {
        if (!need("Войдите, чтобы увидеть телефон.", () => A.ph(e, el))) return;
        el.textContent = "📞 " + ((await rpc("seller_phone", { p_uid: e.id })) || "не указан");
    });

    /* ===================== чаты ===================== */
    openChat = function (id) {
        (async () => {
            if (!need("Войдите, чтобы написать продавцу.", () => openChat(id))) return;
            let cid = id, c = chats[id];
            if (!c) {                                   // id — это объявление: найдём/создадим чат
                const a = ad(id); if (!a) return;
                if (bans[a.sid]) return toast("Продавец заблокирован");
                if (a.sid === U.id) return toast("Это ваше объявление");
                cid = await rpc("open_chat", { p_ad: id });
                if (!chats[cid]) await reloadChats();
                c = chats[cid];
            }
            if (!c) return;
            const a = ad(c.adId);
            open(head("Чат: " + esc(c.with)) + `<p class="note">${a ? esc(a.model) + " · " + money(a.price) : ""}</p><div class="chat" id="chatBox"></div>
 <form id="chatForm" data-id="${cid}" class="row mt"><input name="t" placeholder="Сообщение…" autocomplete="off" required maxlength="300" style="flex:3"><button class="btn primary">Отправить</button></form>
 <div class="row mt"><button class="btn" data-a="report" data-t="chat" data-id="${cid}">⚑ Пожаловаться на переписку</button></div>`);
            paint(cid);
        })().catch(e => { console.error(e); toast(errText(e)); });
    };
    FORMS.chatForm = async (f, d) => {
        const id = f.dataset.id, t = d.t.trim(); if (!t) return;
        const r = await SB.from("messages").insert({ chat_id: id, sender_id: U.id, body: t }).select("id").single().then(ok);
        const c = chats[id];
        if (c && !c.m.some(x => x.id === r.id)) c.m.push({ id: r.id, me: 1, t });
        f.reset(); paint(id);
    };

    /* ===================== сделки и отзывы ===================== */
    const DST = { requested: ["Ждёт ответа продавца", "#ffd166"], accepted: ["Принята · встреча", "#9ac0ff"], completed: ["Завершена", "#7fe0ac"], cancelled: ["Отменена", "#ff7f9e"] };
    inboxPage = function () {
        const dl = DEALS.slice().sort((a, b) => b.ts - a.ts);
        const cl = Object.values(chats).reverse();
        const dealRow = d => {
            const imSeller = d.seller === U.id, mine = imSeller ? d.sc : d.bc;
            let btns = "";
            if (d.status === "requested") btns = imSeller ? `<button class="btn primary" data-a="dact" data-k="accept" data-id="${d.id}">Принять</button><button class="btn" data-a="dact" data-k="decline" data-id="${d.id}">Отклонить</button>` : `<button class="btn" data-a="dact" data-k="cancel" data-id="${d.id}">Отменить заявку</button>`;
            if (d.status === "accepted") btns = (mine ? `<span class="note">Ждём подтверждения второй стороны</span>` : `<button class="btn primary" data-a="dact" data-k="confirm" data-id="${d.id}">Сделка состоялась</button>`) + `<button class="btn" data-a="dact" data-k="cancel" data-id="${d.id}">Отменить</button>`;
            if (d.status === "completed" && !imSeller && !REVIEWED.has(d.id)) btns = `<button class="btn primary" data-a="rev" data-id="${d.seller}">★ Оставить отзыв</button>`;
            return `<div class="ar glass"><div class="g"><b>${esc(d.model)}</b> · ${money(d.price)}<div class="note">${imSeller ? "Покупатель" : "Продавец"}: ${esc(nameOf(imSeller ? d.buyer : d.seller))} · ${ago(d.ts)}</div></div><span class="chip" style="color:${DST[d.status][1]}">${DST[d.status][0]}</span>${btns}</div>`;
        };
        return `<section><h2>Сделки и чаты</h2><p class="sub">Оплата за б/у устройство проходит при личной встрече. Платформа не проводит деньги покупателя и продавца.</p>
 <h3>Сделки</h3>${dl.length ? dl.map(dealRow).join("") : `<div class="empty">Сделок пока нет. Откройте объявление и нажмите «Купить».</div>`}
 <h3>Чаты</h3>${cl.length ? cl.map(c => { const a = ad(c.adId), last = c.m[c.m.length - 1]; return `<button class="glass ib" data-a="chat" data-id="${c.id}" style="color:inherit">${a && a.img ? `<img src="${esc(a.img)}" alt="">` : `<div class="av">${esc(c.with[0])}</div>`}<div><b>${esc(c.with)}</b>${a ? " · " + esc(a.model) : ""}<div class="note">${last ? (last.me ? "Вы: " : "") + esc(last.t) : "Нет сообщений"}</div></div></button>`; }).join("") : `<div class="empty">Пока нет переписок.</div>`}</section>`;
    };
    A.rbuy = act(async e => {
        const a = ad(e.id); if (!a) return;
        if (!need("Войдите, чтобы купить.", () => A.rbuy(e))) return;
        if (a.sid === U.id) return toast("Это ваше объявление");
        await rpc("request_deal", { p_ad: a.id });
        await refreshData();
        open(head("Заявка отправлена") + `<p>Заявка на <b>${esc(a.model)}</b> за ${money(a.price)} отправлена. ${esc(seller(a.sid).name)} должен её принять — статус в разделе «Чаты». Оплата — при личной встрече: проверьте устройство и встречайтесь в безопасном месте.</p><div class="row"><button class="btn primary" data-a="inbox">Мои сделки</button><button class="btn" data-a="close">Закрыть</button></div>`);
    });
    A.dact = act(async e => {
        if (e.k === "confirm" && !confirm("Подтвердить, что устройство передано и сделка состоялась?")) return;
        if (e.k === "cancel" && !confirm("Отменить сделку?")) return;
        await rpc("deal_action", { p_deal: e.id, p_action: e.k });
        await refreshData();
        toast({ accept: "Заявка принята", decline: "Заявка отклонена", cancel: "Сделка отменена", confirm: "Подтверждено" }[e.k]);
    });
    A.rev = e => {
        if (!need("Войдите, чтобы оставить отзыв.", () => A.rev(e))) return;
        if (e.id === U.id) return toast("Нельзя оставить отзыв себе");
        const deal = DEALS.find(d => d.buyer === U.id && d.seller === e.id && d.status === "completed" && !REVIEWED.has(d.id));
        if (!deal) return toast("Отзыв можно оставить после завершённой сделки");
        open(head("Отзыв о " + esc(seller(e.id).name)) + `<form id="revForm" data-sid="${esc(e.id)}" data-deal="${deal.id}" class="form"><label class="full">Оценка<select name="st"><option value="5">★★★★★ Отлично</option><option value="4">★★★★ Хорошо</option><option value="3">★★★ Нормально</option><option value="2">★★ Плохо</option><option value="1">★ Ужасно</option></select></label><label class="full">Текст отзыва<textarea name="t" required minlength="3" maxlength="300"></textarea></label><button class="btn primary full">Отправить отзыв</button></form>`);
    };
    FORMS.revForm = async (f, d) => {
        await SB.from("reviews").insert({ deal_id: f.dataset.deal, seller_id: f.dataset.sid, author_id: U.id, stars: +d.st, body: d.t.trim() }).then(ok);
        await hydratePublic(); closeM(); refresh(); toast("Спасибо за отзыв!");
    };

    /* ===================== жалобы ===================== */
    const RL = { fraud: "Мошенничество", spam: "Спам", abuse: "Оскорбления", prohibited: "Запрещённый товар", other: "Другое" };
    A.report = e => {
        if (!need("Войдите, чтобы отправить жалобу.", () => A.report(e))) return;
        open(head("Пожаловаться") + `<form id="reportForm" data-t="${esc(e.t)}" data-id="${esc(e.id)}" class="form" style="grid-template-columns:1fr"><label>Причина<select name="r">${Object.entries(RL).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label><label>Комментарий (необязательно)<textarea name="c" maxlength="300"></textarea></label><button class="btn primary">Отправить жалобу</button></form>`);
    };
    FORMS.reportForm = async (f, d) => {
        const { error } = await SB.from("reports").insert({ reporter_id: U.id, target_type: f.dataset.t, target_id: f.dataset.id, reason: d.r, details: (d.c || "").trim() });
        if (error) { if (error.code === "23505") { closeM(); return toast("Вы уже отправляли жалобу на это"); } throw error; }
        closeM(); toast("Жалоба отправлена модераторам");
    };

    /* ===================== админ-панель ===================== */
    renderAdm = function () {
        const m = $("#admMain");
        if (!isAdmin()) {
            $("#admOut").hidden = !U;
            m.innerHTML = `<section style="max-width:400px;margin:60px auto"><div class="glass" style="padding:26px"><h2>Вход в админ-панель</h2><p class="sub">${U ? "Вы вошли как " + esc(U.name) + " — у этого аккаунта нет прав администратора." : "Только для администратора магазина."}</p>
 <form id="admLogin" class="form" style="grid-template-columns:1fr"><label>Email<input name="l" type="email" required autocomplete="username"></label><label>Пароль<input name="p" type="password" required autocomplete="current-password"></label><div id="admErr" class="out" style="min-height:18px"></div><button class="btn primary">Войти</button></form></div></section>`;
            return;
        }
        $("#admOut").hidden = false;
        const no = ORD.filter(o => o.status === "paid" || (isManual() && o.status === "pending_payment")).length, np = ADS.filter(a => a.status === "pending").length,
            nr = REPORTS.filter(r => r.status === "open").length, nb = Object.keys(bans).length;
        const tabs = [["cat", "Каталог"], ["ord", "Заказы" + (no ? ` (${no} новых)` : "")], ["ads", "Объявления" + (np ? ` (${np} на модерации)` : "")], ["rep", "Жалобы" + (nr ? ` (${nr})` : "")], ["usr", "Пользователи" + (nb ? ` · 🚫${nb}` : "")]];
        if (!tabs.some(([k]) => k === at)) at = "cat";
        m.innerHTML = `<div class="tabs" style="margin-top:16px">${tabs.map(([k, t]) => `<button class="btn ${at === k ? "on" : ""}" data-a="atab" data-k="${k}">${t}</button>`).join("")}<button class="btn" data-a="admrefresh" title="Обновить данные">↻</button></div><div id="admBody"></div>`;
        ({ cat: admCat, ord: admOrd, ads: admAds, rep: admRep, usr: admUsr }[at])($("#admBody"));
    };
    FORMS.admLogin = async (f, d) => {
        const er = $("#admErr");
        const { error } = await SB.auth.signInWithPassword({ email: d.l.trim().toLowerCase(), password: d.p });
        if (error) { er.textContent = errText(error); f.p.value = ""; return; }
        if (!(await finishAuth(er))) return;
        if (!isAdmin()) { er.textContent = "У этого аккаунта нет прав администратора"; }
        refresh();
    };
    A.admrefresh = act(async () => { await refreshData(); toast("Данные обновлены"); });

    admOrd = function (b) {
        const closed = o => ["cancelled", "refunded"].includes(o.status);
        const l = ORD.filter(o => of === "all" || (of === "closed" ? closed(o) : o.status === of)).sort((a, c) => c.ts - a.ts);
        const rev = ORD.filter(o => ["paid", "shipped", "delivered"].includes(o.status)).reduce((n, o) => n + o.total, 0);
        b.innerHTML = `<section><h2>Заказы</h2><p class="sub">Оплата подтверждается автоматически через платёжного провайдера. Проверьте заказ, отправьте и укажите трек-номер.</p>
 <div class="stats">${sbox(ORD.length, "всего заказов")}${sbox(ORD.filter(o => o.status === "paid").length, "ждут отправки")}${sbox(money(rev), "оплачено (без отмен)")}</div>
 ${fbar("ofil", of, [["all", "Все"], ["paid", "Ждут отправки"], ["shipped", "В пути"], ["delivered", "Доставлены"], ["pending_payment", "Не оплачены"], ["closed", "Отменённые"]])}
 ${l.length ? l.map(o => `<div class="ar glass"><div class="g"><b>№${o.id}</b> · ${esc(o.name)}<div class="note">${dt(o.ts)} · ${DLV[o.delivery] || ""} · ${esc(o.country)} · ${o.items.reduce((n, i) => n + i.qty, 0)} шт.</div></div>${chip(o.status)}<b>${money(o.total)}</b><button class="btn" data-a="oopen" data-id="${o.id}">Открыть</button></div>`).join("") : `<div class="empty">Заказов нет.</div>`}</section>`;
    };

    admAds = function (b) {
        const l = ADS.filter(a => af === "all" || a.status === af).sort((a, c) => c.d - a.d);
        b.innerHTML = `<section><h2>Объявления и модерация</h2><p class="sub">Новые объявления попадают в ленту только после одобрения. Объявление с 3 открытыми жалобами автоматически возвращается на проверку.</p>
 ${fbar("afil", af, [["pending", "На модерации"], ["active", "Опубликованы"], ["reserved", "В сделке"], ["rejected", "Отклонены"], ["all", "Все"]])}
 ${l.length ? l.map(a => `<div class="ar glass">${a.img ? `<img class="th" src="${esc(a.img)}" alt="">` : `<div class="th"></div>`}<div class="g"><b>${esc(a.model)}</b> · ${esc(a.mem)} · ${esc(a.cond)} · ${money(a.price)}<div class="note">${esc(nameOf(a.sid))} · ${esc(a.city)} · ${ago(a.d)} · фото: ${a.photos.length}${a.reason ? " · " + esc(a.reason) : ""}</div></div>${achip(a.status)}
 <button class="btn" data-a="ad" data-id="${a.id}">Открыть</button>${["pending", "rejected"].includes(a.status) ? `<button class="btn primary" data-a="amod" data-k="approve" data-id="${a.id}">Одобрить</button>` : ""}${["pending", "active", "reserved"].includes(a.status) ? `<button class="btn" data-a="amod" data-k="reject" data-id="${a.id}">Отклонить</button>` : ""}${a.status !== "removed" ? `<button class="btn" data-a="amod" data-k="remove" data-id="${a.id}">Снять</button>` : ""}</div>`).join("") : `<div class="empty">Здесь пусто.</div>`}</section>`;
    };
    A.afil = e => { af = e.k; renderAdm(); };
    A.amod = act(async e => {
        if (e.k === "approve") { await rpc("admin_moderate_ad", { p_ad: e.id, p_action: "approve" }); await refreshData(); return toast("Объявление опубликовано"); }
        open(head(e.k === "reject" ? "Отклонить объявление" : "Снять объявление") + `<form id="rejForm" data-id="${esc(e.id)}" data-k="${esc(e.k)}" class="form" style="grid-template-columns:1fr"><label>Причина (увидит продавец)<select name="rs"><option>Подозрение на мошенничество</option><option>Нет фото или плохое качество</option><option>Некорректное описание или цена</option><option>Запрещённый товар</option><option>Другое</option></select></label><label>Пояснение (необязательно)<input name="c" maxlength="100"></label><button class="btn primary">Подтвердить</button></form>`);
    });
    FORMS.rejForm = async (f, d) => {
        await rpc("admin_moderate_ad", { p_ad: f.dataset.id, p_action: f.dataset.k, p_reason: d.rs + (d.c && d.c.trim() ? ": " + d.c.trim() : "") });
        await refreshData(); closeM(); toast("Готово");
    };

    function admRep(b) {
        const l = REPORTS.filter(r => rf === "all" || r.status === rf);
        const label = r => {
            if (r.type === "ad") { const a = ad(r.target); return a ? `Объявление «${esc(a.model)}» · ${esc(nameOf(a.sid))}` : "Объявление (удалено)"; }
            if (r.type === "user") return "Пользователь: " + esc(nameOf(r.target));
            return "Переписка";
        };
        const quick = r => r.status !== "open" ? "" : (r.type === "ad" && ad(r.target) ? `<button class="btn" data-a="ad" data-id="${esc(r.target)}">Открыть</button><button class="btn" data-a="amod" data-k="remove" data-id="${esc(r.target)}">Снять объявление</button>` : "")
            + (r.type === "user" ? `<button class="btn" data-a="ban" data-id="${esc(r.target)}">Забанить</button>` : "")
            + (r.type === "chat" ? `<button class="btn" data-a="rchat" data-id="${esc(r.target)}">Прочитать</button>` : "");
        b.innerHTML = `<section><h2>Жалобы</h2><p class="sub">Переписку можно прочитать только по открытой жалобе.</p>
 ${fbar("rfil", rf, [["open", "Открытые"], ["resolved", "Решённые"], ["dismissed", "Отклонённые"], ["all", "Все"]])}
 ${l.length ? l.map(r => `<div class="ar glass"><div class="g"><b>${RL[r.reason] || r.reason}</b> · ${label(r)}<div class="note">От: ${esc(nameOf(r.by))} · ${dt(r.ts)}${r.details ? " · " + esc(r.details) : ""}</div></div>${quick(r)}${r.status === "open" ? `<button class="btn primary" data-a="rres" data-k="resolved" data-id="${r.id}">Нарушение подтверждено</button><button class="btn" data-a="rres" data-k="dismissed" data-id="${r.id}">Отклонить жалобу</button>` : `<span class="chip">${r.status === "resolved" ? "решена" : "отклонена"}</span>`}</div>`).join("") : `<div class="empty">Жалоб нет.</div>`}</section>`;
    }
    A.rfil = e => { rf = e.k; renderAdm(); };
    A.rres = act(async e => { await rpc("admin_resolve_report", { p_report: e.id, p_status: e.k }); await refreshData(); toast("Жалоба закрыта"); });
    A.rchat = act(async e => {
        const [c, msgs] = await Promise.all([
            SB.from("chats").select("buyer_id,seller_id").eq("id", e.id).single().then(ok),
            SB.from("messages").select("sender_id,body,created_at").eq("chat_id", e.id).order("id").then(ok)
        ]);
        open(head("Переписка по жалобе") + `<p class="note">${esc(nameOf(c.buyer_id))} ↔ ${esc(nameOf(c.seller_id))}</p><div class="chat">${msgs.map(m => `<div class="m"><b>${esc(nameOf(m.sender_id))}:</b> ${esc(m.body)}</div>`).join("") || "<p class='note'>Сообщений нет.</p>"}</div>`);
    });

    admUsr = function (b) {
        const all = USERS.map(u => ({ ...u, type: u.role === "admin" ? "Админ" : "Пользователь" }));
        const nb = all.filter(u => bans[u.id]).length, l = all.filter(u => uf === "all" || (uf === "ban") === !!bans[u.id]);
        b.innerHTML = `<section><h2>Пользователи</h2><p class="sub">Бан скрывает объявления, закрывает открытые сделки и блокирует вход, заказы, отзывы и сообщения.</p><div class="stats">${sbox(all.length, "всего")}${sbox(all.length - nb, "активных")}${sbox(nb, "забанено")}</div>
 ${fbar("ufil", uf, [["all", "Все (" + all.length + ")"], ["act", "Активные (" + (all.length - nb) + ")"], ["ban", "Забанены (" + nb + ")"]])}
 ${l.length ? l.map(u => { const bn = bans[u.id]; return `<div class="ar glass"><div class="av">${esc(u.name[0])}</div><div class="g"><b>${esc(u.name)}</b> <span class="chip">${u.type}</span><div class="note">${esc(u.city)} · с ${u.since} · ${esc(u.phone || "")} · объявлений: ${ADS.filter(a => a.sid === u.id).length} · заказов: ${ORD.filter(o => o.uid === u.id).length}${bn ? ` · причина: ${esc(bn.reason)}` : ""}</div></div>
 <span class="chip" style="color:${bn ? "#ff7f9e" : "#7fe0ac"}">${bn ? "🚫 забанен" : "активен"}</span>${u.role === "admin" || u.id === U.id ? "" : (bn ? `<button class="btn primary" data-a="unban" data-id="${u.id}">Разбанить</button>` : `<button class="btn" data-a="ban" data-id="${u.id}">Забанить</button>`)}</div>`; }).join("") : `<div class="empty">Здесь никого нет.</div>`}</section>`;
    };
    FORMS.banForm = async (f, d) => {
        await rpc("admin_set_ban", { p_user: f.dataset.id, p_ban: true, p_reason: d.r + (d.c && d.c.trim() ? ": " + d.c.trim() : "") });
        await refreshData(); closeM(); toast("Пользователь заблокирован");
    };
    A.unban = act(async e => { await rpc("admin_set_ban", { p_user: e.id, p_ban: false }); await refreshData(); toast("Пользователь разбанен"); });

    /* ===================== общий перехват форм (раньше, чем app.js) ===================== */
    document.addEventListener("submit", ev => {
        const f = ev.target, h = FORMS[f.id];
        if (!h) return;
        ev.preventDefault(); ev.stopImmediatePropagation();
        const btn = f.querySelector("button:not([type=button])");
        if (btn) btn.disabled = true;
        Promise.resolve().then(() => h(f, Object.fromEntries(new FormData(f))))
            .catch(e => { console.error(e); toast(errText(e)); const er = $("#authErr") || $("#admErr"); if (er && /^(loginForm|regForm|admLogin)$/.test(f.id)) er.textContent = errText(e); })
            .finally(() => { if (btn) btn.disabled = false; });
    }, true);

    /* ===================== старт ===================== */
    (async () => {
        try { sessionStorage.removeItem("vs_adm"); } catch { }
        const payFlag = location.hash === "#paid" ? "paid" : location.hash === "#payfail" ? "fail" : "";
        if (payFlag) history.replaceState(null, "", location.pathname + location.search);
        // убираем демо-данные
        SELL.length = 0; REV0.length = 0;
        P = []; ADS = []; USERS = []; ORD = []; chats = {}; bans = {}; revs = []; sold = []; bought = [];
        load(); admMem = false;
        const g = $("#grid"); if (g) g.innerHTML = `<div class="empty">Загрузка каталога…</div>`;
        try {
            const st = await loadSession();
            if (st.banned) toast("Аккаунт заблокирован: " + st.banned);
            await hydratePublic();
            await hydratePrivate();
        } catch (e) {
            console.error(e);
            toast(errText(e));
            if (g) g.innerHTML = `<div class="empty">Не удалось загрузить данные. Проверьте config.js и что в Supabase выполнен schema.sql.</div>`;
            return;
        }
        refresh();
        booted = true;
        if (AUTH_TYPE || AUTH_ERR) history.replaceState(null, "", location.pathname + location.search);
        if (AUTH_ERR) toast("Ссылка из письма недействительна или устарела. Запросите новую.");
        else if (AUTH_TYPE === "signup" && U) toast("Email подтверждён — добро пожаловать!");
        if (recoveryPending && U) openNewPassword();
        if (payFlag === "fail") toast("Оплата не прошла. Заказ можно оплатить позже в профиле.");
        if (payFlag === "paid") {
            toast("Проверяем оплату…");
            for (let i = 0; i < 6 && ORD.some(o => o.status === "pending_payment"); i++) { await sleep(2500); await refreshData(); }
            openAcct();
        }
        addEventListener("hashchange", () => { if (location.hash.startsWith("#admin") && U) refreshData().catch(() => { }); });
    })();
})();
