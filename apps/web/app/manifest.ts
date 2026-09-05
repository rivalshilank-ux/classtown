import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClassTown",
    short_name: "ClassTown",
    description: "A browser-based 2D multiplayer classroom game.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf3e3",
    theme_color: "#e8a13a",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
