/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$2=globalThis,e$2=t$2.ShadowRoot&&(undefined===t$2.ShadyCSS||t$2.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$2=Symbol(),o$4=new WeakMap;let n$3 = class n{constructor(t,e,o){if(this._$cssResult$=true,o!==s$2)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$2&&undefined===t){const e=undefined!==s&&1===s.length;e&&(t=o$4.get(s)),undefined===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&o$4.set(s,t));}return t}toString(){return this.cssText}};const r$4=t=>new n$3("string"==typeof t?t:t+"",undefined,s$2),i$3=(t,...e)=>{const o=1===t.length?t[0]:e.reduce((e,s,o)=>e+(t=>{if(true===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[o+1],t[0]);return new n$3(o,t,s$2)},S$1=(s,o)=>{if(e$2)s.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const e of o){const o=document.createElement("style"),n=t$2.litNonce;undefined!==n&&o.setAttribute("nonce",n),o.textContent=e.cssText,s.appendChild(o);}},c$2=e$2?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$4(e)})(t):t;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:i$2,defineProperty:e$1,getOwnPropertyDescriptor:h$1,getOwnPropertyNames:r$3,getOwnPropertySymbols:o$3,getPrototypeOf:n$2}=Object,a$1=globalThis,c$1=a$1.trustedTypes,l$1=c$1?c$1.emptyScript:"",p$1=a$1.reactiveElementPolyfillSupport,d$1=(t,s)=>t,u$1={toAttribute(t,s){switch(s){case Boolean:t=t?l$1:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t);}return t},fromAttribute(t,s){let i=t;switch(s){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t);}catch(t){i=null;}}return i}},f$1=(t,s)=>!i$2(t,s),b$1={attribute:true,type:String,converter:u$1,reflect:false,useDefault:false,hasChanged:f$1};Symbol.metadata??=Symbol("metadata"),a$1.litPropertyMetadata??=new WeakMap;let y$1 = class y extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t);}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=b$1){if(s.state&&(s.attribute=false),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=true),this.elementProperties.set(t,s),!s.noAccessor){const i=Symbol(),h=this.getPropertyDescriptor(t,i,s);undefined!==h&&e$1(this.prototype,t,h);}}static getPropertyDescriptor(t,s,i){const{get:e,set:r}=h$1(this.prototype,t)??{get(){return this[s]},set(t){this[s]=t;}};return {get:e,set(s){const h=e?.call(this);r?.call(this,s),this.requestUpdate(t,h,i);},configurable:true,enumerable:true}}static getPropertyOptions(t){return this.elementProperties.get(t)??b$1}static _$Ei(){if(this.hasOwnProperty(d$1("elementProperties")))return;const t=n$2(this);t.finalize(),undefined!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties);}static finalize(){if(this.hasOwnProperty(d$1("finalized")))return;if(this.finalized=true,this._$Ei(),this.hasOwnProperty(d$1("properties"))){const t=this.properties,s=[...r$3(t),...o$3(t)];for(const i of s)this.createProperty(i,t[i]);}const t=this[Symbol.metadata];if(null!==t){const s=litPropertyMetadata.get(t);if(undefined!==s)for(const[t,i]of s)this.elementProperties.set(t,i);}this._$Eh=new Map;for(const[t,s]of this.elementProperties){const i=this._$Eu(t,s);undefined!==i&&this._$Eh.set(i,t);}this.elementStyles=this.finalizeStyles(this.styles);}static finalizeStyles(s){const i=[];if(Array.isArray(s)){const e=new Set(s.flat(1/0).reverse());for(const s of e)i.unshift(c$2(s));}else undefined!==s&&i.push(c$2(s));return i}static _$Eu(t,s){const i=s.attribute;return false===i?undefined:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():undefined}constructor(){super(),this._$Ep=undefined,this.isUpdatePending=false,this.hasUpdated=false,this._$Em=null,this._$Ev();}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this));}addController(t){(this._$EO??=new Set).add(t),undefined!==this.renderRoot&&this.isConnected&&t.hostConnected?.();}removeController(t){this._$EO?.delete(t);}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const i of s.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t);}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return S$1(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(true),this._$EO?.forEach(t=>t.hostConnected?.());}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.());}attributeChangedCallback(t,s,i){this._$AK(t,i);}_$ET(t,s){const i=this.constructor.elementProperties.get(t),e=this.constructor._$Eu(t,i);if(undefined!==e&&true===i.reflect){const h=(undefined!==i.converter?.toAttribute?i.converter:u$1).toAttribute(s,i.type);this._$Em=t,null==h?this.removeAttribute(e):this.setAttribute(e,h),this._$Em=null;}}_$AK(t,s){const i=this.constructor,e=i._$Eh.get(t);if(undefined!==e&&this._$Em!==e){const t=i.getPropertyOptions(e),h="function"==typeof t.converter?{fromAttribute:t.converter}:undefined!==t.converter?.fromAttribute?t.converter:u$1;this._$Em=e;const r=h.fromAttribute(s,t.type);this[e]=r??this._$Ej?.get(e)??r,this._$Em=null;}}requestUpdate(t,s,i,e=false,h){if(undefined!==t){const r=this.constructor;if(false===e&&(h=this[t]),i??=r.getPropertyOptions(t),!((i.hasChanged??f$1)(h,s)||i.useDefault&&i.reflect&&h===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,s,i);}false===this.isUpdatePending&&(this._$ES=this._$EP());}C(t,s,{useDefault:i,reflect:e,wrapped:h},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??s??this[t]),true!==h||undefined!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(s=undefined),this._$AL.set(t,s)),true===e&&this._$Em!==t&&(this._$Eq??=new Set).add(t));}async _$EP(){this.isUpdatePending=true;try{await this._$ES;}catch(t){Promise.reject(t);}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,s]of this._$Ep)this[t]=s;this._$Ep=undefined;}const t=this.constructor.elementProperties;if(t.size>0)for(const[s,i]of t){const{wrapped:t}=i,e=this[s];true!==t||this._$AL.has(s)||undefined===e||this.C(s,undefined,i,e);}}let t=false;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(s)):this._$EM();}catch(s){throw t=false,this._$EM(),s}t&&this._$AE(s);}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=true,this.firstUpdated(t)),this.updated(t);}_$EM(){this._$AL=new Map,this.isUpdatePending=false;}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return true}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM();}updated(t){}firstUpdated(t){}};y$1.elementStyles=[],y$1.shadowRootOptions={mode:"open"},y$1[d$1("elementProperties")]=new Map,y$1[d$1("finalized")]=new Map,p$1?.({ReactiveElement:y$1}),(a$1.reactiveElementVersions??=[]).push("2.1.2");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1=globalThis,i$1=t=>t,s$1=t$1.trustedTypes,e=s$1?s$1.createPolicy("lit-html",{createHTML:t=>t}):undefined,h="$lit$",o$2=`lit$${Math.random().toFixed(9).slice(2)}$`,n$1="?"+o$2,r$2=`<${n$1}>`,l=document,c=()=>l.createComment(""),a=t=>null===t||"object"!=typeof t&&"function"!=typeof t,u=Array.isArray,d=t=>u(t)||"function"==typeof t?.[Symbol.iterator],f="[ \t\n\f\r]",v=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_=/-->/g,m=/>/g,p=RegExp(`>|${f}(?:([^\\s"'>=/]+)(${f}*=${f}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),g=/'/g,$=/"/g,y=/^(?:script|style|textarea|title)$/i,x=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),b=x(1),E=Symbol.for("lit-noChange"),A=Symbol.for("lit-nothing"),C=new WeakMap,P=l.createTreeWalker(l,129);function V(t,i){if(!u(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return undefined!==e?e.createHTML(i):i}const N=(t,i)=>{const s=t.length-1,e=[];let n,l=2===i?"<svg>":3===i?"<math>":"",c=v;for(let i=0;i<s;i++){const s=t[i];let a,u,d=-1,f=0;for(;f<s.length&&(c.lastIndex=f,u=c.exec(s),null!==u);)f=c.lastIndex,c===v?"!--"===u[1]?c=_:undefined!==u[1]?c=m:undefined!==u[2]?(y.test(u[2])&&(n=RegExp("</"+u[2],"g")),c=p):undefined!==u[3]&&(c=p):c===p?">"===u[0]?(c=n??v,d=-1):undefined===u[1]?d=-2:(d=c.lastIndex-u[2].length,a=u[1],c=undefined===u[3]?p:'"'===u[3]?$:g):c===$||c===g?c=p:c===_||c===m?c=v:(c=p,n=undefined);const x=c===p&&t[i+1].startsWith("/>")?" ":"";l+=c===v?s+r$2:d>=0?(e.push(a),s.slice(0,d)+h+s.slice(d)+o$2+x):s+o$2+(-2===d?i:x);}return [V(t,l+(t[s]||"<?>")+(2===i?"</svg>":3===i?"</math>":"")),e]};class S{constructor({strings:t,_$litType$:i},e){let r;this.parts=[];let l=0,a=0;const u=t.length-1,d=this.parts,[f,v]=N(t,i);if(this.el=S.createElement(f,e),P.currentNode=this.el.content,2===i||3===i){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes);}for(;null!==(r=P.nextNode())&&d.length<u;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(h)){const i=v[a++],s=r.getAttribute(t).split(o$2),e=/([.?@])?(.*)/.exec(i);d.push({type:1,index:l,name:e[2],strings:s,ctor:"."===e[1]?I:"?"===e[1]?L:"@"===e[1]?z:H}),r.removeAttribute(t);}else t.startsWith(o$2)&&(d.push({type:6,index:l}),r.removeAttribute(t));if(y.test(r.tagName)){const t=r.textContent.split(o$2),i=t.length-1;if(i>0){r.textContent=s$1?s$1.emptyScript:"";for(let s=0;s<i;s++)r.append(t[s],c()),P.nextNode(),d.push({type:2,index:++l});r.append(t[i],c());}}}else if(8===r.nodeType)if(r.data===n$1)d.push({type:2,index:l});else {let t=-1;for(;-1!==(t=r.data.indexOf(o$2,t+1));)d.push({type:7,index:l}),t+=o$2.length-1;}l++;}}static createElement(t,i){const s=l.createElement("template");return s.innerHTML=t,s}}function M(t,i,s=t,e){if(i===E)return i;let h=undefined!==e?s._$Co?.[e]:s._$Cl;const o=a(i)?undefined:i._$litDirective$;return h?.constructor!==o&&(h?._$AO?.(false),undefined===o?h=undefined:(h=new o(t),h._$AT(t,s,e)),undefined!==e?(s._$Co??=[])[e]=h:s._$Cl=h),undefined!==h&&(i=M(t,h._$AS(t,i.values),h,e)),i}class R{constructor(t,i){this._$AV=[],this._$AN=undefined,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,e=(t?.creationScope??l).importNode(i,true);P.currentNode=e;let h=P.nextNode(),o=0,n=0,r=s[0];for(;undefined!==r;){if(o===r.index){let i;2===r.type?i=new k(h,h.nextSibling,this,t):1===r.type?i=new r.ctor(h,r.name,r.strings,this,t):6===r.type&&(i=new Z(h,this,t)),this._$AV.push(i),r=s[++n];}o!==r?.index&&(h=P.nextNode(),o++);}return P.currentNode=l,e}p(t){let i=0;for(const s of this._$AV)undefined!==s&&(undefined!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class k{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,s,e){this.type=2,this._$AH=A,this._$AN=undefined,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cv=e?.isConnected??true;}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return undefined!==i&&11===t?.nodeType&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=M(this,t,i),a(t)?t===A||null==t||""===t?(this._$AH!==A&&this._$AR(),this._$AH=A):t!==this._$AH&&t!==E&&this._(t):undefined!==t._$litType$?this.$(t):undefined!==t.nodeType?this.T(t):d(t)?this.k(t):this._(t);}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t));}_(t){this._$AH!==A&&a(this._$AH)?this._$AA.nextSibling.data=t:this.T(l.createTextNode(t)),this._$AH=t;}$(t){const{values:i,_$litType$:s}=t,e="number"==typeof s?this._$AC(t):(undefined===s.el&&(s.el=S.createElement(V(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===e)this._$AH.p(i);else {const t=new R(e,this),s=t.u(this.options);t.p(i),this.T(s),this._$AH=t;}}_$AC(t){let i=C.get(t.strings);return undefined===i&&C.set(t.strings,i=new S(t)),i}k(t){u(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const h of t)e===i.length?i.push(s=new k(this.O(c()),this.O(c()),this,this.options)):s=i[e],s._$AI(h),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(false,true,s);t!==this._$AB;){const s=i$1(t).nextSibling;i$1(t).remove(),t=s;}}setConnected(t){undefined===this._$AM&&(this._$Cv=t,this._$AP?.(t));}}class H{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,e,h){this.type=1,this._$AH=A,this._$AN=undefined,this.element=t,this.name=i,this._$AM=e,this.options=h,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=A;}_$AI(t,i=this,s,e){const h=this.strings;let o=false;if(undefined===h)t=M(this,t,i,0),o=!a(t)||t!==this._$AH&&t!==E,o&&(this._$AH=t);else {const e=t;let n,r;for(t=h[0],n=0;n<h.length-1;n++)r=M(this,e[s+n],i,n),r===E&&(r=this._$AH[n]),o||=!a(r)||r!==this._$AH[n],r===A?t=A:t!==A&&(t+=(r??"")+h[n+1]),this._$AH[n]=r;}o&&!e&&this.j(t);}j(t){t===A?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"");}}class I extends H{constructor(){super(...arguments),this.type=3;}j(t){this.element[this.name]=t===A?undefined:t;}}class L extends H{constructor(){super(...arguments),this.type=4;}j(t){this.element.toggleAttribute(this.name,!!t&&t!==A);}}class z extends H{constructor(t,i,s,e,h){super(t,i,s,e,h),this.type=5;}_$AI(t,i=this){if((t=M(this,t,i,0)??A)===E)return;const s=this._$AH,e=t===A&&s!==A||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,h=t!==A&&(s===A||e);e&&this.element.removeEventListener(this.name,this,s),h&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t);}}class Z{constructor(t,i,s){this.element=t,this.type=6,this._$AN=undefined,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){M(this,t);}}const B=t$1.litHtmlPolyfillSupport;B?.(S,k),(t$1.litHtmlVersions??=[]).push("3.3.2");const D=(t,i,s)=>{const e=s?.renderBefore??i;let h=e._$litPart$;if(undefined===h){const t=s?.renderBefore??null;e._$litPart$=h=new k(i.insertBefore(c(),t),t,undefined,s??{});}return h._$AI(t),h};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const s=globalThis;class i extends y$1{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=undefined;}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const r=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=D(r,this.renderRoot,this.renderOptions);}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(true);}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(false);}render(){return E}}i._$litElement$=true,i["finalized"]=true,s.litElementHydrateSupport?.({LitElement:i});const o$1=s.litElementPolyfillSupport;o$1?.({LitElement:i});(s.litElementVersions??=[]).push("4.2.2");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=t=>(e,o)=>{undefined!==o?o.addInitializer(()=>{customElements.define(t,e);}):customElements.define(t,e);};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const o={attribute:true,type:String,converter:u$1,reflect:false,hasChanged:f$1},r$1=(t=o,e,r)=>{const{kind:n,metadata:i}=r;let s=globalThis.litPropertyMetadata.get(i);if(undefined===s&&globalThis.litPropertyMetadata.set(i,s=new Map),"setter"===n&&((t=Object.create(t)).wrapped=true),s.set(r.name,t),"accessor"===n){const{name:o}=r;return {set(r){const n=e.get.call(this);e.set.call(this,r),this.requestUpdate(o,n,t,true,r);},init(e){return undefined!==e&&this.C(o,undefined,t,e),e}}}if("setter"===n){const{name:o}=r;return function(r){const n=this[o];e.call(this,r),this.requestUpdate(o,n,t,true,r);}}throw Error("Unsupported decorator location: "+n)};function n(t){return (e,o)=>"object"==typeof o?r$1(t,e,o):((t,e,o)=>{const r=e.hasOwnProperty(o);return e.constructor.createProperty(o,t),r?Object.getOwnPropertyDescriptor(e,o):undefined})(t,e,o)}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function r(r){return n({...r,state:true,attribute:false})}

// src/styles/tokens.ts
// UI-SPEC §4.3 (typography) + §5.2 (spacing) — shared lit-css design tokens
// All values resolve via HA-native vars first, project-local --pd-* fallbacks, explicit literal last.
const typographyTokens = i$3 `
  :host {
    --pd-font-size-caption: var(--ha-font-size-s, 0.75rem);
    --pd-font-size-label:   var(--ha-font-size-m, 0.875rem);
    --pd-font-size-body:    var(--ha-font-size-m, 1rem);
    --pd-font-size-heading: var(--ha-font-size-l, 1.25rem);

    --pd-font-weight-normal: var(--ha-font-weight-normal, 400);
    --pd-font-weight-medium: var(--ha-font-weight-medium, 500);

    --pd-line-height-tight:  1.3;
    --pd-line-height-normal: 1.5;
    --pd-line-height-loose:  1.6;
  }
`;
const spacingTokens = i$3 `
  :host {
    --pd-space-xs:  var(--ha-space-1,  4px);
    --pd-space-sm:  var(--ha-space-2,  8px);
    --pd-space-md:  var(--ha-space-3,  12px);
    --pd-space-lg:  var(--ha-space-4,  16px);
    --pd-space-xl:  var(--ha-space-6,  24px);
    --pd-space-2xl: var(--ha-space-8,  32px);
    --pd-space-3xl: var(--ha-space-12, 48px);

    --pd-radius-sm: var(--ha-border-radius-sm, 6px);
    --pd-radius-md: var(--ha-card-border-radius, 12px);
    --pd-radius-lg: var(--ha-card-border-radius-lg, 16px);
  }
`;
// Merged export so a component's static styles can `css`...${sharedTokens}`` in one go
const sharedTokens = i$3 `
  ${typographyTokens}
  ${spacingTokens}
`;

function deriveState(hass, _config) {
    const prefix = 'sensor.party_dispenser_';
    const recipesEntity = hass.states[`${prefix}recipes`];
    const queueSizeEntity = hass.states[`${prefix}queue_size`];
    const makeableEntity = hass.states[`${prefix}makeable_count`];
    const currentEntity = hass.states[`${prefix}current_order`];
    const connectedEntity = hass.states['binary_sensor.party_dispenser_connected'];
    // Phase 2 sensor shapes (verified against custom_components/party_dispenser/sensor.py):
    //   sensor.party_dispenser_recipes.attributes.recipes = [{id, name, makeable}] (LIGHT per Decision 02-03)
    //   sensor.party_dispenser_queue_size.attributes.queue = [{id, recipe_name, state}]
    //   sensor.party_dispenser_current_order.attributes = { order_id, state, started_at } | {}
    //   binary_sensor.party_dispenser_connected.state = "on" | "off"
    const recipes = (recipesEntity?.attributes?.recipes ?? []);
    const queue = (queueSizeEntity?.attributes?.queue ?? []);
    const queueSize = queue.length;
    const makeableCount = Number(makeableEntity?.state ?? 0);
    const currentOrderId = currentEntity?.attributes?.order_id ?? null;
    const connected = connectedEntity?.state === 'on';
    return {
        recipes,
        queue,
        queueSize,
        makeableCount,
        currentOrderId,
        connected,
        loading: recipesEntity === undefined && queueSizeEntity === undefined,
    };
}

let PdSummaryChip = class PdSummaryChip extends i {
    constructor() {
        super(...arguments);
        this.icon = '';
        this.label = '';
        this.value = '';
        this.tone = 'neutral';
        this.live = false; // true for connection-status chip -> aria-live="polite"
    }
    render() {
        const ariaLabel = `${this.label}: ${this.value}`;
        return b `
      <div
        class="chip tone-${this.tone}"
        role="status"
        aria-label=${ariaLabel}
        aria-live=${this.live ? 'polite' : A}
      >
        ${this.icon ? b `<ha-icon icon=${this.icon}></ha-icon>` : A}
        <span class="label">${this.label}</span>
        <span class="value">${this.value}</span>
      </div>
    `;
    }
};
PdSummaryChip.styles = [
    sharedTokens,
    i$3 `
      :host { display: inline-flex; }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: var(--pd-space-xs, 4px);
        padding: var(--pd-space-xs, 4px) var(--pd-space-sm, 8px);
        background: var(--secondary-background-color, rgba(0,0,0,0.06));
        color: var(--primary-text-color, inherit);
        border-radius: var(--pd-radius-sm, 6px);
        font-size: var(--pd-font-size-label, 0.875rem);
        font-weight: var(--pd-font-weight-medium, 500);
        min-height: 28px;
      }
      .chip .label { color: var(--secondary-text-color, inherit); }
      .chip .value { color: var(--primary-text-color, inherit); font-weight: var(--pd-font-weight-medium, 500); }
      .tone-success { color: var(--success-color, inherit); }
      .tone-danger  { color: var(--error-color, inherit); }
      ha-icon { --mdc-icon-size: 16px; }
    `,
];
__decorate([
    n({ type: String })
], PdSummaryChip.prototype, "icon", undefined);
__decorate([
    n({ type: String })
], PdSummaryChip.prototype, "label", undefined);
__decorate([
    n({ type: String })
], PdSummaryChip.prototype, "value", undefined);
__decorate([
    n({ type: String })
], PdSummaryChip.prototype, "tone", undefined);
__decorate([
    n({ type: Boolean })
], PdSummaryChip.prototype, "live", undefined);
PdSummaryChip = __decorate([
    t('pd-summary-chip')
], PdSummaryChip);

let PdSummaryHeader = class PdSummaryHeader extends i {
    constructor() {
        super(...arguments);
        this.queueSize = 0;
        this.makeableCount = 0;
        this.connected = false;
        this.title = 'Party Dispenser';
        this.showConnection = true;
    }
    render() {
        return b `
      <div class="header" role="group" aria-label="Summary">
        <h3 class="title">${this.title}</h3>
        <div class="chips">
          <pd-summary-chip
            icon="mdi:playlist-music"
            label="Queue"
            .value=${this.queueSize}
            tone="neutral"
          ></pd-summary-chip>
          <pd-summary-chip
            icon="mdi:glass-cocktail"
            label="Ready"
            .value=${this.makeableCount}
            tone="neutral"
          ></pd-summary-chip>
          ${this.showConnection
            ? b `<pd-summary-chip
                icon=${this.connected ? 'mdi:wifi' : 'mdi:wifi-off'}
                label=${this.connected ? 'Live' : 'Reconnecting\u2026'}
                value=""
                tone=${this.connected ? 'success' : 'danger'}
                .live=${true}
              ></pd-summary-chip>`
            : ''}
        </div>
      </div>
    `;
    }
};
PdSummaryHeader.styles = [
    sharedTokens,
    i$3 `
      .header {
        display: flex;
        flex-direction: column;
        gap: var(--pd-space-sm, 8px);
        padding: var(--pd-space-lg, 16px);
        border-bottom: 1px solid var(--divider-color, transparent);
      }
      .title {
        margin: 0;
        font-size: var(--pd-font-size-heading, 1.25rem);
        font-weight: var(--pd-font-weight-medium, 500);
        color: var(--primary-text-color, inherit);
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pd-space-sm, 8px);
      }
    `,
];
__decorate([
    n({ type: Number })
], PdSummaryHeader.prototype, "queueSize", undefined);
__decorate([
    n({ type: Number })
], PdSummaryHeader.prototype, "makeableCount", undefined);
__decorate([
    n({ type: Boolean })
], PdSummaryHeader.prototype, "connected", undefined);
__decorate([
    n({ type: String })
], PdSummaryHeader.prototype, "title", undefined);
__decorate([
    n({ type: Boolean })
], PdSummaryHeader.prototype, "showConnection", undefined);
PdSummaryHeader = __decorate([
    t('pd-summary-header')
], PdSummaryHeader);

let PdRecipeTile = class PdRecipeTile extends i {
    constructor() {
        super(...arguments);
        this.disabled = false;
        this._onClick = () => {
            if (this.disabled || !this.recipe.makeable)
                return;
            this.dispatchEvent(new CustomEvent('pd-order-recipe', {
                detail: { recipeId: this.recipe.id },
                bubbles: true,
                composed: true,
            }));
        };
        this._onKey = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._onClick();
            }
        };
    }
    render() {
        const unusable = this.disabled || !this.recipe.makeable;
        return b `
      <button
        type="button"
        role="button"
        aria-label="${this.recipe.name}${unusable ? ' (not makeable)' : ', tap to order'}"
        aria-disabled=${unusable ? 'true' : 'false'}
        tabindex=${unusable ? -1 : 0}
        @click=${this._onClick}
        @keydown=${this._onKey}
      >
        <span class="name">${this.recipe.name}</span>
        ${this.recipe.makeable
            ? b `<ha-icon icon="mdi:circle" class="dot-ok"></ha-icon>`
            : b `<ha-icon icon="mdi:close-circle-outline" class="dot-no"></ha-icon>`}
      </button>
    `;
    }
};
PdRecipeTile.styles = [
    sharedTokens,
    i$3 `
      button {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: var(--pd-space-sm, 8px);
        width: 100%;
        padding: var(--pd-space-md, 12px);
        border: 1px solid var(--divider-color, transparent);
        border-radius: var(--pd-radius-md, 12px);
        background: var(--card-background-color, transparent);
        color: var(--primary-text-color, inherit);
        font-size: var(--pd-font-size-body, 1rem);
        cursor: pointer;
        min-height: 44px;
        text-align: left;
      }
      button[aria-disabled="true"] {
        opacity: 0.6;
        cursor: default;
      }
      button:focus-visible {
        outline: 2px solid var(--primary-color, currentColor);
        outline-offset: 2px;
      }
      .dot-ok { color: var(--success-color, currentColor); }
      .dot-no { color: var(--warning-color, currentColor); }
      ha-icon { --mdc-icon-size: 20px; }
    `,
];
__decorate([
    n({ attribute: false })
], PdRecipeTile.prototype, "recipe", undefined);
__decorate([
    n({ type: Boolean })
], PdRecipeTile.prototype, "disabled", undefined);
PdRecipeTile = __decorate([
    t('pd-recipe-tile')
], PdRecipeTile);

let PdRecipeGrid = class PdRecipeGrid extends i {
    constructor() {
        super(...arguments);
        this.recipes = [];
        this.showNotMakeable = true;
    }
    _visible() {
        let list = this.showNotMakeable ? this.recipes : this.recipes.filter(r => r.makeable);
        // Sort makeable first (UI-SPEC §2.2 "makeable recipes feel alive")
        list = [...list].sort((a, b) => Number(b.makeable) - Number(a.makeable));
        if (typeof this.maxVisible === 'number' && this.maxVisible > 0) {
            list = list.slice(0, this.maxVisible);
        }
        return list;
    }
    render() {
        const visible = this._visible();
        if (visible.length === 0) {
            return b `
        <div class="empty" role="status">
          <ha-icon icon="mdi:glass-cocktail-off" class="empty-icon"></ha-icon>
          <p class="empty-heading">No recipes yet</p>
          <p class="empty-body">Open the dispenser app to add recipes. They'll appear here automatically.</p>
        </div>
      `;
        }
        return b `
      <div class="grid" role="list" aria-label="Recipes">
        ${visible.map(recipe => b `
          <div role="listitem">
            <pd-recipe-tile .recipe=${recipe}></pd-recipe-tile>
          </div>
        `)}
      </div>
    `;
    }
};
PdRecipeGrid.styles = [
    sharedTokens,
    i$3 `
      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--pd-space-md, 12px);
        padding: var(--pd-space-lg, 16px);
      }
      @container pd-card (min-width: 900px)  { .grid { grid-template-columns: repeat(3, 1fr); } }
      @container pd-card (min-width: 1200px) { .grid { grid-template-columns: repeat(4, 1fr); } }

      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--pd-space-3xl, 48px) var(--pd-space-lg, 16px);
        text-align: center;
        color: var(--secondary-text-color, inherit);
      }
      .empty-icon { --mdc-icon-size: 48px; color: var(--secondary-text-color, inherit); }
      .empty-heading { margin: var(--pd-space-md, 12px) 0 var(--pd-space-xs, 4px) 0; font-size: var(--pd-font-size-heading, 1.25rem); color: var(--primary-text-color, inherit); }
      .empty-body { margin: 0; font-size: var(--pd-font-size-body, 1rem); max-width: 40ch; }
    `,
];
__decorate([
    n({ attribute: false })
], PdRecipeGrid.prototype, "recipes", undefined);
__decorate([
    n({ type: Number })
], PdRecipeGrid.prototype, "maxVisible", undefined);
__decorate([
    n({ type: Boolean })
], PdRecipeGrid.prototype, "showNotMakeable", undefined);
PdRecipeGrid = __decorate([
    t('pd-recipe-grid')
], PdRecipeGrid);

const STATE_COPY = {
    QUEUED: 'Queued',
    PREPARING: 'Preparing',
    POURING: 'Pouring',
    READY: 'Ready',
    QUEUED_OPTIMISTIC: 'Sending\u2026',
};
let PdQueueItem = class PdQueueItem extends i {
    constructor() {
        super(...arguments);
        this.isCurrent = false;
        this._onCancel = () => {
            this.dispatchEvent(new CustomEvent('pd-cancel-order', {
                detail: { orderId: this.item.id },
                bubbles: true,
                composed: true,
            }));
        };
        this._onKey = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._onCancel();
            }
        };
    }
    render() {
        const copy = STATE_COPY[this.item.state] ?? this.item.state;
        const aria = `${this.item.recipe_name}, ${copy}`;
        return b `
      <div class="item ${this.isCurrent ? 'current' : ''}" role="listitem" aria-label=${aria}>
        <span class="name">${this.item.recipe_name}</span>
        <span class="state">${copy}</span>
        <button
          type="button"
          class="cancel"
          aria-label="Cancel ${this.item.recipe_name} order"
          @click=${this._onCancel}
          @keydown=${this._onKey}
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </button>
      </div>
    `;
    }
};
PdQueueItem.styles = [
    sharedTokens,
    i$3 `
      .item {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: var(--pd-space-md, 12px);
        padding: var(--pd-space-md, 12px) var(--pd-space-lg, 16px);
        border: 1px solid var(--divider-color, transparent);
        border-radius: var(--pd-radius-md, 12px);
        background: var(--card-background-color, transparent);
        color: var(--primary-text-color, inherit);
        font-size: var(--pd-font-size-body, 1rem);
      }
      .item.current {
        border-color: var(--primary-color, currentColor);
      }
      .name { font-weight: var(--pd-font-weight-medium, 500); }
      .state {
        font-size: var(--pd-font-size-label, 0.875rem);
        color: var(--secondary-text-color, inherit);
        padding: var(--pd-space-xs, 4px) var(--pd-space-sm, 8px);
        background: var(--secondary-background-color, transparent);
        border-radius: var(--pd-radius-sm, 6px);
      }
      .cancel {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin: -6px;
        padding: 6px;
        background: transparent;
        border: none;
        color: var(--secondary-text-color, inherit);
        cursor: pointer;
        border-radius: 50%;
      }
      .cancel:hover { color: var(--error-color, currentColor); }
      .cancel:focus-visible {
        outline: 2px solid var(--primary-color, currentColor);
        outline-offset: 2px;
      }
      ha-icon { --mdc-icon-size: 20px; }
    `,
];
__decorate([
    n({ attribute: false })
], PdQueueItem.prototype, "item", undefined);
__decorate([
    n({ type: Boolean })
], PdQueueItem.prototype, "isCurrent", undefined);
PdQueueItem = __decorate([
    t('pd-queue-item')
], PdQueueItem);

let PdQueueList = class PdQueueList extends i {
    constructor() {
        super(...arguments);
        this.queue = [];
        this.currentOrderId = null;
    }
    render() {
        if (this.queue.length === 0) {
            return b `
        <div class="empty" role="status">
          <ha-icon icon="mdi:cup-outline" class="empty-icon"></ha-icon>
          <p class="empty-heading">Queue empty</p>
          <p class="empty-body">Pick a recipe to get started.</p>
        </div>
      `;
        }
        return b `
      <div class="list" role="list" aria-label="Live queue" aria-live="polite">
        ${this.queue.map(item => b `
          <pd-queue-item
            .item=${item}
            .isCurrent=${item.id === this.currentOrderId}
          ></pd-queue-item>
        `)}
      </div>
    `;
    }
};
PdQueueList.styles = [
    sharedTokens,
    i$3 `
      .list {
        display: flex;
        flex-direction: column;
        gap: var(--pd-space-sm, 8px);
        padding: var(--pd-space-lg, 16px);
      }

      /* Desktop: queue is a sticky right rail — cap height, scroll within */
      @container pd-card (min-width: 900px) {
        :host {
          max-height: 600px;
          overflow-y: auto;
        }
      }

      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--pd-space-xl, 24px) var(--pd-space-lg, 16px);
        text-align: center;
        color: var(--secondary-text-color, inherit);
      }
      .empty-icon { --mdc-icon-size: 32px; color: var(--secondary-text-color, inherit); }
      .empty-heading { margin: var(--pd-space-md, 12px) 0 var(--pd-space-xs, 4px) 0; font-size: var(--pd-font-size-heading, 1.25rem); color: var(--primary-text-color, inherit); }
      .empty-body { margin: 0; font-size: var(--pd-font-size-body, 1rem); }
    `,
];
__decorate([
    n({ attribute: false })
], PdQueueList.prototype, "queue", undefined);
__decorate([
    n({ type: String })
], PdQueueList.prototype, "currentOrderId", undefined);
PdQueueList = __decorate([
    t('pd-queue-list')
], PdQueueList);

// src/party-dispenser-card.ts
// Sources:
//   - 04-RESEARCH Pattern 1 (lines 271-425) — core structure
//   - UI-SPEC §6.3 (customCards registration at module tail)
//   - UI-SPEC §6.5 (event routing via composed:true,bubbles:true; @-prefixed listeners at root)
//   - UI-SPEC §7.3 (_optimisticQueue local state; reconciled within 2s via _mergedQueue)
//   - UI-SPEC §8.1 / §8.2 (_placeOrder / _cancelOrder flows; optimistic + hass.callService)
//   - UI-SPEC §9.2 (container-type inline-size on :host for responsive layout)
//   - UI-SPEC §17.5 (version banner via "0.4.0" replaced by rollup at build time)
let PartyDispenserCard = class PartyDispenserCard extends i {
    constructor() {
        super(...arguments);
        // Local optimistic entries (UI-SPEC §7.3); reconciled within 2s when real queue lands.
        this._optimisticQueue = [];
        this._placeOrder = async (recipeId) => {
            if (!this.hass)
                return;
            const derived = this._derive();
            const recipe = derived?.recipes.find(r => r.id === recipeId);
            if (!recipe || !recipe.makeable)
                return;
            // Optimistic entry (UI-SPEC §8.1 step 2)
            const optId = `optimistic-${recipeId}-${Date.now()}`;
            this._optimisticQueue = [
                ...this._optimisticQueue,
                {
                    id: optId,
                    recipe_name: recipe.name,
                    state: 'QUEUED_OPTIMISTIC',
                    created_at: new Date().toISOString(),
                },
            ];
            // Auto-expire after 5s if reconciliation never arrives
            setTimeout(() => {
                this._optimisticQueue = this._optimisticQueue.filter(i => i.id !== optId);
            }, 5000);
            try {
                await this.hass.callService('party_dispenser', 'order_recipe', { recipe_id: recipeId });
            }
            catch (err) {
                // HA's built-in error toast already fires on rejected callService; we just log.
                console.warn('[party-dispenser-card] order_recipe failed:', err);
            }
        };
        this._cancelOrder = async (orderId) => {
            if (!this.hass)
                return;
            try {
                await this.hass.callService('party_dispenser', 'cancel_order', { order_id: orderId });
            }
            catch (err) {
                console.warn('[party-dispenser-card] cancel_order failed:', err);
            }
        };
        this._handleOrderRecipe = (e) => {
            void this._placeOrder(e.detail.recipeId);
        };
        this._handleCancelOrder = (e) => {
            void this._cancelOrder(e.detail.orderId);
        };
    }
    setConfig(config) {
        if (!config)
            throw new Error('Invalid configuration: config is required');
        if (config.type !== 'custom:party-dispenser-card') {
            throw new Error(`Invalid card type: ${config.type}`);
        }
        this._config = {
            show_connection_status: true,
            show_not_makeable: true,
            ...config,
        };
    }
    getCardSize() { return 6; }
    getGridOptions() {
        return { rows: 6, columns: 12, min_rows: 3, min_columns: 6, max_rows: 20, max_columns: 12 };
    }
    static async getConfigElement() {
        await Promise.resolve().then(function () { return pdEditor; });
        return document.createElement('pd-editor');
    }
    static getStubConfig() {
        return {
            type: 'custom:party-dispenser-card',
            show_connection_status: true,
            show_not_makeable: true,
        };
    }
    _derive() {
        if (!this.hass || !this._config)
            return null;
        return deriveState(this.hass, this._config);
    }
    _mergedQueue(derived) {
        // Drop optimistic entries that have a matching real queue item (within 2s window)
        // per UI-SPEC §7.3 reconciliation rule.
        const now = Date.now();
        const reconciledIds = new Set();
        for (const optItem of this._optimisticQueue) {
            const match = derived.queue.find(q => {
                if (q.recipe_name !== optItem.recipe_name)
                    return false;
                if (!q.created_at)
                    return true; // sensor may not ship created_at; assume match
                return (now - new Date(q.created_at).getTime()) < 2000;
            });
            if (match)
                reconciledIds.add(optItem.id);
        }
        const active = this._optimisticQueue.filter(i => !reconciledIds.has(i.id));
        return [...derived.queue, ...active];
    }
    firstUpdated() {
        // Community convention: one-time version banner in devtools console (UI-SPEC §17.5)
        console.debug(`%c party-dispenser-card %c ${"0.4.0"}`, 'color:white;background:var(--primary-color, currentColor);padding:2px 6px;border-radius:3px', 'color:var(--primary-color, currentColor);background:transparent');
    }
    render() {
        const d = this._derive();
        if (!d || !this._config)
            return A;
        const mergedQueue = this._mergedQueue(d);
        return b `
      <ha-card
        role="region"
        aria-label=${this._config.title ?? 'Party Dispenser'}
        @pd-order-recipe=${this._handleOrderRecipe}
        @pd-cancel-order=${this._handleCancelOrder}
      >
        <div class="layout">
          <pd-summary-header
            class="slot-header"
            .queueSize=${d.queueSize}
            .makeableCount=${d.makeableCount}
            .connected=${d.connected}
            .title=${this._config.title ?? 'Party Dispenser'}
            .showConnection=${this._config.show_connection_status ?? true}
          ></pd-summary-header>
          <pd-recipe-grid
            class="slot-grid"
            .recipes=${d.recipes}
            .maxVisible=${this._config.max_recipes_visible}
            .showNotMakeable=${this._config.show_not_makeable ?? true}
          ></pd-recipe-grid>
          <pd-queue-list
            class="slot-queue"
            .queue=${mergedQueue}
            .currentOrderId=${d.currentOrderId}
          ></pd-queue-list>
        </div>
      </ha-card>
    `;
    }
};
PartyDispenserCard.styles = [
    sharedTokens,
    i$3 `
      :host {
        display: block;
        container-type: inline-size;
        container-name: pd-card;
      }
      ha-card {
        display: block;
        border-radius: var(--pd-radius-lg, 16px);
        overflow: hidden;
      }

      /* Mobile default: stacked single column */
      .layout {
        display: grid;
        grid-template-columns: 1fr;
        grid-template-areas:
          "header"
          "grid"
          "queue";
      }
      .slot-header { grid-area: header; }
      .slot-grid   { grid-area: grid; }
      .slot-queue  { grid-area: queue; }

      /* Tablet + Desktop: header full-width, grid + queue side-by-side right rail */
      @container pd-card (min-width: 600px) {
        .layout {
          grid-template-columns: 60% 40%;
          grid-template-areas:
            "header header"
            "grid   queue";
        }
      }
      @container pd-card (min-width: 900px) {
        .layout {
          grid-template-columns: 65% 35%;
        }
      }
      @container pd-card (min-width: 1200px) {
        .layout {
          grid-template-columns: 70% 30%;
        }
      }

      /* Fallback for browsers without container queries (rare on HA-compatible in 2026) */
      @supports not (container-type: inline-size) {
        @media (min-width: 600px) {
          .layout {
            grid-template-columns: 60% 40%;
            grid-template-areas:
              "header header"
              "grid   queue";
          }
        }
        @media (min-width: 900px)  { .layout { grid-template-columns: 65% 35%; } }
        @media (min-width: 1200px) { .layout { grid-template-columns: 70% 30%; } }
      }
    `,
];
__decorate([
    n({ attribute: false })
], PartyDispenserCard.prototype, "hass", undefined);
__decorate([
    r()
], PartyDispenserCard.prototype, "_config", undefined);
__decorate([
    r()
], PartyDispenserCard.prototype, "_optimisticQueue", undefined);
PartyDispenserCard = __decorate([
    t('party-dispenser-card')
], PartyDispenserCard);
// Lovelace card picker discovery (UI-SPEC §6.3)
// MUST be at module tail — after class definition — or Lovelace may try to construct
// the card before customElements has the definition (Pitfall 6).
window.customCards =
    window.customCards || [];
window.customCards.push({
    type: 'party-dispenser-card',
    name: 'Party Dispenser',
    preview: true,
    description: 'Recipe grid, live queue, and summary for a Party Dispenser backend',
    documentationURL: 'https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd',
});

const SCHEMA = [
    {
        name: 'entity',
        required: false,
        selector: {
            entity: {
                domain: 'sensor',
                integration: 'party_dispenser',
            },
        },
    },
    { name: 'title', required: false, selector: { text: {} } },
    { name: 'show_connection_status', required: false, selector: { boolean: {} } },
    {
        name: 'max_recipes_visible',
        required: false,
        selector: { number: { min: 1, max: 50, mode: 'box' } },
    },
    { name: 'show_not_makeable', required: false, selector: { boolean: {} } },
];
let PdEditor = class PdEditor extends i {
    constructor() {
        super(...arguments);
        this._computeLabel = (schema) => {
            const labels = {
                entity: 'Queue size sensor',
                title: 'Title',
                show_connection_status: 'Show live/offline indicator',
                max_recipes_visible: 'Max recipes visible',
                show_not_makeable: 'Show recipes with missing ingredients',
            };
            return labels[schema.name] ?? schema.name;
        };
        this._computeHelper = (schema) => {
            const helpers = {
                title: 'Shown at the top of the card. Default: "Party Dispenser".',
                max_recipes_visible: 'Leave blank to show all. Truncates the grid from the bottom.',
            };
            return helpers[schema.name] ?? '';
        };
        this._valueChanged = (ev) => {
            const next = {
                ...ev.detail.value,
                type: 'custom:party-dispenser-card',
            };
            this.dispatchEvent(new CustomEvent('config-changed', {
                detail: { config: next },
                bubbles: true,
                composed: true,
            }));
        };
    }
    setConfig(config) {
        this._config = config;
    }
    render() {
        if (!this.hass || !this._config)
            return A;
        return b `
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
    }
};
__decorate([
    n({ attribute: false })
], PdEditor.prototype, "hass", undefined);
__decorate([
    r()
], PdEditor.prototype, "_config", undefined);
PdEditor = __decorate([
    t('pd-editor')
], PdEditor);

var pdEditor = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get PdEditor () { return PdEditor; }
});

export { PartyDispenserCard };
//# sourceMappingURL=party-dispenser-card.js.map
