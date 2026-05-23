import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { getSupabaseConfigError, supabase } from "@/lib/supabase";

function formatAuthError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? String(err);
  if (/invalid login credentials/i.test(msg)) return "Wrong email or password.";
  if (/email not confirmed/i.test(msg)) return "Check your inbox and confirm your email first.";
  if (/user already registered/i.test(msg)) return "Account exists — sign in instead.";
  if (/password should be at least/i.test(msg)) return "Password must be at least 6 characters.";
  return msg || "Something went wrong. Try again.";
}

export default function LoginScreen() {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const insets = useSafeAreaInsets();
  const { session, isLoading: authLoading, signIn, signUp, isConfigured } = useAuth();
  const { isSetupRequired, isLoading: playerLoading } = useGame();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!authLoading && !playerLoading && session) {
    if (isSetupRequired) return <Redirect href="/setup" />;
    return <Redirect href="/(tabs)" />;
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setPending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (mode === "signIn") {
        await signIn(trimmedEmail, password);
      } else if (supabase) {
        const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password });
        if (error) throw error;
        if (!data.session) {
          setError("Account created. Confirm your email, then sign in.");
          setMode("signIn");
          return;
        }
      } else {
        await signUp(trimmedEmail, password);
      }
      router.replace("/(tabs)");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setPending(false);
    }
  }

  if (!isConfigured) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + 32 }]}>
        <Text style={[styles.title, { color: colors.gold }]}>Supabase not configured</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {getSupabaseConfigError() ?? "Check .env and restart Expo with --clear."}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.inner, { paddingTop: topPad + 32, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.heroSection}>
          <View style={[styles.crownRing, { borderColor: withAlpha(colors.gold, 0.28), backgroundColor: withAlpha(colors.gold, 0.08) }]}>
            <MaterialCommunityIcons name="crown" size={56} color={colors.gold} />
          </View>
          <Text style={[styles.title, { color: colors.gold }]}>Cycle of Kings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to save your kingdom across devices and after clearing app data.
          </Text>
        </View>

        <View style={styles.formSection}>
          <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="email-outline" size={20} color={colors.gold} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={t => {
                setEmail(t);
                setError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>
          <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.gold} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={t => {
                setPassword(t);
                setError("");
              }}
              secureTextEntry
              textContentType={mode === "signIn" ? "password" : "newPassword"}
            />
          </View>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: withAlpha(colors.destructive, 0.1), borderColor: withAlpha(colors.destructive, 0.28) }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.gold, opacity: pending ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={pending}
            activeOpacity={0.8}
          >
            {pending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                {mode === "signIn" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(m => (m === "signIn" ? "signUp" : "signIn"))} activeOpacity={0.7}>
            <Text style={[styles.switchMode, { color: colors.gold }]}>
              {mode === "signIn" ? "New ruler? Create an account" : "Already have an account? Sign in"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: "center", gap: 32 },
  heroSection: { alignItems: "center", gap: 14 },
  crownRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, paddingHorizontal: 12 },
  formSection: { gap: 10 },
  inputCard: { flexDirection: "row", alignItems: "center", height: 54, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, gap: 10 },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  button: { height: 54, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  buttonText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  switchMode: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center", marginTop: 8 },
});
