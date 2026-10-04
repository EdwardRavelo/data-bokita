import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const SHIELD = "M32 4 56 10v20c0 16-11 26-24 30C19 56 8 46 8 30V10z";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="e"><path d="${SHIELD}"/></clipPath></defs><path d="${SHIELD}" fill="#0a1f44"/><rect y="24" width="64" height="14" fill="#f3b229" clip-path="url(#e)"/><path d="${SHIELD}" fill="none" stroke="#f3b229" stroke-width="3.5" stroke-linejoin="round"/></svg>`;

/** Ícono para la pantalla de inicio de iOS: el mismo escudo sobre fondo azul. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#061631",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} width={136} height={136} alt="" />
      </div>
    ),
    size,
  );
}
