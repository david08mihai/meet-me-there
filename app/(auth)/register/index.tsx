import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../../../src/contexts/AuthContext';
import {
  createLocalAccount,
  isAuthNetworkError,
} from '../../../src/lib/localAuth';
import { supabase } from '../../../src/lib/supabase';
import {
  validateAcceptedTerms,
  validateBusinessCategory,
  validateBusinessName,
  validateConfirmPassword,
  validateDateOfBirth,
  validateEmail,
  validatePassword,
  validatePersonName,
  validatePhone,
  validateShortDescription,
  validateSocialMedia,
  validateUrl,
} from '../../../src/lib/validation';
import { Button } from '../../../src/ui/Button';
import { ErrorBanner } from '../../../src/ui/ErrorBanner';
import { FormField } from '../../../src/ui/FormField';
import { Input } from '../../../src/ui/Input';
import { Screen } from '../../../src/ui/Screen';
import { theme, useThemeColors } from '../../../src/ui/theme';

type AccountType = 'personal' | 'business';

type PersonalForm = {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  acceptTerms: boolean;
};

type BusinessForm = {
  businessName: string;
  category: string;
  shortDescription: string;
  contactPerson: string;
  phone: string;
  businessEmail: string;
  password: string;
  confirmPassword: string;
  website: string;
  socialMedia: string;
  acceptTerms: boolean;
};

type PersonalErrors = Partial<Record<keyof PersonalForm, string>>;
type BusinessErrors = Partial<Record<keyof BusinessForm, string>>;

const emptyPersonal: PersonalForm = {
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  acceptTerms: false,
};

const emptyBusiness: BusinessForm = {
  businessName: '',
  category: '',
  shortDescription: '',
  contactPerson: '',
  phone: '',
  businessEmail: '',
  password: '',
  confirmPassword: '',
  website: '',
  socialMedia: '',
  acceptTerms: false,
};

