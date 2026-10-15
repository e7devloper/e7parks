import { MaterialCommunityIcons } from '@expo/vector-icons';
import { forwardRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ColorValue,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONTENT_MAX_WIDTH, TOUCH, radius, space, type, usePalette, useStyles, type Palette } from '../lib/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Decorative icon: hidden from screen readers, the neighbouring text carries the meaning. */
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: ColorValue }) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

type ScreenProps = { children: ReactNode; padTop?: boolean; footer?: ReactNode };

/** Scrollable, keyboard-aware page body. `padTop` is for screens without a navigation header. */
export const Screen = forwardRef<ScrollView, ScreenProps>(function Screen({ children, padTop = false, footer }, ref) {
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={ref}
        style={styles.flex}
        contentContainerStyle={[
          styles.screen,
          {
            paddingTop: padTop ? insets.top + space.xxl : space.xl,
            paddingBottom: (footer ? 0 : insets.bottom) + space.xl,
            paddingLeft: insets.left + space.xl,
            paddingRight: insets.right + space.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
      {footer ? <Footer>{footer}</Footer> : null}
    </KeyboardAvoidingView>
  );
});

/** Bar pinned to the bottom edge for a screen's primary action. */
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);
  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: insets.bottom + space.md, paddingLeft: insets.left + space.xl, paddingRight: insets.right + space.xl },
      ]}
    >
      <View style={styles.column}>{children}</View>
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; hint?: string; error?: string | null; optional?: boolean };

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, hint, error, optional, style, secureTextEntry, onFocus, onBlur, ...input },
  ref
) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  // Password fields get a show/hide toggle.
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}>  Optional</Text> : null}
      </Text>
      <View>
        <TextInput
          ref={ref}
          placeholderTextColor={c.placeholder}
          selectionColor={c.link}
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          secureTextEntry={secureTextEntry && hidden}
          style={[
            styles.input,
            focused && styles.inputFocused,
            !!error && styles.inputError,
            secureTextEntry && styles.inputWithToggle,
            style,
          ]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.toggle}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={c.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'text' | 'danger';
  icon?: IconName;
};

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon }: ButtonProps) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const text = variant === 'text';
  const off = disabled || loading;
  const danger = variant === 'danger';
  const color = text ? c.link : danger ? c.onDanger : c.onAction;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={onPress}
      disabled={off}
      android_ripple={{ color: text ? c.surfaceAlt : '#00000022' }}
      style={({ pressed }) => [
        styles.button,
        text && styles.buttonText,
        danger && styles.buttonDanger,
        pressed && styles.pressed,
        off && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={color} /> : null}
          <Text style={[styles.buttonLabel, { color }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

type Option<T extends string> = { value: T; label: string; icon?: IconName };
type ChoiceProps<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
  /** `tiles`: two-column grid with icons. `pills`: wrapping row. `segments`: equal-width row for 2–4 short options. */
  layout?: 'tiles' | 'pills' | 'segments';
};

/** Single-choice control, announced to screen readers as a radio group. */
export function Choice<T extends string>({ label, options, value, onChange, error, layout = 'pills' }: ChoiceProps<T>) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.options, layout === 'segments' && styles.segments]}>
        {options.map((o) => {
          const on = o.value === value;
          const fg = on ? c.onSelect : c.heading;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              android_ripple={{ color: c.surfaceAlt }}
              style={({ pressed }) => [
                styles.option,
                layout === 'tiles' && styles.tile,
                layout === 'segments' && styles.segment,
                on && styles.optionOn,
                pressed && !on && styles.pressed,
              ]}
            >
              {o.icon ? <Icon name={o.icon} size={layout === 'tiles' ? 26 : 18} color={fg} /> : null}
              <Text style={[styles.optionText, { color: fg }, on && styles.optionTextOn]} numberOfLines={2}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/** A titled group of related fields. */
export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {description ? <Text style={styles.sectionText}>{description}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  if (!children) return null;
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <Icon name="alert-circle-outline" size={20} color={c.danger} />
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.ground },
    screen: { flexGrow: 1 },
    column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
    footer: { paddingTop: space.md, backgroundColor: c.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },

    field: { marginBottom: space.xl },
    label: { ...type.label, color: c.heading, marginBottom: space.sm },
    optional: { ...type.caption, color: c.muted, fontWeight: '400' },
    hint: { ...type.caption, color: c.muted, marginTop: space.sm },
    fieldError: { ...type.caption, color: c.danger, marginTop: space.sm, fontWeight: '600' },
    input: {
      ...type.body,
      lineHeight: undefined,
      minHeight: TOUCH + 4,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      color: c.heading,
    },
    inputFocused: { borderColor: c.link, borderWidth: 2, paddingHorizontal: space.lg - 1, paddingVertical: space.md - 1 },
    inputError: { borderColor: c.danger },
    inputWithToggle: { paddingRight: TOUCH + space.sm },
    toggle: { position: 'absolute', right: 0, top: 0, bottom: 0, width: TOUCH + 4, alignItems: 'center', justifyContent: 'center' },

    button: {
      flexDirection: 'row',
      gap: space.sm,
      backgroundColor: c.action,
      borderRadius: radius.md,
      minHeight: 54,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space.xl,
      overflow: 'hidden',
    },
    buttonText: { backgroundColor: 'transparent', minHeight: TOUCH },
    buttonDanger: { backgroundColor: c.danger },
    buttonLabel: { ...type.button },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.5 },

    options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    segments: { flexWrap: 'nowrap' },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      minHeight: TOUCH,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    tile: { flexBasis: '47%', flexGrow: 1, minHeight: 64, paddingVertical: space.md },
    segment: { flex: 1, justifyContent: 'center', paddingHorizontal: space.sm },
    optionOn: { backgroundColor: c.select, borderColor: c.select },
    optionText: { ...type.label, fontWeight: '500', flexShrink: 1 },
    optionTextOn: { fontWeight: '700' },

    section: { marginBottom: space.lg },
    sectionTitle: { ...type.title, color: c.heading },
    sectionText: { ...type.body, color: c.muted, marginTop: space.xs },
    sectionBody: { marginTop: space.lg },

    error: {
      flexDirection: 'row',
      gap: space.sm,
      alignItems: 'flex-start',
      backgroundColor: c.dangerSoft,
      padding: space.md,
      borderRadius: radius.md,
      marginBottom: space.lg,
    },
    errorText: { ...type.label, color: c.danger, flex: 1 },
  });
