import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, X, Check, ChevronRight, MapPin, Calendar } from 'lucide-react-native';

import { impactLight, notifySuccess } from '../../utils/haptics';
import { useAuthStore } from '../../store/auth-store';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { AgeBand } from '../../types/index';

// ─── Constants ───────────────────────────────────────────────────────

const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45-54', label: '45–54' },
  { value: '55+', label: '55+' },
];

interface RegionOption {
  country_code: string;
  country_name: string;
  flag: string;
  regions: string[];
}

const REGION_OPTIONS: RegionOption[] = [
  {
    country_code: 'EG', country_name: 'Egypt', flag: '🇪🇬',
    regions: ['Cairo', 'Alexandria', 'Giza', 'Dakahlia', 'Sharqia', 'Qalyubia', 'Gharbia', 'Asyut', 'Other'],
  },
  {
    country_code: 'SA', country_name: 'Saudi Arabia', flag: '🇸🇦',
    regions: ['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Khobar', 'Abha', 'Tabuk', 'Other'],
  },
  {
    country_code: 'AE', country_name: 'UAE', flag: '🇦🇪',
    regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Other'],
  },
  {
    country_code: 'KW', country_name: 'Kuwait', flag: '🇰🇼',
    regions: ['Kuwait City', 'Hawalli', 'Farwaniya', 'Ahmadi', 'Other'],
  },
  {
    country_code: 'QA', country_name: 'Qatar', flag: '🇶🇦',
    regions: ['Doha', 'Al Wakra', 'Al Rayyan', 'Other'],
  },
  {
    country_code: 'BH', country_name: 'Bahrain', flag: '🇧🇭',
    regions: ['Manama', 'Muharraq', 'Riffa', 'Other'],
  },
  {
    country_code: 'OM', country_name: 'Oman', flag: '🇴🇲',
    regions: ['Muscat', 'Salalah', 'Sohar', 'Other'],
  },
  {
    country_code: 'JO', country_name: 'Jordan', flag: '🇯🇴',
    regions: ['Amman', 'Irbid', 'Zarqa', 'Aqaba', 'Other'],
  },
];

// ─── Unlock Card (shown when user hasn't set demographics) ──────────

interface BenchmarkUnlockCardProps {
  onUnlock: () => void;
}

export function BenchmarkUnlockCard({ onUnlock }: BenchmarkUnlockCardProps): React.ReactElement {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => { impactLight(); onUnlock(); }}
      className="mx-4 mb-4 rounded-2xl p-4"
      style={{
        backgroundColor: colors.primary + '08',
        borderWidth: 1,
        borderColor: colors.primary + '20',
      }}
    >
      <View className="flex-row items-center mb-2">
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.primary + '15',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Users size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
            See How You Compare
          </Text>
        </View>
        <ChevronRight size={16} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginLeft: 48 }}>
        Add your age and region to see how your spending compares to anonymous Wallet users like you.
      </Text>
    </Pressable>
  );
}

// ─── Demographics Editor Modal ───────────────────────────────────────

interface DemographicsEditorProps {
  visible: boolean;
  onClose: () => void;
}

export function DemographicsEditor({ visible, onClose }: DemographicsEditorProps): React.ReactElement {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const [selectedAge, setSelectedAge] = useState<AgeBand | null>(
    (user?.age_band as AgeBand) ?? null,
  );
  const [selectedCountry, setSelectedCountry] = useState<RegionOption | null>(
    REGION_OPTIONS.find((r) => r.country_code === user?.country_code) ?? null,
  );
  const [selectedRegion, setSelectedRegion] = useState<string | null>(
    user?.region_name ?? null,
  );

  const canSave = selectedAge && selectedCountry && selectedRegion;

  const handleSave = (): void => {
    if (!canSave) return;
    impactLight();
    updateProfile(
      {
        age_band: selectedAge,
        country_code: selectedCountry!.country_code,
        region_name: selectedRegion!,
      },
      {
        onSuccess: () => {
          notifySuccess();
          onClose();
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 pb-3"
          style={{ paddingTop: insets.top + 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
        >
          <Pressable onPress={onClose} hitSlop={12} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textPrimary }}>
            Benchmark Profile
          </Text>
          <Pressable
            onPress={handleSave}
            hitSlop={12}
            style={{ padding: 4, opacity: canSave ? 1 : 0.3 }}
            disabled={!canSave || isPending}
          >
            <Check size={22} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {/* Value proposition */}
          <View className="mb-6">
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
              This helps us show you anonymous spending comparisons from Wallet users in your age group and region. Your data stays private.
            </Text>
          </View>

          {/* Age Band */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Calendar size={15} color={colors.textSecondary} strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginLeft: 6 }}>
                Age Range
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {AGE_BANDS.map((ab) => {
                const isSelected = selectedAge === ab.value;
                return (
                  <Pressable
                    key={ab.value}
                    onPress={() => { impactLight(); setSelectedAge(ab.value); }}
                    className="rounded-xl px-4 py-2.5"
                    style={{
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary : colors.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: isSelected ? '#FFFFFF' : colors.textPrimary,
                      }}
                    >
                      {ab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Country */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <MapPin size={15} color={colors.textSecondary} strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginLeft: 6 }}>
                Country
              </Text>
            </View>
            {REGION_OPTIONS.map((opt) => {
              const isSelected = selectedCountry?.country_code === opt.country_code;
              return (
                <Pressable
                  key={opt.country_code}
                  onPress={() => {
                    impactLight();
                    setSelectedCountry(opt);
                    setSelectedRegion(null); // reset region when country changes
                  }}
                  className="flex-row items-center rounded-xl px-4 py-3 mb-2"
                  style={{
                    backgroundColor: isSelected ? colors.primary + '10' : colors.surface,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{opt.flag}</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: isSelected ? colors.primary : colors.textPrimary,
                    }}
                  >
                    {opt.country_name}
                  </Text>
                  {isSelected ? (
                    <View className="ml-auto">
                      <Check size={16} color={colors.primary} strokeWidth={2.5} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Region (conditional on country) */}
          {selectedCountry ? (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <MapPin size={15} color={colors.textSecondary} strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginLeft: 6 }}>
                  Region / City
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {selectedCountry.regions.map((region) => {
                  const isSelected = selectedRegion === region;
                  return (
                    <Pressable
                      key={region}
                      onPress={() => { impactLight(); setSelectedRegion(region); }}
                      className="rounded-xl px-4 py-2.5"
                      style={{
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: isSelected ? '#FFFFFF' : colors.textPrimary,
                        }}
                      >
                        {region}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
