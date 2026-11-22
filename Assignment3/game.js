"use strict";

function setPositions() {
	var positions=[];
	var snakePositions   =[13,38,46,73,81,87]
	var snakeNewPositions=[2,17,26,43,51,67]

	var ladderPositions   =[3,8,32,48,56,78]
	var ladderNewPositions=[5,29,72,58,76,88]

	var snakes_or_ladders_Positions   =[25,65,70]
	var snakes_or_ladders_NewPositions=["5 or 45","44 or 84","49 or 90"]


	for (var i = 1; i <=90 ; i++) {
	 positions[i]=new Object();
	 positions[i].from=i;


	 if(snakePositions.indexOf(i)!=-1){
	   positions[i].to=snakeNewPositions[snakePositions.indexOf(i)];
	   positions[i].type="Snake";
	 }
	 else if(ladderPositions.indexOf(i)!=-1){
	   positions[i].to=ladderNewPositions[ladderPositions.indexOf(i)];
	   positions[i].type="Ladders";
	 }
	 else if(snakes_or_ladders_Positions.indexOf(i)!=-1){
	   positions[i].to=snakes_or_ladders_NewPositions[snakes_or_ladders_Positions.indexOf(i)];
	   positions[i].type="Snake or Ladders";
	 }
	 else if(i===16  || i===30 || i===47 || i===68 || i===83){
		positions[i].to="Just for the next two rounds go back";
		positions[i].type="Party";
	 }
	 else if(i===6 || i===21 || i===40 || i===57 || i===75){
		positions[i].to="1 with "+(100-i)+"% possibility or 90 with "+i+" % possibility";
		positions[i].type="ALL IN";
	 }
	 else{
	   positions[i].to=i;
		positions[i].type="Normal";

	 }
	}
	 return positions;
	}

var cells = setPositions();

var SOUND_FILES = {
	dice: "sounds/dice.mp3",
	step: "sounds/move pawn.mp3",
	snake: "sounds/fail sound.mp3",
	win: "sounds/win sound.mp3"
};

var DICE_NAMES = ["", "one", "two", "three", "four", "five", "six"];

var DICE_FOLDER = "ImagesDice";
var STEP_DELAY = 350;
var timeScale = 1;
var END_CELL = 90;

var players = [];
var currentPlayer = 0;
var lastRoll = 0;
var lastGrade = null;
var busy = false;
var gameOver = false;
var pendingAllIn = false;
var winner = null;
var messages = [];
var session = 0;

function playSound(name) {
	var file = SOUND_FILES[name];
	if (!file) {
		return;
	}
	var audio = new Audio(encodeURI(file));
	var result = audio.play();
	if (result && result.catch) {
		result.catch(function () {});
	}
}

function wait(ms) {
	return new Promise(function (resolve) {
		setTimeout(resolve, ms * timeScale);
	});
}

function randomInt(min, max) {
	return min + Math.floor(Math.random() * (max - min + 1));
}

function addMessage(text) {
	messages.unshift(text);
	if (messages.length > 8) {
		messages.pop();
	}
}

function newGame() {
	session++;
	players = [
		{ id: 0, name: "Παίκτης 1 (κόκκινος)", pos: 0, partyRounds: 0 },
		{ id: 1, name: "Παίκτης 2 (λευκός)", pos: 0, partyRounds: 0 }
	];
	currentPlayer = randomInt(0, 1);
	lastRoll = 0;
	lastGrade = null;
	busy = false;
	gameOver = false;
	pendingAllIn = false;
	winner = null;
	messages = [];
	var diceImage = document.getElementById("diceImage");
	if (diceImage) {
		diceImage.style.visibility = "hidden";
	}
	addMessage("Νέο παιχνίδι! Ξεκινάει ο " + getPlayerTurn().name + ".");
	updateGUI();
}

function getPlayerTurn() {
	return players[currentPlayer];
}

function changePlayerTurn() {
	if (lastRoll === 6) {
		addMessage(getPlayerTurn().name + ": έφερε 6 και ξαναπαίζει!");
	} else {
		currentPlayer = 1 - currentPlayer;
	}
}

function hasPlayerWon(player) {
	return player.pos === END_CELL;
}

function buildPath(from, roll, backward) {
	var path = [];
	var pos = from;
	var dir = backward ? -1 : 1;
	for (var i = 0; i < roll; i++) {
		var next = pos + dir;
		if (next > END_CELL) {
			dir = -1;
			next = pos + dir;
		}
		if (next < 1) {
			break;
		}
		path.push(next);
		pos = next;
	}
	return path;
}

function showDice(n) {
	var diceImage = document.getElementById("diceImage");
	diceImage.alt = "Ζάρι: " + n;
	diceImage.src = DICE_FOLDER + "/" + DICE_NAMES[n] + ".png";
	diceImage.style.visibility = "visible";
}

function rollDice() {
	return new Promise(function (resolve) {
		playSound("dice");
		var frames = 0;
		var timer = setInterval(function () {
			frames++;
			if (frames >= 8) {
				clearInterval(timer);
				var result = randomInt(1, 6);
				showDice(result);
				resolve(result);
			} else {
				showDice(randomInt(1, 6));
			}
		}, 80 * timeScale);
	});
}

