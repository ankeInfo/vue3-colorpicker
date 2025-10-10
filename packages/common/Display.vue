<template>
  <div class="vc-display">
    <template v-if="!disableColor">
      <Straw  @change="onStrawChange"/>
      <CurrentColor :inputType="inputType" size="small" :color="(state.color as Color)" />
    </template>
    <template v-if="inputType === 'hex'">
      <div style="display: flex; flex: 1; gap: 4px; height: 100%">
        <div class="vc-color-input">
          <input v-model="state.hex" maxlength="8" @input="onInputChange" @blur="onBlurChange" />
        </div>
        <div class="vc-alpha-input" v-if="!disableAlpha">
          <input class="vc-alpha-input__inner" :value="state.alpha" @input="onAlphaBlur" />%
        </div>
      </div>
    </template>
    <template v-else-if="state.rgba">
      <div style="display: flex; flex: 1; gap: 4px; height: 100%">
        <div class="vc-color-input" v-for="(v, i) in state.rgba" :key="i">
          <input :value="v" @input="(e) => onInputChange(e, i)" @blur="(e) => onBlurChange(e, i)" />
        </div>
      </div>
    </template>

    <div class="vc-input-toggle" @click="onInputTypeChange">{{ inputType }}</div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, reactive, ref } from "vue";
  import propTypes from "vue-types";
  import { Color } from "../utils/color";
  import { whenever, useDebounceFn, formatDate } from "@vueuse/core";
  import tinycolor from "tinycolor2";
  import CurrentColor from "./Color.vue";
  import Straw from "./Straw.vue";

  export default defineComponent({
    name: "Display",
    components: { CurrentColor, Straw },
    props: {
      color: propTypes.instanceOf(Color),
      disableAlpha: propTypes.bool.def(false),
      disableColor: propTypes.bool.def(false),
    },
    emits: ["update:color", "change", "changeType", "changeColor"],
    setup(props, { emit }) {

      const inputType = ref<"hex" | "rgba">("hex");
      const formatHex = (hex?: string) => {
        if (!hex) {
          return ''
        }
        return  hex.startsWith('#') ? hex : `#${hex}`
      }
      const formatAlpha = (alpha?: number) => {
        if (alpha === 0) {
          return 0
        }
        if (!alpha) {
          return 100
        }
        return Math.round(alpha)
      }

      const state = reactive({
        color: props.color,
        hex:  formatHex(props.color?.hex),
        alpha: formatAlpha(props.color?.alpha),
        rgba: props.color?.RGB,
      });

      const onInputTypeChange = () => {
        inputType.value = inputType.value === "rgba" ? "hex" : "rgba";
        emit("changeType", inputType.value);
      };

      const onAlphaBlur = useDebounceFn((event) => {
        if (!event.target.value) {
          return;
        }

        let opacity = parseInt(event.target.value.replace("%", ""));

        if (opacity > 100) {
          event.target.value = "100";
          opacity = 100;
        }

        if (opacity < 0) {
          event.target.value = "0";
          opacity = 0;
        }

        if (isNaN(opacity)) {
          event.target.value = "100";
          opacity = 100;
        }

        if (!isNaN(opacity) && state.color) {
          state.color.alpha = opacity;
        }

        emit("change", state.color);
      }, 300);

      const onBlurChange = useDebounceFn((event, key?: number) => {
        if (!state.color) {
          return;
        }

        if (inputType.value === "hex") {
          const _hex = event.target.value.replace("#", "");
          if (tinycolor(_hex).isValid()) {
            if ([3, 4].includes(_hex.length)) {
              state.color.hex = formatHex(_hex);
            }
          } else {
            state.color.hex = "";
          }

          emit("change", state.color);
        } else if (inputType.value === "rgba" && key === 3) {
          if (event.target.value.toString() === "0." && state.rgba) {
            state.rgba[key] = event.target.value;
            const [r, g, b, a] = state.rgba;
            state.color.hex =  formatHex(tinycolor({ r, g, b }).toHex());
            state.color.alpha = Math.round(a * 100);
            emit("change", state.color);
          }
        }
      }, 100);

      const onInputChange = useDebounceFn((event, key?: number) => {
        let value: any= event.target.value;
        if (!value) {
          return;
        }

        if (inputType.value === "hex") {
          const _hex = value.replace("#", "");
          if (tinycolor(_hex).isValid() && state.color) {
            if ([6, 8].includes(_hex.length)) {
              state.color.hex = formatHex(_hex);
            }
          }
        } else if (key !== undefined && state.rgba && state.color) {
          if (value < 0) {
            value = 0;
          }

          if (key === 3) {
            if (value > 1 || isNaN(value)) {
              value = 1;
            }

            if (value.toString() === "0.") {
              return;
            }
          }

          if (key < 3 && event.target.value > 255) {
            value = 255;
          }

          state.rgba[key] = value;
          const [r, g, b, a] = state.rgba;
          state.color.hex = formatHex(tinycolor({ r, g, b }).toHex());
          state.color.alpha = Math.round(a * 100);
        }

        emit("change", state.color);
      }, 300);

      const changeColor = (color: Color) => {
        state.color = color;
        state.alpha = Math.round(state.color.alpha);
        state.hex = formatHex(state.color.hex);
        state.rgba = state.color.RGB;
      }

      whenever(
        () => props.color,
        (value: Color) => {
          if (value) {
            changeColor(value);
          }
        },
        { deep: true }
      );

      const onStrawChange = (color: Color) => {
        changeColor(color);
        emit("update:color", color);
        emit("change", color);
      }

      return {
        state,
        inputType,
        onInputTypeChange,
        onAlphaBlur,
        onInputChange,
        onBlurChange,
        onStrawChange,
      };
    },
  });
