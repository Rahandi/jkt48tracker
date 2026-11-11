import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "#E4002B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* "48" text */}
        <span
          style={{
            color: "white",
            fontSize: 15,
            fontWeight: 800,
            fontFamily: "sans-serif",
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          48
        </span>
        {/* Tracker dot — top right */}
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "white",
            opacity: 0.9,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
