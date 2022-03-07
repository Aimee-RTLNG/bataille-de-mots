<script setup lang="ts">
import { watchEffect } from 'vue'
import ConfettiExplosion from 'vue-confetti-explosion'
import { GameCompleteProps, GameState, LettersGuessedProps, LetterState, OtherScore, OtherUser } from './types'
import ExampleWrapper from './components/ExampleWrapper.vue'
import MiniBoardPlaying from './components/MiniBoardPlaying.vue'
import MiniBoardScore from './components/MiniBoardScore.vue'
import MiniScores from './components/MiniScores.vue'
import MiniBoard from './components/MiniBoard.vue'
import Game from './components/Game.vue'
import { useList, useOthers, useMyPresence } from './lib-liveblocks'
import { copyTextToClipboard, copyUrlToClipboard } from './lib/copyText'
import { getWordOfTheDay } from './lib/getWordOfTheDay'
import { getRandomUsername } from './lib/getRandomUsername'
import { sortUsers } from './lib/sortUsers'
import messages from './lib/messages'
import Header from './components/Header.vue'

/**
 * WORDLE WARS is a Wordle clone that allows for multiplayer gameplay. It works
 * using Liveblocks (https://liveblocks.io), a set of tools helpful for building
 * collaborative experiences. This demo is written 100% on the front end.
 *
 * The `Game` component was forked from Evan You's open-source VVordle, thanks!
 */

// ================================================================================
// SETUP

// Get word of the day. Resets at UTC +00:00
const { answer, answerDay } = getWordOfTheDay()

const { randomUsername } = getRandomUsername()

// Current state of game, username, etc
let gameState: GameState = $ref(GameState.CONNECTING)
let username = $ref(localStorage.getItem('username') || randomUsername)
let confettiAnimation = $ref(false)
let emojiScore = $ref('')
let copyLinkMessage = $ref('')

// Thème

// Custom Liveblocks hooks, based on the Liveblocks React library
const [myPresence, updateMyPresence] = useMyPresence()
const others = useOthers()
const savedScores = useList('scores-' + answer)

// Get all others with presence, and return their presence
let othersPresence = $computed(() => {
  return others?.value
    ? [...others.value].filter(other => other.presence).map(other => other.presence)
    : []
})

// Filter others by odd or even number for live scores on either side of screen
const othersFilterOdd = (odd = true) => {
  return othersPresence.filter((o, index) => o?.score && (index % 2 === (odd ? 1 : 0)))
}

// Get users sorted by score
const sortedUsers = $computed(() => {
  if (!myPresence?.value || !othersPresence) {
    return []
  }
  return sortUsers([...othersPresence, myPresence.value].filter(user => user?.score) as OtherUser[])
})

// ================================================================================
// GAME STATE

/**
 * Wordle Wars has a number of different game states, such as CONNECTING, READY,
 * COMPLETE etc. It has a decentralised method of control, meaning that each player
 * sets their own game state, and there is no central server or host. If any player
 * disconnects it will still run smoothly without problems. The game events below
 * run for every player when a change occurs. The event that runs depends on the
 * current state.
 */
const gameEvents: { [key in GameState]?: () => void } = {
  // CONNECTING stage starts when player first loads page
  // Move to intro when connected to presence and scores
  [GameState.CONNECTING]: () => {
    if (myPresence?.value && savedScores?.value()) {
      updateGameStage(GameState.INTRO)
    }
  },

  // INTRO stage starts when selecting username
  // When connected, if scores for current word found, show scores
  [GameState.INTRO]: () => {
    if (savedScores?.value()?.toArray().length) {
      updateGameStage(GameState.SCORES)
    }
  },

  // READY stage starts after ready button pressed
  // When all users are in the READY or PLAYING stages, start game
  [GameState.READY]: () => {
    if (allInStages([GameState.READY, GameState.PLAYING])) {
      setTimeout(() => {
        updateGameStage(GameState.PLAYING)
      }, 800)
    }
  },

  // COMPLETE stage starts on finishing the puzzle
  // When all users are finished, show scores
  [GameState.COMPLETE]: () => {
    if (allInStages([GameState.SCORES, GameState.COMPLETE, GameState.WAITING])) {
      updateGameStage(GameState.SCORES)
    }
  }
}

