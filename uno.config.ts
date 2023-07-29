import {
  defineConfig,
  presetIcons,
  presetTypography,
  presetWind,
} from "unocss";
import transformerDirectives from "@unocss/transformer-directives";
import { presetScrollbar } from "unocss-preset-scrollbar";

export default defineConfig({
  presets: [presetWind(), presetIcons(), presetScrollbar(), presetTypography()],
  theme: {
    breakpoints: {
      xs: "348px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1920px",
    },
  },
  transformers: [transformerDirectives()],
});
