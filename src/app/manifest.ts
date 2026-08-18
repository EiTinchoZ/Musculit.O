import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Musculit.O",
    short_name: "Musculit.O",
    description: "Tracking de gym, progresion de cargas y journal personal.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0c0b",
    theme_color: "#0f0c0b",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
