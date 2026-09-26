import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Youly — log food by talking. Your AI weight loss coach.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#047857",
          padding: "80px 88px",
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#6ee7b7",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Youly
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 82,
            lineHeight: 1.05,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.03em",
          }}
        >
          Log food by talking.
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 38,
            lineHeight: 1.3,
            color: "#d1fae5",
          }}
        >
          An AI coach that tracks your calories and protein — and adapts to you.
        </div>
      </div>
    ),
    size
  );
}
