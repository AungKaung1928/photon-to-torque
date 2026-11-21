import { createContext } from 'react'

// A live value a panel pins to one node of its chapter's diagram (e.g. the replay delay on the sim node).
export interface DiagramTag {
  route: string
  node: string
  text: string
}

export const DiagramTagContext = createContext<(tag: DiagramTag) => void>(() => {})
