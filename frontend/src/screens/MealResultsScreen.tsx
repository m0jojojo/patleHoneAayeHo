import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getDishMacros, logMeal, type Macros, type ScanResult, type ScannedDish } from '../meals/api';
import { guessMealType, MEAL_TYPE_LABELS, MEAL_TYPES, type MealType } from '../meals/mealTypes';

interface Props {
  scanResult: ScanResult;
  onLogged: (result: { showSettingsNudge: boolean }) => void;
}

type OilLevel = 'low' | 'medium' | 'high';
const OIL_LEVELS: OilLevel[] = ['low', 'medium', 'high'];

interface MacroFields {
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}

const ZERO_MACROS: Macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

function toFields(macros: Macros): MacroFields {
  return {
    calories: String(Math.round(macros.calories)),
    proteinG: String(Math.round(macros.proteinG)),
    carbsG: String(Math.round(macros.carbsG)),
    fatG: String(Math.round(macros.fatG)),
  };
}

function allDishesResolved(dishes: ScannedDish[], resolved: Record<number, Macros>): boolean {
  return dishes.every((dish, index) => !dish.needsDisambiguation || resolved[index]);
}

function sumMacros(dishes: ScannedDish[], resolved: Record<number, Macros>): Macros {
  return dishes.reduce((sum, dish, index) => {
    const macros = dish.macros ?? resolved[index];
    if (!macros) return sum;
    return {
      calories: sum.calories + macros.calories,
      proteinG: sum.proteinG + macros.proteinG,
      carbsG: sum.carbsG + macros.carbsG,
      fatG: sum.fatG + macros.fatG,
    };
  }, ZERO_MACROS);
}

