/** @type {import('next').NextConfig} */
const nextConfig = {
//   images: {
//   remotePatterns: [
//     {
//       protocol: "https",
//       hostname: "upload.wikimedia.org",
//       pathname: "/**",
//     },
//     {
//       protocol: "https",
//       hostname: "images.unsplash.com",
//       pathname: "/**",
//     },
//   ],
// },
  allowedDevOrigins: ['192.168.137.177'],

}

module.exports = nextConfig
