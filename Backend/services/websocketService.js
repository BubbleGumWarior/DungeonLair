const clients = new Set();

const WebSocketService = {
  addClient(ws) {
    clients.add(ws);
    ws.on('close', () => {
      clients.delete(ws);
    });
  },

  emitMasksInBattleUpdate(masksInBattle) {
    const message = JSON.stringify({ type: 'masksInBattleUpdate', data: masksInBattle });
    clients.forEach(client => {
      if (client.readyState === 1) { // Ensure the WebSocket is open
        client.send(message);
      }
    });
  }
};

module.exports = WebSocketService;
