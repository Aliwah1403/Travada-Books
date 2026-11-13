import { createContext, useContext } from "react"

/**
 * Where an Overview tile is drawn. "grid": inside a fixed-size react-grid-layout
 * cell, so it should fill the cell (charts take the remaining height).
 * "stack": the phone column, where every tile keeps its natural height.
 * Defaults to "stack" so a component used outside the grid behaves as before.
 */
export type TileMode = "grid" | "stack"

export const TileModeContext = createContext<TileMode>("stack")

export function useTileMode(): TileMode {
  return useContext(TileModeContext)
}