// On any change, run game event for current state (defined above)
watchEffect(() => {
  gameEvents[gameState]?.()
})

// ================================================================================
// HELPER FUNCTIONS

// Updates the current game stage for local player
function updateGameStage (stage: GameState) {
  if (myPresence?.value) {
    gameState = stage
    updateMyPresence({ stage })
  }
}

function updateUserName(){
  let newUsername = getRandomUsername()
  localStorage.setItem('username', newUsername.randomUsername)
  username = newUsername.randomUsername
}

// Returns true if every user is in one of the `stages`
function allInStages (stages: GameState[]) {
  if (!others?.value || !others?.value.count) {
    return false
  }
  let myPresenceFound = false
  return stages.some(stage => {
    const othersReady = others.value?.toArray().every(
      other => other.presence && other.presence.stage === stage
    )
    myPresenceFound = myPresenceFound || myPresence!.value.stage === stage
    return Boolean(othersReady)
  }) && myPresenceFound
}

// ================================================================================
// EVENT FUNCTIONS

// Enter the waiting room, set default presence, once username chosen
async function enterWaitingRoom () {
  updateMyPresence({
    name: username,
    board: '',
    score: { [LetterState.ABSENT]: 0, [LetterState.CORRECT]: 0, [LetterState.PRESENT]: 0 },
    stage: gameState,
    rowsComplete: 0,
    timeFinished: Infinity
  })

  updateGameStage(GameState.WAITING)
  localStorage.setItem('username', username)
}


// When current player guesses a row of letters
function onLettersGuessed ({ letterStates, letterBoard }: LettersGuessedProps) {
  const currentScore: OtherScore|any = {
    [LetterState.CORRECT]: 0,
    [LetterState.PRESENT]: 0,
    [LetterState.ABSENT ]: 0
  }
  Object.values(letterStates).forEach(state => {
    currentScore[state] += 1
  })
  const rowsComplete = letterBoard.reduce((acc, curr) => {
    if (curr.every(obj => obj.state !== LetterState.INITIAL)) {
      return acc += 1
    }
    return acc
  }, 0)
  updateMyPresence({ score: currentScore, board: letterBoard, rowsComplete: rowsComplete })
}

// When current player wins or loses game, celebrate, update score with ticks, await others winning
function onGameComplete ({ success, successGrid }: GameCompleteProps) {
  if (!myPresence || !savedScores?.value) {
    return
  }
  updateGameStage(GameState.COMPLETE)
  let updatedPresence: { timeFinished: number, score?: {} } = { timeFinished: Number(Date.now()) }
  if (success) {
    updatedPresence = { ...updatedPresence, score: { ...myPresence.value.score, [LetterState.CORRECT]: answer.length }}
    confettiAnimation = true
    setTimeout(() => confettiAnimation = false, 3000)
  }
  updateMyPresence(updatedPresence)
  savedScores.value()!.push(myPresence.value as OtherUser)
  emojiScore = createEmojiScore(successGrid || '')
}

// Copy link on click button
function onCopyLink () {
  copyUrlToClipboard()
  copyLinkMessage = 'Copié'
  setTimeout(() => copyLinkMessage = '', 1400)
}

// Create emoji scores
function createEmojiScore (successGrid: string) {
  let resultString = `#BatailleDeMot #${answerDay}\n\n`
  sortedUsers.forEach((user, index) => {
    resultString += `${index + 1}. ${user.name}\n`
  })
  resultString += '\n' + successGrid
  return resultString + '\n\nhttps://wleb.fr/bataille-de-mots'
}

