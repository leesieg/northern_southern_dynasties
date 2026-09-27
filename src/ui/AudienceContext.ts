import {createContext} from 'react';

export const AudienceDeferContext=createContext<(()=>void)|null>(null);
export const AudienceDecorHostContext=createContext<HTMLElement|null>(null);
