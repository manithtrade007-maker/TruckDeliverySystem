// Shared app state/handlers for extracted page components.
// App builds the value object; page components read via useApp().
import { createContext, useContext } from "react";

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);
