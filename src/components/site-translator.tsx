import { useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { translateTexts } from "@/lib/translate.functions";

const CACHE = "aldia-tr-en-v1";
const LETTERS = /[A-Za-zÁÉÍÓÚáéíóúñÑ]{2,}/;

/** Translates every visible text node when EN is active; cached in the browser. */
export function SiteTranslator() {
  const lang = useLang();
  useEffect(() => {
    if (lang !== "en") return;
    const cache: Record<string, string> = JSON.parse(localStorage.getItem(CACHE) || "{}");
    const originals = new WeakMap<Node, string>();
    const queue = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let busy = false;

    const nodes = () => {
      const out: { n: Node; src: string }[] = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const p = n.parentElement;
          if (!p || p.closest("script,style,code,pre,textarea,[data-no-translate]")) return NodeFilter.FILTER_REJECT;
          return LETTERS.test(n.nodeValue ?? "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const cur = n.nodeValue ?? "";
        let src = originals.get(n);
        if (src === undefined || (cur !== cache[src.trim()] && cur !== src)) { src = cur; originals.set(n, cur); }
        out.push({ n, src });
      }
      return out;
    };
    const apply = () => {
      for (const { n, src } of nodes()) {
        const k = src.trim();
        const tr = cache[k];
        if (tr) { const v = src.replace(k, tr); if (n.nodeValue !== v) n.nodeValue = v; }
        else queue.add(k);
      }
      for (const el of document.querySelectorAll<HTMLElement>("[placeholder],[aria-label],[title]")) {
        for (const a of ["placeholder", "aria-label", "title"]) {
          const v = el.getAttribute(a); if (!v || !LETTERS.test(v)) continue;
          const orig = el.dataset[`o${a.replace("-", "")}`] ?? v;
          el.dataset[`o${a.replace("-", "")}`] = orig;
          if (cache[orig]) { if (v !== cache[orig]) el.setAttribute(a, cache[orig]); } else queue.add(orig);
        }
      }
      void flush();
    };
    const flush = async () => {
      if (busy || !queue.size) return;
      busy = true;
      const batch = [...queue].slice(0, 60);
      batch.forEach((b) => queue.delete(b));
      try {
        const { out } = await translateTexts({ data: { texts: batch } });
        batch.forEach((b, i) => { cache[b] = out[i] ?? b; });
        localStorage.setItem(CACHE, JSON.stringify(cache));
      } catch { batch.forEach((b) => { cache[b] = b; }); }
      busy = false;
      schedule();
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(apply, 120); };
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    apply();
    return () => { mo.disconnect(); clearTimeout(timer); };
  }, [lang]);
  return null;
}
