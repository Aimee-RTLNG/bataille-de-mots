<script setup lang="ts">
import MiniBoard from './MiniBoard.vue'
import { OtherUser } from '../types'

const { user, showLetters = false, answerLength } = defineProps<{
  user: OtherUser,
  showLetters: boolean,
  answerLength: number,
}>()
</script>

<template>
  <MiniBoard :user="user" :showLetters="showLetters" :answerLength="answerLength">
     <div class="mini-board-name">
      <div>
        {{ user.name }}
      </div>
    </div>
  </MiniBoard>
</template>

<style scoped>
.mini-board-name {
  position: relative;
  padding-bottom: 38px;
  font-weight: 600;
  font-size: 18px;
  color: #47504c;
}

.mini-board-name {
  color: #D4D4D8;
}

.mini-board-name > div {
  position: absolute;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  padding-top: 8px;
}
</style>
