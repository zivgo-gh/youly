import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Generated rather than shipped as a binary so the mark stays in sync with the
// brand tokens. favicon.ico stays alongside this for legacy /favicon.ico hits.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#047857",
          color: "#6ee7b7",
          fontSize: 340,
          fontWeight: 700,
          letterSpacing: "-0.05em",
        }}
      >
        Y
      </div>
    ),
    size
  );
}
