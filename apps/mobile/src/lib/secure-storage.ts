import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Storage session web-safe — expo-secure-store TIDAK punya implementasi web
 * (native module kosong → setItemAsync/deleteItemAsync THROW). Di web pakai
 * localStorage (sesi demo; data non-rahasia). Native tetap SecureStore.
 */

const isWeb = Platform.OS === 'web'

function webGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function webSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // localStorage penuh/diblokir — abaikan (sesi tidak bertahan)
  }
}

function webDelete(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) return webGet(key)
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    webSet(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    webDelete(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}