import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

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
          background: "linear-gradient(135deg, #c7642d 0%, #c8a15d 100%)",
          borderRadius: 8,
        }}
      >
        <span style={{ fontSize: 20, fontFamily: "serif", color: "#0f0c0b", fontWeight: 700 }}>M</span>
      </div>
    ),
    { ...size },
  );
}
