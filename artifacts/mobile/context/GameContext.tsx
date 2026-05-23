import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useState } from "react";

interface GameContextType {
  playerId: number | null;
  townId: number | null;
  playerName: string | null;
  isLoading: boolean;
  isSetupRequired: boolean;
  setPlayer: (playerId: number, townId: number, name: string) => Promise<void>;
  clearPlayer: () => Promise<void>;
  setPlayerLoading: (loading: boolean) => void;
}

const GameContext = createContext<GameContextType>({
  playerId: null,
  townId: null,
  playerName: null,
  isLoading: true,
  isSetupRequired: false,
  setPlayer: async () => {},
  clearPlayer: async () => {},
  setPlayerLoading: () => {},
});

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [townId, setTownId] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setPlayer = useCallback(async (pId: number, tId: number, name: string) => {
    await AsyncStorage.multiSet([
      ["playerId", String(pId)],
      ["townId", String(tId)],
      ["playerName", name],
    ]);
    setPlayerId(pId);
    setTownId(tId);
    setPlayerName(name);
  }, []);

  const clearPlayer = useCallback(async () => {
    await AsyncStorage.multiRemove(["playerId", "townId", "playerName"]);
    setPlayerId(null);
    setTownId(null);
    setPlayerName(null);
  }, []);

  const setPlayerLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <GameContext.Provider
      value={{
        playerId,
        townId,
        playerName,
        isLoading,
        isSetupRequired: !isLoading && playerId === null,
        setPlayer,
        clearPlayer,
        setPlayerLoading,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
