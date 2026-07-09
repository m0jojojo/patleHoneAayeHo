import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  size?: number;
  testID?: string;
}

// Colored circular icon chip used for each stat row (calories, protein, carbs, fat) - the icon
// name and tint color are chosen by the caller (see MacroSummaryCard), this component just handles
// the circular badge presentation.
export default function StatBadgeIcon({ icon, backgroundColor, size = 36, testID }: Props) {
  return (
    <View
      testID={testID}
      style={[styles.badge, { backgroundColor, width: size, height: size, borderRadius: size / 2 }]}
    >
      <Ionicons name={icon} size={size * 0.55} color={colors.textOnDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
