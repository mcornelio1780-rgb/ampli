/* Ampli core: cuentas (Firebase o Supabase), formularios, links de Polar y textos comunes en 4 idiomas.
   Lo cargan la landing, Ampli Desk, la página legal y la de gracias. No editar: la configuración va en /config.js */
(function () {
  "use strict";
  var CFG = window.AMPLI_CONFIG || {};
  var SCRIPT = document.currentScript;
  var ROOT = (function () {
    try { var r = SCRIPT.src.replace(/assets\/core\.js.*$/, ""); return r || "./"; } catch (e) { return "./"; }
  })();
  var SITE = (CFG.siteUrl ? CFG.siteUrl.replace(/\/$/, "") + "/" : ROOT);
  var FB = CFG.firebase || {};
  var BACKEND = CFG.backend || (FB.apiKey ? "firebase" : (CFG.supabaseUrl ? "supabase" : "none"));
  var configured = BACKEND === "firebase" ? !!(FB.apiKey && FB.projectId && FB.authDomain)
    : BACKEND === "supabase" ? !!(CFG.supabaseUrl && CFG.supabaseAnonKey) : false;
  var enabled = false, sb = null, api = null;
  var loadScript = function (src) {
    return new Promise(function (res, rej) {
      var el = document.createElement("script"); el.src = src; el.crossOrigin = "anonymous";
      el.onload = res; el.onerror = function () { rej(new Error("load " + src)); }; document.head.appendChild(el);
    });
  };

  /* ---------- Adaptador SUPABASE ---------- */
  var supaAdapter = function () {
    var norm = function (u) { return u ? { id: u.id, email: u.email, user_metadata: u.user_metadata || {}, verified: true, provider: (u.app_metadata && u.app_metadata.provider) || "email" } : null; };
    return {
      init: function () {
        var go = function () {
          sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } });
          return sb.auth.getSession().then(function (r) { return norm(r.data && r.data.session ? r.data.session.user : null); });
        };
        return (window.supabase && window.supabase.createClient ? Promise.resolve() : loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js")).then(go);
      },
      onChange: function (cb) { sb.auth.onAuthStateChange(function (ev, session) { cb(ev, norm(session ? session.user : null)); }); },
      signIn: function (e, p) { return sb.auth.signInWithPassword({ email: e, password: p }).then(function (r) { if (r.error) throw r.error; }); },
      signUp: function (e, p, meta, redirect) {
        return sb.auth.signUp({ email: e, password: p, options: { emailRedirectTo: redirect, data: meta } }).then(function (r) {
          if (r.error) throw r.error;
          if (r.data && r.data.user && r.data.user.identities && r.data.user.identities.length === 0) throw { message: "already registered" };
          return { needsConfirm: !(r.data && r.data.session) };
        });
      },
      reset: function (e, redirect) { return sb.auth.resetPasswordForEmail(e, { redirectTo: redirect }).then(function (r) { if (r.error) throw r.error; }); },
      updatePassword: function (p) { return sb.auth.updateUser({ password: p }).then(function (r) { if (r.error) throw r.error; }); },
      google: function (redirect) { return sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect } }).then(function (r) { if (r.error) throw r.error; }); },
      signOut: function () { return sb.auth.signOut(); },
      resendVerification: function () { return Promise.resolve(); },
      reloadUser: function () { return sb.auth.getSession().then(function (r) { return norm(r.data && r.data.session ? r.data.session.user : null); }); },
      insertLead: function (row) { return sb.from("leads").insert(row).then(function (r) { if (r.error) throw r.error; }); },
      getProfile: function (u) { return sb.from("profiles").select("*").eq("id", u.id).maybeSingle().then(function (r) { return r.data || null; }); },
      upsertProfile: function (u, f) { return sb.from("profiles").upsert(Object.assign({ id: u.id }, f)).then(function (r) { if (r.error) throw r.error; }); },
      insertEvent: function (u, ev, meta) { return sb.from("app_events").insert({ user_id: u.id, event: ev, meta: meta || {} }); }
    };
  };

  /* ---------- Adaptador FIREBASE (Auth con SDK + Firestore por REST) ---------- */
  var fbAdapter = function () {
    var auth = null, raw = null;
    var V = "10.14.1", CDN = "https://cdn.jsdelivr.net/npm/firebase@" + V + "/";
    var DB = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(FB.projectId) + "/databases/(default)/documents/";
    var norm = function (u) {
      if (!u) return null;
      var prov = (u.providerData && u.providerData[0] && u.providerData[0].providerId) || "password";
      return { id: u.uid, email: u.email, user_metadata: { full_name: u.displayName || "" }, verified: !!u.emailVerified || prov !== "password", provider: prov === "google.com" ? "google" : "email" };
    };
    var toV = function (v) {
      if (v === null || v === undefined) return { nullValue: null };
      if (typeof v === "boolean") return { booleanValue: v };
      if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
      if (v instanceof Date) return { timestampValue: v.toISOString() };
      if (typeof v === "object") { var f = {}; Object.keys(v).forEach(function (k) { f[k] = toV(v[k]); }); return { mapValue: { fields: f } }; }
      return { stringValue: String(v) };
    };
    var toF = function (o) { var f = {}; Object.keys(o).forEach(function (k) { if (o[k] !== undefined) f[k] = toV(o[k]); }); return { fields: f }; };
    var fromV = function (v) {
      if (!v) return null;
      if ("stringValue" in v) return v.stringValue; if ("booleanValue" in v) return v.booleanValue;
      if ("integerValue" in v) return parseInt(v.integerValue, 10); if ("doubleValue" in v) return v.doubleValue;
      if ("timestampValue" in v) return v.timestampValue; if ("nullValue" in v) return null;
      if ("mapValue" in v) { var o = {}; var fs = v.mapValue.fields || {}; Object.keys(fs).forEach(function (k) { o[k] = fromV(fs[k]); }); return o; }
      return null;
    };
    var req = function (method, path, body, needAuth) {
      var tok = needAuth && raw ? raw.getIdToken() : Promise.resolve(null);
      return tok.then(function (t) {
        var h = { "Content-Type": "application/json" }; if (t) h.Authorization = "Bearer " + t;
        return fetch(DB + path + (path.indexOf("?") > -1 ? "&" : "?") + "key=" + encodeURIComponent(FB.apiKey), { method: method, headers: h, body: body ? JSON.stringify(body) : undefined });
      }).then(function (r) {
        if (r.status === 404 && method === "GET") return null;
        if (!r.ok) return r.text().then(function (x) { var e = new Error("firestore " + r.status + " " + x.slice(0, 200)); e.status = r.status; throw e; });
        return r.status === 204 ? {} : r.json();
      });
    };
    var mapErr = function (e) { var c = (e && e.code) || ""; var m = { "auth/invalid-credential": "invalid login", "auth/wrong-password": "invalid login", "auth/user-not-found": "invalid login", "auth/invalid-login-credentials": "invalid login", "auth/email-already-in-use": "already registered", "auth/weak-password": "password least", "auth/too-many-requests": "too many", "auth/invalid-email": "invalid email", "auth/popup-closed-by-user": "popup closed", "auth/cancelled-popup-request": "popup closed", "auth/popup-blocked": "popup blocked" }[c]; return m ? { message: m, code: c } : e; };
    return {
      init: function () {
        var go = function () {
          var app = window.firebase.apps && window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp({ apiKey: FB.apiKey, authDomain: FB.authDomain, projectId: FB.projectId, appId: FB.appId });
          auth = app.auth();
          try { auth.useDeviceLanguage(); } catch (e) {}
          return new Promise(function (res) { var off = auth.onAuthStateChanged(function (u) { raw = u; off(); res(norm(u)); }); });
        };
        return (window.firebase && window.firebase.auth ? Promise.resolve() : loadScript(CDN + "firebase-app-compat.js").then(function () { return loadScript(CDN + "firebase-auth-compat.js"); })).then(go);
      },
      onChange: function (cb) { auth.onAuthStateChanged(function (u) { raw = u; cb("CHANGE", norm(u)); }); },
      signIn: function (e, p) { return auth.signInWithEmailAndPassword(e, p).then(function () {}, function (x) { throw mapErr(x); }); },
      signUp: function (e, p, meta, redirect) {
        return auth.createUserWithEmailAndPassword(e, p).then(function (cred) {
          raw = cred.user;
          var jobs = [cred.user.updateProfile({ displayName: meta.full_name || "" }).catch(function () {})];
          jobs.push(req("PATCH", "profiles/" + cred.user.uid, toF({ full_name: meta.full_name || "", role: meta.role || "student", lang: meta.lang || "es", marketing_consent: !!meta.marketing, terms_accepted_at: new Date(), created_at: new Date() }), true).catch(function (x) { console.warn("profile", x); }));
          if (CFG.requireEmailVerified !== false) jobs.push(cred.user.sendEmailVerification({ url: redirect }).catch(function (x) { console.warn("verify", x); }));
          return Promise.all(jobs).then(function () { return { needsConfirm: CFG.requireEmailVerified !== false }; });
        }, function (x) { throw mapErr(x); });
      },
      reset: function (e, redirect) { return auth.sendPasswordResetEmail(e, { url: redirect }).then(function () {}, function (x) { var m = mapErr(x); if (m.message === "invalid login") return; throw m; }); },
      updatePassword: function (p) { return raw ? raw.updatePassword(p) : Promise.reject(new Error("no user")); },
      google: function () {
        var prov = new window.firebase.auth.GoogleAuthProvider(); prov.setCustomParameters({ prompt: "select_account" });
        return auth.signInWithPopup(prov).then(function (cred) {
          raw = cred.user;
          if (cred.additionalUserInfo && cred.additionalUserInfo.isNewUser) {
            return req("PATCH", "profiles/" + cred.user.uid, toF({ full_name: cred.user.displayName || "", role: "student", lang: lang, marketing_consent: false, terms_accepted_at: new Date(), created_at: new Date() }), true).catch(function () {});
          }
        }, function (x) { throw mapErr(x); });
      },
      signOut: function () { return auth.signOut(); },
      resendVerification: function (redirect) { return raw ? raw.sendEmailVerification({ url: redirect }) : Promise.resolve(); },
      reloadUser: function () { return raw ? raw.reload().then(function () { raw = auth.currentUser; return raw ? raw.getIdToken(true).then(function () { return norm(raw); }) : null; }) : Promise.resolve(null); },
      insertLead: function (row) { var r = Object.assign({}, row, { created_at: new Date(), status: "nuevo" }); return req("POST", "leads", toF(r), !!raw); },
      getProfile: function (u) { return req("GET", "profiles/" + u.id, null, true).then(function (d) { if (!d || !d.fields) return null; var o = {}; Object.keys(d.fields).forEach(function (k) { o[k] = fromV(d.fields[k]); }); o.id = u.id; return o; }).catch(function () { return null; }); },
      upsertProfile: function (u, f) {
        var mask = Object.keys(f).map(function (k) { return "updateMask.fieldPaths=" + encodeURIComponent(k); }).join("&");
        return req("PATCH", "profiles/" + u.id + "?" + mask, toF(f), true);
      },
      insertEvent: function (u, ev, meta) { return req("POST", "app_events", toF({ user_id: u.id, event: ev, meta: meta || {}, created_at: new Date() }), true); }
    };
  };

  var T = {
    es: { errPopup: "Tu navegador bloqueó la ventana de Google. Permite ventanas emergentes e inténtalo de nuevo.", login: "Entrar", signup: "Crear cuenta", logout: "Salir", account: "Mi cuenta", openDesk: "Abrir Ampli Desk",
      email: "Correo", password: "Contraseña (mínimo 8 caracteres)", name: "Nombre y apellido", role: "Soy…",
      roleStudent: "Talento: quiero aprender el oficio", roleClinic: "Clínica o consultorio en EE.UU.", roleBilling: "Empresa de billing", roleOther: "Otro",
      consent: "Acepto los <a href='{t}' target='_blank'>Términos</a>, la <a href='{p}' target='_blank'>Política de privacidad</a> y la <a href='{a}' target='_blank'>Política de uso de IA</a>.",
      marketing: "Quiero recibir novedades de Ampli (puedo darme de baja cuando quiera).",
      google: "Continuar con Google", or: "o con tu correo", forgot: "¿Olvidaste tu contraseña?", sendReset: "Enviar enlace",
      resetTitle: "Recuperar contraseña", newPassTitle: "Nueva contraseña", savePass: "Guardar contraseña",
      haveAccount: "¿Ya tienes cuenta? Entra", noAccount: "¿No tienes cuenta? Créala gratis",
      checkEmail: "Listo. Te enviamos un correo a {e} para activar tu cuenta. Revisa también spam o promociones.",
      resetSent: "Si el correo existe, te llegará un enlace para crear una nueva contraseña.",
      passSaved: "Contraseña actualizada. Ya puedes usar Ampli Desk.",
      errCreds: "Correo o contraseña incorrectos.", errConfirm: "Tu cuenta aún no está activada. Revisa el correo de activación.",
      errExists: "Ese correo ya tiene cuenta. Entra o recupera tu contraseña.", errWeak: "La contraseña debe tener al menos 8 caracteres.",
      errRate: "Demasiados intentos. Espera unos minutos y vuelve a probar.", errGeneric: "No se pudo completar. Inténtalo de nuevo.",
      errConsent: "Debes aceptar los términos para continuar.", errEmail: "Escribe un correo válido.",
      off: "Las cuentas aún no están activadas en este sitio.", close: "Cerrar", welcome: "Hola, {n}",
      soon: "Muy pronto podrás pagar en línea. Déjanos tus datos y te reservamos el lugar.", sending: "Enviando…",
      terms: "Términos", privacy: "Privacidad", ai: "Uso de IA y regulación" },
    en: { errPopup: "Your browser blocked the Google window. Allow pop-ups and try again.", login: "Log in", signup: "Sign up", logout: "Log out", account: "My account", openDesk: "Open Ampli Desk",
      email: "Email", password: "Password (8+ characters)", name: "Full name", role: "I am…",
      roleStudent: "Talent: I want to learn the craft", roleClinic: "US clinic or practice", roleBilling: "Billing company", roleOther: "Other",
      consent: "I accept the <a href='{t}' target='_blank'>Terms</a>, the <a href='{p}' target='_blank'>Privacy Policy</a> and the <a href='{a}' target='_blank'>AI Use Policy</a>.",
      marketing: "Send me Ampli updates (I can unsubscribe anytime).",
      google: "Continue with Google", or: "or with your email", forgot: "Forgot your password?", sendReset: "Send link",
      resetTitle: "Reset password", newPassTitle: "New password", savePass: "Save password",
      haveAccount: "Already have an account? Log in", noAccount: "No account? Create one for free",
      checkEmail: "Done. We sent an email to {e} to activate your account. Check spam or promotions too.",
      resetSent: "If the email exists, you’ll get a link to set a new password.",
      passSaved: "Password updated. You can now use Ampli Desk.",
      errCreds: "Wrong email or password.", errConfirm: "Your account isn’t activated yet. Check the activation email.",
      errExists: "That email already has an account. Log in or reset your password.", errWeak: "Password must be at least 8 characters.",
      errRate: "Too many attempts. Wait a few minutes and try again.", errGeneric: "Something went wrong. Please try again.",
      errConsent: "You must accept the terms to continue.", errEmail: "Enter a valid email.",
      off: "Accounts aren’t enabled on this site yet.", close: "Close", welcome: "Hi, {n}",
      soon: "Online checkout opens very soon. Leave your details and we’ll hold your spot.", sending: "Sending…",
      terms: "Terms", privacy: "Privacy", ai: "AI use & regulation" },
    pt: { errPopup: "Seu navegador bloqueou a janela do Google. Permita pop-ups e tente de novo.", login: "Entrar", signup: "Criar conta", logout: "Sair", account: "Minha conta", openDesk: "Abrir o Ampli Desk",
      email: "E-mail", password: "Senha (mínimo 8 caracteres)", name: "Nome completo", role: "Sou…",
      roleStudent: "Talento: quero aprender o ofício", roleClinic: "Clínica ou consultório nos EUA", roleBilling: "Empresa de faturamento", roleOther: "Outro",
      consent: "Aceito os <a href='{t}' target='_blank'>Termos</a>, a <a href='{p}' target='_blank'>Política de privacidade</a> e a <a href='{a}' target='_blank'>Política de uso de IA</a>.",
      marketing: "Quero receber novidades da Ampli (posso cancelar quando quiser).",
      google: "Continuar com o Google", or: "ou com seu e-mail", forgot: "Esqueceu a senha?", sendReset: "Enviar link",
      resetTitle: "Recuperar senha", newPassTitle: "Nova senha", savePass: "Salvar senha",
      haveAccount: "Já tem conta? Entre", noAccount: "Não tem conta? Crie grátis",
      checkEmail: "Pronto. Enviamos um e-mail para {e} para ativar sua conta. Veja também spam ou promoções.",
      resetSent: "Se o e-mail existir, você receberá um link para criar uma nova senha.",
      passSaved: "Senha atualizada. Você já pode usar o Ampli Desk.",
      errCreds: "E-mail ou senha incorretos.", errConfirm: "Sua conta ainda não foi ativada. Veja o e-mail de ativação.",
      errExists: "Esse e-mail já tem conta. Entre ou recupere a senha.", errWeak: "A senha deve ter pelo menos 8 caracteres.",
      errRate: "Muitas tentativas. Espere alguns minutos e tente de novo.", errGeneric: "Não foi possível concluir. Tente novamente.",
      errConsent: "Você precisa aceitar os termos para continuar.", errEmail: "Digite um e-mail válido.",
      off: "As contas ainda não estão ativadas neste site.", close: "Fechar", welcome: "Olá, {n}",
      soon: "Em breve você poderá pagar online. Deixe seus dados e reservamos sua vaga.", sending: "Enviando…",
      terms: "Termos", privacy: "Privacidade", ai: "Uso de IA e regulação" },
    fr: { errPopup: "Votre navigateur a bloqué la fenêtre Google. Autorisez les pop-ups et réessayez.", login: "Se connecter", signup: "Créer un compte", logout: "Se déconnecter", account: "Mon compte", openDesk: "Ouvrir Ampli Desk",
      email: "E-mail", password: "Mot de passe (8 caractères min.)", name: "Nom complet", role: "Je suis…",
      roleStudent: "Talent : je veux apprendre le métier", roleClinic: "Clinique ou cabinet aux États-Unis", roleBilling: "Société de facturation", roleOther: "Autre",
      consent: "J’accepte les <a href='{t}' target='_blank'>Conditions</a>, la <a href='{p}' target='_blank'>Politique de confidentialité</a> et la <a href='{a}' target='_blank'>Politique d’usage de l’IA</a>.",
      marketing: "Je veux recevoir les nouvelles d’Ampli (désinscription possible à tout moment).",
      google: "Continuer avec Google", or: "ou avec votre e-mail", forgot: "Mot de passe oublié ?", sendReset: "Envoyer le lien",
      resetTitle: "Réinitialiser le mot de passe", newPassTitle: "Nouveau mot de passe", savePass: "Enregistrer",
      haveAccount: "Déjà un compte ? Connectez-vous", noAccount: "Pas de compte ? Créez-le gratuitement",
      checkEmail: "C’est fait. Nous avons envoyé un e-mail à {e} pour activer votre compte. Vérifiez aussi les spams.",
      resetSent: "Si l’e-mail existe, vous recevrez un lien pour définir un nouveau mot de passe.",
      passSaved: "Mot de passe mis à jour. Vous pouvez utiliser Ampli Desk.",
      errCreds: "E-mail ou mot de passe incorrect.", errConfirm: "Votre compte n’est pas encore activé. Consultez l’e-mail d’activation.",
      errExists: "Cet e-mail a déjà un compte. Connectez-vous ou réinitialisez le mot de passe.", errWeak: "Le mot de passe doit contenir au moins 8 caractères.",
      errRate: "Trop de tentatives. Attendez quelques minutes.", errGeneric: "Une erreur est survenue. Réessayez.",
      errConsent: "Vous devez accepter les conditions pour continuer.", errEmail: "Saisissez un e-mail valide.",
      off: "Les comptes ne sont pas encore activés sur ce site.", close: "Fermer", welcome: "Bonjour, {n}",
      soon: "Le paiement en ligne ouvre très bientôt. Laissez vos coordonnées, nous gardons votre place.", sending: "Envoi…",
      terms: "Conditions", privacy: "Confidentialité", ai: "Usage de l’IA et réglementation" }
  };

  var lang = (function () {
    var q = new URLSearchParams(location.search).get("lang");
    var s = null; try { s = localStorage.getItem("ampli_lang"); } catch (e) {}
    var n = (q || s || navigator.language || "es").slice(0, 2);
    return T[n] ? n : "es";
  })();
  var t = function (k) { return (T[lang] && T[lang][k]) || T.es[k] || k; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var legal = function (h) { return ROOT + "legal/index.html#" + h; };

  /* ---------- cupón por URL (?cupon=LATAM25) ---------- */
  try {
    var c = new URLSearchParams(location.search).get("cupon");
    if (c) sessionStorage.setItem("ampli_cupon", c.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40));
  } catch (e) {}

  /* ---------- estado de sesión ---------- */
  var current = { user: null, profile: null };
  var listeners = [];
  var emit = function () { listeners.forEach(function (f) { try { f(current); } catch (e) { console.error(e); } }); };
  var loadProfile = function () {
    if (!api || !current.user) { current.profile = null; return Promise.resolve(null); }
    return api.getProfile(current.user).then(function (p) { current.profile = p || null; return current.profile; }).catch(function () { current.profile = null; return null; });
  };
  var ready = !configured ? Promise.resolve(current) : (function () {
    api = BACKEND === "firebase" ? fbAdapter() : supaAdapter();
    return api.init().then(function (u) {
      enabled = true; current.user = u;
      api.onChange(function (event, user) {
        var changed = (user ? user.id : null) !== (current.user ? current.user.id : null) || (user && current.user && user.verified !== current.user.verified);
        current.user = user;
        if (event === "PASSWORD_RECOVERY") { setTimeout(function () { openAuth("newpass"); }, 50); }
        if (changed || event === "SIGNED_IN") loadProfile().then(emit);
      });
      return loadProfile().then(function () { return current; });
    }).catch(function (e) { console.error("Ampli backend", e); enabled = false; return current; });
  })();

  /* ---------- modal de cuenta ---------- */
  var css = "\
.ampli-ov{position:fixed;inset:0;background:rgba(15,20,48,.62);z-index:1000;display:none;align-items:center;justify-content:center;padding:16px}\
.ampli-ov.on{display:flex}\
.ampli-md{background:var(--card,#fff);color:var(--fg,#14162B);width:100%;max-width:440px;max-height:calc(100vh - 32px);overflow:auto;border-radius:18px;padding:26px;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);font-family:'Bricolage Grotesque',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}\
.ampli-md h2{font:800 26px/1.1 inherit;font-family:inherit;margin:0 0 6px}\
.ampli-md .x{float:right;border:0;background:transparent;font-size:24px;line-height:1;cursor:pointer;color:inherit;padding:4px 8px;border-radius:8px}\
.ampli-md label{display:block;font-weight:600;font-size:14px;margin:12px 0 5px}\
.ampli-md input[type=email],.ampli-md input[type=password],.ampli-md input[type=text],.ampli-md select{width:100%;font:inherit;font-size:16px;padding:11px 12px;border-radius:8px;border:1.5px solid var(--line,#CCD3EA);background:var(--bg,#F6F7FB);color:inherit}\
.ampli-md .chk{display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.45;margin-top:12px;font-weight:400}\
.ampli-md .chk input{width:18px;height:18px;flex:none;margin-top:1px}\
.ampli-md .chk a{color:var(--link,#1D3FBB)}\
.ampli-md .b{display:flex;width:100%;justify-content:center;align-items:center;gap:10px;font:700 15px inherit;font-family:inherit;border-radius:999px;padding:12px 16px;border:2px solid var(--fg,#14162B);background:transparent;color:inherit;cursor:pointer;margin-top:14px}\
.ampli-md .b.p{background:#1D3FBB;border-color:#1D3FBB;color:#fff}\
.ampli-md .b:disabled{opacity:.5;cursor:wait}\
.ampli-md .sep{text-align:center;font-size:13px;color:var(--muted,#4A4F6A);margin:16px 0 0}\
.ampli-md .lnk{background:none;border:0;color:var(--link,#1D3FBB);font:600 14px inherit;font-family:inherit;cursor:pointer;padding:6px 0;text-decoration:underline}\
.ampli-md .msg{display:none;margin-top:14px;padding:12px;border-radius:10px;font-size:14px;line-height:1.45}\
.ampli-md .msg.ok{display:block;background:#167A52;color:#fff}.ampli-md .msg.err{display:block;background:#D7263D;color:#fff}\
.ampli-md .foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-top:10px}\
.ampli-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#14162B;color:#fff;padding:11px 18px;border-radius:999px;font:600 14px 'Bricolage Grotesque',system-ui,sans-serif;opacity:0;transition:opacity .2s;pointer-events:none;z-index:1100;max-width:92vw;text-align:center}\
.ampli-toast.on{opacity:1}";
  var mounted = false, mode = "login", overlay, box;
  var mount = function () {
    if (mounted) return; mounted = true;
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    overlay = document.createElement("div"); overlay.className = "ampli-ov"; overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-modal", "true");
    box = document.createElement("div"); box.className = "ampli-md"; overlay.appendChild(box);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) closeAuth(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay.classList.contains("on")) closeAuth(); });
    document.body.appendChild(overlay);
    var to = document.createElement("div"); to.className = "ampli-toast"; to.id = "ampliToast"; to.setAttribute("role", "status"); to.setAttribute("aria-live", "polite"); document.body.appendChild(to);
  };
  var toast = function (m, ms) { mount(); var e = document.getElementById("ampliToast"); e.textContent = m; e.classList.add("on"); clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove("on"); }, ms || 2200); };
  var googleBtn = function () {
    return CFG.googleLogin === false ? "" : "<button type='button' class='b' data-a='google'><svg width='18' height='18' viewBox='0 0 48 48' aria-hidden='true'><path fill='#FFC107' d='M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z'/><path fill='#FF3D00' d='M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z'/><path fill='#4CAF50' d='M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z'/><path fill='#1976D2' d='M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z'/></svg>" + esc(t("google")) + "</button><p class='sep'>" + esc(t("or")) + "</p>";
  };
  var render = function () {
    var consent = t("consent").replace("{t}", legal("terms")).replace("{p}", legal("privacy")).replace("{a}", legal("ai"));
    var head = "<button type='button' class='x' data-a='close' aria-label='" + esc(t("close")) + "'>×</button>";
    var h = "";
    if (!enabled) {
      h = head + "<h2>" + esc(t("login")) + "</h2><p>" + esc(t("off")) + "</p><a class='b' href='mailto:" + esc(CFG.contactEmail || "") + "'>" + esc(CFG.contactEmail || "") + "</a>";
    } else if (mode === "signup") {
      h = head + "<h2>" + esc(t("signup")) + "</h2>" + googleBtn() +
        "<form data-f='signup' novalidate><label for='af-n'>" + esc(t("name")) + "</label><input id='af-n' type='text' autocomplete='name' required>" +
        "<label for='af-e'>" + esc(t("email")) + "</label><input id='af-e' type='email' autocomplete='email' required>" +
        "<label for='af-p'>" + esc(t("password")) + "</label><input id='af-p' type='password' autocomplete='new-password' minlength='8' required>" +
        "<label for='af-r'>" + esc(t("role")) + "</label><select id='af-r'><option value='student'>" + esc(t("roleStudent")) + "</option><option value='clinic'>" + esc(t("roleClinic")) + "</option><option value='billing'>" + esc(t("roleBilling")) + "</option><option value='other'>" + esc(t("roleOther")) + "</option></select>" +
        "<label class='chk'><input type='checkbox' id='af-c' required><span>" + consent + "</span></label>" +
        "<label class='chk'><input type='checkbox' id='af-m'><span>" + esc(t("marketing")) + "</span></label>" +
        "<button class='b p' type='submit'>" + esc(t("signup")) + "</button></form><div class='msg' role='alert'></div>" +
        "<div class='foot'><button type='button' class='lnk' data-a='login'>" + esc(t("haveAccount")) + "</button></div>";
    } else if (mode === "reset") {
      h = head + "<h2>" + esc(t("resetTitle")) + "</h2><form data-f='reset' novalidate><label for='af-e'>" + esc(t("email")) + "</label><input id='af-e' type='email' autocomplete='email' required>" +
        "<button class='b p' type='submit'>" + esc(t("sendReset")) + "</button></form><div class='msg' role='alert'></div><div class='foot'><button type='button' class='lnk' data-a='login'>" + esc(t("login")) + "</button></div>";
    } else if (mode === "newpass") {
      h = head + "<h2>" + esc(t("newPassTitle")) + "</h2><form data-f='newpass' novalidate><label for='af-p'>" + esc(t("password")) + "</label><input id='af-p' type='password' autocomplete='new-password' minlength='8' required>" +
        "<button class='b p' type='submit'>" + esc(t("savePass")) + "</button></form><div class='msg' role='alert'></div>";
    } else {
      h = head + "<h2>" + esc(t("login")) + "</h2>" + googleBtn() +
        "<form data-f='login' novalidate><label for='af-e'>" + esc(t("email")) + "</label><input id='af-e' type='email' autocomplete='email' required>" +
        "<label for='af-p'>" + esc(t("password").replace(/ \(.*\)/, "")) + "</label><input id='af-p' type='password' autocomplete='current-password' required>" +
        "<button class='b p' type='submit'>" + esc(t("login")) + "</button></form><div class='msg' role='alert'></div>" +
        "<div class='foot'><button type='button' class='lnk' data-a='reset'>" + esc(t("forgot")) + "</button><button type='button' class='lnk' data-a='signup'>" + esc(t("noAccount")) + "</button></div>";
    }
    box.innerHTML = h;
    box.querySelectorAll("[data-a]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-a");
        if (a === "close") closeAuth(); else if (a === "google") google(); else { mode = a; render(); focusFirst(); }
      });
    });
    var f = box.querySelector("form"); if (f) f.addEventListener("submit", submit);
  };
  var focusFirst = function () { var i = box.querySelector("input,button.b"); if (i) i.focus(); };
  var msg = function (txt, ok) { var m = box.querySelector(".msg"); if (!m) return; m.className = "msg " + (ok ? "ok" : "err"); m.textContent = txt; };
  var errText = function (e) {
    var s = ((e && (e.message || e.error_description)) || "").toLowerCase();
    if (s.indexOf("invalid login") > -1 || s.indexOf("invalid credentials") > -1) return t("errCreds");
    if (s.indexOf("not confirmed") > -1) return t("errConfirm");
    if (s.indexOf("already registered") > -1 || s.indexOf("already been registered") > -1 || s.indexOf("user already") > -1) return t("errExists");
    if (s.indexOf("password") > -1 && (s.indexOf("least") > -1 || s.indexOf("weak") > -1 || s.indexOf("short") > -1)) return t("errWeak");
    if (s.indexOf("rate") > -1 || s.indexOf("too many") > -1 || (e && e.status === 429)) return t("errRate");
    if (s.indexOf("invalid email") > -1) return t("errEmail");
    if (s.indexOf("popup blocked") > -1) return t("errPopup");
    return t("errGeneric");
  };
  var validEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
  var appUrl = function (extra) { return SITE + "app/" + (extra || ""); };
  var afterLogin = function () {
    if (location.pathname.indexOf("/app") > -1) { closeAuth(); }
    else { location.href = appUrl(); }
  };
  var submit = function (ev) {
    ev.preventDefault();
    var f = ev.target, kind = f.getAttribute("data-f"), btn = f.querySelector("button[type=submit]");
    var g = function (id) { var el = box.querySelector("#" + id); return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : ""; };
    var email = g("af-e"), pass = g("af-p");
    if (kind !== "newpass" && !validEmail(email)) { msg(t("errEmail")); return; }
    if ((kind === "signup" || kind === "newpass") && pass.length < 8) { msg(t("errWeak")); return; }
    if (kind === "signup" && !g("af-c")) { msg(t("errConsent")); return; }
    btn.disabled = true; var lbl = btn.textContent; btn.textContent = t("sending");
    var done = function () { btn.disabled = false; btn.textContent = lbl; };
    var p;
    if (kind === "login") {
      p = api.signIn(email, pass).then(afterLogin);
    } else if (kind === "signup") {
      p = api.signUp(email, pass, { full_name: g("af-n"), role: g("af-r"), lang: lang, marketing: g("af-m"), terms_accepted_at: new Date().toISOString() }, appUrl())
        .then(function (r) {
          if (!r.needsConfirm) { afterLogin(); } else { f.style.display = "none"; msg(t("checkEmail").replace("{e}", email), true); if (BACKEND === "firebase") setTimeout(afterLogin, 2500); }
        });
    } else if (kind === "reset") {
      p = api.reset(email, appUrl("?reset=1")).then(function () { f.style.display = "none"; msg(t("resetSent"), true); });
    } else if (kind === "newpass") {
      p = api.updatePassword(pass).then(function () { f.style.display = "none"; msg(t("passSaved"), true); setTimeout(closeAuth, 1600); });
    }
    p.catch(function (e) { console.warn(e); msg(errText(e)); }).then(done);
  };
  var google = function () {
    api.google(appUrl()).then(function () { if (BACKEND === "firebase") { loadProfile().then(function () { emit(); afterLogin(); }); } }, function (e) { if (e && e.message === "popup closed") return; msg(errText(e)); });
  };
  var openAuth = function (m) { mount(); mode = m || "login"; render(); overlay.classList.add("on"); document.body.style.overflow = "hidden"; setTimeout(focusFirst, 30); };
  var closeAuth = function () { if (!overlay) return; overlay.classList.remove("on"); document.body.style.overflow = ""; };

  /* ---------- formularios (leads) ---------- */
  var saveLead = function (data) {
    data = Object.assign({}, data, { lang: lang, page: location.pathname.slice(0, 120), user_agent: (navigator.userAgent || "").slice(0, 250) });
    if (!enabled) {
      if (!CFG.contactEmail || CFG.formFallback === "mailto") return Promise.resolve({ ok: false, via: "none" });
      var fd = { _subject: "Ampli · " + (data.kind || "form") + " · " + (data.email || ""), _template: "table", _captcha: "false" };
      Object.keys(data).forEach(function (k) { if (k !== "user_agent") fd[k] = data[k]; });
      return fetch("https://formsubmit.co/ajax/" + encodeURIComponent(CFG.contactEmail), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(fd) })
        .then(function (r) { return r.ok ? { ok: true, via: "formsubmit" } : { ok: false, via: "none" }; })
        .catch(function () { return { ok: false, via: "none" }; });
    }
    var row = {};
    ["kind", "name", "email", "country", "english", "job", "practice", "state", "denials", "message", "lang", "page", "consent", "user_agent"].forEach(function (k) { if (data[k] !== undefined && data[k] !== "") row[k] = data[k]; });
    if (row.denials !== undefined) row.denials = parseInt(row.denials, 10) || null;
    if (current.user) row.user_id = current.user.id;
    return api.insertLead(row).then(function () { return { ok: true, via: BACKEND }; })
      .catch(function (e) { console.warn("lead", e); return { ok: false, via: "error", error: e }; });
  };
  var mailtoLead = function (subject, data) {
    var body = Object.keys(data).map(function (k) { return k + ": " + data[k]; }).join("\n");
    return "mailto:" + (CFG.contactEmail || "") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  };

  /* ---------- Polar ---------- */
  var polarUrl = function (key) {
    var base = CFG.polar && CFG.polar[key];
    if (!base) return null;
    try {
      var u = new URL(base);
      if (current.user && current.user.email) u.searchParams.set("customer_email", current.user.email);
      var nm = (current.profile && current.profile.full_name) || (current.user && current.user.user_metadata && (current.user.user_metadata.full_name || current.user.user_metadata.name));
      if (nm) u.searchParams.set("customer_name", nm);
      var cp = null; try { cp = sessionStorage.getItem("ampli_cupon"); } catch (e) {}
      if (cp) u.searchParams.set("discount_code", cp);
      return u.toString();
    } catch (e) { return base; }
  };
  var buy = function (key) {
    track("checkout_click", { product: key });
    var u = polarUrl(key);
    if (u) { location.href = u; return; }
    toast(t("soon"), 5000);
    var target = key === "pilot" ? "clinicas" : "postula";
    var el = document.getElementById(target);
    if (el) { setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300); }
    else { setTimeout(function () { location.href = SITE + "#" + target; }, 1800); }
  };

  /* ---------- perfil y eventos (sin datos de pacientes) ---------- */
  var saveProfile = function (fields) {
    if (!enabled || !current.user) return Promise.resolve(false);
    return api.upsertProfile(current.user, fields).then(function () { current.profile = Object.assign({}, current.profile || {}, fields); return true; })
      .catch(function (e) { console.warn("profile", e); return false; });
  };
  var track = function (event, meta) {
    if (!enabled || !current.user) return;
    try { api.insertEvent(current.user, String(event).slice(0, 60), meta || {}).then(function () {}, function () {}); } catch (e) {}
  };
  var signOut = function () { if (!enabled) return Promise.resolve(); return api.signOut().then(function () { current.user = null; current.profile = null; emit(); }); };
  var resendVerification = function () { return enabled ? api.resendVerification(appUrl()) : Promise.resolve(); };
  var reloadUser = function () { if (!enabled) return Promise.resolve(null); return api.reloadUser().then(function (u) { current.user = u; return loadProfile().then(function () { emit(); return u; }); }); };

  window.Ampli = {
    cfg: CFG, root: ROOT, backend: BACKEND, ready: ready,
    get enabled() { return enabled; },
    resendVerification: resendVerification, reloadUser: reloadUser,
    user: function () { return current.user; }, profile: function () { return current.profile; },
    onAuth: function (f) { listeners.push(f); }, openAuth: openAuth, closeAuth: closeAuth, signOut: signOut,
    saveLead: saveLead, mailtoLead: mailtoLead, polarUrl: polarUrl, buy: buy, saveProfile: saveProfile, track: track,
    toast: toast, legal: legal, esc: esc,
    t: t, lang: function () { return lang; },
    setLang: function (l) { if (T[l]) { lang = l; try { localStorage.setItem("ampli_lang", l); } catch (e) {} if (overlay && overlay.classList.contains("on")) render(); } }
  };
})();
