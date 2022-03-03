import { answers } from '../words'

export function getWordOfTheDay () {

  const now = dateToUtc(new Date())
  const start = new Date(Date.UTC(2022, 1, 15))
  const diff = Number(now) - Number(start)
  let day = Math.floor(diff / (1000 * 60 * 60 * 24))
  while (day > answers.length) {
    day -= answers.length
  }

  // On retourne un mot au hasard, peu importe le jour
  let queryString = window.location.search;
  let urlParams = new URLSearchParams(queryString);
  let code = urlParams.get('room');
  var indexCode : number = 0;
  if(code) indexCode = parseInt(code.replace(/[^\d,]/g,'')) % answers.length;

  let selectedWord = answers[indexCode];
  if (import.meta.env.DEV) {
    console.log('DEV: Answer is ' + selectedWord);
  }
  return { answer: selectedWord.toLowerCase(), answerDay: day + 1 }
}

export function getWordById (roomId : string) {
	var indexCode = parseInt(roomId.replace(/[^\d,]/g,'')) % answers.length;

	let selectedWord = answers[indexCode];
	if (import.meta.env.DEV) {
	  console.log('DEV: Answer is ' + selectedWord);
	}
	return selectedWord.toLowerCase()
}

function dateToUtc (d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
