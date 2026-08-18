import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export function GET() {
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
          borderRadius: 108,
        }}
      >
        <span style={{ fontSize: 288, fontFamily: "serif", color: "#0f0c0b", fontWeight: 700 }}>M</span>
      </div>
    ),
    { ...size },
  );
}
