import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';

import { Button } from '../../../src/ui/Button';
import { FormField } from '../../../src/ui/FormField';
import { Input } from '../../../src/ui/Input';
import { Screen } from '../../../src/ui/Screen';
import { theme } from '../../../src/ui/theme';
import { supabase } from '../../../src/lib/supabase';

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

export default function RegisterAccountType() {
  const [accountType, setAccountType] = useState<AccountType>('personal');

  const [personal, setPersonal] = useState<PersonalForm>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);

  const [business, setBusiness] = useState<BusinessForm>({
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
  });

  const title = useMemo(
    () =>
      accountType === 'personal'
        ? 'Create your personal account'
        : 'Create your business account',
    [accountType]
  );

  const handleRegister = async () => {
  try {
    setLoading(true);

    if (accountType === 'personal') {
      const { data, error } = await supabase.auth.signUp({
        email: personal.email,
        password: personal.password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('User was not created');

      const { error: userInsertError } = await supabase.from('users').insert({
        user_id: data.user.id,
        email: personal.email,
        phone: personal.phone,
        account_type: 'personal',
        role: 'user',
        account_status: 'active',
      });

      if (userInsertError) throw userInsertError;

      const { error: personalInsertError } = await supabase
        .from('personal_profiles')
        .insert({
          user_id: data.user.id,
          full_name: personal.name,
          date_of_birth: personal.dateOfBirth,
          gender: personal.gender,
          photo_url: null,
        });

      if (personalInsertError) throw personalInsertError;
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: business.businessEmail,
        password: business.password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('User was not created');

      const { error: userInsertError } = await supabase.from('users').insert({
        user_id: data.user.id,
        email: business.businessEmail,
        phone: business.phone,
        account_type: 'business',
        role: 'user',
        account_status: 'active',
      });

      if (userInsertError) throw userInsertError;

      const { error: businessInsertError } = await supabase
        .from('business_profiles')
        .insert({
          user_id: data.user.id,
          business_name: business.businessName,
          business_category: business.category,
          short_description: business.shortDescription,
          contact_person_name: business.contactPerson,
          logo_url: null,
          location_text: null,
          website: business.website || null,
          social_media_link: business.socialMedia || null,
        });

      if (businessInsertError) throw businessInsertError;
    }

    alert('Account created. Please check your email to confirm your account.');
  } catch (error) {
    console.error(error);
    alert(error instanceof Error ? error.message : 'Something went wrong');
  } finally {
    setLoading(false);
  }
};

  return (
    <Screen scrollable style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MEET ME THERE</Text>
        <Text style={styles.title}>Sign up</Text>
        <Text style={styles.subtitle}>
          Join the app and start discovering nearby events and people.
        </Text>
      </View>

      <View style={styles.card}>
        <FormField label="Account type" required>
  <View style={styles.accountTypeRow}>
    <Pressable
      onPress={() => setAccountType('personal')}
      style={[
        styles.accountTypeOption,
        accountType === 'personal' && styles.accountTypeOptionSelected,
      ]}
    >
      <Text
        style={[
          styles.accountTypeText,
          accountType === 'personal' && styles.accountTypeTextSelected,
        ]}
      >
        Personal Account
      </Text>
    </Pressable>

    <Pressable
      onPress={() => setAccountType('business')}
      style={[
        styles.accountTypeOption,
        accountType === 'business' && styles.accountTypeOptionSelected,
      ]}
    >
      <Text
        style={[
          styles.accountTypeText,
          accountType === 'business' && styles.accountTypeTextSelected,
        ]}
      >
        Business Account
      </Text>
    </Pressable>
  </View>
</FormField>

        <Text style={styles.sectionTitle}>{title}</Text>

        {accountType === 'personal' ? (
          <>
            <FormField label="Photo (optional)">
              <Pressable style={styles.uploadBox}>
                <Text style={styles.uploadTitle}>Upload profile photo</Text>
                <Text style={styles.uploadText}>
                  Tap to choose an image later
                </Text>
              </Pressable>
            </FormField>

            <FormField label="Email" required>
              <Input
                value={personal.email}
                onChangeText={(value) =>
                  setPersonal((prev) => ({ ...prev, email: value }))
                }
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <FormField label="Password" required>
              <Input
                value={personal.password}
                onChangeText={(value) =>
                  setPersonal((prev) => ({ ...prev, password: value }))
                }
                placeholder="Create a password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <FormField label="Confirm Password" required>
              <Input
                value={personal.confirmPassword}
                onChangeText={(value) =>
                  setPersonal((prev) => ({ ...prev, confirmPassword: value }))
                }
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <FormField label="Full Name" required>
              <Input
                value={personal.name}
                onChangeText={(value) =>
                  setPersonal((prev) => ({ ...prev, name: value }))
                }
                placeholder="Enter your full name"
              />
            </FormField>

            <FormField label="Phone" required>
              <Input
                value={personal.phone}
                onChangeText={(value) =>
                  setPersonal((prev) => ({ ...prev, phone: value }))
                }
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </FormField>

            <FormField label="Date of Birth" required>
              <Input
                value={personal.dateOfBirth}
                onChangeText={(value) =>
                  setPersonal((prev) => ({ ...prev, dateOfBirth: value }))
                }
                placeholder="YYYY-MM-DD"
              />
            </FormField>

            <FormField label="Gender" required>
  <View style={styles.genderList}>
    {[
      { label: 'Female', value: 'female' },
      { label: 'Male', value: 'male' },
      { label: 'Other', value: 'other' },
      { label: 'Prefer not to say', value: 'prefer_not_to_say' },
    ].map((option) => {
      const selected = personal.gender === option.value;

      return (
        <Pressable
          key={option.value}
          onPress={() =>
            setPersonal((prev) => ({ ...prev, gender: option.value }))
          }
          style={styles.genderRow}
        >
          <View
            style={[
              styles.genderRadioOuter,
              selected && styles.genderRadioOuterSelected,
            ]}
          >
            {selected ? <View style={styles.genderRadioInner} /> : null}
          </View>

          <Text
            style={[
              styles.genderLabel,
              selected && styles.genderLabelSelected,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
</FormField>

            <Pressable
              style={styles.checkboxRow}
              onPress={() =>
                setPersonal((prev) => ({
                  ...prev,
                  acceptTerms: !prev.acceptTerms,
                }))
              }
            >
              <View
                style={[
                  styles.checkbox,
                  personal.acceptTerms && styles.checkboxChecked,
                ]}
              >
                {personal.acceptTerms ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </View>
              <Text style={styles.checkboxLabel}>
                I accept the Terms and Conditions
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <FormField label="Logo (optional)">
              <Pressable style={styles.uploadBox}>
                <Text style={styles.uploadTitle}>Upload business logo</Text>
                <Text style={styles.uploadText}>
                  Tap to choose an image later
                </Text>
              </Pressable>
            </FormField>

            <FormField label="Business Name" required>
              <Input
                value={business.businessName}
                onChangeText={(value) =>
                  setBusiness((prev) => ({ ...prev, businessName: value }))
                }
                placeholder="Enter your business name"
              />
            </FormField>

            <FormField label="Category" required>
              <Input
                value={business.category}
                onChangeText={(value) =>
                  setBusiness((prev) => ({ ...prev, category: value }))
                }
                placeholder="Ex: Cafe, Event Space, Community Hub"
              />
            </FormField>

            <FormField label="Short Description" required>
              <TextInput
                value={business.shortDescription}
                onChangeText={(value) =>
                  setBusiness((prev) => ({ ...prev, shortDescription: value }))
                }
                placeholder="Tell users about your business"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                textAlignVertical="top"
                style={styles.textArea}
              />
            </FormField>

            <FormField label="Contact Person" required>
              <Input
                value={business.contactPerson}
                onChangeText={(value) =>
                  setBusiness((prev) => ({ ...prev, contactPerson: value }))
                }
                placeholder="Contact person name"
              />
            </FormField>

            <FormField label="Phone" required>
              <Input
                value={business.phone}
                onChangeText={(value) =>
                  setBusiness((prev) => ({ ...prev, phone: value }))
                }
                placeholder="Enter business phone number"
                keyboardType="phone-pad"
              />
            </FormField>

            <FormField label="Business Email" required>
              <Input
                value={business.businessEmail}
                onChangeText={(value) =>
                  setBusiness((prev) => ({ ...prev, businessEmail: value }))
                }
                placeholder="Enter business email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <FormField label="Password" required>
              <Input
                value={business.password}
                onChangeText={(value) =>
                  setBusiness((prev) => ({ ...prev, password: value }))
                }
                placeholder="Create a password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <FormField label="Confirm Password" required>
              <Input
                value={business.confirmPassword}
                onChangeText={(value) =>
                  setBusiness((prev) => ({ ...prev, confirmPassword: value }))
                }
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <FormField label="Website (optional)">
              <Input
                value={business.website}
                onChangeText={(value) =>
                  setBusiness((prev) => ({ ...prev, website: value }))
                }
                placeholder="https://yourbusiness.com"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <FormField label="Social Media (optional)">
              <Input
                value={business.socialMedia}
                onChangeText={(value) =>
                  setBusiness((prev) => ({ ...prev, socialMedia: value }))
                }
                placeholder="@yourbusiness or profile link"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <Pressable
              style={styles.checkboxRow}
              onPress={() =>
                setBusiness((prev) => ({
                  ...prev,
                  acceptTerms: !prev.acceptTerms,
                }))
              }
            >
              <View
                style={[
                  styles.checkbox,
                  business.acceptTerms && styles.checkboxChecked,
                ]}
              >
                {business.acceptTerms ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </View>
              <Text style={styles.checkboxLabel}>
                I accept the Terms and Conditions
              </Text>
            </Pressable>
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
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Log in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </Screen>
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
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  
  uploadBox: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  uploadTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  uploadText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
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
    color: theme.colors.text,
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
    color: theme.colors.textMuted,
  },
  accountTypeRow: {
  flexDirection: 'row',
  gap: theme.spacing.md,
},

accountTypeOption: {
  flex: 1,
  minHeight: 48,
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: theme.radius.md,
  backgroundColor: theme.colors.background,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: theme.spacing.md,
},

accountTypeOptionSelected: {
  backgroundColor: theme.colors.primary,
  borderColor: theme.colors.primary,
},

accountTypeText: {
  fontSize: theme.fontSize.sm,
  fontWeight: '500',
  color: theme.colors.text,
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
  borderColor: theme.colors.border,
  backgroundColor: theme.colors.background,
  alignItems: 'center',
  justifyContent: 'center',
},

genderRadioOuterSelected: {
  borderColor: theme.colors.primary,
},

genderRadioInner: {
  width: 10,
  height: 10,
  borderRadius: theme.radius.full,
  backgroundColor: theme.colors.primary,
},

genderLabel: {
  fontSize: theme.fontSize.sm,
  color: theme.colors.text,
},

genderLabelSelected: {
  fontWeight: '600',
},
  footerLink: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
