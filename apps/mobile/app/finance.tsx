import { useBudgets, useCreateExpense, useCurrentFamily, useExpenses, useSavingsGoals } from "@/lib/queries";
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

function currency(s: string): string {
  return `$${Number(s).toFixed(2)}`;
}

export default function FinanceScreen() {
  const { family } = useCurrentFamily();
  const { data: budgets = [] } = useBudgets(family?.familyId);
  const { data: expenses = [] } = useExpenses(family?.familyId);
  const { data: goals = [] } = useSavingsGoals(family?.familyId);
  const createExpense = useCreateExpense();

  if (!family) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Create a family first.</Text>
      </View>
    );
  }

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalBudget = budgets.reduce((s, b) => s + Number(b.limitAmount), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <Text style={styles.title}>Finance</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Budget</Text>
          <Text style={styles.summaryValue}>{currency(String(totalBudget))}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Spent</Text>
          <Text style={styles.summaryValue}>{currency(String(totalSpent))}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Left</Text>
          <Text style={[styles.summaryValue, totalBudget - totalSpent < 0 && styles.negative]}>
            {currency(String(totalBudget - totalSpent))}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Budgets</Text>
      {budgets.length === 0 ? (
        <Text style={styles.muted}>No budgets yet.</Text>
      ) : (
        budgets.map((b) => {
          const pct = Number(b.limitAmount) > 0 ? (Number(b.spentAmount) / Number(b.limitAmount)) * 100 : 0;
          return (
            <View key={b.id} style={styles.card}>
              <Text style={styles.cardTitle}>{b.name}</Text>
              <Text style={styles.cardSub}>
                {currency(b.spentAmount)} / {currency(b.limitAmount)} ({b.period})
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 100 ? "#EF4444" : pct > 80 ? "#F59E0B" : "#4F46E5" },
                  ]}
                />
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.sectionTitle}>Quick expense</Text>
      <ExpenseQuickAdd familyId={family.familyId} create={createExpense} />

      <Text style={styles.sectionTitle}>Recent expenses</Text>
      {expenses.length === 0 ? (
        <Text style={styles.muted}>No expenses yet.</Text>
      ) : (
        expenses.slice(0, 10).map((e) => (
          <View key={e.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{e.merchant || "Unknown"}</Text>
              <Text style={styles.amount}>{currency(e.amount)}</Text>
            </View>
            <Text style={styles.cardSub}>
              {e.category || "Uncategorized"} - {new Date(e.expenseDate).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Savings goals</Text>
      {goals.length === 0 ? (
        <Text style={styles.muted}>No savings goals yet.</Text>
      ) : (
        goals.map((g) => {
          const pct = Number(g.targetAmount) > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0;
          return (
            <View key={g.id} style={styles.card}>
              <Text style={styles.cardTitle}>{g.name}</Text>
              <Text style={styles.cardSub}>
                {currency(g.currentAmount)} / {currency(g.targetAmount)}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: "#10B981" }]} />
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function ExpenseQuickAdd({ familyId, create }: { familyId: string; create: ReturnType<typeof useCreateExpense> }) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");

  return (
    <View style={styles.quickAdd}>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount $"
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        value={merchant}
        onChangeText={setMerchant}
        placeholder="Merchant"
        style={styles.input}
      />
      <TextInput
        value={category}
        onChangeText={setCategory}
        placeholder="Category"
        style={styles.input}
      />
      <Pressable
        style={[styles.btn, create.isPending && styles.disabled]}
        disabled={create.isPending}
        onPress={async () => {
          if (!amount) return;
          await create.mutateAsync({
            familyId,
            amount,
            merchant: merchant || undefined,
            category: category || undefined,
            expenseDate: new Date().toISOString(),
          });
          setAmount(""); setMerchant(""); setCategory("");
        }}
      >
        <Text style={styles.btnText}>{create.isPending ? "Adding..." : "Add expense"}</Text>
      </Pressable>
    </View>
  );
}

import { useState } from "react";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  summaryItem: { flex: 1, alignItems: "center", backgroundColor: "#F5F5FF", borderRadius: 16, padding: 12 },
  summaryLabel: { fontSize: 12, color: "#6B7280" },
  summaryValue: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 4 },
  negative: { color: "#EF4444" },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginTop: 24, marginBottom: 8 },
  card: { borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 8 },
  cardTitle: { fontWeight: "600", color: "#111827" },
  cardSub: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  amount: { fontWeight: "700", color: "#111827" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressBar: { height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, marginTop: 8, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  quickAdd: { gap: 8 },
  input: { borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 12 },
  btn: { backgroundColor: "#4F46E5", padding: 14, borderRadius: 16 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  muted: { color: "#888" },
});
