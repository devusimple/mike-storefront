/**
 * Cloudinary fetch transformation: serve a resized, auto-format/quality
 * variant instead of the original upload. Non-Cloudinary URLs pass through.
 * Example: thumb(url, 600) → …/image/upload/w_600,q_auto,f_auto/…
 */
export function thumb(url: string | null | undefined, width: number, height?: number): string {
  if (!url) return "";
  const marker = "/image/upload/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const t = height
    ? `w_${width},h_${height},c_fill,q_auto,f_auto`
    : `w_${width},q_auto,f_auto`;
  return `${url.slice(0, i + marker.length)}${t}/${url.slice(i + marker.length)}`;
}