async function slide(player, to, kind, sess) {
	if (kind === "ladder") {
		addMessage(player.name + ": πέρασε το μάθημα! Σκάλα από το " + player.pos + " στο " + to + ".");
	} else {
		addMessage(player.name + ": κόπηκε στο μάθημα! Φίδι από το " + player.pos + " στο " + to + ".");
		playSound("snake");
	}
	updateGUI();
	await wait(700);
	if (sess !== session) {
		return false;
	}
	player.pos = to;
	updateGUI();
	await wait(300);
	return sess === session;
}

async function resolveCell(player, sess) {
	var cell = cells[player.pos];
	if (cell.type === "Ladders") {
		return (await slide(player, cell.to, "ladder", sess)) ? "done" : "aborted";
	}
	if (cell.type === "Snake") {
		return (await slide(player, cell.to, "snake", sess)) ? "done" : "aborted";
	}
	if (cell.type === "Snake or Ladders") {
		var parts = cell.to.split(" or ");
		var snakeTo = parseInt(parts[0], 10);
		var ladderTo = parseInt(parts[1], 10);
		lastGrade = randomInt(0, 10);
		addMessage(player.name + ": δίνει μάθημα και παίρνει βαθμό " + lastGrade + ".");
		updateGUI();
		await wait(900);
		if (sess !== session) {
			return "aborted";
		}
		var ok;
		if (lastGrade <= 4) {
			ok = await slide(player, snakeTo, "snake", sess);
		} else {
			ok = await slide(player, ladderTo, "ladder", sess);
		}
		return ok ? "done" : "aborted";
	}
	if (cell.type === "Party") {
		player.partyRounds = 2;
		addMessage(player.name + ": party στο Βιολογικό! Πάει προς τα πίσω για τους επόμενους 2 γύρους.");
		updateGUI();
		return "done";
	}
	if (cell.type === "ALL IN") {
		return "allin";
	}
	return "done";
}

function endGame(player) {
	gameOver = true;
	busy = false;
	winner = player;
	addMessage(player.name + " έφτασε στο " + END_CELL + " και πήρε πτυχίο!");
	playSound("win");
	updateGUI();
	setTimeout(function () {
		alert("Συγχαρητήρια! Ο " + player.name + " κέρδισε το παιχνίδι!");
	}, 100);
}

function finishTurn(player) {
	if (hasPlayerWon(player)) {
		endGame(player);
		return;
	}
	changePlayerTurn();
	busy = false;
	updateGUI();
}

async function answerAllIn(accept) {
	if (!pendingAllIn || gameOver) {
		return;
	}
	var sess = session;
	var player = getPlayerTurn();
	pendingAllIn = false;
	if (!accept) {
		addMessage(player.name + ": δεν πήρε το ρίσκο του All In.");
		finishTurn(player);
		return;
	}
	var chance = player.pos;
	addMessage(player.name + ": All In! " + chance + "% πιθανότητα για το " + END_CELL + ".");
	updateGUI();
	await wait(1200);
	if (sess !== session) {
		return;
	}
	if (Math.random() * 100 < chance) {
		player.pos = END_CELL;
		addMessage(player.name + ": κέρδισε την κλήρωση και πάει στο " + END_CELL + "!");
	} else {
		player.pos = 1;
		addMessage(player.name + ": έχασε την κλήρωση και γυρνάει στο 1.");
		playSound("snake");
	}
	updateGUI();
	await wait(400);
	if (sess !== session) {
		return;
	}
	finishTurn(player);
}

async function play() {
	if (busy || gameOver || pendingAllIn) {
		return;
	}
	busy = true;
	var sess = session;
	var player = getPlayerTurn();
	updateGUI();
	var roll = await rollDice();
	if (sess !== session) {
		return;
	}
	lastRoll = roll;
	var backward = player.partyRounds > 0;
	if (backward) {
		player.partyRounds--;
		addMessage(player.name + ": έφερε " + roll + " και πάει προς τα πίσω (party).");
	} else if (player.pos + roll > END_CELL) {
		addMessage(player.name + ": έφερε " + roll + " αλλά χρειαζόταν " + (END_CELL - player.pos) + " ακριβώς. Πάει πίσω.");
	} else {
		addMessage(player.name + ": έφερε " + roll + ".");
	}
	updateGUI();
	var path = buildPath(player.pos, roll, backward);
	for (var i = 0; i < path.length; i++) {
		await wait(STEP_DELAY);
		if (sess !== session) {
			return;
		}
		player.pos = path[i];
		playSound("step");
		updateGUI();
	}
	await wait(250);
	if (sess !== session) {
		return;
	}
	var outcome = await resolveCell(player, sess);
	if (outcome === "aborted" || sess !== session) {
		return;
	}
	if (outcome === "allin" && !hasPlayerWon(player)) {
		pendingAllIn = true;
		addMessage(player.name + ": κουτάκι All In! Θέλεις να ρισκάρεις;");
		updateGUI();
		return;
	}
	finishTurn(player);
}