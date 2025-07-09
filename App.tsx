import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlayerHand } from './components/PlayerHand';
import { GameBoard } from './components/GameBoard';
import { GameState, Player, Card, Color, Value, GameMode, P2PAction } from './types';
import * as gameLogic from './services/gameLogic';

// PeerJS is globally available from the script tag in index.html
declare var Peer: any;
type DataConnection = any; // Type from PeerJS

const initialPlayers: Player[] = [
    { id: 'player1', name: 'Player 1', hand: [] },
    { id: 'player2', name: 'Player 2', hand: [] },
];

const INITIAL_STATE: GameState = {
    deck: [],
    discardPile: [],
    players: initialPlayers,
    currentPlayerIndex: 0,
    isGameOver: false,
    winner: null,
    currentColor: Color.WILD,
    gameMessage: 'Waiting to start...',
    unoCalled: [],
};

const ColorPicker: React.FC<{ onSelectColor: (color: Color) => void }> = ({ onSelectColor }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4">
            <h3 className="text-2xl font-bold text-white mb-4">Choose a color</h3>
            <div className="flex gap-4">
                <button onClick={() => onSelectColor(Color.RED)} className="w-20 h-20 rounded-full bg-red-600 hover:scale-110 transition-transform shadow-lg border-4 border-transparent hover:border-white"></button>
                <button onClick={() => onSelectColor(Color.GREEN)} className="w-20 h-20 rounded-full bg-green-600 hover:scale-110 transition-transform shadow-lg border-4 border-transparent hover:border-white"></button>
                <button onClick={() => onSelectColor(Color.BLUE)} className="w-20 h-20 rounded-full bg-blue-600 hover:scale-110 transition-transform shadow-lg border-4 border-transparent hover:border-white"></button>
                <button onClick={() => onSelectColor(Color.YELLOW)} className="w-20 h-20 rounded-full bg-yellow-500 hover:scale-110 transition-transform shadow-lg border-4 border-transparent hover:border-white"></button>
            </div>
        </div>
    </div>
);

const GameOverScreen: React.FC<{ winner: Player | null, onNewGame: () => void, isHost: boolean }> = ({ winner, onNewGame, isHost }) => (
     <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl flex flex-col items-center gap-6 text-center border-2 border-yellow-400">
            <h2 className="text-4xl font-bold text-yellow-400">Game Over</h2>
            <p className="text-2xl text-white">{winner ? `${winner.name} wins!` : 'It\'s a draw!'}</p>
            {isHost && (
                <button onClick={onNewGame} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors text-lg">
                    Play Again
                </button>
            )}
        </div>
    </div>
);