export default function MealResultsScreen({ scanResult, onLogged }: Props) {
  const manualMode = scanResult.visionFailed || scanResult.dishes.length === 0;

  const [resolvedMacros, setResolvedMacros] = useState<Record<number, Macros>>({});
  const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
  const [manualDishName, setManualDishName] = useState('');
  const [fields, setFields] = useState<MacroFields | null>(() => {
    if (manualMode) return toFields(ZERO_MACROS);
    if (allDishesResolved(scanResult.dishes, {})) return toFields(sumMacros(scanResult.dishes, {}));
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const [mealType, setMealType] = useState<MealType>(() => guessMealType());

  async function handleResolveOil(index: number, dish: ScannedDish, oilLevel: OilLevel) {
    setResolvingIndex(index);
    setError(null);
    try {
      const { macros } = await getDishMacros(dish.label, { oilLevel, portionMultiplier: dish.portionMultiplier });
      const nextResolved = { ...resolvedMacros, [index]: macros };
      setResolvedMacros(nextResolved);
      if (allDishesResolved(scanResult.dishes, nextResolved)) {
        setFields(toFields(sumMacros(scanResult.dishes, nextResolved)));
      }
    } catch {
      setError("Couldn't get macros for that dish. Please try again.");
    } finally {
      setResolvingIndex(null);
    }
  }

  async function handleConfirm() {
    if (!fields || logging) return;
    if (manualMode && manualDishName.trim().length === 0) {
      setError('Please enter what you ate.');
      return;
    }

    setLogging(true);
    setError(null);
    try {
      const macros: Macros = {
        calories: Number(fields.calories),
        proteinG: Number(fields.proteinG),
        carbsG: Number(fields.carbsG),
        fatG: Number(fields.fatG),
      };
      const dishLabels = manualMode ? [manualDishName.trim()] : scanResult.dishes.map((dish) => dish.label);
      const portionEstimate = manualMode
        ? { manual: true }
        : { dishes: scanResult.dishes.map((dish) => ({ label: dish.label, portionMultiplier: dish.portionMultiplier })) };

      const result = await logMeal({ dishLabels, portionEstimate, macros, mealType });
      onLogged({ showSettingsNudge: result.showSettingsNudge });
    } catch {
      setError("Couldn't log this meal. Please try again.");
    } finally {
      setLogging(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} testID="meal-results-screen">
      <Text style={styles.title}>{manualMode ? "Couldn't identify your meal" : 'Here’s what we found'}</Text>

      <Text style={styles.label}>Which meal is this?</Text>
      <View style={styles.mealTypeRow}>
        {MEAL_TYPES.map((type) => (
          <Pressable
            key={type}
            testID={`meal-type-${type}`}
            style={[styles.mealTypeOption, mealType === type && styles.mealTypeOptionSelected]}
            onPress={() => setMealType(type)}
          >
            <Text style={[styles.mealTypeOptionText, mealType === type && styles.mealTypeOptionTextSelected]}>
              {MEAL_TYPE_LABELS[type]}
            </Text>
          </Pressable>
        ))}
      </View>

      {manualMode ? (
        <>
          <Text style={styles.label}>What did you eat?</Text>
          <TextInput
            testID="manual-dish-name-input"
            style={styles.input}
            value={manualDishName}
            onChangeText={setManualDishName}
            placeholder="e.g. Dal and rice"
          />
        </>
      ) : (
        scanResult.dishes.map((dish, index) => {
          const macros = dish.macros ?? resolvedMacros[index];
          return (
            <View key={`${dish.label}-${index}`} testID={`dish-row-${index}`} style={styles.dishRow}>
              <Text style={styles.dishLabel}>{dish.label}</Text>
              {!dish.matched && !macros ? (
                <Text style={styles.dishNote}>Couldn&apos;t match to a known dish.</Text>
              ) : dish.needsDisambiguation && !macros ? (
                <>
                  <Text style={styles.dishNote}>{dish.disambiguationQuestion}</Text>
                  <View style={styles.oilOptions}>
                    {OIL_LEVELS.map((level) => (
                      <Pressable
                        key={level}
                        testID={`oil-option-${index}-${level}`}
                        style={styles.oilOption}
                        onPress={() => handleResolveOil(index, dish, level)}
                        disabled={resolvingIndex === index}
                      >
                        <Text style={styles.oilOptionText}>{level}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {resolvingIndex === index ? <ActivityIndicator /> : null}
                </>
              ) : macros ? (
                <Text style={styles.dishNote}>
                  {Math.round(macros.calories)} kcal{dish.macrosSource === 'estimated' ? ' (AI estimate)' : ''}
                </Text>
              ) : null}
            </View>
          );
        })
      )}

      {error ? (
        <Text testID="meal-results-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {fields ? (
        <>
          <Text style={styles.label}>Calories</Text>
          <TextInput
            testID="calories-input"
            style={styles.input}
            keyboardType="numeric"
            value={fields.calories}
            onChangeText={(value) => setFields({ ...fields, calories: value })}
          />
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput
            testID="protein-input"
            style={styles.input}
            keyboardType="numeric"
            value={fields.proteinG}
            onChangeText={(value) => setFields({ ...fields, proteinG: value })}
          />
          <Text style={styles.label}>Carbs (g)</Text>
          <TextInput
            testID="carbs-input"
            style={styles.input}
            keyboardType="numeric"
            value={fields.carbsG}
            onChangeText={(value) => setFields({ ...fields, carbsG: value })}
          />
          <Text style={styles.label}>Fat (g)</Text>
          <TextInput
            testID="fat-input"
            style={styles.input}
            keyboardType="numeric"
            value={fields.fatG}
            onChangeText={(value) => setFields({ ...fields, fatG: value })}
          />

          <Pressable
            testID="log-meal-button"
            style={[styles.button, logging && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={logging}
          >
            {logging ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log this meal</Text>}
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  label: { fontSize: 14, color: '#666', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  dishRow: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 4 },
  dishLabel: { fontSize: 16, fontWeight: '600' },
  dishNote: { fontSize: 13, color: '#666', marginTop: 4 },
  oilOptions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  oilOption: { borderWidth: 1, borderColor: '#111', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  oilOptionText: { fontSize: 14 },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  mealTypeOption: { borderWidth: 1, borderColor: '#111', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  mealTypeOptionSelected: { backgroundColor: '#111' },
  mealTypeOptionText: { fontSize: 13, color: '#111' },
  mealTypeOptionTextSelected: { color: '#fff' },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c00' },
});
