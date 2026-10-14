/**
 * Loads the brand logo (TuskaEx's, or a tenant's) for embedding into generated PDFs (jsPDF
 * addImage needs a data-URL + the natural size to keep the aspect ratio).
 * Returns null on any failure — statements must still generate without the
 * logo (offline tab, missing asset) rather than fail.
 */
import { isTenantHost } from '@/lib/tenantHost';

export type PdfLogo = { dataUrl: string; w: number; h: number };

const PLATFORM_PDF_LOGO = '/marketing/tuskaex-logo.png';

/**
 * Whose brand a generated statement wears. Callers pass what
 * useTenantBrand() resolved; omitted, the host decides (and a tenant host
 * with no brand info gets an unbranded statement, never TuskaEx's).
 */
export type PdfBrand = {
  isTenant: boolean;
  brandName?: string | null;
  logoUrl?: string | null;
};

export type ResolvedPdfBrand = {
  isTenant: boolean;
  /** Text in the header band; '' prints nothing. */
  name: string;
  /** Same-origin logo to embed, or null for none. */
  logoSrc: string | null;
  /** Footer disclaimer line. */
  footer: string;
  /** Filename prefix, e.g. 'tuskaex-' on the platform, '' on a tenant. */
  filePrefix: string;
};

export function resolvePdfBrand(brand?: PdfBrand): ResolvedPdfBrand {
  const tenant = brand ? brand.isTenant : isTenantHost();
  if (!tenant) {
    return {
      isTenant: false,
      name: 'TuskaEx',
      logoSrc: PLATFORM_PDF_LOGO,
      footer: 'TuskaEx — for information only. Not tax or legal advice.',
      filePrefix: 'tuskaex-',
    };
  }
  const name = (brand?.brandName ?? '').trim();
  return {
    isTenant: true,
    name,
    logoSrc: brand?.logoUrl ? brand.logoUrl : null,
    footer: name
      ? `${name} — for information only. Not tax or legal advice.`
      : 'For information only. Not tax or legal advice.',
    filePrefix: '',
  };
}

/** Re-encode any browser-decodable image (JPEG, SVG, WebP…) as PNG for jsPDF. */
function toPngDataUrl(src: string, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) { reject(new Error('no canvas')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

export async function loadPdfLogo(src: string | null = PLATFORM_PDF_LOGO): Promise<PdfLogo | null> {
  if (!src) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('read failed'));
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      img.onerror = () => reject(new Error('decode failed'));
      img.src = dataUrl;
    });
    if (src !== PLATFORM_PDF_LOGO && !blob.type.includes('png')) {
      // A tenant's upload may be JPEG/SVG/WebP; addImage is told 'PNG'.
      return { dataUrl: await toPngDataUrl(dataUrl, dims.w, dims.h), ...dims };
    }
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

/** Stamp the logo at the top-right of the current page, `hMm` tall. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stampPdfLogo(doc: any, logo: PdfLogo | null, margin: number, hMm = 9): void {
  if (!logo) return;
  try {
    const pageW = doc.internal.pageSize.getWidth();
    const w = (logo.w / logo.h) * hMm;
    doc.addImage(logo.dataUrl, 'PNG', pageW - margin - w, 12, w, hMm);
  } catch {
    /* never block statement generation on the logo */
  }
}
