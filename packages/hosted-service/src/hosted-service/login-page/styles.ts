export const loginPageStyles = `
:root { color-scheme: dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; overflow-x: hidden; background: #08131f; color: #f8fafc; }
body::before, body::after { content: ""; position: fixed; inset: 0; pointer-events: none; }
body::before {
  background: var(--auth-background-image, url("https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1800&q=82")) center / cover no-repeat;
  transform: scale(1.02);
}
body::after {
  background:
    linear-gradient(90deg, rgb(7 18 32 / 92%) 0%, rgb(9 31 45 / 78%) 48%, rgb(14 111 100 / 72%) 100%),
    linear-gradient(180deg, rgb(5 12 22 / 16%) 0%, rgb(5 12 22 / 56%) 100%);
}
a { min-height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 6px; text-decoration: none; font-weight: 700; }
.auth-status {
  position: fixed; z-index: 2; top: 24px; right: 24px; min-height: 36px; display: inline-flex; align-items: center;
  padding: 0 14px; border: 1px solid rgb(148 163 184 / 24%); border-radius: 8px; background: rgb(15 23 42 / 74%);
  box-shadow: 0 14px 32px rgb(0 0 0 / 22%); color: #e2e8f0; font-size: 13px;
}
.auth-shell {
  position: relative; z-index: 1; min-height: 100vh; width: min(1280px, calc(100vw - 48px)); margin: 0 auto;
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(360px, 440px); align-items: center; gap: 72px; padding: 72px 0;
}
.hero-copy { max-width: 760px; }
.brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; }
.mark {
  width: 56px; height: 56px; display: grid; place-items: center; border-radius: 8px;
  background: linear-gradient(135deg, #4f8cff 0%, #22d4b8 100%); color: #fff; box-shadow: 0 16px 32px rgb(34 211 238 / 18%);
}
.mark svg { width: 30px; height: 30px; display: block; }
.brand-title {
  display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px; border-radius: 6px;
  background: rgb(15 23 42 / 48%); color: #bfdbfe; font-size: 14px; font-weight: 700;
}
.hero-kicker { margin-bottom: 16px; color: #67e8f9; font-size: 14px; font-weight: 800; }
h1 { max-width: 720px; margin: 0 0 18px; color: #fff; font-size: 40px; line-height: 1.18; font-weight: 800; }
.hero-copy p { max-width: 680px; margin: 0; color: #e2e8f0; font-size: 16px; line-height: 1.8; font-weight: 600; }
.login-panel {
  width: 100%; border: 1px solid rgb(148 163 184 / 18%); border-radius: 8px; background: rgb(15 23 42 / 92%);
  box-shadow: 0 26px 70px rgb(0 0 0 / 38%); padding: 34px;
}
.login-kicker { margin-bottom: 8px; color: #93c5fd; font-size: 13px; font-weight: 800; }
h2 { margin: 0 0 14px; color: #f8fafc; font-size: 26px; line-height: 1.25; font-weight: 800; }
.login-panel p { margin: 0 0 24px; color: #aebccc; font-size: 14px; line-height: 1.7; font-weight: 600; }
.provider-list { display: grid; gap: 14px; }
.primary-provider {
  min-height: 52px; gap: 10px; padding: 0 18px; background: #4f7fe5; color: #fff; box-shadow: 0 10px 22px rgb(79 127 229 / 28%);
  transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
}
.primary-provider:hover { background: #5d8cf1; box-shadow: 0 16px 30px rgb(79 127 229 / 36%); transform: translateY(-1px); }
.primary-provider-icon { width: 22px; height: 22px; display: grid; place-items: center; flex: 0 0 auto; color: #fff; background: transparent; border: 0; }
.primary-provider-icon svg { width: 21px; height: 21px; display: block; }
.primary-provider .provider-name { margin: 0; font-size: inherit; }
.provider-divider { display: flex; align-items: center; gap: 12px; color: #7d8da3; font-size: 12px; font-weight: 700; }
.provider-divider::before, .provider-divider::after { content: ""; height: 1px; flex: 1; background: rgb(148 163 184 / 16%); }
.secondary-provider-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.provider-option {
  min-height: 72px; flex-direction: column; gap: 8px; padding: 12px 10px; border: 1px solid rgb(148 163 184 / 18%);
  color: #e5edf8; background: rgb(30 41 59 / 62%); text-align: center; transition: transform .16s ease, border-color .16s ease, background .16s ease;
}
.provider-option:hover { border-color: rgb(147 197 253 / 52%); background: rgb(30 64 94 / 76%); transform: translateY(-1px); }
.provider-icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 6px; flex: 0 0 auto; }
.provider-icon svg { width: 22px; height: 22px; display: block; }
.provider-icon-feishu { background: transparent; }
.provider-icon-google { background: #fff; border: 1px solid rgb(226 232 240 / 86%); }
.provider-icon-github { background: #0b1120; color: #fff; }
.provider-name { max-width: 100%; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.provider-empty { border: 1px solid rgb(251 191 36 / 24%); color: #fde68a; background: rgb(120 53 15 / 28%); border-radius: 6px; padding: 12px 14px; line-height: 1.6; font-size: 14px; }
.dev-link { min-height: 42px; margin-top: 12px; border: 1px solid rgb(148 163 184 / 16%); background: rgb(15 23 42 / 48%); color: #cbd5e1; font-size: 13px; }
.dev-link:hover { border-color: rgb(148 163 184 / 34%); background: rgb(30 41 59 / 72%); }
.error { border: 1px solid rgb(248 113 113 / 36%); color: #fecaca; background: rgb(127 29 29 / 34%); border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; }
.footer-row { margin-top: 18px; color: #64748b; font-size: 12px; }
@media (max-width: 780px) {
  .auth-status { top: 16px; right: 16px; }
  .auth-shell { width: min(100% - 32px, 520px); min-height: auto; grid-template-columns: 1fr; gap: 30px; padding: 92px 0 34px; }
  .hero-copy { max-width: none; }
  .brand-row { margin-bottom: 22px; }
  .mark { width: 48px; height: 48px; }
  .mark svg { width: 26px; height: 26px; }
  h1 { font-size: 30px; }
  .hero-copy p { font-size: 15px; }
  .login-panel { padding: 26px; }
  h2 { font-size: 23px; }
}
@media (max-width: 420px) {
  .auth-shell { width: min(100% - 24px, 420px); padding-top: 82px; }
  .auth-status { min-height: 32px; padding: 0 11px; font-size: 12px; }
  .brand-title { max-width: 230px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  h1 { font-size: 27px; }
  .login-panel { padding: 22px; }
  .secondary-provider-list { grid-template-columns: 1fr; }
}
`;