// Player
let is_playing = false;
function toggleAudio(state : boolean){
  if(state) {
    document.getElementById('player').play();
  } else {
    document.getElementById('player').pause();
  }
  is_playing = state;
}

</script>

<template>
  <ExampleWrapper>

    <div id="music">
        <audio loop volume=".2" id="player">
          <source src="/music/motus-music.mp3" type="audio/mpeg">
        </audio> 
        <div class="flex">
            <svg
              class="mr-5"
              width="50"
              height="50"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M17 21C15.8954 21 15 20.1046 15 19V15C15 13.8954 15.8954 13 17 13H19V12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12V13H7C8.10457 13 9 13.8954 9 15V19C9 20.1046 8.10457 21 7 21H3V12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12V21H17ZM19 15H17V19H19V15ZM7 15H5V19H7V15Z"
                fill="currentColor"
              />
            </svg>
          <button class="button-icon" id="play-music" @click="toggleAudio(true)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21ZM12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1C5.92487 1 1 5.92487 1 12C1 18.0751 5.92487 23 12 23Z"
                fill="currentColor"
              />
              <path d="M16 12L10 16.3301V7.66987L16 12Z" fill="currentColor" />
            </svg>
          </button>
          <button class="button-icon" id="pause-music" @click="toggleAudio(false)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9 9H11V15H9V9Z" fill="currentColor" />
              <path d="M15 15H13V9H15V15Z" fill="currentColor" />
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                fill="currentColor"
              />
            </svg>
          </button>
      </div>
    </div>
    
    <Header/>
    <div class="transition-wrapper">
      
      <div v-if="gameState === GameState.CONNECTING" id="connecting">
        <div class="flex flex-col items-center justify-center text-2xl">
          <i class="gg-spinner-two" width="20"></i>
          <p class="mt-5">CONNEXION</p>
        </div>
      </div>

      <div v-if="gameState === GameState.INTRO" id="intro">
        <div>
          <h2>Déclinez votre identité</h2>
          <form @submit.prevent="enterWaitingRoom">
            <label for="set-username">Je suis ...</label>
            <div class="flex items-center">
              <input type="text" id="set-username" v-model="username" autocomplete="off" required />
              <button type="button" class="mt-0 ml-2 button-simple" @click="updateUserName()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M13.5 2c-5.621 0-10.211 4.443-10.475 10h-3.025l5 6.625 5-6.625h-2.975c.257-3.351 3.06-6 6.475-6 3.584 0 6.5 2.916 6.5 6.5s-2.916 6.5-6.5 6.5c-1.863 0-3.542-.793-4.728-2.053l-2.427 3.216c1.877 1.754 4.389 2.837 7.155 2.837 5.79 0 10.5-4.71 10.5-10.5s-4.71-10.5-10.5-10.5z"/>
                </svg>
              </button>
            </div>
            <button class="ready-button">Rejoindre</Button>
          </form>
          <div class="divider" />
          <button class="copy-button" @click="onCopyLink" :disabled="!!copyLinkMessage">
            {{ copyLinkMessage || 'Copier le lien' }} <svg xmlns="http://www.w3.org/2000/svg" class="inline -mt-0.5 ml-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" /><path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" /></svg>
          </button>
        </div>
      </div>

      <div v-if="gameState === GameState.WAITING || gameState === GameState.READY" id="waiting">
        <div>
          <h2>En attente d'autres joueurs</h2>
          <div class="waiting-list">
            <div class="waiting-player">
              <span class="mr-5">{{ myPresence.name }} (moi)</span>
              <div :class="[myPresence.stage === GameState.READY ? 'waiting-player-ready' : 'waiting-player-waiting']">
                {{ myPresence.stage === GameState.READY ? 'Prêt' : 'Se prépare...' }}
              </div>
            </div>
            <div v-for="other in othersPresence" class="waiting-player">
              <span v-if="other.name">{{ other.name }}</span>
              <span v-else><i>Se connecte...</i></span>
              <div :class="[other.stage === GameState.WAITING || other.stage === GameState.INTRO ? 'waiting-player-waiting' : 'waiting-player-ready']">
                {{ other.stage === GameState.READY ? 'Prêt' : other.stage === GameState.PLAYING ? 'Joue' : 'Se prépare...' }}
              </div>
            </div>
            <button v-if="myPresence.stage !== GameState.READY" @click="updateGameStage(GameState.READY)" class="ready-button">
              Prêt à jouer ?
            </button>
            <button v-else @click="updateGameStage(GameState.WAITING)" class="unready-button">
              Je ne suis pas prêt !
            </button>
            <div class="divider" />
            <button class="copy-button" @click="onCopyLink">
              {{ copyLinkMessage || 'Copier le lien' }} <svg xmlns="http://www.w3.org/2000/svg" class="inline -mt-0.5 ml-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" /><path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" /></svg>
            </button>
          </div>

        </div>
      </div>

      <div v-if="gameState === GameState.PLAYING || gameState === GameState.COMPLETE" id="playing">
        <MiniScores :answerLength="answer.length" :sortedUsers="sortedUsers" :shrink="true" />
        <Game :answer="answer" @lettersGuessed="onLettersGuessed" @gameComplete="onGameComplete">
          <template v-slot:board-left>
            <div class="mini-board-container">
              <MiniBoardPlaying v-for="other in othersFilterOdd(true)" :user="other" :showLetters="gameState === GameState.COMPLETE" :answerLength="answer.length" />
            </div>
          </template>
          <template v-slot:board-right>
            <div class="mini-board-container">
              <MiniBoardPlaying v-for="other in othersFilterOdd(false)" :user="other" :showLetters="gameState === GameState.COMPLETE" :answerLength="answer.length" />
            </div>
          </template>
        </Game>
      </div>

      <Transition name="fade-scores">
        <div v-if="gameState === GameState.SCORES" id="scores">
          <div>
            <h2>
              <span>
			  	Tableau des scores pour le mot : 
			  	<br>
			  	<strong class="tracking-wider">{{ answer.toUpperCase() }}</strong>
			  </span>
            </h2>

            <div class="divider" />

            <div class="scores-grid">
              <MiniBoardScore v-for="(other, index) in sortUsers(savedScores().toArray())" :user="other" :position="index + 1" :showLetters="true" />
            </div>

            <div class="divider" />

            <a href="/">
				<button class="ready-button">
				Rejouer
				</button>
            </a>
            
          </div>
        </div>
      </Transition>

      <div v-if="confettiAnimation" class="confetti-wrapper">
        <div>
          <ConfettiExplosion :colors="['#1bb238', '#d2a207', '#82918b']" />
        </div>
      </div>

    </div>

  </ExampleWrapper>
