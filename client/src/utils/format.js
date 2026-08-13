export function formatNumber(n) {
  if (n == null) return '—';
  return n.toLocaleString();
}

export function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const SEVERITY_META = {
  CRITICAL: { label: 'Critical', color: '#E5484D', emoji: '🔴' },
  HIGH: { label: 'High', color: '#F2994A', emoji: '🟠' },
  MEDIUM: { label: 'Medium', color: '#F2C94C', emoji: '🟡' },
  LOW: { label: 'Low', color: '#5B8DEF', emoji: '🔵' },
};

export const LARGE_FILE_META = {
  Healthy: { color: '#4ADE80' },
  Normal: { color: '#5B8DEF' },
  Large: { color: '#F2C94C' },
  'Very Large': { color: '#E5484D' },
};

export function scoreColor(score) {
  if (score >= 80) return '#4ADE80';
  if (score >= 60) return '#F2C94C';
  if (score >= 40) return '#F2994A';
  return '#E5484D';
}
