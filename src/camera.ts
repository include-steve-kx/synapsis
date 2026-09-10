/** Decide whether a live camera should behave like a mirror.
 * Browser camera metadata is authoritative when available. Labels cover desktop
 * webcams (for example FaceTime cameras), where facingMode is often omitted.
 */
export function isFrontFacingCamera(settings: MediaTrackSettings, label = '', deviceCount = 0): boolean {
  if (settings.facingMode === 'user') return true;
  if (settings.facingMode === 'environment') return false;

  const normalizedLabel = label.toLowerCase();
  if (/\b(back|rear|environment|world)\b/.test(normalizedLabel)) return false;
  if (/\b(front|user|facetime|selfie|webcam)\b/.test(normalizedLabel)) return true;

  // A single unlabeled camera is normally a user-facing laptop/web camera.
  return deviceCount === 1;
}
