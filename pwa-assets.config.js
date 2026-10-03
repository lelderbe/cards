// Icon generation: npx @vite-pwa/assets-generator (writes PNGs next to public/icon.svg).
// The icon background is full-bleed, so no padding: the default presets would add white margins.
export default {
  images: ['public/icon.svg'],
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
    maskable: { sizes: [512], padding: 0 },
    apple: { sizes: [180], padding: 0 },
  },
};