function App() {
    const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
    const [gameMode, setGameMode] = useState<GameMode>(GameMode.LOBBY);
    const [myPlayerIndex, setMyPlayerIndex] = useState<number | null>(null);
    
    const peerRef = useRef<any>(null);
    const connRef = useRef<DataConnection>(null);
    const [myPeerId, setMyPeerId] = useState<string>('');
    const [remotePeerId, setRemotePeerId] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    
    const [isColorPickerOpen, setColorPickerOpen] = useState(false);
    const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);
    
    const isHost = myPlayerIndex === 0;

    const sendAction = useCallback((action: P2PAction) => {
        if (connRef.current && connRef.current.open) {
            connRef.current.send(action);
        }
    }, []);

    const handleHostActions = useCallback((action: P2PAction, fromPlayerIndex: number) => {
        setGameState(prev => {
            const topCard = prev.discardPile[prev.discardPile.length - 1];
            let newState: GameState | null = null;
            
            switch (action.type) {
                case 'PLAY_CARD':
                    if (gameLogic.canPlayCard(action.card, topCard, prev.currentColor)) {
                        const player = prev.players[fromPlayerIndex];
                        const newHand = player.hand.filter(c => c.id !== action.card.id);
                        const newPlayers = [...prev.players];
                        newPlayers[fromPlayerIndex] = { ...player, hand: newHand };
                        
                        let tempState: GameState = {
                           ...prev,
                           players: newPlayers,
                           discardPile: [...prev.discardPile, action.card],
                        };

                        if (newHand.length === 0) {
                            newState = { ...tempState, isGameOver: true, winner: player };
                        } else if (action.card.color === Color.WILD) {
                             newState = { ...tempState, gameMessage: `${player.name} played a Wild. Waiting for color choice...` };
                        } else {
                            newState = applyCardEffects(tempState, fromPlayerIndex, action.card);
                        }
                    }
                    break;
                case 'DRAW_CARD': {
                    let deck = [...prev.deck];
                    let discardPile = [...prev.discardPile];
                     if (deck.length === 0) {
                        deck = gameLogic.shuffleDeck(discardPile.slice(0, -1));
                        discardPile = discardPile.slice(-1);
                    }
                    if(deck.length > 0) {
                        const newPlayers = [...prev.players];
                        newPlayers[fromPlayerIndex].hand.push(deck.pop()!);
                        newState = { ...prev, deck, discardPile, players: newPlayers, currentPlayerIndex: (fromPlayerIndex + 1) % 2, gameMessage: `${prev.players[fromPlayerIndex].name} drew a card.` };
                    }
                    break;
                }
                case 'CHOOSE_COLOR': {
                     const lastPlayedCard = prev.discardPile[prev.discardPile.length-1];
                     newState = applyCardEffects(prev, fromPlayerIndex, lastPlayedCard, action.color);
                     break;
                }
                case 'CALL_UNO': {
                    const newUnoCalled = [...prev.unoCalled, prev.players[fromPlayerIndex].id];
                    newState = {...prev, unoCalled: newUnoCalled, gameMessage: `${prev.players[fromPlayerIndex].name} called UNO!`};
                    break;
                }
            }

            if (newState) {
                sendAction({ type: 'GAME_STATE_UPDATE', gameState: newState });
                return newState;
            }
            return prev;
        });
    }, [sendAction]);
    
    const applyCardEffects = (
        state: GameState,
        playerIndex: number,
        card: Card,
        chosenColor?: Color
    ): GameState => {
        let { players, deck } = JSON.parse(JSON.stringify(state));
        let nextPlayerIndex = (playerIndex + 1) % players.length;
        let message = '';
        const cardPlayerName = players[playerIndex].name;
    
        switch (card.value) {
            case Value.DRAW_TWO: {
                const victimIndex = nextPlayerIndex;
                for (let i = 0; i < 2; i++) if (deck.length > 0) players[victimIndex].hand.push(deck.pop()!);
                nextPlayerIndex = (victimIndex + 1) % players.length;
                message = `${cardPlayerName} played Draw Two. ${players[victimIndex].name} draws 2.`;
                break;
            }
            case Value.WILD_DRAW_FOUR: {
                const victimIndex = nextPlayerIndex;
                for (let i = 0; i < 4; i++) if (deck.length > 0) players[victimIndex].hand.push(deck.pop()!);
                nextPlayerIndex = (victimIndex + 1) % players.length;
                message = `${cardPlayerName} played W+4 & chose ${chosenColor}. ${players[victimIndex].name} draws 4.`;
                break;
            }
            case Value.SKIP:
            case Value.REVERSE:
                nextPlayerIndex = (playerIndex + 2) % players.length;
                message = `${cardPlayerName} played ${card.value}. Turn skipped.`;
                break;
            case Value.WILD:
                 message = `${cardPlayerName} played a Wild and chose ${chosenColor}.`;
                 break;
            default:
                 message = `${cardPlayerName} played a ${card.color} ${card.value}.`;
        }
        
        return {
            ...state,
            players,
            deck,
            currentColor: chosenColor || card.color,
            currentPlayerIndex: nextPlayerIndex,
            gameMessage: message,
        };
    };

    const setupConnectionEvents = useCallback((conn: DataConnection) => {
        conn.on('data', (data: P2PAction) => {
            if (isHost) {
                const remotePlayerIndex = myPlayerIndex === 0 ? 1 : 0;
                if(data.type === 'PLAYER_INFO') {
                     setGameState(prev => {
                         const newPlayers = [...prev.players];
                         newPlayers[remotePlayerIndex].name = data.name;
                         return {...prev, players: newPlayers};
                     });
                     sendAction({type: 'PLAYER_INFO', name: gameState.players[myPlayerIndex!].name });
                } else {
                    handleHostActions(data, remotePlayerIndex);
                }
            } else {
                if (data.type === 'GAME_STATE_UPDATE') {
                    setGameState(data.gameState);
                } else if(data.type === 'START_GAME') {
                    setMyPlayerIndex(data.playerIndex);
                    setGameState(data.initialState);
                    setGameMode(GameMode.PLAYING);
                } else if(data.type === 'PLAYER_INFO') {
                     setGameState(prev => {
                         const newPlayers = [...prev.players];
                         newPlayers[0].name = data.name;
                         return {...prev, players: newPlayers};
                     });
                }
            }
        });
        conn.on('open', () => {
             connRef.current = conn;
             if(!isHost){
                sendAction({ type: 'PLAYER_INFO', name: `Player ${Math.floor(Math.random()*100)}`})
             }
        });
        conn.on('close', () => {
            setErrorMsg('Connection lost.');
            setGameMode(GameMode.ERROR);
        });
    }, [isHost, myPlayerIndex, handleHostActions, sendAction, gameState.players]);
    
    useEffect(() => {
        const peer = new Peer();
        peerRef.current = peer;
        peer.on('open', (id: string) => setMyPeerId(id));
        peer.on('connection', (conn: DataConnection) => {
            if (gameMode !== GameMode.HOSTING) {
                 conn.close();
                 return;
            }
            connRef.current = conn;
            setGameMode(GameMode.PLAYING);
            setupConnectionEvents(conn);
            startNewGame();
        });
        peer.on('error', (err: any) => {
            setErrorMsg(`PeerJS Error: ${err.type}`);
            setGameMode(GameMode.ERROR);
        });

        return () => {
            peer.destroy();
        }
    }, [gameMode, setupConnectionEvents]);

    const startNewGame = useCallback(() => {
        let deck = gameLogic.shuffleDeck(gameLogic.createDeck());
        const newPlayers = JSON.parse(JSON.stringify(initialPlayers));

        for (let i = 0; i < 7; i++) {
            newPlayers[0].hand.push(deck.pop()!);
            newPlayers[1].hand.push(deck.pop()!);
        }

        let topCard = deck.pop()!;
        while(topCard.value === Value.WILD_DRAW_FOUR) {
            deck.push(topCard);
            deck = gameLogic.shuffleDeck(deck);
            topCard = deck.pop()!;
        }
        
        const initialState = {
            ...INITIAL_STATE,
            deck,
            discardPile: [topCard],
            players: newPlayers,
            currentColor: topCard.color === Color.WILD ? Color.RED : topCard.color,
            gameMessage: "Game started! Player 1's turn."
        };
        
        setGameState(initialState);
        setMyPlayerIndex(0);
        sendAction({type: 'START_GAME', initialState, playerIndex: 1 });

    }, [sendAction]);

    const handleCreateGame = () => {
        setGameMode(GameMode.HOSTING);
    };

    const handleJoinGame = () => {
        if (!remotePeerId) {
            setErrorMsg('Please enter a Game ID.');
            return;
        }
        if (peerRef.current) {
            const conn = peerRef.current.connect(remotePeerId);
            setupConnectionEvents(conn);
        }
    };

    const handlePlayCard = (card: Card) => {
        const player = gameState.players[myPlayerIndex!];
        if (card.color === Color.WILD) {
            setPendingWildCard(card);
            setColorPickerOpen(true);
        }
        
        if (isHost) {
            handleHostActions({ type: 'PLAY_CARD', card }, myPlayerIndex!);
        } else {
            sendAction({ type: 'PLAY_CARD', card });
        }
        if (player.hand.length === 2 && !gameState.unoCalled.includes(player.id)){
            // you should call uno
        }
    };
    
    const handleDrawCard = () => {
        if (isHost) {
            handleHostActions({ type: 'DRAW_CARD' }, myPlayerIndex!);
        } else {
            sendAction({ type: 'DRAW_CARD' });
        }
    };
    
    const handleSelectColor = (color: Color) => {
        setColorPickerOpen(false);
        setPendingWildCard(null);
        if (isHost) {
            handleHostActions({ type: 'CHOOSE_COLOR', color }, myPlayerIndex!);
        } else {
            sendAction({ type: 'CHOOSE_COLOR', color });
        }
    };
    
    const handleUnoClick = () => {
        if (isHost) {
            handleHostActions({ type: 'CALL_UNO' }, myPlayerIndex!);
        } else {
            sendAction({ type: 'CALL_UNO' });
        }
    }

    const me = myPlayerIndex !== null ? gameState.players[myPlayerIndex] : null;
    const opponent = myPlayerIndex !== null ? gameState.players[(myPlayerIndex + 1) % 2] : null;

    if (gameMode === GameMode.LOBBY || gameMode === GameMode.HOSTING || gameMode === GameMode.JOINING) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-800 text-white p-4">
                <div className="w-full max-w-md bg-gray-900 rounded-xl shadow-2xl p-8 text-center">
                    <h1 className="text-4xl font-bold mb-6 text-yellow-400">UNO Multiplayer</h1>
                    {gameMode === GameMode.HOSTING ? (
                        <div>
                            <h2 className="text-2xl mb-4">Your Game ID:</h2>
                            <p className="text-3xl font-mono bg-gray-700 p-3 rounded-lg select-all cursor-pointer">{myPeerId || 'Loading...'}</p>
                            <p className="mt-4 text-gray-400">Share this ID with your friend. Waiting for them to connect...</p>
                        </div>
                    ) : (
                        <>
                            <button onClick={handleCreateGame} className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors text-lg mb-4">
                                Create Game
                            </button>
                            <div className="my-4 text-gray-500">OR</div>
                             <div className="flex flex-col gap-4">
                                <input type="text" value={remotePeerId} onChange={e => setRemotePeerId(e.target.value)}
                                    placeholder="Enter Friend's Game ID"
                                    className="w-full p-3 rounded-lg bg-gray-700 border-2 border-gray-600 focus:border-yellow-400 focus:outline-none" />
                                <button onClick={handleJoinGame} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-lg">
                                    Join Game
                                </button>
                             </div>
                        </>
                    )}
                    {errorMsg && <p className="text-red-500 mt-4">{errorMsg}</p>}
                </div>
            </div>
        )
    }

    if (gameMode === GameMode.ERROR) {
        return <div className="min-h-screen flex items-center justify-center"><h1 className="text-2xl text-red-500">{errorMsg}</h1></div>
    }

    const topCard = gameState.discardPile.length > 0 ? gameState.discardPile[gameState.discardPile.length - 1] : null;
    const isMyTurn = myPlayerIndex === gameState.currentPlayerIndex;

    return (
        <div className="min-h-screen bg-cover bg-center bg-fixed" style={{backgroundImage: 'url(https://picsum.photos/seed/uno-bg/1920/1080)'}}>
            <div className="min-h-screen bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-between p-4 font-sans">
                 {gameState.isGameOver && <GameOverScreen winner={gameState.winner} onNewGame={startNewGame} isHost={isHost} />}
                 {isColorPickerOpen && <ColorPicker onSelectColor={handleSelectColor} />}
                 
                 {opponent && (
                    <div className="w-full flex-shrink-0">
                        <PlayerHand player={opponent} onCardClick={() => {}} isMe={false} isCurrentPlayer={gameState.currentPlayerIndex === ((myPlayerIndex! + 1) % 2)} />
                    </div>
                 )}

                <main className="w-full flex-grow flex items-center justify-center">
                     <GameBoard topCard={topCard} onDrawClick={handleDrawCard} gameMessage={gameState.gameMessage} currentColor={gameState.currentColor} canDraw={isMyTurn && !isColorPickerOpen} />
                </main>

                {me && (
                    <div className="w-full flex-shrink-0">
                        <PlayerHand player={me} onCardClick={handlePlayCard} isMe={true} isCurrentPlayer={isMyTurn && !isColorPickerOpen} />
                         <div className="flex justify-center mt-4">
                            <button onClick={handleUnoClick} 
                                className="bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                disabled={me.hand.length !== 1 || gameState.unoCalled.includes(me.id)}>
                                UNO
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
