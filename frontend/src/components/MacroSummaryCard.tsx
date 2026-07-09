import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Macros } from '../meals/api';
import { colors, radius, spacing, typography } from '../theme/tokens';
import Card from './Card';
import ProgressBar from './ProgressBar';
import StatBadgeIcon from './StatBadgeIcon';

interface Props {
  consumed: Macros;
  targets: Macros;
  onScanMeal: () => void;
  testID?: string;
}

interface MacroStat {
  key: 'proteinG' | 'carbsG' | 'fatG';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const MACRO_STATS: MacroStat[] = [
  { key: 'proteinG', label: 'Protein', icon: 'barbell', color: colors.protein },
  { key: 'carbsG', label: 'Carbs', icon: 'leaf', color: colors.carbs },
  { key: 'fatG', label: 'Fat', icon: 'water', color: colors.fat },
];

// The "Track Food"-style headline card: today's calories as the big number, with the meal-scan
// action embedded as an icon button in the header, and protein/carb/fat as three color-coded mini
// progress bars underneath.
export default function MacroSummaryCard({ consumed, targets, onScanMeal, testID }: Props) {
  return (
    <Card testID={testID} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <StatBadgeIcon icon="flame" backgroundColor={colors.calories} size={36} />
          <View style={styles.headlineTextGroup}>
            <Text style={styles.headline}>
              {Math.round(consumed.calories)} <Text style={styles.headlineUnit}>/ {Math.round(targets.calories)} Cal</Text>
            </Text>
            <Text style={styles.subtitle}>Eaten today</Text>
          </View>
        </View>
        <Pressable testID="scan-meal-button" onPress={onScanMeal} style={styles.scanButton}>
          <Ionicons name="camera" size={20} color={colors.textOnDark} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        {MACRO_STATS.map((stat) => {
          const consumedValue = consumed[stat.key];
          const targetValue = targets[stat.key];
          return (
            <View key={stat.key} testID={`macro-stat-${stat.key}`} style={styles.statColumn}>
              <View style={styles.statHeader}>
                <StatBadgeIcon icon={stat.icon} backgroundColor={stat.color} size={22} />
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              <Text testID={`macro-value-${stat.label}`} style={styles.statValue}>
                {Math.round(consumedValue)}g
              </Text>
              <ProgressBar testID={`macro-bar-${stat.key}`} consumed={consumedValue} target={targetValue} />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  headlineTextGroup: { flexShrink: 1 },
  headline: { ...typography.statValue, color: colors.textPrimary },
  headlineUnit: { ...typography.body, color: colors.textSecondary },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  scanButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statColumn: { flex: 1, gap: spacing.xs },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  statValue: { ...typography.bodyBold, color: colors.textPrimary },
});
