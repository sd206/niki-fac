import { useActivity, useCurrentFamily, useEvents, useTasks } from "@/lib/queries";
import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HomeScreen() {
  const { family } = useCurrentFamily();
  const now = new Date();
  const from = startOfDay(now).toISOString();
  const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events = [] } = useEvents(family?.familyId, from, to);
  const { data: tasks = [] } = useTasks(family?.familyId, "open");
  const { data: activity = [] } = useActivity(family?.familyId, 5);

  const today = events.filter((e) => {
    const d = new Date(e.startAt);
    return d >= startOfDay(now) && d <= endOfDay(now);
  });
  const upcoming = events.filter((e) => new Date(e.startAt) > endOfDay(now)).slice(0, 5);
  const dueTasks = tasks
    .filter((t) => t.dueAt && new Date(t.dueAt) <= endOfDay(now))
    .slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.greeting}>
        {greeting()}
        {family ? `, the ${family.name} family` : ""}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today</Text>
        {today.length === 0 ? (
          <Text style={styles.muted}>Nothing scheduled today.</Text>
        ) : (
          today.map((e) => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.eventTitle}>{e.title}</Text>
              <Text style={styles.muted}>{formatTime(e.startAt)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <Link href="/calendar" style={styles.link}>
            Calendar
          </Link>
        </View>
        {upcoming.length === 0 ? (
          <Text style={styles.muted}>No upcoming events.</Text>
        ) : (
          upcoming.map((e) => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.eventTitle}>{e.title}</Text>
              <Text style={styles.muted}>{formatWhen(e.startAt)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tasks due</Text>
          <Link href="/tasks" style={styles.link}>
            All tasks
          </Link>
        </View>
        {dueTasks.length === 0 ? (
          <Text style={styles.muted}>No tasks due today.</Text>
        ) : (
          dueTasks.map((t) => (
            <View key={t.id} style={styles.row}>
              <Text style={styles.eventTitle}>{t.title}</Text>
              <Text style={styles.muted}>
                {t.dueAt && formatWhen(t.dueAt)}
                {t.points > 0 ? ` - +${t.points} pts` : ""}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Link href="/family/activity" style={styles.link}>
            View all
          </Link>
        </View>
        {activity.length === 0 ? (
          <Text style={styles.muted}>No recent activity.</Text>
        ) : (
          activity.map((a) => (
            <View key={a.id} style={styles.row}>
              <Text style={styles.eventTitle}>
                {a.actorName || "Someone"} {a.action} {a.entity}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.navRow}>
        <Link href="/family/directory" style={styles.navBtn}>
          Members
        </Link>
        <Link href="/tasks" style={styles.navBtn}>
          Tasks
        </Link>
        <Link href="/finance" style={styles.navBtn}>
          Finance
        </Link>
        <Link href="/meals" style={styles.navBtn}>
          Meals
        </Link>
        <Link href="/travel" style={styles.navBtn}>
          Travel
        </Link>
        <Link href="/documents" style={styles.navBtn}>
          Vault
        </Link>
        <Link href="/ai" style={styles.navBtn}>
          AI
        </Link>
        <Link href="/memories" style={styles.navBtn}>
          Memory
        </Link>
        <Link href="/family/invite" style={styles.navBtn}>
          Invite
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  greeting: { fontSize: 22, fontWeight: "700", color: "#111827" },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  eventTitle: { fontWeight: "600", color: "#111827" },
  muted: { color: "#6B7280" },
  link: { color: "#4F46E5", fontWeight: "600" },
  navRow: { flexDirection: "row", gap: 8, marginTop: 24, flexWrap: "wrap" },
  navBtn: {
    backgroundColor: "#F5F5FF",
    color: "#4F46E5",
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
});