</script>

<style lang="scss" scoped>
  $backGroundColor: rgba(200, 200, 200, 0.25);
  $color: #666;

  .vc-display {
    height: 28px;
    display: flex;
    align-items: center;
    gap: 8px;

    .vc-current-color {
      width: 30px;
      height: 100%;
      box-shadow: 3px 0 5px #00000014;
      // border-radius: 2px;
      position: relative;
      cursor: pointer;
      overflow: hidden;
      display: inline-block;
      vertical-align: middle;
      border-radius: 50%;

      &.vc-transparent {
        background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==);
        background-repeat: repeat;
      }

      .color-cube {
        width: 100%;
        height: 100%;
        text-align: center;
      }

      :hover svg {
        display: block;
      }
    }

    :hover .color-cube {
      background: rgba(0, 0, 0, 0.3) !important;
    }

    .vc-color-input {
      height: 100%;
      flex: 1;
      flex-shrink: 0;
      box-sizing: border-box;
      position: relative;

      input {
        padding: 0;
        border: 0;
        outline: none;
        cursor: pointer;
        font-size: 14px;
        text-align: center;
        box-sizing: border-box;
        background-color: $backGroundColor;
        color: $color;
        border-radius: 2px;
        height: 100%;
        width: 100%;
      }
    }

    .vc-rgb-input {
      flex: 1;
      font-size: 12px;
      color: $color;
      text-align: center;

      input {
        padding: 4px 0;
        margin-bottom: 2px;
        border: 0;
        outline: none;
        cursor: pointer;
        font-size: 14px;
        text-align: center;
        background-color: $backGroundColor;
        color: $color;
        border-radius: 2px;
        width: 100%;
      }
    }

    .vc-alpha-input {
      width: 48px;
      height: 100%;
      border: none;
      display: -ms-flexbox;
      display: flex;
      -ms-flex-pack: center;
      justify-content: center;
      -ms-flex-align: center;
      align-items: center;
      border-radius: 2px;
      font-size: 14px;
      background-color: $backGroundColor;
      padding: 0 2px;

      > input {
        width: 100%;
        height: 100%;
        padding: 0;
        text-align: center;
        background-color: transparent;
        font-size: inherit;
      }

      &__inner {
        padding: 10px 12px;
        border-radius: 4px;
        color:  $color;
        font-size: 14px;
        line-height: 20px;
        outline: none;
        border: none;
        display: block;
        box-sizing: border-box;
        cursor: pointer;
      }
    }

    .vc-input-toggle {
      cursor: pointer;
      font-size: 12px;
      line-height: 12px;
      width: 24px;
      border-radius: 4px;
      padding: 2px;

      &:hover {
        background-color: #efefef;
      }

      &::before {
        height: 0;
        width: 0;
        margin: auto;
        content: "";
        display: block;
        border-bottom: 4px solid #888;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        margin-bottom: 2px;
      }

      &::after {
        height: 0;
        width: 0;
        margin: auto;
        content: "";
        display: block;
        border-top: 4px solid #888;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        margin-top: 2px;
      }
    }

    .picker-color {
      background: #efefef !important;
      border-radius: 50%;
      color: #1f87e8;
    }

    .copy-text {
      font-size: 12px;
      line-height: 28px;
      text-align: center;
      transform: scale(0.8);
      display: inline-block;

      svg {
        display: none;
        justify-content: center;
        -ms-flex-align: center;
        align-items: center;
        padding-top: 2px;
        padding-left: 2px;
        color: #f8f8f8;
      }
    }
  }
</style>
