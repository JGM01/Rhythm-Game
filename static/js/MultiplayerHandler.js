// js/MultiplayerHandler.js
class MultiplayerHandler {
    constructor(game) {
        this.game = game;
        this.ws = null;
        this.roomId = null;
        this.players = new Map();
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`ws://${window.location.hostname}:8080/ws`);

            this.ws.onopen = () => {
                console.log('Connected to game server');
                resolve();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };

            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            };

            this.ws.onclose = () => {
                console.log('Disconnected from game server');
                this.game.handleDisconnect();
            };
        });
    }

    handleMessage(message) {
        switch (message.type) {
            case 'room_created':
                this.roomId = message.roomId;
                break;
            case 'player_joined':
                this.players.set(message.playerId, {
                    score: 0,
                    combo: 0,
                    username: message.username
                });
                break;
            case 'player_left':
                this.players.delete(message.playerId);
                break;
            case 'score_update':
                if (this.players.has(message.playerId)) {
                    const player = this.players.get(message.playerId);
                    player.score = message.score;
                    player.combo = message.combo;
                }
                break;
            case 'game_start':
                this.game.startMultiplayerSong(message.songId);
                break;
        }
    }

    createRoom() {
        this.send({
            type: 'create_room'
        });
    }

    joinRoom(roomId) {
        this.send({
            type: 'join_room',
            roomId: roomId
        });
    }

    updateScore(score, combo) {
        this.send({
            type: 'score_update',
            score: score,
            combo: combo
        });
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}
