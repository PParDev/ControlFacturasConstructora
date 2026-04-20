// Global singleton toast emitter — import { toast } from '../lib/toast' from anywhere
const listeners = []

function emit(notification) {
  listeners.forEach(fn => fn({ ...notification, id: Date.now() + Math.random() }))
}

function subscribe(fn) {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
  }
}

export const toast = {
  success: (msg) => emit({ type: 'success', msg }),
  error:   (msg) => emit({ type: 'error',   msg }),
  warning: (msg) => emit({ type: 'warning', msg }),
  info:    (msg) => emit({ type: 'info',    msg }),
}

export { subscribe }
