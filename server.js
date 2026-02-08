const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// --- GAME DATA (USMC HISTORY) ---
const questions = [
    {
        question: "If Tun Tavern were a Yelp review today, what signature item was on the menu?",
        answers: [
            "A) The 'Liberty or Death' Burger",
            "B) 'Continental Congress' Craft IPA",
            "C) Recruitment papers & beer",
            "D) 'Taxation' Tater Tots"
        ],
        correctIndex: 2 // C
    },
    {
        question: "What is the 'Quatrefoil' on an Officer's cover originally used for?",
        answers: [
            "A) Identifying friendlies for snipers",
            "B) Solar navigation",
            "C) It's French for 'Cool Hat'",
            "D) A target for enemy birds"
        ],
        correctIndex: 0 // A
    },
    {
        question: "Finish the phrase: 'Semper Gumby' means...",
        answers: [
            "A) Always Green",
            "B) Always Flexible",
            "C) Always Stretching",
            "D) Always Claymation"
        ],
        correctIndex: 1 // B
    }
];

let gameState = {
    players: {},
    currentQuestionIndex: -1,
    isGameActive: false
};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Identify as Host or Player
    socket.on('joinGame', (data) => {
        if (data.role === 'host') {
            socket.join('hostRoom');
        } else {
            gameState.players[socket.id] = {
                name: data.name,
                score: 0,
                id: socket.id
            };
            socket.join('playerRoom');
            // Tell host a new maggot arrived
            io.to('hostRoom').emit('updatePlayerList', Object.values(gameState.players));
        }
    });

    // Start Game
    socket.on('startGame', () => {
        gameState.currentQuestionIndex = 0;
        gameState.isGameActive = true;
        sendQuestion();
    });

    // Receive Answer
    socket.on('submitAnswer', (index) => {
        if (!gameState.isGameActive) return;
        
        const currentQ = questions[gameState.currentQuestionIndex];
        const isCorrect = index === currentQ.correctIndex;
        
        if (isCorrect) {
            gameState.players[socket.id].score += 100;
        }

        // Send feedback to host
        io.to('hostRoom').emit('playerAnswered', {
            name: gameState.players[socket.id].name,
            correct: isCorrect
        });
    });

    // Next Question
    socket.on('nextQuestion', () => {
        gameState.currentQuestionIndex++;
        if (gameState.currentQuestionIndex < questions.length) {
            sendQuestion();
        } else {
            io.emit('gameOver', Object.values(gameState.players));
        }
    });

    function sendQuestion() {
        const q = questions[gameState.currentQuestionIndex];
        io.emit('newQuestion', q);
    }

    // Disconnect
    socket.on('disconnect', () => {
        if (gameState.players[socket.id]) {
            delete gameState.players[socket.id];
            io.to('hostRoom').emit('updatePlayerList', Object.values(gameState.players));
        }
    });
});

http.listen(3000, () => {
    console.log('Gunny Gavel is listening on *:3000');
});
