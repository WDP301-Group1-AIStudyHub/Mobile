import { StyleSheet, Text, View } from 'react-native'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { formatBytes } from '../../utils/formatBytes'
import type { StorageStatus } from '../../types/storage'

// Layout-only styles live at module level; colours are applied inline because
// they depend on the theme and on the current status.
const styles = StyleSheet.create({
  track: { height: 6, borderRadius: Radius.sm, overflow: 'hidden' },
  fill: { height: 6, borderRadius: Radius.sm },
  labelRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: FontSize.xs },
  percent: { fontSize: FontSize.xs, fontWeight: '700' },
})

export default function StorageUsageBar({
  quotaBytes,
  showLabel = true,
  status,
  usedBytes,
}: {
  quotaBytes: number
  showLabel?: boolean
  status: StorageStatus
  usedBytes: number
}) {
  const C = useColors()
  const percent =
    quotaBytes > 0 ? Math.max(0, Math.min(100, (usedBytes / quotaBytes) * 100)) : 100
  const fillColor =
    status === 'FULL' || status === 'CRITICAL'
      ? C.error
      : status === 'WARNING'
        ? C.warning
        : C.accentTeal

  return (
    <View>
      <View style={[styles.track, { backgroundColor: C.cardBorder }]}>
        {/* Width stays inline so a quota change never rebuilds the stylesheet. */}
        <View
          style={[styles.fill, { backgroundColor: fillColor, width: `${percent}%` }]}
        />
      </View>
      {showLabel ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: C.textSecondary }]}>
            {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
          </Text>
          <Text style={[styles.percent, { color: C.textSecondary }]}>
            {percent.toFixed(percent >= 10 ? 0 : 1)}%
          </Text>
        </View>
      ) : null}
    </View>
  )
}
