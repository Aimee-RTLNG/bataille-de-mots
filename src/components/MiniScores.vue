<script setup lang="ts">
import { OtherUser } from '../types'
import ScoreCard from './ScoreCard.vue'

const { answerLength, sortedUsers, shrink = false } = defineProps<{
  answerLength: number,
  sortedUsers: OtherUser[],
  shrink?: boolean,
}>()

</script>

<template>
  <div class="mini-score-container">
    <div v-for="(user, index) in sortedUsers" :class="['mini-score', shrink && 'shrink']">
      <div class="mini-score-score">
        {{ index + 1 }}.
      </div>
      <div class="mini-score-name">{{ user.name }}</div>
      <ScoreCard :answerLength="answerLength" :user="user" />
    </div>

    <div :class="['mini-score-mobile', shrink && 'shrink']">
		<div class="flex" v-if="sortedUsers[0].score.correct === answerLength">
			<span class="mini-score-name mr-2">{{ sortedUsers[0].name }}</span> a terminé !
			<ScoreCard class="ml-2" :answerLength="answerLength" :user="sortedUsers[0]" />
		</div>
		<div class="flex" v-else-if="sortedUsers[0].score.correct" >
			<span class="mini-score-name mr-2">{{ sortedUsers[0].name }}</span> est en tête avec 
			<ScoreCard class="ml-2" :answerLength="answerLength" :user="sortedUsers[0]" />
		</div>
		<div v-else>Essayez de deviner le mot de {{answerLength}} lettres</div>
    </div>
  </div>
</template>

<style scoped>
.mini-score-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  gap: 18px;
  margin: 0 auto;
  width: 100%;
  font-size: 22px;
  padding-top: 20px;
}

.mini-score {
  --border-radius: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.mini-score-mobile {
  display: none;
  justify-content: center;
  align-items: center;
  gap: 5px;
  margin-bottom: 25px;
}

.mini-score-score {
  color: #6f7770;
  font-weight: 500;
  flex-shrink: 0;
  flex-grow: 0;
  width: 40px;
  text-align: left;
}

.mini-score-score {
  color: #A1A1AA;
}

.mini-score-name {
  font-weight: 600;
  color: #373f3b;
  flex-grow: 1;
  text-align: center;
}

.mini-score-name {
  color: #E5E7EB;
}


@media (max-height: 975px) {
  .mini-score.shrink {
    display: none;
  }

  .mini-score-mobile.shrink {
    display: flex;
  }
}

@media (max-width: 715px) {
  .mini-score-mobile {
    font-size: 18px;
  }
}
</style>
