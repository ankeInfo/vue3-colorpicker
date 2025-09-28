<template>
  <div :style="bg" class="bg">
    <span>{{ color }}</span>
  </div>

  <div :style="bgline" class="bg">
    <span>{{ gradientColor }}</span>
  </div>

  <div class="main">
    <div class="color-pickers">
      <div class="inline">
        默认：<ColorPicker v-model:pureColor="color" format="hex" disabled :picker-container="container" blurClose >
              <template #extra>
                <div class="btn-reset" @click="resetColor"> reset </div>
              </template>
          </ColorPicker>
      </div>
       <div class="inline">
         chrome & circle :
      <ColorPicker v-model:pureColor="color" shape="circle" pickerType="chrome" defaultPopup>
        <template #extra>
          <div class="btn-reset" @click="resetColor"> reset </div>
        </template>
      </ColorPicker>
      </div>
     <div>


      <div class="inline">
         chrome & gradient :
          <ColorPicker v-model:gradientColor="gradientColor" pickerType="chrome"  useType="gradient" />
         </div>
    </div>
      <div style="position: fixed; bottom: 10px; right: 10px">
        <ColorPicker v-model:gradientColor="gradientColor" useType="gradient" />
      </div>
    </div>
    <div class="color-pickers">
      <div>
        <ColorPicker
          v-model:pureColor="color"
          is-widget
          disableHistory
          disableAlpha
          :defaultColors="[]"
        >
          <template #extra>
            <div class="btn-reset" @click="resetColor"> reset </div>
          </template>
        </ColorPicker>
        <h3>pickerType: fk</h3>
      </div>
      <div>
        <ColorPicker v-model:pureColor="color" is-widget pickerType="chrome" :debounce="10" />
        <h3>pickerType: chrome</h3>
      </div>

      <div>
        <ColorPicker
          v-model:pureColor="color"
          v-model:gradientColor="gradientColor"
          is-widget
          activeKey="gradient"
          useType="both"
           pickerType="chrome"
          :debounce="10"
          @gradientColorChange="onChange"
          @pureColorChange="onChange"
        />
        <h3>useType: both</h3>
         <h3>pickerType: chrome</h3>
      </div>

      <div>
        <ColorPicker
          theme="black"
          useType="gradient"
          v-model:gradientColor="gradientColor"
          :disableHistory="true"
          is-widget
        />
        <h3>useType: gradient</h3>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from "vue";

  const color = ref('#ffa72722');
  const container = document.querySelector("#app");
  const gradientColor = ref(
    // "linear-gradient(90deg, rgba(255, 255, 255, 1) 0%, rgba(0, 0, 0, 1) 100%)"
    "radial-gradient(circle, rgba(255, 167, 39, 1) 0%, rgba(0, 0, 0, 1) 100%)"
  );

  const bg = computed(() => {
    return { background: color.value };
  });

  const bgline = computed(() => {
    return { background: gradientColor.value };
  });

  const onChange = (val: string) => {
    console.log(val);
  };

  const resetColor = () => {
    color.value = '';
  };
</script>

<style lang="scss">
  body,
  html {
    margin: 0;
    padding: 0;
    font-family: Avenir, Helvetica, Arial, sans-serif;
  }

  .main {
    padding: 40px 10%;
  }

  .color-pickers {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
  }
  .inline {
    display: inline-block;
  }

  .bg {
    color: #fff;
    font-size: 24px;
    padding: 40px 0;
    text-align: center;

    & > span {
      display: inline-block;
      // background-color: rgba($color: #000, $alpha: 0.8);
      padding: 2px 6px;
      border-radius: 4px;
    }
  }

  .btn-reset {
    border: 1px solid #aaa;
    text-align: center;
    padding: 4px 0;
    border-radius: 4px;
    color: #666;
    cursor: pointer;
    font-size: 12px;
  }
</style>