</template>

<style scoped>


.transition-wrapper {
	position: relative;
	height: 100%
}

.transition-wrapper>div {
	min-height: 100%
}

#connecting,
#intro,
#waiting {
	font-size: 18px;
	background: #18181b
}

#connecting {
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center
}

#intro>div,
#waiting>div {
	min-width: 320px;
	width: max-content;
	max-width: 100%;
	background: #fff;
	padding: 40px 35px 30px 35px;
	display: flex;
	align-items: center;
	flex-direction: column
}

#intro>div,
#waiting>div {
	background: #27272a
}

label {
	font-size: 16px;
	font-weight: 500;
	opacity: .6
}

input {
	padding: 8px 10px;
	border-radius: 4px;
	border: 1px solid #d3d3d3;
	box-shadow: 0 1px 2px 0 rgba(0, 0, 0, .05);
	background: #18181b;
	border-color: #52525b
}

button {
	width: 100%;
	padding: 9px 10px;
	border-radius: 4px;
	color: #fff;
	font-weight: 600;
	transition: background-color ease-in-out 150ms, opacity 150ms ease-in-out;
	margin-bottom: 0
}

button:disabled {
	background-color: #1bb238!important
}

button:hover {
	background-color: #28c549
}

button:active {
	background-color: #1bb238
}

