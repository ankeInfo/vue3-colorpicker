<template>
  <WrapContainer
    v-if="isWidget"
    v-model:active-key="state.activeKey"
    :show-tab="useType === 'both'"
    :style="{ zIndex: zIndex }"
    :theme="theme"
    @change="onActiveKeyChange"
  >
    <component :is="getComponentName" :key="getComponentName" v-bind="getBindArgs" />

    <div v-if="hasExtra" class="vc-color-extra">
      <slot name="extra"></slot>
    </div>
  </WrapContainer>

  <template v-if="!isWidget">
    <div
      class="vc-color-wrap transparent"
      :class="{
        round: shape === 'circle',
        empty: empty,
        disabled: disabled,
      }"
      ref="colorCubeRef"
    >
      <div
        class="current-color"
        :class="{ transparent: true}"
        :style="getBgColorStyle"
        @click="onShowPicker"></div>
    </div>

    <teleport :to="pickerContainer">
      <div
        ref="pickerRef"
        v-show="showPicker"
        :style="{ zIndex: zIndex }"
        @mouseleave="onAutoClose"
      >
        <WrapContainer
          v-if="showPicker"
          :show-tab="useType === 'both' && !state.isAdvanceMode"
          :theme="theme"
          v-model:active-key="state.activeKey"
          @change="onActiveKeyChange"
        >
          <component :is="getComponentName" :key="getComponentName" v-bind="getBindArgs" />

          <div v-if="hasExtra" class="vc-color-extra">
            <slot name="extra"></slot>
          </div>
        </WrapContainer>
      </div>
    </teleport>
  </template>
</template>

