import React, { useState, useCallback, useEffect, useMemo } from "react";
import { v4 as uuid } from "uuid";
import shuffle from "lodash.shuffle";
import "./App.css";

const stateVersion = 1;
const stateKey = `botct_state_${stateVersion}`;
let initialState = localStorage.getItem(stateKey) || {
  players: [],
  showTable: false,
};

if (initialState && typeof initialState === "string") {
  initialState = JSON.parse(initialState);
}

function App() {
  const [showTable, setShowTable] = useState(initialState.showTable);
  const [players, setPlayers] = useState(initialState.players);
  const [canvas, setCanvas] = useState(null);
  const canvasContext = useMemo(() => canvas && canvas.getContext("2d"), [
    canvas,
  ]);

  const handleAddPlayer = useCallback(() => {
    setPlayers((players) => [
      ...players,
      {
        id: uuid(),
        name: "",
        dead: false,
      },
    ]);
  }, []);

  const handleRemovePlayer = useCallback((playerId) => {
    setPlayers((players) => players.filter((player) => player.id !== playerId));
  }, []);

  const handlePlayerNameChange = useCallback((playerId, name) => {
    setPlayers((players) =>
      players.map((player) =>
        player.id === playerId ? { ...player, name } : player
      )
    );
  }, []);

  const toggleShowTable = useCallback(
    () => setShowTable((showTable) => !showTable),
    []
  );

  const handleCanvasClick = useCallback(
    (event) => {
      if (!canvas) {
        return;
      }
      const playerPositions = getPlayerPositions(canvas, players);
      const mousePosition = getCanvasMousePosition(canvas, event);
      const playerPositionsWithDistance = playerPositions
        .map((playerPosition) => ({
          playerPosition,
          distance: getDistance(playerPosition, mousePosition),
        }))
        .sort((a, b) => a.distance - b.distance);

      const [nearest] = playerPositionsWithDistance;

      if (nearest && nearest.distance < 50) {
        const { player: playerToKill } = nearest.playerPosition;

        setPlayers(
          players.map((player) =>
            player.id === playerToKill.id
              ? { ...player, dead: !player.dead }
              : player
          )
        );
      }
    },
    [canvas, players]
  );

  const handleExportTableClick = useCallback(() => {
    if (!canvas) {
      return;
    }

    const now = new Date();
    const filename = `botct-table-${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}.png`;
    downloadCanvas(canvas, filename);
  }, [canvas]);

  const handleShuffleClick = useCallback(() => {
    setPlayers((players) => shuffle(players));
  }, []);

  useEffect(() => {
    if (!canvas || !canvasContext) {
      return;
    }
    renderTable(canvas, canvasContext, players);
  }, [canvas, canvasContext, players]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(stateKey, JSON.stringify({ players, showTable }));
    }, 500);

    return () => clearTimeout(timeout);
  }, [players, showTable]);

  if (showTable) {
    return (
      <div className="App">
        <canvas
          className="TableCanvas"
          width={800}
          height={800}
          ref={setCanvas}
          onClick={handleCanvasClick}
        />
        <button onClick={handleExportTableClick}>Export</button>
        <button onClick={toggleShowTable}>Back to Player List</button>
      </div>
    );
  }

  return (
    <div className="App">
      <ul className="PlayerList">
        {players.map((player) => (
          <li key={player.id} className="PlayerListItem">
            <input
              className="PlayerNameInput"
              value={player.name}
              onChange={(event) =>
                handlePlayerNameChange(player.id, event.currentTarget.value)
              }
            />
            <button
              className="PlayerDeleteButton"
              onClick={() => handleRemovePlayer(player.id)}
            >
              {"\u2715"}
            </button>
          </li>
        ))}
      </ul>
      <button onClick={handleAddPlayer}>Add Player</button>
      <button onClick={handleShuffleClick}>Shuffle players</button>
      <button onClick={toggleShowTable}>View Table</button>
    </div>
  );
}

function renderTable(canvas, context, players) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "black";
  const tableCircle = getTableCircle(canvas);
  const playerPositions = getPlayerPositions(canvas, players);
  const deadXWidth = 25;

  context.beginPath();
  context.arc(tableCircle.x, tableCircle.y, tableCircle.radius, 0, Math.PI * 2);
  context.stroke();

  context.font = "16px Arial";
  context.textAlign = "center";

  for (const { x, y, player } of playerPositions) {
    context.fillText(player.name, x, y + 8, 100);
    context.stroke();

    if (player.dead) {
      context.beginPath();
      context.moveTo(x - deadXWidth, y - deadXWidth);
      context.lineTo(x + deadXWidth, y + deadXWidth);
      context.stroke();

      context.beginPath();
      context.moveTo(x - deadXWidth, y + deadXWidth);
      context.lineTo(x + deadXWidth, y - deadXWidth);
      context.stroke();
    }
  }
}

function getTableCircle(canvas) {
  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const circleRadius = Math.min(width, height) / 2 - 200;

  return {
    x: centerX,
    y: centerY,
    radius: circleRadius,
  };
}

function getPlayerPositions(canvas, players) {
  const tableCircle = getTableCircle(canvas);
  const playerCount = players.length;

  return players.map((player, i) => ({
    player,
    x:
      tableCircle.x +
      (tableCircle.radius + 50) * Math.cos(((Math.PI * 2) / playerCount) * i),
    y:
      tableCircle.y +
      (tableCircle.radius + 50) * Math.sin(((Math.PI * 2) / playerCount) * i),
  }));
}

function getCanvasMousePosition(canvas, event) {
  const { left, top, width, height } = canvas.getBoundingClientRect();
  const scaleX = canvas.width / width;
  const scaleY = canvas.height / height;

  return {
    x: (event.clientX - left) * scaleX,
    y: (event.clientY - top) * scaleY,
  };
}

function getDistance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function downloadCanvas(canvas, fileName) {
  const link = document.createElement("a");
  link.setAttribute("download", fileName);
  link.setAttribute(
    "href",
    canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")
  );
  link.click();
}

export default App;
