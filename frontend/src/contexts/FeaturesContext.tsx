"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getFeatures } from "@/lib/api";
import type { Features } from "@/types/features";

// Enquanto carrega, ou se a consulta falhar, tudo fica desligado: o site funciona sem IA
// e nenhum botão de IA aparece para depois sumir.
const ALL_OFF: Features = { semanticSearch: false, aiCover: false, aiChat: false, aiWriting: false };

const FeaturesContext = createContext<Features>(ALL_OFF);

// Consulta GET /config/features uma vez, ao abrir o site (fica no layout).
export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Features>(ALL_OFF);

  useEffect(() => {
    getFeatures()
      .then(setFeatures)
      .catch(() => setFeatures(ALL_OFF));
  }, []);

  return <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>;
}

// Quais recursos de IA mostrar, ex.: const { aiCover } = useFeatures();
export function useFeatures(): Features {
  return useContext(FeaturesContext);
}