<script lang="ts">
  import {
    computed,
    defineComponent,
    ExtractPropTypes,
    PropType,
    provide,
    reactive,
    ref,
    useSlots,
  } from "vue";
  import { onClickOutside, tryOnMounted, whenever, useDebounceFn } from "@vueuse/core";
  import tinycolor, { ColorInputWithoutInstance } from "tinycolor2";
  import { ColorStop, GradientNode, parse, stringify } from "gradient-parser";
  import { createPopper, Instance } from "@popperjs/core";
  import propTypes from "vue-types";

  import FkColorPicker from "./fk/FkColorPicker.vue";
  import ChromeColorPicker from "./chrome/ChromeColorPicker.vue";
  import GradientColorPicker from "./gradient/GradientColorPicker.vue";
  import WrapContainer from "./common/WrapContainer.vue";

  import { ColorPickerProvider, ColorPickerProviderKey } from "./utils/type";
  import { Color, ColorFormat } from "./utils/color";
  import { Local, type Lang } from "./lang";
  import { isEmpty } from "lodash-es";

  const colorPickerProps = {
    /**
     * 是否作为组件使用（不展示弹窗）
     */
    isWidget: propTypes.bool.def(false),
    /**
     * 选择器样式（fk或chrome）
     */
    pickerType: propTypes.oneOf(["fk", "chrome"]).def("fk"),
    /**
     * 选择器形状（circle或square）
     */
    shape: propTypes.oneOf(["circle", "square"]).def("square"),
    /**
     * 初始颜色值（支持tinycolor2格式）
     */
    pureColor: {
      type: [String, Object] as PropType<ColorInputWithoutInstance>,
      default: '',
    },
    /**
     * 初始渐变颜色值（支持gradient-parser格式）
     */
    gradientColor: propTypes.string.def(""),
    /**
     * 颜色格式（hex、rgb、hsl）
     */
    format: {
      type: String as PropType<ColorFormat>,
      default: "hex",
    },
    /**
     * 是否禁用透明度选择
     */
    disableAlpha: propTypes.bool.def(false),
    /**
     * 是否禁用历史颜色选择
     */
    disableHistory: propTypes.bool.def(false),
    /**
     * 是否四舍五入历史颜色值
     */
    roundHistory: propTypes.bool.def(false),
    /**
     * 颜色选择模式（pure、gradient、both）
     */
    useType: propTypes.oneOf(["pure", "gradient", "both"]).def("pure"),
    /**
     * 初始激活的选项卡（pure或gradient）
     */
    activeKey: propTypes.oneOf(["pure", "gradient"]).def("pure"),
    /**
     * 语言（ZH-cn或En）
     */
    lang: {
      type: String as PropType<Lang>,
      default: "ZH-cn",
    },
    /**
     * 弹窗z-index值
     */
    zIndex: propTypes.number.def(9999),
    /**
     * 弹窗挂载容器（默认body）
     */
    pickerContainer: {
      type: [String, HTMLElement],
      default: "body",
    },
    /**
     * 弹窗显示/隐藏防抖时间（毫秒）
     */
    debounce: propTypes.number.def(100),
    /**
     * 弹窗主题（white或black）
     */
    theme: propTypes.oneOf(["white", "black"]).def("white"),
    /**
     * 是否在点击弹窗外部时自动关闭
     */
    blurClose: propTypes.bool.def(false),
    /**
     * 是否默认弹窗可见（仅当isWidget为false时）
     */
    defaultPopup: propTypes.bool.def(false),

    /**
     * 是否禁用选择器
     */
    disabled: propTypes.bool.def(false),
  };

  type ColorPickerProps = Partial<ExtractPropTypes<typeof colorPickerProps>>;

  export { ColorPickerProps };

  export default defineComponent({
    name: "ColorPicker",
    components: { FkColorPicker, ChromeColorPicker, GradientColorPicker, WrapContainer },
    inheritAttrs: false,
    props: colorPickerProps,
    emits: [
      "update:pureColor",
      "pureColorChange",
      "update:gradientColor",
      "gradientColorChange",
      "update:activeKey",
      "activeKeyChange",
    ],
    setup(props, { emit }) {
      provide<ColorPickerProvider>(ColorPickerProviderKey, {
        lang: computed(() => Local[props.lang || "ZH-cn"]),
      });

      const hasExtra = !!useSlots().extra;

      const state = reactive({
        pureColor: props.pureColor,
        activeKey: props.useType === "gradient" ? "gradient" : props.activeKey, //  "pure" | "gradient"
        isAdvanceMode: false,
      });

      const startColor = new Color("#000");
      const endColor = new Color("#000");
      const instance = new Color(state.pureColor);

      const gradientState = reactive({
        startColor,
        endColor,
        startColorStop: 0,
        endColorStop: 100,
        angle: 0,
        type: "linear",
        gradientColor: props.gradientColor,
      });

      // Ref
      const colorInstance = ref(instance);
      const showPicker = ref(props.defaultPopup);
      const colorCubeRef = ref<HTMLElement | null>(null);
      const pickerRef = ref<HTMLElement | null>(null);

      let popperInstance: Instance | null = null;

      const getBgColorStyle = computed(() => {
        if(empty.value) {
          return {}
        }
        const bgColor = state.activeKey !== "gradient"
            ? tinycolor(state.pureColor).toRgbString()
            : gradientState.gradientColor;
        return {
          background: bgColor,
        };
      });

      const empty = computed(() => {
        return isEmpty(state.activeKey !== "gradient" ? state.pureColor :gradientState.gradientColor);
      });



      const getComponentName = computed(() => {
        if (state.activeKey === "gradient") {
          return GradientColorPicker.name;
        }

        return props.pickerType === "fk" ? FkColorPicker.name : ChromeColorPicker.name;
      });

      const onAdvanceChange = (isAdvance: boolean) => {
        state.isAdvanceMode = isAdvance;
      };

      const getBindArgs = computed(() => {
        const commonProps = {
          disableAlpha: props.disableAlpha,
          disableHistory: props.disableHistory,
          roundHistory: props.roundHistory,
          pickerType: props.pickerType,
          theme: props.theme,
        };

        if (state.activeKey === "gradient") {
          return {
            ...commonProps,
            startColor: gradientState.startColor,
            endColor: gradientState.endColor,
            angle: gradientState.angle,
            type: gradientState.type,
            startColorStop: gradientState.startColorStop,
            endColorStop: gradientState.endColorStop,
            onStartColorChange: (v: Color) => {
              gradientState.startColor = v;
              onGradientChange();
            },
            onEndColorChange: (v: Color) => {
              gradientState.endColor = v;
              onGradientChange();
            },
            onStartColorStopChange: (v: number) => {
              gradientState.startColorStop = v;
              onGradientChange();
            },
            onEndColorStopChange: (v: number) => {
              gradientState.endColorStop = v;
              onGradientChange();
            },
            onAngleChange: (v: number) => {
              gradientState.angle = v;
              onGradientChange();
            },
            onTypeChange: (type: string) => {
              gradientState.type = type;
              onGradientChange();
            },
            onAdvanceChange: onAdvanceChange,
          };
        }

        return {
          ...commonProps,
          disableAlpha: props.disableAlpha,
          disableHistory: props.disableHistory,
          roundHistory: props.roundHistory,
          color: colorInstance.value,
          onChange: onColorChange,
          onAdvanceChange: onAdvanceChange,
        };
      });

      const onShowPicker = () => {
        if(props.disabled) {
          return;
        }
        showPicker.value = true;
        if (!popperInstance) {
          initProper();
        } else {
          popperInstance.update();
        }
      };

      const onHidePicker = () => {
        showPicker.value = false;
      };

      const onAutoClose = useDebounceFn(() => {
        if (!props.isWidget && props.blurClose) {
          onHidePicker();
        }
      }, 100);

      onClickOutside(pickerRef, () => {
        onHidePicker();
      });

      const parseGradientColor = () => {
        try {
          const [colorNode] = parse(gradientState.gradientColor);

          if (
            colorNode &&
            colorNode.type.includes("gradient") &&
            colorNode.colorStops.length >= 2
          ) {
            const startColorVal = colorNode.colorStops[0];
            const endColorVal = colorNode.colorStops[1];

            gradientState.startColorStop = Number(startColorVal.length?.value) || 0;
            gradientState.endColorStop = Number(endColorVal.length?.value) || 0;

            if (colorNode.type === "linear-gradient" && colorNode.orientation?.type === "angular") {
              gradientState.angle = Number(colorNode.orientation?.value) || 0;
            }

            gradientState.type = colorNode.type.split("-")[0];

            const [r, g, b, a] = startColorVal.value;
            const [r1, g1, b1, a1] = endColorVal.value;

            gradientState.startColor = new Color({
              r: Number(r),
              g: Number(g),
              b: Number(b),
              a: Number(a),
            });
            gradientState.endColor = new Color({
              r: Number(r1),
              g: Number(g1),
              b: Number(b1),
              a: Number(a1),
            });
          }
        } catch (e) {
          console.error(`[Parse Color]: ${e}`);
        }
      };

      const onGradientChange = useDebounceFn(() => {
        const nodes = color2GradientNode();
        try {
          gradientState.gradientColor = stringify(nodes);

          emit("update:gradientColor", gradientState.gradientColor);
          emit("gradientColorChange", gradientState.gradientColor);
        } catch (e) {
          console.error(e);
        }
      }, props.debounce);

      const color2GradientNode = () => {
        const nodes: GradientNode[] = [];
        const startColorArr = gradientState.startColor.RGB.map((v) => v.toString());
        const endColorArr = gradientState.endColor.RGB.map((v) => v.toString());

        const colorStops: ColorStop[] = [
          {
            type: "rgba",
            value: [startColorArr[0], startColorArr[1], startColorArr[2], startColorArr[3]],
            length: { value: gradientState.startColorStop + "", type: "%" },
          },
          {
            type: "rgba",
            value: [endColorArr[0], endColorArr[1], endColorArr[2], endColorArr[3]],
            length: { value: gradientState.endColorStop + "", type: "%" },
          },
        ];

        if (gradientState.type === "linear") {
          nodes.push({
            type: "linear-gradient",
            orientation: { type: "angular", value: gradientState.angle + "" },
            colorStops: colorStops,
          });
        } else if (gradientState.type === "radial") {
          nodes.push({
            type: "radial-gradient",
            orientation: [{ type: "shape", value: "circle" }],
            colorStops: colorStops,
          });
        }

        return nodes;
      };

      const initProper = () => {
        if (colorCubeRef.value && pickerRef.value) {
          popperInstance = createPopper(colorCubeRef.value, pickerRef.value, {
            placement: "auto",
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [0, 8],
                },
              },
              {
                name: "flip",
                options: {
                  allowedAutoPlacements: ["top", "bottom", "left", "right"],
                  rootBoundary: "viewport",
                },
              },
            ],
          });
        }
      };

      const onColorChange = (v: Color) => {
        colorInstance.value = v;
        state.pureColor = v.toString(props.format);
        emitColorChange();
      };

      const emitColorChange = useDebounceFn(() => {
        emit("update:pureColor", state.pureColor);
        emit("pureColorChange", state.pureColor);
      }, props.debounce);

      const onActiveKeyChange = (key: string) => {
        state.activeKey = key;
        emit("update:activeKey", key);
        emit("activeKeyChange", key);
      };

      tryOnMounted(() => {
        parseGradientColor();

        if (!popperInstance) {
          initProper();
        }
      });

      const handleGradientColorChange = (value?: any) => {
        const equal  =value == gradientState.gradientColor;

        if (!equal) {
          gradientState.gradientColor = value;
        }
      };

      whenever(
        () => props.gradientColor,
        (value) => {
            handleGradientColorChange(value);
        }
      );

      whenever(
        () => gradientState.gradientColor,
        () => {
          parseGradientColor();
        }
      );

      whenever(
        () => props.activeKey,
        (value) => {
          state.activeKey = value;
        }
      );

      whenever(
        () => props.useType,
        (value) => {
          if (state.activeKey !== "gradient" && value === "gradient") {
            state.activeKey = "gradient";
          } else {
            state.activeKey = "pure";
          }
        }
      );


       //=====处理单色(PureColor) start====
      const handlePureColorChange = (value?: any) => {
        const equal = tinycolor.equals(value, state.pureColor);

        if (!equal) {
          state.pureColor = value || "";
          colorInstance.value = new Color(value );
          // emitColorChange();
        }
      };

      whenever(
        () => props.pureColor,
        (value) => {
          handlePureColorChange(value);
        },
        {
          deep: true
        }
      );

      //=====处理空值的情况====
      whenever(
        () => props,
        (value) => {
          if(isEmpty(value.pureColor)){
             handlePureColorChange();
          }
          if(isEmpty(value.gradientColor)){
            handleGradientColorChange();
          }
        },{
          deep: true
        }
      );

      return {
        colorCubeRef,
        pickerRef,
        showPicker,
        colorInstance,
        getBgColorStyle,
        getComponentName,
        getBindArgs,
        state,
        empty,
        hasExtra,
        onColorChange,
        onShowPicker,
        onActiveKeyChange,
        onAutoClose,
      };
    },
  });
</script>

<style lang="scss" scoped>
  .vc-color-wrap {
    width: 24px;
    height: 24px;
    box-shadow: 3px 0 5px #00000014;
    position: relative;
    cursor: pointer;
    overflow: hidden;
    display: inline-block;
    vertical-align: middle;

    &.transparent {
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==);
      background-repeat: repeat;
    }

    &.round {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1px solid #d8d8d8;
    }

    .current-color {
      width: 100%;
      height: 100%;

       &.empty {
        &::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
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
       &.disabled {
        cursor: not-allowed;
      }
  }

  .vc-color-extra {
    margin-top: 10px;
  }
</style>
