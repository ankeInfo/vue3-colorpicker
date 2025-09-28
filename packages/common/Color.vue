<template>
    <div class="vc-current-color vc-transparent" :class="{'small-color': size === 'small'}">
      <div class="color-cube" :style="getBgColorStyle" @click="onCopyColorStr">
        <div class="copy-text" :title="copied ? lang?.copySuccess || '复制成功' : lang?.copy || '复制'">
          <svg
            v-if="copied"
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

       <!-- <span v-if="copied" class="copy-text"></span>  -->
      </div>
    </div>
</template>

<script lang="ts">
  import { computed, defineComponent, inject, reactive, ref } from "vue";
  import propTypes from "vue-types";
  import { Color } from "../utils/color";
  import { whenever,  useClipboard } from "@vueuse/core";
import { ColorPickerProvider, ColorPickerProviderKey } from "../utils/type";
  // import tinycolor from "tinycolor2";

  export default defineComponent({
    name: "Color",
    props: {
      color: propTypes.instanceOf(Color),
      inputType: propTypes.oneOf(["hex", "rgba"]).def("hex"),
      size: propTypes.oneOf(["small", "default"]).def("default"),
    },
    setup(props) {
      const parent = inject<ColorPickerProvider>(ColorPickerProviderKey);

      const { copy, copied, isSupported } = useClipboard();

      const state = reactive({
        color: props.color,
        previewBgColor: props.color?.toRgbString() ,
      });

      const getBgColorStyle = computed(() => {
        return {
          background: state.previewBgColor || '#00000000',
        };
      });

      const onCopyColorStr = () => {
        if (isSupported && state.color) {
          const colorStr =  props.inputType === "hex"
              ? state.color.toString(state.color.alpha === 100 ? "hex6" : "hex8")
              : state.color.toRgbString();
          copy(colorStr || "");
        }
      };


      whenever(
        () => props.color,
        () => {
          if (props.color) {
            state.color = props.color;
            state.previewBgColor = props.color.toRgbString();
          }
        },
        { deep: true }
      );

      return {
        state,
        getBgColorStyle,
        copied,
        onCopyColorStr,
        lang: parent?.lang,
      };
    },
  });
</script>

<style lang="scss" scoped>
  $backGroundColor: rgba(200, 200, 200, 0.25);
  $color: #666;

 .vc-current-color {
      width: 100%;
      height: 100%;
      box-shadow: 3px 0 5px #00000014;
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
      .copy-text {
        font-size: 12px;
        text-align: center;
        // transform: scale(0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        line-height: 36px;
        height: 36px;
        svg {
          color: #f8f8f8;
          display: none;
          height: 22px;
          width: 22px;
        }
      }
      :hover .copy-text {
        transition: all 0.3s;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.3) !important;
      }
      :hover .copy-text svg {
        display: block;
      }
      &.small-color {
        .copy-text {
          line-height: 28px;
          height: 28px;
          width: 32px;
        }
        svg {
          width: 18px;
          height: 18px;
        }
      }
    }
</style>
