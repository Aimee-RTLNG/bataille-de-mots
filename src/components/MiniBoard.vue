<script setup lang="ts">
import { LetterState, OtherUser } from "../types";

const {
	user,
	rows = 6,
	large = false,
	showLetters = false,
	answerLength
} = defineProps<{
	user: OtherUser;
	rows?: number;
	large?: boolean;
	showLetters?: boolean;
	answerLength?: number;
}>();

const [fontSize, boxSize] = large ? ["32px", "47px"] : ["16px", "25px"];

const emptyBoard = $ref(
	Array.from({ length: 6 }, () =>
		Array.from({ length: answerLength }, () => ({
			letter: "",
			state: LetterState.INITIAL,
		}))
	)
);

const currentBoard = $computed(() => {
	return user.board.length ? user.board : emptyBoard;
});
</script>

<template>
	<div>
		<slot />
		<div class="mini-board">
			<div v-for="row in currentBoard" class="mini-board-row">
				<div
					v-for="(tile, index) in row"
					:class="['mini-board-tile', tile.state && 'revealed']"
				>
					<div
						class="front mini-board-tile-unset"
						:style="{ transitionDelay: `${index * 300}ms` }"
					/>
					<div
						:class="['back', tile.state]"
						:style="{
							transitionDelay: `${index * 300}ms`,
							animationDelay: `${index * 100}ms`,
						}"
					>
						{{ showLetters ? tile.letter.toUpperCase() : "" }}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.mini-board {
	--box-size: v-bind(boxSize);
	--board-rows: v-bind(rows);
	--border-radius: 2px;

	font-size: 17px;
	display: grid;
	grid-template-rows: repeat(var(--board-rows), var(--box-size));
	grid-gap: 3px;
	box-sizing: border-box;
}

.mini-board-row {
	display: flex;
}

.mini-board-tile {
	position: relative;
	margin: 0 2px;
}

#board .mini-board-tile {
	min-width: 25px;
	min-height: 25px;
}

#scores .mini-board-tile {
	min-width: 40px;
	min-height: 40px;
}

.mini-board-tile > div {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
}

.mini-board-tile-unset {
	border: 1px solid #3f3f46;
	border-radius: var(--border-radius);
	background: #18181b;
}

.mini-board-tile .front,
.mini-board-tile .back {
	box-sizing: border-box;
	display: inline-flex;
	justify-content: center;
	align-items: center;
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	transition: transform 0.6s;
	backface-visibility: hidden;
	-webkit-backface-visibility: hidden;
	font-weight: 600;
}

.mini-board-tile .back {
	transform: rotateX(180deg);
}

.mini-board-tile.revealed .front {
	transform: rotateX(180deg);
	border-radius: var(--border-radius);
}

.mini-board-tile.revealed .back {
	transform: rotateX(0deg);
	border-radius: var(--border-radius);
}

#scores .mini-board-final-score {
	text-align: center;
}

#scores .mini-board {
	margin: 15px auto;
	width: max-content;
}
</style>