button:focus-visible,
input:focus,
input:focus-visible {
	outline: 2px solid #118f2b
}

h2 {
	font-size: 24px;
	font-weight: 500;
	text-align: center;
	margin-bottom: 24px
}

#intro,
#playing,
#waiting {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 20px;
	justify-content: center;
	flex-grow: 1
}

#playing {
	justify-content: space-between
}

.mini-board-container {
	margin: 0 40px;
	display: grid;
	grid-template-rows: repeat(2, calc(var(--height)/ 2));
	grid-auto-columns: auto;
	grid-auto-flow: column;
	gap: 0 40px
}

#intro form,
.waiting-list {
	width: 100%;
	margin: 0 auto
}

#intro form>* {
	margin-bottom: 12px;
	width: 100%
}

#intro form>:last-child {
	margin-bottom: 0
}

#intro form label {
	text-align: left
}

.small-center-message {
	width: 100%;
	text-align: center;
	font-size: 16px;
	font-weight: 500;
	opacity: .6;
	margin-top: 12px
}

.waiting-player {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px
}

.waiting-player-ready,
.waiting-player-waiting {
	font-weight: 600
}

.waiting-player-message {
	margin-top: 24px
}

.start-animation {
	position: fixed;
	display: flex;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	justify-content: center;
	align-items: center
}

#scores {
	flex-grow: 1;
	display: flex;
	justify-content: center;
	align-items: stretch;
	flex-direction: column;
	padding-top: 20px
}

#scores>div {
	max-width: 538px;
	width: 100%;
	margin: 0 auto;
	padding-bottom: 60px;
	position: relative
}

#scores h2 {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 10px
}

.scores-grid {
	width: 100%;
	margin: 30px 0;
	grid-template-columns: repeat(2, 1fr);
	grid-auto-rows: auto;
	grid-gap: 40px
}

.confetti-wrapper {
	position: fixed;
	top: -15%;
	right: 0;
	bottom: 0;
	left: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 50;
	pointer-events: none
}

.fade-scores-enter-active,
.fade-scores-enter-from,
.fade-scores-leave-active,
.fade-scores-leave-to {
	left: 50%;
	transform: translateX(-50%)
}

@media (max-width:415px) {
	header h1 {
		font-size: 28px
	}
}

@media (max-width:715px) {
	#intro,
	#waiting {
		display: block;
		background: #fff
	}
	#intro>div,
	#waiting>div {
		margin: 0 auto;
		box-shadow: none
	}
	#intro>div,
	#waiting>div {
		background: 0 0!important
	}
	#scores>div {
		max-width: 250px
	}
	#scores h2 {
		flex-direction: column
	}
	.scores-grid {
		width: 250px;
		grid-template-columns: repeat(1, 1fr)
	}
}

@keyframes spinner-two {
    0% {transform: rotate(0deg)}
    to {transform: rotate(359deg)}
}
.gg-spinner-two {
    transform: scale(var(--ggs,1));
    box-sizing: border-box;
    position: relative;
    display: block;
    width: 50px;
    height: 50px
}
.gg-spinner-two::after,
.gg-spinner-two::before {
    box-sizing: border-box;
    display: block;
    width: 50px;
    height: 50px;
    content: "";
    position: absolute;
    border-radius: 100px
}
.gg-spinner-two::before {
    animation: spinner-two 1s cubic-bezier(.6,0,.4,1) infinite;
    border: 3px solid transparent;
    border-bottom-color: currentColor;
    border-top-color: currentColor
}
.gg-spinner-two::after {
    border: 3px solid;
    opacity: .2
}

</style>