export default function RegisterAccountType() {
  const router = useRouter();
  const { setLocalSession } = useAuth();
  const colors = useThemeColors();

  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [personal, setPersonal] = useState<PersonalForm>(emptyPersonal);
  const [business, setBusiness] = useState<BusinessForm>(emptyBusiness);
  const [personalErrors, setPersonalErrors] = useState<PersonalErrors>({});
  const [businessErrors, setBusinessErrors] = useState<BusinessErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () =>
      accountType === 'personal'
        ? 'Create your personal account'
        : 'Create your business account',
    [accountType],
  );

  const validatePersonal = () => {
    const errors: PersonalErrors = {};

    errors.email = validateEmail(personal.email.trim().toLowerCase()) ?? undefined;
    errors.password = validatePassword(personal.password) ?? undefined;
    errors.confirmPassword =
      validateConfirmPassword(personal.confirmPassword, personal.password) ?? undefined;
    errors.name = validatePersonName(personal.name, 'Name is required') ?? undefined;
    errors.phone = validatePhone(personal.phone) ?? undefined;
    const parsedDate = personal.dateOfBirth.trim() ? new Date(personal.dateOfBirth.trim()) : null;
    errors.dateOfBirth = validateDateOfBirth(parsedDate) ?? undefined;
    errors.gender = personal.gender ? undefined : 'Gender is required';
    errors.acceptTerms = validateAcceptedTerms(personal.acceptTerms) ?? undefined;

    const compact = Object.fromEntries(
      Object.entries(errors).filter(([, value]) => Boolean(value)),
    ) as PersonalErrors;
    setPersonalErrors(compact);
    return Object.keys(compact).length === 0;
  };

  const validateBusiness = () => {
    const errors: BusinessErrors = {};

    errors.businessName = validateBusinessName(business.businessName) ?? undefined;
    errors.category = validateBusinessCategory(business.category) ?? undefined;
    errors.shortDescription =
      validateShortDescription(business.shortDescription) ?? undefined;
    errors.contactPerson =
      validatePersonName(business.contactPerson, 'Contact person name is required') ?? undefined;
    errors.phone = validatePhone(business.phone) ?? undefined;
    errors.businessEmail =
      validateEmail(business.businessEmail.trim().toLowerCase()) ?? undefined;
    errors.password = validatePassword(business.password) ?? undefined;
    errors.confirmPassword =
      validateConfirmPassword(business.confirmPassword, business.password) ?? undefined;
    errors.website = validateUrl(business.website, 'Please enter a valid website URL') ?? undefined;
    errors.socialMedia = validateSocialMedia(business.socialMedia) ?? undefined;
    errors.acceptTerms = validateAcceptedTerms(business.acceptTerms) ?? undefined;

    const compact = Object.fromEntries(
      Object.entries(errors).filter(([, value]) => Boolean(value)),
    ) as BusinessErrors;
    setBusinessErrors(compact);
    return Object.keys(compact).length === 0;
  };

  const createLocalFallbackAccount = async () => {
    const localUser =
      accountType === 'personal'
        ? await createLocalAccount({
            email: personal.email,
            password: personal.password,
            accountType: 'personal',
            displayName: personal.name,
            phone: personal.phone,
          })
        : await createLocalAccount({
            email: business.businessEmail,
            password: business.password,
            accountType: 'business',
            displayName: business.businessName,
            phone: business.phone,
          });

    await setLocalSession(localUser);
    router.replace('/map');
  };

  const handleRegister = async () => {
    setErrorMessage(null);
    setNotice(null);

    const isValid = accountType === 'personal' ? validatePersonal() : validateBusiness();
    if (!isValid) return;

    try {
      setLoading(true);

      if (accountType === 'personal') {
        const email = personal.email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email,
          password: personal.password,
        });

        if (error) throw error;
        if (!data.user) throw new Error('User was not created');

        const { error: userInsertError } = await supabase.from('users').insert({
          user_id: data.user.id,
          email,
          phone: personal.phone.trim(),
          account_type: 'personal',
          role: 'user',
          account_status: 'active',
        });
        if (userInsertError) throw userInsertError;

        const { error: personalInsertError } = await supabase
          .from('personal_profiles')
          .insert({
            user_id: data.user.id,
            full_name: personal.name.trim(),
            date_of_birth: personal.dateOfBirth.trim(),
            gender: personal.gender,
            photo_url: null,
          });
        if (personalInsertError) throw personalInsertError;
      } else {
        const email = business.businessEmail.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email,
          password: business.password,
        });

        if (error) throw error;
        if (!data.user) throw new Error('User was not created');

        const { error: userInsertError } = await supabase.from('users').insert({
          user_id: data.user.id,
          email,
          phone: business.phone.trim(),
          account_type: 'business',
          role: 'user',
          account_status: 'active',
        });
        if (userInsertError) throw userInsertError;

        const { error: businessInsertError } = await supabase
          .from('business_profiles')
          .insert({
            user_id: data.user.id,
            business_name: business.businessName.trim(),
            business_category: business.category.trim(),
            short_description: business.shortDescription.trim(),
            contact_person_name: business.contactPerson.trim(),
            logo_url: null,
            location_text: null,
            website: business.website.trim() || null,
            social_media_link: business.socialMedia.trim() || null,
          });
        if (businessInsertError) throw businessInsertError;
      }

      setNotice('Account created. Please check your email to confirm your account.');
      router.replace('/verify-email');
    } catch (error) {
      if (isAuthNetworkError(error)) {
        try {
          await createLocalFallbackAccount();
          return;
        } catch (localError) {
          setErrorMessage(
            localError instanceof Error
              ? localError.message
              : 'Could not create a local development account.',
          );
          return;
        }
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const updatePersonal = <Key extends keyof PersonalForm>(key: Key, value: PersonalForm[Key]) => {
    setPersonal((prev) => ({ ...prev, [key]: value }));
    setPersonalErrors((prev) => ({ ...prev, [key]: undefined }));
    setErrorMessage(null);
  };

  const updateBusiness = <Key extends keyof BusinessForm>(key: Key, value: BusinessForm[Key]) => {
    setBusiness((prev) => ({ ...prev, [key]: value }));
    setBusinessErrors((prev) => ({ ...prev, [key]: undefined }));
    setErrorMessage(null);
  };

  return (
    <Screen scrollable style={styles.screen}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>MEET ME THERE</Text>
        <Text style={[styles.title, { color: colors.text }]}>Sign up</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Join the app and start discovering nearby events and people.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
        {notice ? <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}

        <FormField label="Account type" required>
          <View style={styles.accountTypeRow}>
            <AccountTypeButton
              label="Personal Account"
              selected={accountType === 'personal'}
              colors={colors}
              onPress={() => setAccountType('personal')}
            />
            <AccountTypeButton
              label="Business Account"
              selected={accountType === 'business'}
              colors={colors}
              onPress={() => setAccountType('business')}
            />
          </View>
        </FormField>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>

        {accountType === 'personal' ? (
          <>
            <FormField label="Photo (optional)">
              <UploadBox title="Upload profile photo" />
            </FormField>

            <FormField label="Email" required error={personalErrors.email}>
              <Input
                value={personal.email}
                onChangeText={(value) => updatePersonal('email', value)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={personalErrors.email}
              />
            </FormField>

            <FormField label="Password" required error={personalErrors.password}>
              <Input
                value={personal.password}
                onChangeText={(value) => updatePersonal('password', value)}
                placeholder="Create a password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={personalErrors.password}
              />
            </FormField>

            <FormField
              label="Confirm Password"
              required
              error={personalErrors.confirmPassword}
            >
              <Input
                value={personal.confirmPassword}
                onChangeText={(value) => updatePersonal('confirmPassword', value)}
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={personalErrors.confirmPassword}
              />
            </FormField>

            <FormField label="Full Name" required error={personalErrors.name}>
              <Input
                value={personal.name}
                onChangeText={(value) => updatePersonal('name', value)}
                placeholder="Enter your full name"
                error={personalErrors.name}
              />
            </FormField>

            <FormField label="Phone" required error={personalErrors.phone}>
              <Input
                value={personal.phone}
                onChangeText={(value) => updatePersonal('phone', value)}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                error={personalErrors.phone}
              />
            </FormField>

            <FormField
              label="Date of Birth"
              required
              error={personalErrors.dateOfBirth}
            >
              <Input
                value={personal.dateOfBirth}
                onChangeText={(value) => updatePersonal('dateOfBirth', value)}
                placeholder="YYYY-MM-DD"
                error={personalErrors.dateOfBirth}
              />
            </FormField>

            <FormField label="Gender" required error={personalErrors.gender}>
              <View style={styles.genderList}>
                {[
                  { label: 'Female', value: 'female' },
                  { label: 'Male', value: 'male' },
                  { label: 'Other', value: 'other' },
                  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
                ].map((option) => (
                  <RadioRow
                    key={option.value}
                    label={option.label}
                    selected={personal.gender === option.value}
                    onPress={() => updatePersonal('gender', option.value)}
                  />
                ))}
              </View>
            </FormField>

            <TermsCheckbox
              checked={personal.acceptTerms}
              error={personalErrors.acceptTerms}
              onPress={() => updatePersonal('acceptTerms', !personal.acceptTerms)}
            />
          </>
        ) : (
          <>
            <FormField label="Logo (optional)">
              <UploadBox title="Upload business logo" />
            </FormField>

            <FormField
              label="Business Name"
              required
              error={businessErrors.businessName}
            >
              <Input
                value={business.businessName}
                onChangeText={(value) => updateBusiness('businessName', value)}
                placeholder="Enter your business name"
                error={businessErrors.businessName}
              />
            </FormField>

            <FormField label="Category" required error={businessErrors.category}>
              <Input
                value={business.category}
                onChangeText={(value) => updateBusiness('category', value)}
                placeholder="Cafe, Event Space, Community Hub"
                error={businessErrors.category}
              />
            </FormField>

            <FormField
              label="Short Description"
              required
              error={businessErrors.shortDescription}
            >
              <TextInput
                value={business.shortDescription}
                onChangeText={(value) => updateBusiness('shortDescription', value)}
                placeholder="Tell users about your business"
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                style={[
                  styles.textArea,
                  { backgroundColor: colors.background, color: colors.text, borderColor: businessErrors.shortDescription ? colors.error : colors.border },
                ]}
              />
            </FormField>

            <FormField
              label="Contact Person"
              required
              error={businessErrors.contactPerson}
            >
              <Input
                value={business.contactPerson}
                onChangeText={(value) => updateBusiness('contactPerson', value)}
                placeholder="Contact person name"
                error={businessErrors.contactPerson}
              />
            </FormField>

            <FormField label="Phone" required error={businessErrors.phone}>
              <Input
                value={business.phone}
                onChangeText={(value) => updateBusiness('phone', value)}
                placeholder="Enter business phone number"
                keyboardType="phone-pad"
                error={businessErrors.phone}
              />
            </FormField>

            <FormField
              label="Business Email"
              required
              error={businessErrors.businessEmail}
            >
              <Input
                value={business.businessEmail}
                onChangeText={(value) => updateBusiness('businessEmail', value)}
                placeholder="Enter business email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={businessErrors.businessEmail}
              />
            </FormField>

            <FormField label="Password" required error={businessErrors.password}>
              <Input
                value={business.password}
                onChangeText={(value) => updateBusiness('password', value)}
                placeholder="Create a password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={businessErrors.password}
              />
            </FormField>

            <FormField
              label="Confirm Password"
              required
              error={businessErrors.confirmPassword}
            >
              <Input
                value={business.confirmPassword}
                onChangeText={(value) => updateBusiness('confirmPassword', value)}
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={businessErrors.confirmPassword}
              />
            </FormField>

            <FormField label="Website (optional)" error={businessErrors.website}>
              <Input
                value={business.website}
                onChangeText={(value) => updateBusiness('website', value)}
                placeholder="https://yourbusiness.com"
                autoCapitalize="none"
                autoCorrect={false}
                error={businessErrors.website}
              />
            </FormField>

            <FormField label="Social Media (optional)">
              <Input
                value={business.socialMedia}
                onChangeText={(value) => updateBusiness('socialMedia', value)}
                placeholder="@yourbusiness or profile link"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <TermsCheckbox
              checked={business.acceptTerms}
              error={businessErrors.acceptTerms}
              onPress={() => updateBusiness('acceptTerms', !business.acceptTerms)}
            />
          </>
        )}

        <Button
          label={
            accountType === 'personal'
              ? 'Create Personal Account'
              : 'Create Business Account'
          }
          onPress={handleRegister}
          loading={loading}
          style={styles.submitButton}
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Already have an account?</Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Log in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

function AccountTypeButton({
  label,
  selected,
  colors,
  onPress,
}: {
  label: string;
  selected: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.accountTypeOption,
        {
          backgroundColor: selected ? colors.primary : colors.background,
          borderColor: selected ? colors.primary : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.accountTypeText, { color: selected ? '#fff' : colors.text }, selected && styles.accountTypeTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function UploadBox({ title }: { title: string }) {
  const colors = useThemeColors();
  return (
    <Pressable style={({ pressed }) => [styles.uploadBox, { borderColor: colors.border, backgroundColor: colors.background }, pressed && styles.pressed]}>
      <Text style={[styles.uploadTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.uploadText, { color: colors.textMuted }]}>Tap to choose an image later</Text>
    </Pressable>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} style={styles.genderRow}>
      <View style={[styles.genderRadioOuter, { borderColor: selected ? colors.primary : colors.border }, selected && styles.genderRadioOuterSelected]}>
        {selected ? <View style={[styles.genderRadioInner, { backgroundColor: colors.primary }]} /> : null}
      </View>
      <Text style={[styles.genderLabel, { color: selected ? colors.primary : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function TermsCheckbox({
  checked,
  error,
  onPress,
}: {
  checked: boolean;
  error?: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.termsBlock}>
      <Pressable style={styles.checkboxRow} onPress={onPress}>
        <View style={[styles.checkbox, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : colors.background }]}>
          {checked ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={[styles.checkboxLabel, { color: colors.text }]}>I accept the Terms and Conditions</Text>
      </Pressable>
      {error ? <Text style={[styles.checkboxError, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  eyebrow: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  notice: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
  },
  uploadBox: {
    minHeight: 96,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  uploadTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  uploadText: {
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
  },
  termsBlock: {
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  checkboxError: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    marginLeft: 34,
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
  },
  footerLink: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  accountTypeOption: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  accountTypeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  accountTypeTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  genderList: {
    gap: theme.spacing.sm,
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  genderRadioOuter: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderRadioOuterSelected: {},
  genderRadioInner: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.full,
  },
  genderLabel: {
    fontSize: theme.fontSize.sm,
  },
  genderLabelSelected: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
``