import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "QuizCraft - ระบบสร้างแบบทดสอบและสรุปบทเรียน",
    short_name: "QuizCraft",
    description:
      "ระบบสร้างแบบทดสอบจำลอง แฟลชการ์ด และสรุปบทเรียนจากเนื้อหาการเรียนอย่างกระชับตรงประเด็น",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF9F5",
    theme_color: "#FAF9F5",
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
