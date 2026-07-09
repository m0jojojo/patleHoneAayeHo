import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDateString, todayDateString } from '../dateUtils';
import { colors, radius, spacing, typography } from '../theme/tokens';
import PillButton from './PillButton';

interface Props {
  selectedDate: string; // YYYY-MM-DD
  onCancel: () => void;
  onConfirm: (date: string) => void;
  testID?: string;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month: month - 1, day };
}

// Custom month-grid date picker - no calendar library needed for something this contained.
// Lets the dashboard load a past day's summary; future dates are shown but disabled since there's
// nothing to show for a day that hasn't happened yet.
//
// The caller is expected to only mount this when it should be shown (e.g.
// `{calendarVisible && <CalendarModal ... />}`) rather than passing a `visible` prop - mounting
// fresh each time it opens is what resets the picker back to the selected date's month, with no
// separate reset-on-reopen effect needed.
export default function CalendarModal({ selectedDate, onCancel, onConfirm, testID }: Props) {
  const [viewedYear, setViewedYear] = useState(() => parseDate(selectedDate).year);
  const [viewedMonth, setViewedMonth] = useState(() => parseDate(selectedDate).month);
  const [pendingDate, setPendingDate] = useState(selectedDate);

  const today = todayDateString();

  function goToPreviousMonth() {
    if (viewedMonth === 0) {
      setViewedYear(viewedYear - 1);
      setViewedMonth(11);
    } else {
      setViewedMonth(viewedMonth - 1);
    }
  }

  function goToNextMonth() {
    if (viewedMonth === 11) {
      setViewedYear(viewedYear + 1);
      setViewedMonth(0);
    } else {
      setViewedMonth(viewedMonth + 1);
    }
  }

  const firstWeekday = new Date(viewedYear, viewedMonth, 1).getDay();
  const daysInMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...(Array(firstWeekday).fill(null) as null[]),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel} testID={testID}>
      <Pressable testID="calendar-backdrop" style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable testID="calendar-prev-month" onPress={goToPreviousMonth}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerText}>
            {MONTH_NAMES[viewedMonth]}, {viewedYear}
          </Text>
          <Pressable testID="calendar-next-month" onPress={goToNextMonth}>
            <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((label, index) => (
            <Text key={index} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (day === null) return <View key={index} style={styles.cell} />;

            const dateString = formatDateString(new Date(viewedYear, viewedMonth, day));
            const isFuture = dateString > today;
            const isSelected = dateString === pendingDate;

            return (
              <Pressable
                key={index}
                testID={`calendar-day-${dateString}`}
                style={styles.cell}
                disabled={isFuture}
                onPress={() => setPendingDate(dateString)}
              >
                <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                  <Text
                    style={[styles.dayText, isFuture && styles.dayTextDisabled, isSelected && styles.dayTextSelected]}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <PillButton testID="calendar-cancel-button" label="Cancel" onPress={onCancel} style={styles.actionButton} />
          <PillButton
            testID="calendar-done-button"
            label="Done"
            variant="solid"
            onPress={() => onConfirm(pendingDate)}
            style={styles.actionButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { ...typography.subtitle, color: colors.textPrimary },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekdayLabel: { ...typography.caption, color: colors.textSecondary, width: CELL_SIZE, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: CELL_SIZE - 8,
    height: CELL_SIZE - 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: { backgroundColor: colors.brand },
  dayText: { ...typography.body, color: colors.textPrimary },
  dayTextDisabled: { color: colors.textMuted },
  dayTextSelected: { color: colors.textOnDark, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  actionButton: { flex: 1 },
});
