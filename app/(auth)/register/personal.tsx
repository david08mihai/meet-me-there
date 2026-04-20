import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { SignUpError, useAuth } from '../../../src/contexts/AuthContext';
import {
  validateAcceptedTerms,
  validateConfirmPassword,
  validateDateOfBirth,
  validateEmail,
  validatePassword,
  validatePersonName,
  validatePhone,
  validateRequiredChoice,
} from '../../../src/lib/validation';
import { Button } from '../../../src/ui/Button';
import { Checkbox } from '../../../src/ui/Checkbox';
import { DateField } from '../../../src/ui/DateField';
import { ErrorBanner } from '../../../src/ui/ErrorBanner';
import { FormField } from '../../../src/ui/FormField';
import { Input } from '../../../src/ui/Input';
import { PhotoPicker } from '../../../src/ui/PhotoPicker';
import { Screen } from '../../../src/ui/Screen';
import { Select, SelectOption } from '../../../src/ui/Select';
import { theme } from '../../../src/ui/theme';

type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';

const GENDER_OPTIONS: readonly SelectOption<Gender>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

type Errors = Partial<
  Record<
    | 'email'
    | 'password'
    | 'confirmPassword'
    | 'name'
    | 'phone'
    | 'dateOfBirth'
    | 'gender'
    | 'terms',
    string
  >
>;

export default function RegisterPersonal() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [photo, setPhoto] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<TextInput>(null);

  const validate = (): Errors => {
    const next: Errors = {};
    next.email = validateEmail(email) ?? undefined;
    next.password = validatePassword(password) ?? undefined;
    next.confirmPassword = validateConfirmPassword(confirmPassword, password) ?? undefined;
    next.name = validatePersonName(name) ?? undefined;
    next.phone = validatePhone(phone) ?? undefined;
    next.dateOfBirth = validateDateOfBirth(dateOfBirth) ?? undefined;
    next.gender = validateRequiredChoice(gender, 'Gender is required') ?? undefined;
    next.terms = validateAcceptedTerms(acceptTerms) ?? undefined;
    return Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as Errors;
  };

  const onSubmit = async () => {
    const found = validate();
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signUp({
        email,
        password,
        displayName: name.trim(),
        photoURL: photo ?? undefined,
      });
    } catch (err) {
      if (err instanceof SignUpError && err.code === 'email-already-in-use') {
        setErrors((prev) => ({ ...prev, email: err.message }));
        emailRef.current?.focus();
      } else if (err instanceof SignUpError) {
        setServerError(err.message);
      } else {
        setServerError('Something went wrong. Please try again');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Personal account</Text>
        <Text style={styles.subtitle}>Fill in your details to create your account.</Text>
      </View>

      {serverError ? <ErrorBanner message={serverError} /> : null}

      <View style={styles.photoRow}>
        <PhotoPicker value={photo} onChange={setPhoto} placeholderLabel="Add photo" />
      </View>

      <FormField label="Email" required error={errors.email}>
        <Input
          ref={emailRef}
          value={email}
          onChangeText={setEmail}
          placeholder="name@domain.tld"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          error={errors.email}
        />
      </FormField>

      <FormField label="Password" required error={errors.password}>
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          error={errors.password}
        />
      </FormField>

      <FormField label="Confirm password" required error={errors.confirmPassword}>
        <Input
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          error={errors.confirmPassword}
        />
      </FormField>

      <FormField label="Name" required error={errors.name}>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          autoCapitalize="words"
          textContentType="name"
          error={errors.name}
        />
      </FormField>

      <FormField label="Phone number" required error={errors.phone}>
        <Input
          value={phone}
          onChangeText={setPhone}
          placeholder="+40 712 345 678"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          error={errors.phone}
        />
      </FormField>

      <FormField label="Date of birth" required error={errors.dateOfBirth}>
        <DateField
          value={dateOfBirth}
          onChange={setDateOfBirth}
          maximumDate={new Date()}
          error={errors.dateOfBirth}
        />
      </FormField>

      <FormField label="Gender" required error={errors.gender}>
        <Select<Gender>
          value={gender}
          onChange={setGender}
          options={GENDER_OPTIONS}
          placeholder="Select gender"
          title="Gender"
          error={errors.gender}
        />
      </FormField>

      <View style={styles.terms}>
        <Checkbox
          value={acceptTerms}
          onChange={setAcceptTerms}
          error={errors.terms}
          label={
            <Text style={styles.termsLabel}>
              I accept the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          }
        />
      </View>

      <Button label="Register" onPress={onSubmit} loading={submitting} disabled={submitting} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Changed your mind? </Text>
        <Text style={styles.footerLink} onPress={() => router.back()} accessibilityRole="link">
          Go back
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing.lg },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  photoRow: { alignItems: 'center', marginBottom: theme.spacing.lg },
  terms: { marginBottom: theme.spacing.lg },
  termsLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  termsLink: { color: theme.colors.primary, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  footerText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  footerLink: { color: theme.colors.primary, fontSize: theme.fontSize.sm },
});
