<template>
  <div class="vc-chrome-colorPicker">
    <Board :round="true" :hide="false" :color="(state.color as Color)" @change="onBoardChange" />
    <div class="vc-chrome-colorPicker-body">
      <div class="chrome-controls">
        <!-- <div class="chrome-color-straw">
          <Straw @change="onCompactChange"/>
        </div>
         <div class="chrome-color-wrap transparent"    >
           <CurrentColor :input-type="inputType" :color="(state.color as Color)" :size="disableAlpha?'small':'default'" />
        </div> -->
        <div class="chrome-sliders">
          <Hue size="small" :color="(state.color as Color)" @change="onHueChange" />
          <Alpha
            v-if="!disableAlpha"
            size="small"
            :color="(state.color as Color)"
            @change="onAlphaChange"
          />
        </div>
        <!-- <div class="chrome-transparent--wrap" :class="{'small':disableAlpha}" @click="onTransparenChange">
            <div
               class="chrome-transparent transparent"
               style="color: transparent;"
            ></div>
          </div> -->
      </div>
      <Display
        :color="(state.color as Color)"
        :disable-alpha="disableAlpha"
        @changeType="onInputTypeChange"
      />
      <History
        :round="roundHistory"
        :colors="historyColors"
        v-if="!disableHistory"
        @change="onCompactChange"
      />
    </div>
  </div>
</template>

<script lang="ts">
  import { computed, defineComponent, reactive, ref } from "vue";
  import Alpha from "../common/Alpha.vue";
  import Board from "../common/Board.vue";
  import Hue from "../common/Hue.vue";
  import History from "../common/History.vue";
  import propTypes from "vue-types";
  import { Color, HISTORY_COLOR_KEY, MAX_STORAGE_LENGTH } from "../utils/color";
  import { useDebounceFn, useLocalStorage, whenever } from "@vueuse/core";
  import tinycolor from "tinycolor2";
  import Display from "../common/Display.vue";
  import CurrentColor from "../common/Color.vue";
  import Straw from "../common/Straw.vue";

  export default defineComponent({
    name: "ChromeColorPicker",
    components: {CurrentColor, Display, Alpha, Board, Hue, History, Straw},
    props: {
      color: propTypes.instanceOf(Color),
      disableHistory: propTypes.bool.def(false),
      roundHistory: propTypes.bool.def(false),
      disableAlpha: propTypes.bool.def(false),
    },
    emits: ["update:color", "change"],
    setup(props, { emit }) {
      const colorInstance = props.color || new Color();
      const state = reactive({
        color: colorInstance,
        hex: colorInstance.toHexString(),
        rgb: colorInstance.toRgbString(),
      });
      const inputType = ref<"hex" | "rgba">("hex");

      const previewStyle = computed(() => {
        return { background: state.rgb };
      });

      const historyColors = useLocalStorage<string[]>(HISTORY_COLOR_KEY, [], {});

      const updateColorHistoryFn = useDebounceFn(() => {
        if (props.disableHistory) {
          return;
        }
        const rgbString = state.color.toRgbString();

        historyColors.value = historyColors.value.filter((value) => {
          return !tinycolor.equals(value, rgbString);
        });

        if (historyColors.value.includes(rgbString)) {
          return;
        }

        while (historyColors.value.length > MAX_STORAGE_LENGTH) {
          historyColors.value.pop();
        }

        historyColors.value.unshift(rgbString);
      }, 500);

      const onAlphaChange = (alpha: number) => {
        state.color.alpha = alpha;
      };

      const onHueChange = (hue: number) => {
        state.color.hue = hue;
      };

      const onInputChange = (color: Color) => {
        if (color.hex !== undefined) {
          state.color.hex = color.hex;
        }

        if (color.alpha !== undefined) {
          state.color.alpha = color.alpha;
        }
      };

      const onBoardChange = (saturation: number, brightness: number) => {
        state.color.saturation = saturation;
        state.color.brightness = brightness;
      };

      const onCompactChange = (color: string) => {
        if (color !== "advance") {
          state.color.hex = color;
        }
      };
      const onInputTypeChange = (type: "hex" | "rgba") => {
        inputType.value = type;
      }
      const onTransparenChange = () => {
        state.color.hex = 'transparent'
      }

      whenever(
        () => props.color,
        (value: Color) => {
          if (value) {
            state.color = value;
          }
        },
        { deep: true }
      );

      whenever(
        () => state.color,
        () => {
          state.hex = state.color.toHexString();
          state.rgb = state.color.toRgbString();
          updateColorHistoryFn();
          emit("update:color", state.color);
          emit("change", state.color);
        },
        { deep: true }
      );
      return {
        state,
        previewStyle,
        historyColors,
        inputType,
        onAlphaChange,
        onHueChange,
        onBoardChange,
        onInputChange,
        onCompactChange,
        onInputTypeChange,
        onTransparenChange
      };
    },
  });
</script>

<style lang="scss" scoped>
  .vc-chrome-colorPicker {
    position: relative;
    box-sizing: border-box;
    border-radius: 3px;
    user-select: none;
    background-color: initial;

    &-body {
      position: relative;

      .chrome-controls {
        display: flex;
        .chrome-color-straw {
          flex: 0 0 26px;
          height: 36px;
          display: flex;
          align-items: center;
        }

        .chrome-transparent--wrap {
          position: relative;
          width: 27px;
          height: 27px;
          cursor: pointer;
          overflow: hidden;
          box-shadow: 3px 0 5px #00000014;
          &.small {
            width: 18px;
            height: 18px;
          }
          &:hover {
            transform: scale(1.2);
            z-index: 299;
            transition: transform 0.2s;
          }
          .chrome-transparent {
            width: 100%;
            height: 100%;

            &.transparent {
              &::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: white;
              }

              &::after {
                content: "";
                position: absolute;
                top: 100%;
                left: 0;
                transform: rotate(-45deg);
                transform-origin: 0 0;
                width: 35px;
                height: 1px;
                background: red;
              }
            }
          }
        }

        .chrome-color-wrap {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          z-index: 1;

          &.transparent {
            background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==);
            background-repeat: repeat;
          }

          .current-color {
            width: 100%;
            height: 100%;
          }
        }

        .chrome-sliders {
          flex: 1;
          // margin-left: 10px;
          // margin-right: 10px;
        }
      }
    }
  }
</style>
