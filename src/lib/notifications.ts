import { isTauri } from '@tauri-apps/api/core'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

export async function requestReminderPermission(): Promise<boolean> {
  try {
    if (isTauri()) {
      let allowed = await isPermissionGranted()
      if (!allowed) allowed = (await requestPermission()) === 'granted'
      return allowed
    }
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export async function showReminder(title: string, body: string) {
  try {
    if (isTauri()) {
      sendNotification({ title, body })
      return
    }
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body })
  } catch (error) {
    console.error('Could not show reminder notification.', error)
  }
}
