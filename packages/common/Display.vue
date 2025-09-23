<template>
  <div class="vc-display">
    <div
      v-if="isEyeDropperSupported"
      class="color-straw"
      :class="{ 'picker-color': pickerColor }"
      @click="onEyeDropper"
    >
      <svg
        v-if="pickerColor"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
      >
        <path
          fill="currentColor"
          d="m21.42 6.34l-3.75-3.75l-3.82 3.82l-1.94-1.91l-1.41 1.41l1.42 1.42L3 16.25V21h4.75l8.92-8.92l1.42 1.42l1.41-1.41l-1.92-1.92zM6.92 19L5 17.08l8.06-8.06l1.92 1.92z"
        />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="m17.66 5.41l.92.92l-2.69 2.69l-.92-.92zM17.67 3c-.26 0-.51.1-.71.29l-3.12 3.12l-1.93-1.91l-1.41 1.41l1.42 1.42L3 16.25V21h4.75l8.92-8.92l1.42 1.42l1.41-1.41l-1.92-1.92l3.12-3.12c.4-.4.4-1.03.01-1.42l-2.34-2.34c-.2-.19-.45-.29-.7-.29M6.92 19L5 17.08l8.06-8.06l1.92 1.92z"
        />
      </svg>
    </div>
    <div class="vc-current-color vc-transparent">
      <div class="color-cube" :style="getBgColorStyle" @click="onCopyColorStr">
        <div class="copy-text" :title="copied ? '复制成功' : '复制'">
          <svg
            v-if="copied"
            width="24"
            height="24"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 24L20 34L40 14"
              stroke="currentColor"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg
            v-else
            width="24"
            height="24"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13 38H41V16H30V4H13V38Z"
              fill="none"
              stroke="currentColor"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M30 4L41 16"
              stroke="currentColor"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M7 20V44H28"
              stroke="currentColor"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M19 20H23" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
            <path d="M19 28H31" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
          </svg>
        </div>

        <!-- <span v-if="copied" class="copy-text"></span> -->
      </div>
    </div>
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
  import { computed, defineComponent, reactive, ref } from "vue";
  import propTypes from "vue-types";
  import { Color } from "../utils/color";
  import { whenever, useDebounceFn, useClipboard } from "@vueuse/core";
  import tinycolor from "tinycolor2";

  export default defineComponent({
    name: "Display",
    props: {
      color: propTypes.instanceOf(Color),
      disableAlpha: propTypes.bool.def(false),
    },
    emits: ["update:color", "change", "changeColor"],
    setup(props, { emit }) {
      const { copy, copied, isSupported } = useClipboard();
      const pickerColor = ref(false);

      const inputType = ref<"hex" | "rgba">("hex");
      const state = reactive({
        color: props.color,
        hex: props.color?.hex,
        alpha: Math.round(props.color?.alpha || 100),
        rgba: props.color?.RGB,
        previewBgColor: props.color?.toRgbString(),
      });

      const getBgColorStyle = computed(() => {
        return {
          background: state.previewBgColor,
        };
      });

      const onInputTypeChange = () => {
        inputType.value = inputType.value === "rgba" ? "hex" : "rgba";
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
              state.color.hex = _hex;
            }
          } else {
            state.color.hex = "000000";
          }

          emit("change", state.color);
        } else if (inputType.value === "rgba" && key === 3) {
          if (event.target.value.toString() === "0." && state.rgba) {
            state.rgba[key] = event.target.value;
            const [r, g, b, a] = state.rgba;
            state.color.hex = tinycolor({ r, g, b }).toHex();
            state.color.alpha = Math.round(a * 100);
            emit("change", state.color);
          }
        }
      }, 100);

      const onInputChange = useDebounceFn((event, key?: number) => {
        if (!event.target.value) {
          return;
        }

        if (inputType.value === "hex") {
          const _hex = event.target.value.replace("#", "");
          if (tinycolor(_hex).isValid() && state.color) {
            if ([6, 8].includes(_hex.length)) {
              state.color.hex = _hex;
            }
          }
        } else if (key !== undefined && state.rgba && state.color) {
          if (event.target.value < 0) {
            event.target.value = 0;
          }

          if (key === 3) {
            if (event.target.value > 1 || isNaN(event.target.value)) {
              event.target.value = 1;
            }

            if (event.target.value.toString() === "0.") {
              return;
            }
          }

          if (key < 3 && event.target.value > 255) {
            event.target.value = 255;
          }

          state.rgba[key] = event.target.value;
          const [r, g, b, a] = state.rgba;
          state.color.hex = tinycolor({ r, g, b }).toHex();
          state.color.alpha = Math.round(a * 100);
        }

        emit("change", state.color);
      }, 300);

      const onCopyColorStr = () => {
        if (isSupported && state.color) {
          const colorStr =
            inputType.value === "hex"
              ? state.color.toString(state.color.alpha === 100 ? "hex6" : "hex8")
              : state.color.toRgbString();
          copy(colorStr || "");
        }
      };

      whenever(
        () => props.color,
        (value: Color) => {
          if (value) {
            state.color = value;
            state.alpha = Math.round(state.color.alpha);
            state.hex = state.color.hex;
            state.rgba = state.color.RGB;
          }
        },
        { deep: true }
      );

      whenever(
        () => state.color,
        () => {
          if (state.color) {
            state.previewBgColor = state.color.toRgbString();
          }
        },
        { deep: true }
      );
      const isEyeDropperSupported = "EyeDropper" in window;
      console.error("isEyeDropperSupported", isEyeDropperSupported);

      const onEyeDropper = (event: MouseEvent) => {
        event.stopPropagation();
        if (!isEyeDropperSupported) {
          return;
        }
        pickerColor.value = true;
        const eyeDropper = new (window as any).EyeDropper();
        eyeDropper
          .open()
          .then((result: any) => {
            pickerColor.value = false;
            emit("changeColor", result.sRGBHex);
          })
          .catch((e: any) => {
            pickerColor.value = false;
            console.error(e);
          });
      };

      return {
        state,
        getBgColorStyle,
        inputType,
        copied,
        pickerColor,
        isEyeDropperSupported,
        onInputTypeChange,
        onAlphaBlur,
        onInputChange,
        onBlurChange,
        onCopyColorStr,
        onEyeDropper,
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
        color: #000;
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
