"use strict";(()=>{function x(){var l,b,u,v;let t=window.WFC;if(!/\.webflow\.io$/.test(location.hostname)||!t||(b=(l=window.Webflow)==null?void 0:l.env)!=null&&b.call(l,"editor")||(v=(u=window.Webflow)==null?void 0:u.env)!=null&&v.call(u,"design")||document.getElementById("wfc-environment"))return;let o=t.source?t.source===t.devBase:!!t.dev,r=!!t.source&&t.source!==t.devBase&&t.source!==t.stag,p=!!t.dev&&!o||r,f=o?"Dev":"Staging",d=document.createElement("div");d.id="wfc-environment";let n=d.attachShadow({mode:"open"});n.innerHTML=`
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
  `;let m=n.querySelector(".control"),i=n.querySelector(".launcher"),g=n.querySelector(".choices"),h=n.querySelector(".status"),w=n.querySelectorAll("[data-mode]");n.querySelector(".label").textContent=f,n.querySelector(".dot").toggleAttribute("data-dev",o),i.setAttribute("aria-label",`Choose environment (${f})`),r&&(h.textContent="Staging unavailable \xB7 using release"),i.title=r?"Staging could not load. Using the pinned release.":p?"Local dev could not load. Using staging.":"Switch between staging and local dev";function c(e,a=!1){var s;i.hidden=e,g.hidden=!e,h.hidden=!e||!p,m.toggleAttribute("data-expanded",e),i.setAttribute("aria-expanded",String(e)),a&&(e?(s=n.querySelector('[aria-pressed="true"]'))==null||s.focus():i.focus())}w.forEach(e=>{let a=e.dataset.mode==="dev";e.setAttribute("aria-pressed",String(a===o)),e.addEventListener("click",()=>{if(a===!!t.dev&&!p)return;let s=new URL(location.href);s.searchParams.set("wfc-dev",a?"1":"0");try{localStorage.setItem("wfc-dev",a?"1":"0")}catch{}location.assign(s.href)})}),i.addEventListener("click",()=>c(!0,!0)),n.querySelector(".minimize").addEventListener("click",()=>c(!1,!0)),m.addEventListener("keydown",e=>{e.key!=="Escape"||g.hidden||(e.preventDefault(),e.stopPropagation(),c(!1,!0))}),document.addEventListener("pointerdown",e=>{e.composedPath().includes(d)||c(!1)}),document.body.appendChild(d)}function S(t,o){try{o()}catch(r){console.error(`[wfc] ${t} failed to initialize`,r)}}function y(){document.documentElement.classList.remove("is-loading"),S("environment-switcher",x)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",y,{once:!0}):y();})();
