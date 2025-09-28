import { App, Plugin } from "vue";

import "./styles/index.scss";
import ColorPicker from "./ColorPicker.vue";
import type { ColorPickerProps } from "./ColorPicker.vue";

const Vue3ColorPicker: Plugin = {
  install: (app: App) => {
    const name = ColorPicker.name || "ColorPicker";
    app.component(name, ColorPicker);
    app.component("Vue3" + name, ColorPicker);
  },
};

export { ColorPicker, type ColorPickerProps };

export default Vue3ColorPicker;
