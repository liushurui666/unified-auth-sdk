export const loginPageStyles = `
:root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f6fa; color: #111827; }
main { width: min(440px, calc(100vw - 32px)); background: #fff; border: 1px solid #e3e7ef; border-radius: 8px; padding: 28px; box-shadow: 0 18px 50px rgb(15 23 42 / 10%); }
.brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 8px; background: #1677ff; color: #fff; font-weight: 700; font-size: 13px; }
.brand-title { font-size: 14px; color: #4b5563; }
h1 { font-size: 24px; line-height: 1.25; margin: 0 0 8px; }
p { margin: 0 0 22px; color: #4b5563; line-height: 1.7; }
a { min-height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 6px; text-decoration: none; font-weight: 600; }
.provider-list { display: grid; grid-template-columns: repeat(3, minmax(86px, 1fr)); gap: 12px; }
.provider-option { min-height: 116px; flex-direction: column; gap: 10px; padding: 14px 8px 12px; border: 1px solid #e5e7eb; color: #111827; background: #fff; text-align: center; }
.provider-option:hover { border-color: #8fb2ff; background: #f8fbff; transform: translateY(-1px); box-shadow: 0 10px 24px rgb(15 23 42 / 8%); }
.provider-icon { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 8px; flex: 0 0 auto; }
.provider-icon svg { width: 34px; height: 34px; display: block; }
.provider-icon-feishu { background: #eef6ff; }
.provider-icon-google { background: #fff; border: 1px solid #edf0f5; }
.provider-icon-github { background: #24292f; color: #fff; }
.provider-copy { display: flex; flex-direction: column; gap: 4px; line-height: 1.15; min-width: 0; }
.provider-name { font-size: 14px; white-space: nowrap; }
.dev-link { height: 42px; margin-top: 12px; background: #f3f4f6; color: #111827; }
.disabled { opacity: .45; pointer-events: none; }
.error { border: 1px solid #fecaca; color: #991b1b; background: #fef2f2; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; }
.footer-row { margin-top: 18px; color: #6b7280; font-size: 12px; }
@media (max-width: 420px) {
  main { padding: 22px; }
  h1 { font-size: 22px; }
  .provider-list { gap: 8px; }
  .provider-option { min-height: 106px; }
  .provider-icon { width: 46px; height: 46px; }
  .provider-icon svg { width: 30px; height: 30px; }
}
`;

