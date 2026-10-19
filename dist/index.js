"use strict";(()=>{function w(){document.querySelectorAll("[data-aria-role]").forEach(e=>{var t;let i=(t=e.dataset.ariaRole)==null?void 0:t.trim();i&&e.setAttribute("role",i)})}function S(){var d,x,b,y;let e=window.WFC;if(!/\.webflow\.io$/.test(location.hostname)||!e||(x=(d=window.Webflow)==null?void 0:d.env)!=null&&x.call(d,"editor")||(y=(b=window.Webflow)==null?void 0:b.env)!=null&&y.call(b,"design")||document.getElementById("wfc-environment"))return;let i=e.source?e.source===e.devBase:!!e.dev,t=!!e.source&&e.source!==e.devBase&&e.source!==e.stag,r=!!e.dev&&!i||t,a=i?"Dev":"Staging",u=document.createElement("div");u.id="wfc-environment";let n=u.attachShadow({mode:"open"});n.innerHTML=`
    <style>
      :host {
        all: initial;
        position: fixed !important;
        left: max(10px, env(safe-area-inset-left)) !important;
        bottom: max(10px, env(safe-area-inset-bottom)) !important;
        z-index: 2147483000 !important;
        display: block !important;
        pointer-events: none !important;
        color-scheme: dark;
      }
      *, *::before, *::after { box-sizing: border-box; }
      [hidden] { display: none !important; }
      .control {
        width: max-content;
        padding: 3px;
        border: 1px solid #ffffff26;
        border-radius: 11px;
        background: #1b1b1bf2;
        box-shadow: 0 2px 10px #0002;
        opacity: .65;
        pointer-events: auto;
        transition: opacity 150ms ease;
      }
      .control:hover, .control:focus-within, .control[data-expanded] { opacity: 1; }
      button {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        margin: 0;
        border: 0;
        border-radius: 7px;
        padding: 0 10px;
        height: 28px;
        background: transparent;
        color: #c5c5c5;
        font: 500 11px/1 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        letter-spacing: 0;
        cursor: pointer;
        touch-action: manipulation;
      }
      button:hover { background: #ffffff12; color: #fff; }
      button:focus-visible { outline: 2px solid #d9ff54; outline-offset: 1px; }
      button[aria-pressed='true'] { background: #ffffff20; color: #fff; }
      .choices { display: flex; gap: 3px; }
      .segment { min-width: 44px; height: 32px; }
      .minimize { width: 28px; height: 32px; padding: 0; }
      .dot { width: 5px; height: 5px; border-radius: 50%; background: #b5b5b5; }
      .dot[data-dev] { background: #d9ff54; }
      svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 1.5; }
      .status {
        margin: 5px 0 0;
        padding: 7px 9px;
        border-radius: 7px;
        background: #1b1b1bf2;
        color: #ddd;
        font: 11px/1.4 system-ui, sans-serif;
        pointer-events: auto;
      }
      @media (prefers-reduced-motion: reduce) { .control { transition: none; } }
      @media print { :host { display: none !important; } }
    </style>
    <div class="control">
      <button class="launcher" type="button" aria-expanded="false" aria-controls="choices">
        <span class="dot" aria-hidden="true"></span>
        <span class="label"></span>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m4 2 4 4-4 4"/></svg>
      </button>
      <div class="choices" id="choices" role="group" aria-label="Code environment" hidden>
        <button class="segment" type="button" data-mode="staging" title="Use the deployed staging code">Staging</button>
        <button class="segment" type="button" data-mode="dev" title="Use your local code \u2014 run pnpm dev first">Dev</button>
        <button class="minimize" type="button" aria-label="Minimize environment switcher" title="Minimize">
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8"/></svg>
        </button>
      </div>
    </div>
    <p class="status" role="status" hidden>Dev unavailable \xB7 using staging</p>
  `;let h=n.querySelector(".control"),s=n.querySelector(".launcher"),c=n.querySelector(".choices"),f=n.querySelector(".status"),g=n.querySelectorAll("[data-mode]");n.querySelector(".label").textContent=a,n.querySelector(".dot").toggleAttribute("data-dev",i),s.setAttribute("aria-label",`Choose environment (${a})`),t&&(f.textContent="Staging unavailable \xB7 using release"),s.title=t?"Staging could not load. Using the pinned release.":r?"Local dev could not load. Using staging.":"Switch between staging and local dev";function l(o,p=!1){var m;s.hidden=o,c.hidden=!o,f.hidden=!o||!r,h.toggleAttribute("data-expanded",o),s.setAttribute("aria-expanded",String(o)),p&&(o?(m=n.querySelector('[aria-pressed="true"]'))==null||m.focus():s.focus())}g.forEach(o=>{let p=o.dataset.mode==="dev";o.setAttribute("aria-pressed",String(p===i)),o.addEventListener("click",()=>{if(p===!!e.dev&&!r)return;let m=new URL(location.href);m.searchParams.set("wfc-dev",p?"1":"0");try{localStorage.setItem("wfc-dev",p?"1":"0")}catch{}location.assign(m.href)})}),s.addEventListener("click",()=>l(!0,!0)),n.querySelector(".minimize").addEventListener("click",()=>l(!1,!0)),h.addEventListener("keydown",o=>{o.key!=="Escape"||c.hidden||(o.preventDefault(),o.stopPropagation(),l(!1,!0))}),document.addEventListener("pointerdown",o=>{o.composedPath().includes(u)||l(!1)}),document.body.appendChild(u)}function E(){document.querySelectorAll("input[data-placeholder], textarea[data-placeholder]").forEach(e=>{var t;let i=(t=e.dataset.placeholder)==null?void 0:t.trim();i&&(e.placeholder=i)})}var q="input[id], select[id], textarea[id]";function M(e){return e.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g,"").trim().replace(/[\s_]+/g,"-").slice(0,40)}function L(){let e=new Map;if(document.querySelectorAll(q).forEach(t=>{var a;let r=(a=e.get(t.id))!=null?a:[];r.push(t),e.set(t.id,r)}),![...e.values()].some(t=>t.length>1))return;let i=new Set(Array.from(document.querySelectorAll("[id]"),t=>t.id));e.forEach((t,r)=>{t.length<2||t.forEach((a,u)=>{var f,g,l;let n=(f=a.closest("label, .w-radio, .w-checkbox"))!=null?f:a.parentElement,h=(l=(g=n==null?void 0:n.querySelector(".w-form-label"))==null?void 0:g.textContent)!=null?l:"",s=`${r}-${M(h)||u+1}`,c=s;for(let d=2;i.has(c);d++)c=`${s}-${d}`;i.add(c),n==null||n.querySelectorAll(`[for="${CSS.escape(r)}"]`).forEach(d=>d.setAttribute("for",c)),a.id=c})})}function v(e,i){try{i()}catch(t){console.error(`[wfc] ${e} failed to initialize`,t)}}function k(){document.documentElement.classList.remove("is-loading"),v("environment-switcher",S),v("aria-roles",w),v("placeholders",E),v("unique-form-ids",L)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",k,{once:!0}):k();})();
