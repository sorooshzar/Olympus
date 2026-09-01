// Lightweight haptic feedback wrapper. Fails silently on unsupported devices
// (e.g. iOS Safari has no navigator.vibrate). Never throws.
export const haptic = {
  light: () => { try { navigator.vibrate?.(12); } catch {} },
  medium: () => { try { navigator.vibrate?.(28); } catch {} },
  strong: () => { try { navigator.vibrate?.(45); } catch {} },
};