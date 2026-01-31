/// <reference types="vite/client" />

import { ElectronAPI } from '@shared/types/ipc.types';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
