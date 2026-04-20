import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { SignUpError, useAuth } from '../../../src/contexts/AuthContext';
import {
  validateAcceptedTerms,
  validateBusinessName,
  validateEmail,
  validatePassword,
  validatePersonName,
  validatePhone,
  validateRequiredChoice,
  validateShortDescription,
  validateUrl,
} from '../../../src/lib/validation';
import { Button } from '../../../src/ui/Button';
import { Checkbox } from '../../../src/ui/Checkbox';
import { ErrorBanner } from '../../../src/ui/ErrorBanner';
import { FormField } from '../../../src/ui/FormField';
import { Input } from '../../../src/ui/Input';
import { PhotoPicker } from '../../../src/ui/PhotoPicker';
import { Screen } from '../../../src/ui/Screen';
import { Select, SelectOption } from '../../../src/ui/Select';
import { theme } from '../../../src/ui/theme';

type Category = 'restaurant' | 'cafe' | 'bar' | 'gym' | 'store' | 'service' | 'other';

const CATEGORY_OPTIONS: readonly SelectOption<Category>[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'bar', label: 'Bar / Pub' },
  { value: 'gym', label: 'Gym / Fitness' },
  { value: 'store', label: 'Store / Retail' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' },
];

type Errors = Partial<
  Record<
    | 'businessName'
    | 'category'
    | 'description'
    | 'contactName'
    | 'phone'
    | 'email'
    | 'password'
    | 'website'
    | 'socialMedia'
    | 'terms',
    string
  >
>;

export default function RegisterBusiness() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [logo, setLogo] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [socialMedia, setSocialMedia] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<TextInput>(null);

  const validate = (): Errors => {
    const next: Errors = {};
    next.businessName = validateBusinessName(businessName) ?? undefined;
    next.category = validateRequiredChoice(category, 'Business category is required') ?? undefined;
    next.description = validateShortDescription(description) ?? undefined;
    next.contactName =
      validatePersonName(contactName, 'Contact person name is required') ?? undefined;
    next.phone = validatePhone(phone) ?? undefined;
    next.email = validateEmail(email) ?? undefined;
    next.password = validatePassword(password) ?? undefined;
    next.website = validateUrl(website, 'Please enter a valid website URL') ?? undefined;
    next.socialMedia =
      validateUrl(socialMedia, 'Please enter a valid social media URL') ?? undefined;
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
        displayName: businessName.trim(),
        photoURL: logo ?? undefined,
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
        <Text style={styles.title}>Business account</Text>
        <Text style={styles.subtitle}>Tell us about your business to get started.</Text>
      </View>

      {serverError ? <ErrorBanner message={serverError} /> : null}

      <View style={styles.logoRow}>
        <PhotoPicker value={logo} onChange={setLogo} shape="square" placeholderLabel="Add logo" />
      </View>

      <FormField label="Business name" required error={errors.businessName}>
        <Input
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Your business name"
          autoCapitalize="words"
          error={errors.businessName}
        />
      </FormField>

      <FormField label="Category" required error={errors.category}>
        <Select<Category>
          value={category}
          onChange={setCategory}
          options={CATEGORY_OPTIONS}
          placeholder="Select a category"
          title="Business category"
          error={errors.category}
        />
      </FormField>

      <FormField label="Short description" required error={errors.description}>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="What do you offer? (max 500 characters)"
          multiline
          numberOfLines={4}
          style={styles.textarea}
          maxLength={500}
          error={errors.description}
        />
      </FormField>

      <FormField label="Contact person name" required error={errors.contactName}>
        <Input
          value={contactName}
          onChangeText={setContactName}
          placeholder="Full name"
          autoCapitalize="words"
          textContentType="name"
          error={errors.contactName}
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

      <FormField label="Business email" required error={errors.email}>
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

      <FormField label="Website (optional)" error={errors.website}>
        <Input
          value={website}
          onChangeText={setWebsite}
          placeholder="https://example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          textContentType="URL"
          error={errors.website}
        />
      </FormField>

      <FormField label="Social media link (optional)" error={errors.socialMedia}>
        <Input
          value={socialMedia}
          onChangeText={setSocialMedia}
          placeholder="https://instagram.com/…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          textContentType="URL"
          error={errors.socialMedia}
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
  logoRow: { alignItems: 'center', marginBottom: theme.spacing.lg },
  textarea: {
    height: 110,
    paddingTop: theme.spacing.md,
    textAlignVertical: 'top',
  },
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
