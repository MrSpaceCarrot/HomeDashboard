import { ElectronAPI } from '@electron-toolkit/preload'

interface CustomElectronAPI extends ElectronAPI {
  onTripsUpdate(callback: (data: unknown) => void): void
  onBusUpdate(callback: (data: unknown) => void): void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    busUpdate: any
  }
}
