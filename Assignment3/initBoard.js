"use strict";

function initBoard() {
	var table = document.getElementById('mainTable');

	for (var i = 9; i >= 1; i--) {
		var tr = document.createElement('tr');
		for (var j = 9; j >= 0; j--) {
			var td1 = document.createElement('td');
			var num = i * 10 - j;
			td1.innerHTML = "<div id='position" + num + "'><img  src='images/" + num + ".png'  height=70 width=80></div>";
			tr.appendChild(td1);
		}
		table.appendChild(tr);
	}
	newGame();
}

function renderBoard() {
	for (var n = 1; n <= 90; n++) {
		var hasRed = players[0].pos === n;
		var hasWhite = players[1].pos === n;
		var folder = "images";
		if (hasRed && hasWhite) {
			folder = "imagesBoth";
		} else if (hasRed) {
			folder = "imagesRed";
		} else if (hasWhite) {
			folder = "imagesWhite";
		}
		var img = document.getElementById("position" + n).firstChild;
		var src = folder + "/" + n + ".png";
		if (img.getAttribute("src") !== src) {
			img.setAttribute("src", src);
		}
	}
}

function positionText(player) {
	return player.pos === 0 ? "εκτός ταμπλό" : "κουτάκι " + player.pos;
}

function renderInfo() {
	var html = "<h2>Info</h2>";
	for (var i = 0; i < players.length; i++) {
		var p = players[i];
		var cls = "playerRow";
		if (!gameOver && i === currentPlayer) {
			cls += " current";
		}
		var extra = p.partyRounds > 0 ? " (πίσω για " + p.partyRounds + " γύρους)" : "";
		html += "<div class='" + cls + "'>" + p.name + ": " + positionText(p) + extra + "</div>";
	}
	if (gameOver) {
		html += "<p class='winner'>Ο " + winner.name + " κέρδισε! Τέλος παιχνιδιού.</p>";
	} else {
		html += "<p>Παίζει: <b>" + getPlayerTurn().name + "</b></p>";
		if (lastRoll === 6) {
			html += "<p class='again'>Έφερε 6 - ξαναπαίζει!</p>";
		}
	}
	if (lastRoll > 0) {
		html += "<p>Τελευταίο ζάρι: <b>" + lastRoll + "</b></p>";
	}
	if (lastGrade !== null) {
		html += "<p>Τελευταίος βαθμός: <b>" + lastGrade + "</b></p>";
	}
	if (pendingAllIn && (typeof computerPlayer === "undefined" || currentPlayer !== computerPlayer)) {
		html += "<div class='allin'>All In στο " + getPlayerTurn().pos + ": " + getPlayerTurn().pos + "% για το 90, " + (100 - getPlayerTurn().pos) + "% για το 1.<br>" +
			"<button onclick='answerAllIn(true)'>All In!</button> " +
			"<button onclick='answerAllIn(false)'>Όχι, ευχαριστώ</button></div>";
	}
	html += "<ul class='log'>";
	for (var k = messages.length - 1; k >= 0; k--) {
		html += "<li>" + messages[k] + "</li>";
	}
	html += "</ul>";
	var infoBox = document.getElementById("infoBox");
	infoBox.innerHTML = html;
	var logElement = infoBox.querySelector(".log");
	if (logElement) {
		logElement.scrollTop = logElement.scrollHeight;
	}
}

function renderDice() {
	var button = document.getElementById("diceButton");
	button.disabled = busy || gameOver || pendingAllIn;
}

function updateGUI() {
	renderBoard();
	renderInfo();
	renderDice();
}