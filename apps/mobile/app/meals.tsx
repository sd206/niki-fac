import { useCreateMeal, useCreateShoppingItem, useCurrentFamily, useDeleteShoppingItem, useMeals, useShoppingList } from "@/lib/queries";
import type { MealType } from "@niki/shared-types";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDay(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

export default function MealsScreen() {
  const { family } = useCurrentFamily();
  const from = startOfWeek(new Date()).toISOString();
  const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: meals = [], isLoading } = useMeals(family?.familyId, from, to);
  const { data: shopping = [] } = useShoppingList(family?.familyId);
  const createMeal = useCreateMeal();
  const createShopping = useCreateShoppingItem();
  const delShopping = useDeleteShoppingItem();

  const [shopName, setShopName] = useState("");

  if (!family) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Create a family first.</Text>
      </View>
    );
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() + i);
    return d;
  });

  const mealsByDate = new Map<string, typeof meals>();
  for (const m of meals) {
    const key = new Date(m.date).toDateString();
    const arr = mealsByDate.get(key) ?? [];
    arr.push(m);
    mealsByDate.set(key, arr);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <Text style={styles.title}>Meals</Text>

      <Text style={styles.sectionTitle}>This Week</Text>
      {isLoading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginTop: 16 }} />
      ) : (
        days.map((d) => {
          const dayMeals = mealsByDate.get(d.toDateString()) ?? [];
          return (
            <View key={d.toISOString()} style={styles.dayCard}>
              <Text style={styles.dayLabel}>{formatDay(d)}</Text>
              {dayMeals.length === 0 ? (
                <Text style={styles.muted}>No meals planned.</Text>
              ) : (
                dayMeals.map((m) => (
                  <View key={m.id} style={styles.mealRow}>
                    <Text style={styles.mealType}>{m.mealType}</Text>
                    <Text style={styles.mealTitle}>{m.title}</Text>
                  </View>
                ))
              )}
              <View style={styles.quickAddRow}>
                {MEAL_TYPES.map((mt) => (
                  <Pressable
                    key={mt}
                    style={styles.quickBtn}
                    onPress={() => createMeal.mutate({
                      familyId: family!.familyId,
                      date: d.toISOString(),
                      mealType: mt,
                      title: mt,
                    })}
                  >
                    <Text style={styles.quickBtnText}>+{mt[0]}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.sectionTitle}>Shopping List</Text>
      <View style={styles.shoppingAdd}>
        <TextInput
          value={shopName}
          onChangeText={setShopName}
          placeholder="Add item..."
          style={styles.input}
        />
        <Pressable
          style={styles.btn}
          onPress={async () => {
            if (!shopName) return;
            await createShopping.mutateAsync({ familyId: family!.familyId, name: shopName });
            setShopName("");
          }}
        >
          <Text style={styles.btnText}>Add</Text>
        </Pressable>
      </View>
      {shopping.length === 0 ? (
        <Text style={styles.muted}>No items on the list.</Text>
      ) : (
        shopping.map((item) => (
          <View key={item.id} style={styles.shopRow}>
            <Text style={[styles.shopName, item.checked && styles.checked]}>{item.name}</Text>
            <Pressable onPress={() => delShopping.mutate(item.id)}>
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginTop: 24, marginBottom: 8 },
  dayCard: { borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 8 },
  dayLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  mealRow: { flexDirection: "row", gap: 8, marginBottom: 2 },
  mealType: { fontSize: 12, color: "#4F46E5", fontWeight: "600", textTransform: "capitalize" },
  mealTitle: { fontSize: 14, color: "#111827" },
  quickAddRow: { flexDirection: "row", gap: 4, marginTop: 4 },
  quickBtn: { backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  quickBtnText: { fontSize: 12, color: "#4F46E5", fontWeight: "600" },
  shoppingAdd: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: { flex: 1, borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 12 },
  btn: { backgroundColor: "#4F46E5", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  btnText: { color: "#fff", fontWeight: "600" },
  shopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 12, padding: 8, marginBottom: 4 },
  shopName: { color: "#111827" },
  checked: { textDecorationLine: "line-through", color: "#9CA3AF" },
  delete: { color: "#EF4444", fontSize: 12 },
  muted: { color: "#888" },
});
