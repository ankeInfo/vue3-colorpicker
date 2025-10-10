<template>
  <div v-if="isEyeDropperSupported" class="vc-color-straw"   :class="{ 'activate': activate }"   @click="onEyeDropper">
     <div class="vc-color-straw-icon">
      <svg  v-if="activate" xmlns="http://www.w3.org/2000/svg" width="20"  height="20" viewBox="0 0 24 24">
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
  </div>
</template>

<script lang="ts">
  import {  defineComponent, ref } from "vue";
  import propTypes from "vue-types";
  import { Color } from "../utils/color";

  export default defineComponent({
    name: "Straw",
    props: {
      color: propTypes.instanceOf(Color),
    },
    emits: ["update:color", "change"],
    setup(_props, { emit }) {

      const activate = ref(false);

      const isEyeDropperSupported = "EyeDropper" in window;

      const onEyeDropper = (event: MouseEvent) => {
        event.stopPropagation();
        if (!isEyeDropperSupported) {
          return;
        }
        activate.value = true;
        const eyeDropper = new (window as any).EyeDropper();
        eyeDropper
          .open()
          .then((result: any) => {
            activate.value = false;
            emit("change", new Color(result.sRGBHex));
          })
          .catch((e: any) => {
            activate.value = false;
            console.error("eyeDropper error", e);
          });
      };

      return {
        activate,
        isEyeDropperSupported,
        onEyeDropper,
      };
    },
  });
</script>

<style lang="scss" scoped>
  .vc-color-straw {
    cursor: pointer;
    &.activate {
      background: #efefef !important;
      border-radius: 50%;
      color: #1f87e8;
    }
    .vc-color-straw-icon {
        width: 100%;
        height: 100%;
    }
  }
</style>
